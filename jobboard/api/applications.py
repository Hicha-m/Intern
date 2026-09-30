from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from django.db import transaction
from django.urls import path

from jobboard import models as m
from jobboard.api.core import (
    APIError,
    apply_fields,
    body,
    endpoint,
    integer,
    lock_user,
    model_data,
    paginate,
)
from jobboard.services import applications as service

APP_FIELDS = [
    "id",
    "offer_id",
    "source_id",
    "status",
    "submitted_at",
    "external_reference",
    "created_at",
    "updated_at",
]
RUN_FIELDS = [
    "id",
    "revision_id",
    "purpose",
    "status",
    "phase",
    "attempt_no",
    "error_code",
    "external_receipt",
    "started_at",
    "finished_at",
    "created_at",
]
TASK_FIELDS = ["title", "due_at", "completed_at"]
INTERVIEW_FIELDS = [
    "title",
    "starts_at",
    "ends_at",
    "display_timezone",
    "meeting_url",
    "location_text",
    "status",
    "notes",
]


def revision_data(revision):
    return {
        **model_data(
            revision,
            [
                "id",
                "revision_no",
                "schema_version",
                "profile_snapshot",
                "offer_snapshot",
                "form_snapshot",
                "answers",
                "content_hash",
                "sealed_at",
                "created_at",
            ],
        ),
        "document_ids": list(
            revision.document_links.values_list("document_id", flat=True)
        ),
        "missing_fields": service.missing_fields(revision),
    }


def run_data(run):
    return model_data(run, RUN_FIELDS)


@endpoint(["GET", "POST"])
def applications(request):
    if request.method == "POST":
        data = body(request, ["offer_id", "source_id"], ["offer_id", "source_id"])
        return model_data(
            service.create_application(
                request.user, integer(data["offer_id"]), integer(data["source_id"])
            ),
            APP_FIELDS,
        )
    qs = m.Application.objects.filter(user=request.user).order_by("-updated_at", "-pk")
    status = request.GET.get("status")
    if status:
        if status not in m.Application.Status.values:
            raise APIError("invalid_status", "Unknown status.")
        qs = qs.filter(status=status)
    return paginate(qs, request, lambda app: model_data(app, APP_FIELDS))


@endpoint(["GET"])
def application_detail(request, pk):
    app = service.private_application(request.user, pk)
    # Bounded history pages independently of the main tracker page.
    return {
        **model_data(app, APP_FIELDS),
        "latest_revision": revision_data(app.revisions.order_by("-revision_no").first())
        if app.revisions.exists()
        else None,
        "latest_run": run_data(app.runs.order_by("-pk").first())
        if app.runs.exists()
        else None,
    }


@endpoint(["POST"])
def prepare(request, pk):
    body(request, [])
    return revision_data(service.prepare(request.user, pk))


@endpoint(["GET", "POST"])
def revise(request, pk):
    if request.method == "GET":
        app = service.private_application(request.user, pk)
        return paginate(app.revisions.order_by("-revision_no"), request, revision_data)
    data = body(request, ["answers", "document_ids"], ["answers", "document_ids"])
    return revision_data(
        service.revise(request.user, pk, data["answers"], data["document_ids"])
    )


@endpoint(["POST"])
def approve(request, pk):
    data = body(
        request,
        ["revision_id", "content_hash", "idempotency_key"],
        ["revision_id", "content_hash", "idempotency_key"],
    )
    return run_data(
        service.approve(
            request.user,
            pk,
            integer(data["revision_id"]),
            data["content_hash"],
            data["idempotency_key"],
        )
    )


@endpoint(["POST"])
def revoke(request, pk):
    body(request, [])
    return model_data(service.revoke(request.user, pk), APP_FIELDS)


@endpoint(["POST"])
def status(request, pk):
    data = body(request, ["status", "reason"], ["status", "reason"])
    return model_data(
        service.update_status(request.user, pk, data["status"], data["reason"]),
        APP_FIELDS,
    )


@endpoint(["POST"])
def resolve(request, pk):
    data = body(request, ["outcome", "evidence"], ["outcome", "evidence"])
    return run_data(
        service.resolve(request.user, pk, data["outcome"], data["evidence"])
    )


def related_config(kind):
    return (
        (m.ApplicationTask, TASK_FIELDS)
        if kind == "tasks"
        else (m.Interview, INTERVIEW_FIELDS)
    )


def validate_related(kind, data):
    if kind == "interviews" and "display_timezone" in data:
        try:
            ZoneInfo(data["display_timezone"])
        except (ZoneInfoNotFoundError, TypeError, ValueError):
            raise APIError("invalid_timezone", "Provide an IANA time zone.") from None


@endpoint(["GET", "POST"])
def related_list(request, pk, kind):
    app = service.private_application(request.user, pk)
    model, fields = related_config(kind)
    if request.method == "GET":
        return paginate(
            model.objects.filter(application=app).order_by("pk"),
            request,
            lambda row: model_data(row, ["id"] + fields),
        )
    data = body(request, fields)
    validate_related(kind, data)
    with transaction.atomic():
        lock_user(request.user)
        app = service.private_application(request.user, pk, lock=True)
        item = apply_fields(model(application=app), data, fields)
        service.event(app, kind + "_created", payload={"id": item.pk})
    return model_data(item, ["id"] + fields)


@endpoint(["PATCH", "DELETE"])
def related_detail(request, pk, kind, item_id):
    model, fields = related_config(kind)
    data = body(request, fields if request.method == "PATCH" else [])
    validate_related(kind, data)
    with transaction.atomic():
        lock_user(request.user)
        app = service.private_application(request.user, pk, lock=True)
        item = model.objects.get(pk=item_id, application=app)
        if request.method == "DELETE":
            item.delete()
            service.event(app, kind + "_deleted", payload={"id": item_id})
            return {"ok": True}
        apply_fields(item, data, fields)
        service.event(app, kind + "_updated", payload={"id": item.pk})
        return model_data(item, ["id"] + fields)


urlpatterns = [
    path("applications/", applications),
    path("applications/<int:pk>/", application_detail),
]
urlpatterns += [
    path("applications/<int:pk>/" + name + "/", view)
    for name, view in [
        ("prepare", prepare),
        ("revisions", revise),
        ("approve", approve),
        ("revoke", revoke),
        ("status", status),
        ("resolve", resolve),
    ]
]
for kind in ("tasks", "interviews"):
    urlpatterns += [
        path("applications/<int:pk>/" + kind + "/", related_list, {"kind": kind}),
        path(
            "applications/<int:pk>/" + kind + "/<int:item_id>/",
            related_detail,
            {"kind": kind},
        ),
    ]


@endpoint(["GET"])
def history(request, pk, kind):
    app = service.private_application(request.user, pk)
    if kind == "runs":
        return paginate(app.runs.order_by("-pk"), request, run_data)
    return paginate(
        app.events.order_by("-happened_at", "-pk"),
        request,
        lambda item: model_data(
            item,
            [
                "id",
                "run_id",
                "kind",
                "origin",
                "status_after",
                "happened_at",
                "payload",
            ],
        ),
    )


urlpatterns += [
    path("applications/<int:pk>/" + kind + "/", history, {"kind": kind})
    for kind in ["runs", "events"]
]
