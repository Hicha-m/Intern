"""Credential evidence regressions; not the independent PRD evaluation corpus."""

from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import SimpleTestCase, TestCase, TransactionTestCase
from django.utils import timezone

from jobboard.models import (
    Offer,
    QualificationEvidence,
    QualificationExtraction,
    SourceRevision,
)
from jobboard.services.qualification_requirements import (
    current_qualification_evidence,
    extract_qualifications,
    extract_revision_qualifications,
)
from jobboard.services.requirement_text import source_sentences
from jobboard.tests import test_engine_quality as fixtures


class QualificationRuleTests(SimpleTestCase):
    def labels(self, text):
        return {
            (row["kind"], row["code"], row["qualification"])
            for row in extract_qualifications(text)
        }

    def test_degrees_are_named_without_equivalence_inference(self):
        for text, code, modality in [
            ("Bac+5 requis.", "bac+5", "required"),
            ("Bachelor's degree required.", "bachelor", "required"),
            ("Ph.D. required.", "phd", "required"),
            ("M.Sc. preferred.", "msc", "preferred"),
            ("Licence professionnelle souhaitée.", "licence", "preferred"),
        ]:
            with self.subTest(text=text):
                self.assertEqual(self.labels(text), {("education", code, modality)})

    def test_named_certificates_are_not_cloud_technologies(self):
        self.assertEqual(self.labels("AWS and Azure required."), set())
        self.assertEqual(
            self.labels("Visit https://example.test/CISSP and https://bts.example."),
            set(),
        )
        self.assertEqual(
            self.labels("AWS Certified Solutions Architect - Associate required."),
            {("certification", "aws-solutions-architect-associate", "required")},
        )
        self.assertEqual(
            self.labels("CompTIA Security+ preferred."),
            {("certification", "comptia-security-plus", "preferred")},
        )
        self.assertEqual(
            self.labels("CISSP non requise."), {("certification", "cissp", "negated")}
        )
        self.assertEqual(
            self.labels("OSCP is not mandatory."),
            {("certification", "oscp", "negated")},
        )

    def test_no_degree_and_alternatives_do_not_create_global_eligibility(self):
        result = list(extract_qualifications("No degree required; CISSP preferred."))
        self.assertIn(
            ("education", "no-degree-required", "not_required"),
            {(row["kind"], row["code"], row["qualification"]) for row in result},
        )
        alternatives = list(
            extract_qualifications("Bachelor's degree or Master's degree required.")
        )
        self.assertEqual(len(alternatives), 2)
        self.assertTrue(all(row["alternative"] for row in alternatives))
        self.assertEqual(
            self.labels("You must master Python. Software licence required."), set()
        )

    def test_language_groups_reuse_existing_alternatives_and_level_text(self):
        result = list(
            extract_qualifications("English or French required. German B2 preferred.")
        )
        alternative = next(row for row in result if row["code"] == "en|fr")
        self.assertTrue(alternative["alternative"])
        self.assertEqual(alternative["value"]["operator"], "any")
        german = next(row for row in result if row["code"] == "de")
        self.assertEqual(german["qualification"], "preferred")
        self.assertEqual(german["value"]["level_text"], "B2")

    def test_literal_html_offsets_and_company_hidden_text_exclusions(self):
        text = "<script>\nCISSP required\n</script><h2>About us</h2><p>English required.</p><h2>Requirements</h2><p><b>CISM</b> required.</p>"
        result = list(extract_qualifications(text))
        self.assertEqual({row["code"] for row in result}, {"cism"})
        for row in result:
            self.assertEqual(text[row["start"] : row["end"]], row["excerpt"])
        self.assertEqual(
            list(source_sentences("Ph\ue000D required."))[0]["visible"],
            "Ph\ue000D required.",
        )


class PersistedQualificationTests(TestCase):
    def setUp(self):
        fixtures.PersistedQualityTests.setUp(self)

    def test_replay_current_revision_and_language_conflicts_keep_history(self):
        first = SourceRevision.objects.create(
            source=self.source,
            raw_hash="8" * 64,
            semantic_hash="8" * 64,
            payload={
                "description": "English required. English not required. Bachelor degree required."
            },
        )
        extraction = extract_revision_qualifications(first)
        self.assertEqual(extract_revision_qualifications(first).pk, extraction.pk)
        self.assertEqual(
            extraction.language_summary["description"]["language_conflicts"]["value"],
            ["en"],
        )
        second = SourceRevision.objects.create(
            source=self.source,
            raw_hash="9" * 64,
            semantic_hash="9" * 64,
            payload={"description": "CISSP preferred."},
        )
        extract_revision_qualifications(second)
        self.source.content_hash = second.raw_hash
        self.source.last_checked_at = timezone.now()
        self.source.save()
        self.assertEqual(
            current_qualification_evidence(Offer.objects.filter(pk=self.offer.pk))
            .get()
            .code,
            "cissp",
        )
        self.assertTrue(extraction.evidence.filter(kind="education").exists())
        self.assertIsNone(extraction.evidence.first().confidence)
        self.source.source_status = "closed"
        self.source.save()
        self.assertFalse(current_qualification_evidence(Offer.objects.all()).exists())

    def test_empty_unsupported_and_oversized_fields_are_not_invented_requirements(self):
        for index, payload, status in [
            ("1", {}, "no_description"),
            ("2", {"description": "Build applications."}, "processed"),
            ("3", {"description": "x" * 200001}, "too_large"),
        ]:
            revision = SourceRevision.objects.create(
                source=self.source,
                raw_hash=index * 64,
                semantic_hash=index * 64,
                payload=payload,
            )
            self.assertEqual(extract_revision_qualifications(revision).status, status)
        self.assertFalse(QualificationEvidence.objects.exists())

    def test_database_rejects_an_unknown_kind(self):
        extraction = extract_revision_qualifications(self.revision)
        with self.assertRaises(IntegrityError), transaction.atomic():
            QualificationEvidence.objects.create(
                extraction=extraction,
                kind="unknown",
                code="bad",
                qualification="required",
                json_path="description",
                start=0,
                end=1,
                ordinal=0,
                excerpt="x",
            )


class QualificationMigrationTests(TransactionTestCase):
    def migrate(self, name):
        executor = MigrationExecutor(connection)
        targets = [("jobboard", name)]
        executor.migrate(targets)
        return executor.loader.project_state(targets).apps

    def tearDown(self):
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
        super().tearDown()

    def test_additive_tables_and_guarded_return_preserve_revisions(self):
        self.migrate("0041_experience_evidence")
        self.migrate("0042_qualification_evidence")
        fixtures.PersistedQualityTests.setUp(self)
        extraction = extract_revision_qualifications(self.revision)
        with self.assertRaisesMessage(
            RuntimeError, "Cannot discard qualification evidence"
        ):
            self.migrate("0041_experience_evidence")
        self.assertTrue(
            QualificationExtraction.objects.filter(pk=extraction.pk).exists()
        )
        QualificationExtraction.objects.all().delete()  # Explicit test-only cleanup.
        restored = self.migrate("0041_experience_evidence")
        self.assertTrue(
            restored.get_model("jobboard", "SourceRevision")
            .objects.filter(pk=self.revision.pk)
            .exists()
        )
