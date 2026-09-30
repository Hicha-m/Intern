"""Atomic catalogue reconciliation; network I/O runs before taking board locks."""

import hashlib

from django.db import transaction
from django.utils import timezone

from jobboard.integrations.greenhouse_catalogue import (
    CatalogueImportError,
    fetch_snapshot,
    normalize_snapshot,
)
from jobboard.models import ImportRun, Location, Offer, OfferSource, SourceBoard


def import_board(board_id):
    board = SourceBoard.objects.get(pk=board_id)
    if (
        not board.enabled
        or board.provider != "greenhouse"
        or board.instance != "global"
        or not board.company_id
    ):
        raise CatalogueImportError("board_not_configured")
    run = ImportRun.objects.create(board=board)
    try:
        snapshot = normalize_snapshot(fetch_snapshot(board.board_key))
        with transaction.atomic():
            locked = SourceBoard.objects.select_for_update().get(pk=board.pk)
            if not locked.enabled or (
                locked.board_key,
                locked.provider,
                locked.company_id,
                locked.instance,
            ) != (board.board_key, board.provider, board.company_id, board.instance):
                raise CatalogueImportError("board_changed")
            if locked.last_success_at and locked.last_success_at >= run.started_at:
                raise CatalogueImportError("superseded_snapshot")
            now = timezone.now()
            seen = []
            for job in snapshot:
                source = OfferSource.objects.filter(
                    board=locked, external_id=job["external_id"]
                ).first()
                if source:
                    offer = Offer.objects.select_for_update().get(pk=source.offer_id)
                    # Curated hidden offers must stay hidden across imports.
                    offer.title, offer.description = job["title"], job["description"]
                    if offer.status != "hidden":
                        offer.status = "open"
                    offer.save(
                        update_fields=["title", "description", "status", "updated_at"]
                    )
                else:
                    offer = Offer.objects.create(
                        company=locked.company,
                        title=job["title"],
                        description=job["description"],
                    )
                if job["location"]:
                    key = (
                        "greenhouse:"
                        + hashlib.sha256(
                            job["location"].casefold().encode()
                        ).hexdigest()
                    )
                    location, _ = Location.objects.get_or_create(
                        canonical_key=key, defaults={"name": job["location"]}
                    )
                    # For merged offers, other sources may supply additional locations.
                    if source and offer.sources.exclude(board=locked).exists():
                        offer.locations.add(location)
                    else:
                        offer.locations.set([location])
                elif not source or not offer.sources.exclude(board=locked).exists():
                    offer.locations.clear()
                source, _ = OfferSource.objects.update_or_create(
                    board=locked,
                    external_id=job["external_id"],
                    defaults={
                        "offer": offer,
                        "origin_url": job["url"],
                        "apply_url": job["url"],
                        "source_status": "active",
                        "first_seen_at": source.first_seen_at if source else now,
                        "last_seen_at": now,
                        "last_checked_at": now,
                        "last_seen_run": run,
                        "content_hash": job["hash"],
                        "raw_payload": job["raw"],
                    },
                )
                seen.append(source.pk)
            missing = locked.sources.exclude(pk__in=seen)
            affected = list(missing.values_list("offer_id", flat=True))
            missing.update(source_status="missing", last_checked_at=now)
            Offer.objects.filter(pk__in=affected, status="open").exclude(
                sources__source_status="active"
            ).update(status="closed", updated_at=now)
            locked.last_success_at = now
            locked.save(update_fields=["last_success_at"])
            run.status, run.finished_at, run.is_full_snapshot, run.seen_count = (
                "succeeded",
                now,
                True,
                len(snapshot),
            )
            run.save(
                update_fields=[
                    "status",
                    "finished_at",
                    "is_full_snapshot",
                    "seen_count",
                ]
            )
        return run
    except Exception as exc:
        ImportRun.objects.filter(pk=run.pk).update(
            status="failed",
            finished_at=timezone.now(),
            error_code=exc.code
            if isinstance(exc, CatalogueImportError)
            else "import_failed",
        )
        raise
