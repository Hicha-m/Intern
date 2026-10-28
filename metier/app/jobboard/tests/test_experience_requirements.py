"""Adversarial experience regressions, separate from the unbuilt PRD evaluation set."""

from decimal import Decimal

from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import SimpleTestCase, TestCase, TransactionTestCase
from django.utils import timezone

from jobboard.models import (
    ExperienceEvidence,
    ExperienceExtraction,
    Offer,
    SourceRevision,
)
from jobboard.services.experience_requirements import (
    current_experience_evidence,
    extract_experience,
    extract_revision_experience,
)
from jobboard.tests import test_engine_quality as fixtures


class ExperienceRuleTests(SimpleTestCase):
    def fact(self, text):
        rows = list(extract_experience(text))
        self.assertEqual(len(rows), 1, text)
        return rows[0]

    def test_explicit_bounds_and_stated_values_fr_en(self):
        for text, comparison, low, high, stated, unit in [
            (
                "At least 2 years of experience required.",
                "minimum",
                "2",
                None,
                None,
                "year",
            ),
            ("3+ years experience preferred.", "minimum", "3", None, None, "year"),
            (
                "Au moins 1,5 ans d’expérience exigés.",
                "minimum",
                "1.5",
                None,
                None,
                "year",
            ),
            ("2 to 4 years experience required.", "range", "2", "4", None, "year"),
            ("Entre 2 et 4 ans d’expérience.", "range", "2", "4", None, "year"),
            ("Up to 2 years experience.", "maximum", None, "2", None, "year"),
            ("6 months experience preferred.", "stated", None, None, "6", "month"),
            ("3 years experience.", "stated", None, None, "3", "year"),
        ]:
            with self.subTest(text=text):
                row = self.fact(text)
                self.assertEqual(row["comparison"], comparison)
                for field, value in [
                    ("minimum", low),
                    ("maximum", high),
                    ("stated", stated),
                ]:
                    self.assertEqual(
                        row[field], Decimal(value) if value is not None else None
                    )
                self.assertEqual(row["unit"], unit)

    def test_no_experience_means_no_minimum_not_a_maximum_of_zero(self):
        for text in [
            "No experience required.",
            "Sans expérience.",
            "Aucune expérience requise.",
        ]:
            row = self.fact(text)
            self.assertEqual(row["minimum"], 0)
            self.assertIsNone(row["maximum"])
            self.assertEqual(row["qualification"], "not_required")

    def test_no_inference_from_junior_contract_duration_company_or_hidden_text(self):
        for text in [
            "Junior Backend Engineer.",
            "Internship duration: 6 months.",
            "Our company has 20 years of experience.",
            "<script>3 years experience required.</script>",
            "<h2>About us</h2><p>We have 10 years experience.</p>",
        ]:
            self.assertEqual(list(extract_experience(text)), [], text)

    def test_strict_bounds_negation_conflicts_and_alternatives_are_retained(self):
        self.assertFalse(self.fact("Less than 3 years experience.")["inclusive"])
        self.assertFalse(self.fact("More than 2 years experience.")["inclusive"])
        self.assertEqual(
            self.fact("3 years experience is not required.")["qualification"], "negated"
        )
        rows = list(
            extract_experience(
                "No experience required; at least 3 years experience required."
            )
        )
        self.assertEqual(len(rows), 2)
        self.assertEqual(
            {row["comparison"] for row in rows}, {"none_required", "minimum"}
        )
        alternatives = list(
            extract_experience("2 years Python or 3 years Java experience required.")
        )
        self.assertEqual(len(alternatives), 2)
        self.assertTrue(all(row["alternative"] for row in alternatives))
        self.assertEqual(list(extract_experience("5 to 2 years experience.")), [])

    def test_html_excerpts_and_offsets_are_literal(self):
        text = "<h2>Preferred skills</h2><p>6 months of <b>experience</b>.</p>"
        row = self.fact(text)
        self.assertEqual(row["qualification"], "preferred")
        self.assertEqual(text[row["start"] : row["end"]], row["excerpt"])


class PersistedExperienceTests(TestCase):
    def setUp(self):
        fixtures.PersistedQualityTests.setUp(self)

    def test_revisions_replay_and_current_selection_preserve_unknown_offer_dimensions(
        self,
    ):
        first = SourceRevision.objects.create(
            source=self.source,
            raw_hash="8" * 64,
            semantic_hash="8" * 64,
            payload={"description": "No experience required."},
        )
        extraction = extract_revision_experience(first)
        self.assertEqual(extract_revision_experience(first).pk, extraction.pk)
        second = SourceRevision.objects.create(
            source=self.source,
            raw_hash="9" * 64,
            semantic_hash="9" * 64,
            payload={"description": "At least 3 years experience required."},
        )
        extract_revision_experience(second)
        self.source.content_hash = second.raw_hash
        self.source.last_checked_at = timezone.now()
        self.source.save()
        evidence = current_experience_evidence(
            Offer.objects.filter(pk=self.offer.pk)
        ).get()
        self.assertEqual(evidence.minimum, 3)
        self.assertEqual(ExperienceEvidence.objects.count(), 2)
        self.assertEqual(ExperienceExtraction.objects.count(), 2)
        self.offer.refresh_from_db()
        self.assertIsNone(self.offer.experience_years_min)
        self.assertIsNone(self.offer.experience_years_max)
        self.source.source_status = "closed"
        self.source.save()
        self.assertFalse(current_experience_evidence(Offer.objects.all()).exists())

    def test_absence_and_no_description_are_separate_coverage_states(self):
        for index, payload, status in [
            ("1", {}, "no_description"),
            ("2", {"description": "Junior software role."}, "processed"),
            ("3", {"description": "x" * 200001}, "too_large"),
        ]:
            revision = SourceRevision.objects.create(
                source=self.source,
                raw_hash=index * 64,
                semantic_hash=index * 64,
                payload=payload,
            )
            self.assertEqual(extract_revision_experience(revision).status, status)
        self.assertFalse(ExperienceEvidence.objects.exists())

    def test_database_rejects_reversed_bounds(self):
        extraction = extract_revision_experience(self.revision)
        with self.assertRaises(IntegrityError), transaction.atomic():
            ExperienceEvidence.objects.create(
                extraction=extraction,
                qualification="required",
                comparison="range",
                minimum=5,
                maximum=2,
                unit="year",
                start=0,
                end=1,
                ordinal=0,
                json_path="description",
                excerpt="x",
            )


class ExperienceMigrationTests(TransactionTestCase):
    def migrate(self, name):
        executor = MigrationExecutor(connection)
        targets = [("jobboard", name)]
        executor.migrate(targets)
        return executor.loader.project_state(targets).apps

    def tearDown(self):
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
        super().tearDown()

    def test_additive_tables_and_guarded_rollback_preserve_revisions(self):
        self.migrate("0040_skill_evidence")
        self.migrate("0041_experience_evidence")
        fixtures.PersistedQualityTests.setUp(self)
        extraction = extract_revision_experience(self.revision)
        with self.assertRaisesMessage(
            RuntimeError, "Cannot discard experience evidence"
        ):
            self.migrate("0040_skill_evidence")
        self.assertTrue(ExperienceExtraction.objects.filter(pk=extraction.pk).exists())
        ExperienceExtraction.objects.all().delete()  # Explicit cleanup of test evidence.
        restored = self.migrate("0040_skill_evidence")
        self.assertTrue(
            restored.get_model("jobboard", "SourceRevision")
            .objects.filter(pk=self.revision.pk)
            .exists()
        )
