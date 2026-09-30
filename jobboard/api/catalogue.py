from django.contrib.postgres.search import SearchQuery
from django.db import transaction
from django.db.models import Exists, F, OuterRef, Prefetch, Q
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from django.urls import path
from django.utils import timezone

from jobboard.api.core import APIError, body, endpoint, lock_user, model_data, paginate
from jobboard.models import (
    CandidateProfile,
    CompensationBand,
    Location,
    Offer,
    OfferSource,
    Role,
    SavedOffer,
    SearchPreference,
    Skill,
)
from jobboard.models.choices import ContractType, WorkMode


def offer_queryset():
    return (
        Offer.objects.select_related("company", "role")
        .prefetch_related(
            "locations",
            "skills",
            "compensation_bands",
            Prefetch(
                "sources",
                queryset=OfferSource.objects.filter(
                    source_status="active", board__enabled=True
                ).select_related("board"),
            ),
        )
        .order_by(F("published_at").desc(nulls_last=True), "-id")
    )


def open_offers():
    return (
        offer_queryset()
        .filter(status="open")
        .filter(Q(expires_at__isnull=True) | Q(expires_at__gt=timezone.now()))
    )


def serialize_offer(offer, detail=False):
    result = model_data(
        offer,
        [
            "id",
            "title",
            "contract_type",
            "employment_schedule",
            "work_mode",
            "seniority",
            "remote_scope",
            "language_code",
            "status",
            "published_at",
            "expires_at",
        ],
    )
    result["company"] = model_data(offer.company, ["id", "name", "website_url"])
    result["role"] = (
        model_data(offer.role, ["id", "name", "slug"]) if offer.role_id else None
    )
    result["locations"] = [
        model_data(item, ["id", "name", "country_code", "region", "city"])
        for item in offer.locations.all()
    ]
    result["skills"] = [
        model_data(item, ["id", "name", "slug"]) for item in offer.skills.all()
    ]
    result["compensation_bands"] = [
        model_data(
            item,
            [
                "id",
                "minimum",
                "maximum",
                "currency",
                "period",
                "gross_net",
                "location_id",
            ],
        )
        for item in offer.compensation_bands.all()
    ]
    result["sources"] = [
        {
            "id": item.pk,
            "provider": item.board.provider,
            "apply_url": item.apply_url,
            "submission_mode": item.board.submission_mode,
        }
        for item in offer.sources.all()
    ]
    if detail:
        result["description"] = offer.description
    return result


def filtered_offers(request):
    queryset = open_offers()
    for field, choices in [
        ("contract_type", ContractType.values),
        ("work_mode", WorkMode.values),
    ]:
        value = request.GET.get(field)
        if value:
            if value not in choices:
                raise APIError("invalid_filter", f"Invalid {field}.")
            queryset = queryset.filter(**{field: value})
    for param, field in [("role", "role_id"), ("location", "locations__id")]:
        value = request.GET.get(param)
        if value:
            if not value.isdecimal() or len(value) > 18 or int(value) < 1:
                raise APIError("invalid_filter", f"{param} must be a positive integer.")
            queryset = queryset.filter(**{field: int(value)})
    query = request.GET.get("q", "").strip()
    if len(query) > 300:
        raise APIError("invalid_filter", "Search is limited to 300 characters.")
    if query:
        queryset = queryset.filter(
            search_vector=SearchQuery(query, config="simple", search_type="websearch")
        )
    return queryset.distinct()


@endpoint(["GET"])
def offers(request):
    return paginate(filtered_offers(request), request, serialize_offer)


@endpoint(["GET"])
def offer_detail(request, pk):
    return serialize_offer(get_object_or_404(open_offers(), pk=pk), detail=True)


@endpoint(["GET"])
def catalogue(request):
    # Each vocabulary has an independent page, selected with ?kind=roles|skills|locations.
    kind = request.GET.get("kind", "roles")
    models = {"roles": Role, "skills": Skill, "locations": Location}
    if kind not in models:
        raise APIError("invalid_filter", "kind must be roles, skills or locations.")
    queryset = models[kind].objects.order_by("name", "id")
    query = request.GET.get("q", "").strip()
    if len(query) > 300:
        raise APIError("invalid_filter", "Search is limited to 300 characters.")
    if query:
        queryset = queryset.filter(name__icontains=query)
    fields = (
        ["id", "name", "country_code", "region", "city"]
        if kind == "locations"
        else ["id", "name", "slug"]
    )
    result = paginate(queryset, request, lambda item: model_data(item, fields))
    result["kind"] = kind
    return result


@endpoint(["GET"])
def saved_offers(request):
    return paginate(
        offer_queryset()
        .filter(saved_by__user=request.user)
        .order_by("-saved_by__created_at", "-id"),
        request,
        serialize_offer,
    )


