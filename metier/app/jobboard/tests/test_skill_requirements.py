"""Adversarial rule regressions; not the independent 200-advert evaluation corpus."""

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import SimpleTestCase, TestCase, TransactionTestCase

from jobboard.models import (
    OfferSkill,
    Skill,
    SkillEvidence,
    SkillExtraction,
    SourceRevision,
)
from jobboard.services.skill_requirements import (
    extract_mentions,
    extract_revision_skills,
)
from jobboard.tests import test_engine_quality as quality_fixtures


class SkillRuleTests(SimpleTestCase):
    def labels(self, text):
        return {
            (item["skill_slug"], item["qualification"])
            for item in extract_mentions(text)
        }

    def test_required_preferred_unspecified_and_negated_fr_en(self):
        for text, expected in [
            ("Python required.", {("python", "required")}),
            ("SQL obligatoire.", {("sql", "required")}),
            ("Docker souhaité.", {("docker", "preferred")}),
            ("Kubernetes is a bonus.", {("kubernetes", "preferred")}),
            ("We use Rust.", {("rust", "unspecified")}),
            ("Python is not required.", {("python", "negated")}),
            ("No experience with Java required.", {("java", "negated")}),
            ("Aucune expérience avec Python exigée.", {("python", "negated")}),
        ]:
            with self.subTest(text=text):
                self.assertEqual(self.labels(text), expected)

    def test_mixed_cues_are_uncertain_and_alternatives_not_mandatory_pairs(self):
        self.assertEqual(
            self.labels("Python required, Docker preferred."),
            {("python", "unspecified"), ("docker", "unspecified")},
        )
        self.assertEqual(
            self.labels("Python required but Python is not required."),
            {("python", "unspecified")},
        )
        result = list(extract_mentions("Python or Java required."))
        self.assertEqual(len(result), 2)
        self.assertTrue(all(row["alternative"] for row in result))

    def test_technology_boundaries_synonyms_and_false_friends(self):
        self.assertEqual(
            self.labels("C++ and C# required. Node.js preferred. Postgres and K8s."),
            {
                ("cpp", "required"),
                ("csharp", "required"),
                ("nodejs", "preferred"),
                ("postgresql", "unspecified"),
                ("kubernetes", "unspecified"),
            },
        )
        self.assertEqual(
            self.labels("We react to changes. Go to our website. JavaScripted styles."),
            set(),
        )

    def test_excerpts_are_literal_even_with_html_and_hidden_text_is_ignored(self):
        text = "<h2>Requirements</h2><li><b>Python</b> required.</li><script>\nDocker required\n</script><h2>About us</h2><p>Our company uses Java.</p>"
        result = list(extract_mentions(text))
        self.assertEqual({row["skill_slug"] for row in result}, {"python"})
        for row in result:
            self.assertEqual(text[row["start"] : row["end"]], row["excerpt"])


