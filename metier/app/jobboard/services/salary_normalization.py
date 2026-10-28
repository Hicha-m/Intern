"""Normalize retained structured salary evidence without annualizing or guessing."""

import re
from decimal import Decimal, InvalidOperation

from django.db import transaction

from jobboard.models import CompensationBand, OfferSource

VERSION = "salary-1"
PERIODS = {
    "HOUR": "hour",
    "DAY": "day",
    "WEEK": "week",
    "MONTH": "month",
    "YEAR": "year",
}


def normalize_salary(payload):
    envelope = payload.get("compensation")
    if not isinstance(envelope, dict):
        return {"status": "missing", "reason": "no_structured_salary"}
    source = envelope.get("source")
    site = payload.get("site")
    if site != "indeed" or not isinstance(source, dict):
        return {"status": "unknown", "reason": "publication_not_proven"}
    base = source.get("baseSalary")
    status = "published"
    if not base:
        estimated = source.get("estimated")
        if isinstance(estimated, dict) and estimated.get("baseSalary"):
            base, status = estimated["baseSalary"], "estimated"
        else:
            return {"status": "missing", "reason": "no_salary_bounds"}
    if not isinstance(base, dict) or not isinstance(base.get("range"), dict):
        return {"status": "invalid", "reason": "invalid_range"}
    bounds = []
    for name in ("min", "max"):
        raw = base["range"].get(name)
        if raw is None:
            bounds.append(None)
            continue
        try:
            if isinstance(raw, bool):
                raise ValueError()
            value = Decimal(str(raw))
            if (
                not value.is_finite()
                or value < 0
                or value >= Decimal("100000000000000")
                or value != value.quantize(Decimal("0.01"))
            ):
                raise ValueError()
            bounds.append(str(value))
        except (InvalidOperation, ValueError):
            return {"status": "invalid", "reason": "invalid_amount"}
    if not any(value is not None for value in bounds):
        return {"status": "missing", "reason": "no_salary_bounds"}
    if all(value is not None for value in bounds) and Decimal(bounds[0]) > Decimal(
        bounds[1]
    ):
        return {"status": "invalid", "reason": "reversed_range"}
    currency = (
        source.get("currencyCode")
        if status == "published"
        else source["estimated"].get("currencyCode")
    )
    currency = (
        currency
        if isinstance(currency, str) and re.fullmatch(r"[A-Z]{3}", currency)
        else None
    )
    unit = base.get("unitOfWork")
    period = PERIODS.get(unit.upper()) if isinstance(unit, str) else None
    return {
        "status": status,
        "minimum": bounds[0],
        "maximum": bounds[1],
        "currency": currency,
        "period": period,
        "gross_net": "unknown",
        "comparable": bool(currency and period),
        "json_path": "compensation.source."
        + ("baseSalary" if status == "published" else "estimated.baseSalary"),
    }


@transaction.atomic
def sync_salary(source, revision):
    source = OfferSource.objects.select_for_update().get(pk=source.pk)
    if revision.source_id != source.pk:
        raise ValueError("Salary revision belongs to another source")
    projection = {
        **normalize_salary(revision.payload),
        "version": VERSION,
        "source_revision_id": revision.pk,
    }
    managed = CompensationBand.objects.filter(source=source, extraction_version=VERSION)
    if projection["status"] == "published" and projection["comparable"]:
        values = {
            field: projection[field]
            for field in ("minimum", "maximum", "currency", "period", "gross_net")
        }
        managed.update_or_create(
            defaults={
                **values,
                "offer_id": source.offer_id,
                "source_revision": revision,
            },
            source=source,
            extraction_version=VERSION,
        )
    else:
        # Only replace this extractor's current projection; original revisions and
        # all legacy/manual bands remain untouched.
        managed.delete()
    OfferSource.objects.filter(pk=source.pk).update(salary_projection=projection)
    return projection
