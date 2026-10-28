"""Explicit IT occupation evidence for tests that exercise the public catalogue."""

from django.utils import timezone

from jobboard import models as m


def publishable(offer):
    # These API fixtures explicitly represent IT roles, even when a test uses an
    # arbitrary title for sorting/search. Taxonomy tests classify their own prose.
    if offer.job_subdomain_id is None:
        domain, _ = m.JobDomain.objects.get_or_create(
            slug="software-it", defaults={"name": "Informatique et systèmes"},
        )
        subdomain, _ = m.JobSubdomain.objects.get_or_create(
            slug="software-generalist", defaults={
                "name": "Développement logiciel généraliste", "domain": domain,
                "generalist": True,
            },
        )
        offer.job_subdomain = subdomain
        offer.taxonomy_status = "broad"
        offer.save(update_fields=["job_subdomain", "taxonomy_status"])
    m.OfferEnrichment.objects.get_or_create(
        offer=offer,
        defaults={
            "classification": "confirmed",
            "facts": {"job_scope": {"value": "in_scope"}},
            "europe_status": "in_scope",
            "country_codes": ["FR"],
        },
    )
    if not offer.sources.exists():
        board, _ = m.SourceBoard.objects.get_or_create(
            provider="greenhouse",
            instance="global",
            board_key="published-test",
            defaults={"company": offer.company},
        )
        m.OfferSource.objects.create(
            offer=offer,
            board=board,
            external_id=str(offer.pk),
            origin_url="https://example.com/job",
            apply_url="https://example.com/job",
            content_hash="a" * 64,
            last_checked_at=timezone.now(),
        )
    else:
        offer.sources.filter(last_checked_at__isnull=True).update(
            last_checked_at=timezone.now()
        )
    return offer
