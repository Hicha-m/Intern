"""Attempt history follows the same transaction and lease as query progress."""

from django.utils import timezone

from jobboard.models import DiscoveryAttempt
from jobboard.services.catalogue import _diagnostic_code


def begin_attempt(query, token):
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
