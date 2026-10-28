"""Attempt history follows the same transaction and lease as query progress."""

from django.db.models import F
from django.utils import timezone

from jobboard.integrations.greenhouse_catalogue import CatalogueImportError
from jobboard.models import DiscoveryAttempt
from jobboard.services.catalogue import _diagnostic_code


def begin_attempt(query, token):
    # The caller holds the query row lock and has established claim eligibility.
    # A replacement claim is authoritative proof that an older worker lost ownership.
    DiscoveryAttempt.objects.filter(query=query, outcome="running").exclude(
        lease_token=token
    ).update(
        outcome="failed",
        finished_at=timezone.now(),
        error_code="lease_expired",
        cursor_after=F("cursor_before"),
        received_count=None,
        imported_count=None,
    )
    return DiscoveryAttempt.objects.create(
        query=query,
        lease_token=token,
        cursor_before=query.cursor,
        cursor_after=query.cursor,
        request={
            field: getattr(query, field)
            for field in ("provider", "country", "language", "domain", "term")
        },
    )


def finish_attempt(query, token, *, received=None, imported=None, more=False, error=""):
    attempt = DiscoveryAttempt.objects.get(query=query, lease_token=token)
    if error:
        outcome = "empty_uncertain" if error.endswith("empty_unconfirmed") else "failed"
    else:
        invalid = query.results.filter(
            last_seen_at__gte=attempt.started_at, status="invalid"
        ).exists()
        outcome = (
            "partial"
            if more or invalid
            else "success"
            if received
            else "empty_confirmed"
        )
    DiscoveryAttempt.objects.filter(pk=attempt.pk, outcome="running").update(
        finished_at=timezone.now(),
        outcome=outcome,
        cursor_after=attempt.cursor_before if error else query.cursor,
        received_count=received,
        imported_count=imported,
        error_code=_diagnostic_code(error) if error else "",
    )


def validate_lease(query, token):
    """Recheck after ingestion: an over-budget import must roll back its progress."""
    if (
        query.lease_token != token
        or not query.enabled
        or not query.lease_expires_at
        or query.lease_expires_at <= timezone.now()
    ):
        raise CatalogueImportError("lease_lost")