class PersistedSkillTests(TestCase):
    def setUp(self):
        # Reuse only the existing source fixture setup, not its tests.
        quality_fixtures.PersistedQualityTests.setUp(self)

    def test_replay_revision_changes_and_legacy_summary_are_independent(self):
        legacy = Skill.objects.create(slug="python", name="Python")
        summary = OfferSkill.objects.create(
            offer=self.offer, skill=legacy, importance="preferred"
        )
        first = SourceRevision.objects.create(
            source=self.source,
            raw_hash="c" * 64,
            semantic_hash="c" * 64,
            payload={"description": "Python required. Docker is a bonus."},
        )
        run = extract_revision_skills(first)
        self.assertEqual(run.status, "processed")
        self.assertEqual(run.evidence.count(), 2)
        self.assertEqual(extract_revision_skills(first).pk, run.pk)
        self.assertEqual(SkillExtraction.objects.count(), 1)
        second = SourceRevision.objects.create(
            source=self.source,
            raw_hash="d" * 64,
            semantic_hash="d" * 64,
            payload={"description": "Python is not required."},
        )
        extract_revision_skills(second)
        self.assertEqual(run.evidence.get(skill=legacy).qualification, "required")
        self.assertEqual(
            SkillEvidence.objects.get(extraction__revision=second).qualification,
            "negated",
        )
        summary.refresh_from_db()
        self.assertEqual(summary.importance, "preferred")
        self.assertIsNone(run.evidence.first().confidence)

    def test_known_field_paths_skip_company_data_and_cover_lever_lists(self):
        revision = SourceRevision.objects.create(
            source=self.source,
            raw_hash="e" * 64,
            semantic_hash="e" * 64,
            payload={
                "company": {"description": "Python required."},
                "descriptionPlain": "Build applications.",
                "lists": [{"text": "Preferred skills", "content": "<li>Docker</li>"}],
            },
        )
        run = extract_revision_skills(revision)
        evidence = run.evidence.get()
        self.assertEqual(evidence.skill.slug, "docker")
        self.assertEqual(evidence.qualification, "preferred")
        self.assertEqual(evidence.json_path, "lists.0.content")
        self.assertEqual(evidence.excerpt, "<li>Docker</li>")

    def test_existing_skill_name_is_reused_even_with_an_older_slug(self):
        skill = Skill.objects.create(name="Node.js", slug="node-js")
        revision = SourceRevision.objects.create(
            source=self.source,
            raw_hash="f" * 64,
            semantic_hash="f" * 64,
            payload={"description": "Node.js required."},
        )
        evidence = extract_revision_skills(revision).evidence.get()
        self.assertEqual(evidence.skill_id, skill.pk)
        self.assertFalse(Skill.objects.filter(slug="nodejs").exists())

    def test_absent_and_oversized_descriptions_have_explicit_coverage(self):
        for index, payload, expected in [
            ("1", {}, "no_description"),
            ("2", {"description": "x" * 200001}, "too_large"),
            ("3", {"description": "Join our team."}, "processed"),
        ]:
            revision = SourceRevision.objects.create(
                source=self.source,
                raw_hash=index * 64,
                semantic_hash=index * 64,
                payload=payload,
            )
            self.assertEqual(extract_revision_skills(revision).status, expected)
        self.assertFalse(SkillEvidence.objects.exists())

    def test_current_evidence_excludes_previous_revisions_and_inactive_sources(self):
        from jobboard.models import Offer
        from jobboard.services.skill_requirements import current_skill_evidence

        first = SourceRevision.objects.create(
            source=self.source,
            raw_hash="8" * 64,
            semantic_hash="8" * 64,
            payload={"description": "Python required."},
        )
        second = SourceRevision.objects.create(
            source=self.source,
            raw_hash="9" * 64,
            semantic_hash="9" * 64,
            payload={"description": "Docker preferred."},
        )
        extract_revision_skills(first)
        extract_revision_skills(second)
        from datetime import timedelta

        from django.utils import timezone
        self.source.last_checked_at = timezone.now()
        self.source.content_hash = second.raw_hash
        self.source.save()
        self.assertEqual(
            list(
                current_skill_evidence(
                    Offer.objects.filter(pk=self.offer.pk)
                ).values_list("skill__slug", flat=True)
            ),
            ["docker"],
        )
        self.assertFalse(current_skill_evidence(Offer.objects.none()).exists())
        self.source.last_checked_at = timezone.now() - timedelta(days=3)
        self.source.save()
        self.assertFalse(current_skill_evidence(Offer.objects.all()).exists())
        self.source.source_status = "closed"
        self.source.save()
        self.assertFalse(current_skill_evidence(Offer.objects.all()).exists())
        self.assertEqual(SkillEvidence.objects.count(), 2)


class SkillMigrationTests(TransactionTestCase):
    def migrate(self, name):
        executor = MigrationExecutor(connection)
        targets = [("jobboard", name)]
        executor.migrate(targets)
        return executor.loader.project_state(targets).apps

    def tearDown(self):
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
        super().tearDown()

    def test_additive_schema_preserves_skills_on_roundtrip(self):
        old = self.migrate("0039_salary_provenance")
        skill = old.get_model("jobboard", "Skill").objects.create(
            name="Legacy Python", slug="python"
        )
        new = self.migrate("0040_skill_evidence")
        self.assertEqual(new.get_model("jobboard", "SkillEvidence").objects.count(), 0)
        self.assertEqual(
            new.get_model("jobboard", "Skill").objects.get(pk=skill.pk).name,
            "Legacy Python",
        )
        restored = self.migrate("0039_salary_provenance")
        self.assertEqual(
            restored.get_model("jobboard", "Skill").objects.get(pk=skill.pk).name,
            "Legacy Python",
        )

    def test_rollback_refuses_to_discard_recorded_evidence(self):
        quality_fixtures.PersistedQualityTests.setUp(self)
        revision = SourceRevision.objects.create(
            source=self.source,
            raw_hash="7" * 64,
            semantic_hash="7" * 64,
            payload={"description": "Python required."},
        )
        extraction = extract_revision_skills(revision)
        with self.assertRaisesMessage(RuntimeError, "Cannot discard skill evidence"):
            self.migrate("0039_salary_provenance")
        self.assertEqual(
            SkillEvidence.objects.get(extraction=extraction).skill.slug, "python"
        )
        SkillExtraction.objects.all().delete()  # Explicit cleanup of fictitious evidence only.
        restored = self.migrate("0039_salary_provenance")
        self.assertEqual(
            restored.get_model("jobboard", "SourceRevision")
            .objects.get(pk=revision.pk)
            .raw_hash,
            "7" * 64,
        )
