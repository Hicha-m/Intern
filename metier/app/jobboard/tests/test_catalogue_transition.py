"""Historical projection replay preserves explicit employment data and private links."""

from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase
from django.utils import timezone

from jobboard import models as m
from jobboard.services.engine_quality import enrich_offer, published_offers


class CatalogueTransitionTests(TestCase):
    def setUp(self):
        self.company = m.Company.objects.create(name="Historical IT")
        self.location = m.Location.objects.create(
            name="Paris, France", country_code="FR", canonical_key="transition-fr"
        )
        self.board = m.SourceBoard.objects.create(
            company=self.company, provider="greenhouse", board_key="transition"
        )
        self.offers = []
        for index, (contract, seniority, title) in enumerate([
            ("internship", "entry", "Backend internship"),
            ("employment", "unknown", "Senior Backend Engineer"),
            ("unknown", "unknown", "Junior Backend Developer"),
            ("permanent", "senior", "Backend Engineer"),
            ("fixed_term", "mid", "Data Engineer"),
            ("unknown", "unknown", "Marketing internship"),
        ]):
            offer = m.Offer.objects.create(
                company=self.company, title=title, contract_type=contract,
                seniority=seniority, description="Duration: 6 months. Build our product.",
            )
            offer.locations.add(self.location)
            source = m.OfferSource.objects.create(
                offer=offer, board=self.board, external_id=str(index),
                origin_url=f"https://example.test/jobs/{index}",
                apply_url=f"https://example.test/jobs/{index}/apply",
                content_hash=str(index) * 64, last_checked_at=timezone.now(),
            )
            m.SourceRevision.objects.create(
                source=source, raw_hash=str(index) * 64, semantic_hash="a" * 64,
                payload={"title": title, "description": offer.description},
            )
            m.OfferEnrichment.objects.create(
                offer=offer, extractor_version="historical-internship", content_version=2,
                classification="confirmed", europe_status="in_scope",
            )
            self.offers.append(offer)
        self.user = get_user_model().objects.create_user(username="historical-owner")
        m.SavedOffer.objects.create(user=self.user, offer=self.offers[1])
        m.Application.objects.create(
            user=self.user, offer=self.offers[1], source=self.offers[1].sources.get()
        )

    def replay(self, **options):
        output = StringIO()
        call_command("re_enrich_catalogue", stdout=output, **options)
        return output.getvalue()

    def snapshot(self):
        return {
            model.__name__: [
                {key: value for key, value in row.items() if key not in {
                    "job_subdomain_id", "taxonomy_status", "taxonomy_confidence",
                    "taxonomy_evidence", "taxonomy_version", "taxonomy_input_hash",
                }}
                for row in model.objects.order_by("pk").values()
            ]
            for model in [m.Offer, m.OfferSource, m.SourceRevision, m.SourceBoard,
                          m.Application, m.SavedOffer]
        }

    def test_batches_preserve_values_links_and_evidence_and_are_idempotent(self):
        before = self.snapshot()
        first = self.replay(limit=2)
        self.assertIn(f"Next batch: --after-id {self.offers[1].pk}", first)
        self.assertEqual(m.OfferEnrichment.objects.filter(content_version=3).count(), 2)
        self.replay(all=True, limit=2, after_id=self.offers[1].pk,
                    through_id=self.offers[-1].pk)
        self.assertEqual(self.snapshot(), before)
        eligible = published_offers(m.Offer.objects.all())
        self.assertSetEqual(set(eligible.values_list("pk", flat=True)),
                            {offer.pk for offer in self.offers[:-1]})
        self.offers[0].refresh_from_db()
        fact = self.offers[0].enrichment.facts["duration"]
        self.assertEqual(fact["source_revision_id"], self.offers[0].sources.get().revisions.get().pk)
        versions = list(m.OfferEnrichment.objects.order_by("pk").values())
        self.replay(all=True, limit=1)
        self.assertEqual(list(m.OfferEnrichment.objects.order_by("pk").values()), versions)
        self.assertEqual(self.snapshot(), before)

    def test_failure_reports_last_committed_id_and_hides_exception_payload(self):
        first, failed = self.offers[:2]

        def fail(offer):
            if offer.pk == failed.pk:
                raise ValueError("private source text must never reach the log")
            return enrich_offer(offer)

        with patch("jobboard.management.commands.re_enrich_catalogue.enrich_offer", side_effect=fail):
            with self.assertRaises(CommandError) as caught:
                self.replay(all=True, limit=3)
        message = str(caught.exception)
        self.assertIn(f"--after-id {first.pk} --through-id {self.offers[-1].pk}", message)
        self.assertNotIn("private", message)
        first.refresh_from_db()
        failed.refresh_from_db()
        self.assertEqual(first.enrichment.content_version, 3)
        self.assertEqual(failed.enrichment.content_version, 2)
        self.replay(all=True, after_id=first.pk, through_id=self.offers[-1].pk)
        self.assertEqual(m.OfferEnrichment.objects.filter(content_version=3).count(), 6)

    def test_retained_upper_bound_excludes_new_offers(self):
        upper = self.offers[-1].pk
        self.replay(limit=2)
        new = m.Offer.objects.create(company=self.company, title="New Backend Developer")
        self.replay(all=True, after_id=self.offers[1].pk, through_id=upper)
        self.assertFalse(m.OfferEnrichment.objects.filter(offer=new).exists())
        self.assertEqual(m.OfferEnrichment.objects.filter(content_version=3).count(), 6)

    def test_invalid_resume_bounds_fail_without_writes(self):
        for options in [{"after_id": -1}, {"after_id": 3, "through_id": 2}]:
            with self.subTest(options=options), self.assertRaises(CommandError):
                self.replay(**options)
        self.assertEqual(m.OfferEnrichment.objects.filter(content_version=2).count(), 6)