@endpoint(["PUT", "DELETE"])
def saved_offer(request, pk):
    if request.body:
        body(request, allowed=set())
    with transaction.atomic():
        lock_user(request.user)
        if request.method == "PUT":
            offer = get_object_or_404(open_offers(), pk=pk)
            SavedOffer.objects.get_or_create(user=request.user, offer=offer)
        else:
            SavedOffer.objects.filter(user=request.user, offer_id=pk).delete()
    return {"saved": request.method == "PUT", "offer_id": pk}


@endpoint(["GET"])
def recommendations(request):
    unknown_option = request.GET.get("include_unknown", "true")
    if unknown_option not in {"true", "false"}:
        raise APIError("invalid_filter", "include_unknown must be true or false.")
    include_unknown = unknown_option == "true"
    preference = (
        SearchPreference.objects.filter(profile__user=request.user)
        .prefetch_related("roles", "locations", "contracts", "work_modes")
        .first()
    )
    roles, locations, contracts, modes = set(), set(), set(), set()
    if preference:
        roles = {item.pk for item in preference.roles.all()}
        locations = {item.pk for item in preference.locations.all()}
        contracts = {item.value for item in preference.contracts.all()}
        modes = {item.value for item in preference.work_modes.all()}
    profile = CandidateProfile.objects.filter(user=request.user).first()
    skills = set(profile.skills.values_list("id", flat=True)) if profile else set()
    queryset = filtered_offers(request)
    # Empty accepted sets mean no accepted alternatives, including unknowns.
    if not preference or not contracts or not modes:
        queryset = queryset.none()
    else:
        accepted_contracts = contracts | ({"unknown"} if include_unknown else set())
        accepted_modes = modes | ({"unknown"} if include_unknown else set())
        queryset = queryset.filter(
            contract_type__in=accepted_contracts, work_mode__in=accepted_modes
        )
    has_salary_threshold = (
        preference is not None and preference.minimum_salary is not None
    )
    if has_salary_threshold:
        comparable = CompensationBand.objects.filter(
            offer_id=OuterRef("pk"),
            currency=preference.salary_currency,
            period=preference.salary_period,
            gross_net=preference.salary_gross_net,
            source__source_status="active",
            source__board__enabled=True,
        )
        # For a range, compare its maximum. For a minimum-only disclosure,
        # compare the advertised minimum. No currency/period conversion.
        sufficient = comparable.annotate(
            advertised_upper=Coalesce("maximum", "minimum")
        ).filter(advertised_upper__gte=preference.minimum_salary)
        queryset = queryset.annotate(
            salary_comparable=Exists(comparable), salary_sufficient=Exists(sufficient)
        )
        salary_filter = Q(salary_sufficient=True)
        if include_unknown:
            salary_filter |= Q(salary_comparable=False)
        queryset = queryset.filter(salary_filter)

    def serialize(offer):
        reasons = []
        if offer.role_id in roles:
            reasons.append({"code": "preferred_role", "role_id": offer.role_id})
        common_locations = sorted(
            {item.pk for item in offer.locations.all()} & locations
        )
        common_skills = sorted({item.pk for item in offer.skills.all()} & skills)
        if common_locations:
            reasons.append(
                {"code": "preferred_location", "location_ids": common_locations}
            )
        if common_skills:
            reasons.append({"code": "profile_skills", "skill_ids": common_skills})
        if offer.contract_type in contracts:
            reasons.append({"code": "preferred_contract", "value": offer.contract_type})
        if offer.work_mode in modes:
            reasons.append({"code": "preferred_work_mode", "value": offer.work_mode})
        unknown_fields = [
            field
            for field in ("contract_type", "work_mode")
            if getattr(offer, field) == "unknown"
        ]
        salary_comparison = "not_requested"
        if has_salary_threshold:
            salary_comparison = (
                "comparable" if offer.salary_comparable else "not_comparable"
            )
            if offer.salary_sufficient:
                reasons.append(
                    {
                        "code": "salary_range_meets_minimum",
                        "minimum_salary": str(preference.minimum_salary),
                        "currency": preference.salary_currency,
                        "period": preference.salary_period,
                        "gross_net": preference.salary_gross_net,
                    }
                )
            else:
                unknown_fields.append("salary")
        return {
            "offer": serialize_offer(offer),
            "reasons": reasons,
            "unknown_fields": unknown_fields,
            "salary_comparison": salary_comparison,
        }

    return paginate(queryset.distinct(), request, serialize)


urlpatterns = [
    path("offers/", offers),
    path("offers/<int:pk>/", offer_detail),
    path("catalogue/", catalogue),
    path("saved-offers/", saved_offers),
    path("saved-offers/<int:pk>/", saved_offer),
    path("recommendations/", recommendations),
]
