"""Collection completeness must be supported by diagnostics, never assumed."""

from datetime import timedelta
from unittest.mock import patch

from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase
from django.utils import timezone

from jobboard import models as m
from jobboard.integrations.greenhouse_catalogue import CatalogueImportError
from jobboard.integrations.public_catalogue import CatalogueSnapshot, _posting, digest
from jobboard.services.catalogue import import_board


class CollectionOutcomeTests(TestCase):
    def setUp(self):
        company = m.Company.objects.create(name="Outcome fixture")
        self.board = m.SourceBoard.objects.create(
            company=company, provider="ashby", board_key="outcomes"
        )
        self.row = _posting(
            {"title": "Backend Engineer"},
            "1",
            "Backend Engineer",
            "Build APIs.",
            "https://example.test/1",
            "https://example.test/1",
            ["Paris, France"],
        )

    def collect(self, snapshot):
        with patch(
            "jobboard.services.catalogue.fetch_normalized", return_value=snapshot
        ):
            return import_board(self.board.pk)

    def test_errors_override_complete_and_never_confirm_absence(self):
        self.collect(CatalogueSnapshot([self.row]))
        source = self.board.sources.get()
        ago = timezone.now() - timedelta(hours=8)
        m.SourceObservation.objects.update_or_create(
            source=source, defaults={"missing_count": 2, "missing_since": ago}
        )
        m.BoardSchedule.objects.filter(board=self.board).update(
            quarantine_hash=digest([]), quarantine_since=ago
        )
        run = self.collect(
            CatalogueSnapshot(complete=True, errors=[{"code": "detail_failed"}])
        )
        source.refresh_from_db()
        self.assertEqual(source.source_status, "active")
        self.assertEqual(source.observation.missing_count, 2)
        self.assertFalse(run.is_full_snapshot)
        self.assertEqual(run.outcome, "partial")

    def test_explicit_success_empty_and_failed_results(self):
        run = self.collect(CatalogueSnapshot([self.row]))
        self.assertEqual(run.outcome, "success")
        empty = m.SourceBoard.objects.create(
            company=self.board.company, provider="ashby", board_key="empty"
        )
        with patch(
            "jobboard.services.catalogue.fetch_normalized",
            return_value=CatalogueSnapshot(),
        ):
            self.assertEqual(import_board(empty.pk).outcome, "empty_confirmed")
        with patch(
            "jobboard.services.catalogue.fetch_normalized",
            side_effect=CatalogueImportError("upstream_rate_limited"),
        ):
            with self.assertRaises(CatalogueImportError):
                import_board(self.board.pk)
        failed = self.board.imports.latest("pk")
        self.assertEqual(failed.outcome, "failed")
        self.assertEqual(failed.error_code, "upstream_rate_limited")
        self.assertIsNotNone(failed.finished_at)

    def test_quarantined_empty_is_partial_not_confirmed(self):
        self.collect(CatalogueSnapshot([self.row]))
        run = self.collect(CatalogueSnapshot())
        self.assertEqual(run.outcome, "partial")
        self.assertEqual(run.error_code, "snapshot_quarantined")
        self.assertEqual(self.board.sources.get().source_status, "active")

    def test_diagnostics_are_bounded_and_drop_untrusted_text(self):
        run = self.collect(
            CatalogueSnapshot(
                [self.row],
                errors=[
                    {
                        "code": "detail_failed",
                        "external_id": "https://secret:test@example.test",
                        "message": "private raw text",
                        "token": "secret",
                        "query": "private query",
                    }
                ],
            )
        )
        self.assertEqual(run.diagnostics, [{"code": "detail_failed"}])
        self.assertEqual(run.outcome, "partial")

    def test_diagnostics_are_capped_and_error_codes_cannot_contain_urls(self):
        run = self.collect(
            CatalogueSnapshot(errors=[{"code": "https://secret.test"}] * 700)
        )
        self.assertEqual(len(run.diagnostics), 500)
        self.assertEqual(run.diagnostics[0], {"code": "invalid_diagnostic"})
        self.assertEqual(run.outcome, "partial")
        with patch(
            "jobboard.services.catalogue.fetch_normalized",
            side_effect=CatalogueImportError("https://secret.test"),
        ):
            with self.assertRaises(CatalogueImportError):
                import_board(self.board.pk)
        self.assertEqual(
            self.board.imports.latest("pk").error_code, "invalid_diagnostic"
        )


class CollectionOutcomeMigrationTests(TransactionTestCase):
    old_target = [("jobboard", "0036_recruiter_employment_dimensions")]
    new_target = [("jobboard", "0037_collection_outcome")]

    def migrate(self, target):
        executor = MigrationExecutor(connection)
        executor.migrate(target)
        return executor.loader.project_state(target).apps

    def tearDown(self):
        self.migrate(MigrationExecutor(connection).loader.graph.leaf_nodes())
        super().tearDown()

    def test_additive_upgrade_old_writer_and_guarded_rollback(self):
        old = self.migrate(self.old_target)
        company = old.get_model("jobboard", "Company").objects.create(
            name="Migration outcome"
        )
        board = old.get_model("jobboard", "SourceBoard").objects.create(
            company_id=company.pk, provider="ashby", board_key="migration-outcome"
        )
        LegacyRun = old.get_model("jobboard", "ImportRun")
        original = LegacyRun.objects.create(
            board_id=board.pk, status="succeeded", seen_count=3
        )
        new = self.migrate(self.new_target)
        Run = new.get_model("jobboard", "ImportRun")
        self.assertEqual(Run.objects.get(pk=original.pk).outcome, "unknown")
        old_write = LegacyRun.objects.create(board_id=board.pk)
        self.assertEqual(Run.objects.get(pk=old_write.pk).outcome, "unknown")
        with self.assertRaises(IntegrityError), transaction.atomic():
            Run.objects.filter(pk=original.pk).update(outcome="invented")
        Run.objects.filter(pk=original.pk).update(outcome="partial")
        with self.assertRaisesMessage(
            RuntimeError, "Cannot discard recorded collection outcomes"
        ):
            self.migrate(self.old_target)
        self.assertEqual(Run.objects.get(pk=original.pk).outcome, "partial")
        Run.objects.filter(pk=original.pk).update(outcome="unknown")
        restored = self.migrate(self.old_target)
        retained = restored.get_model("jobboard", "ImportRun").objects.get(
            pk=original.pk
        )
        self.assertEqual(retained.seen_count, 3)
        self.assertEqual(retained.status, "succeeded")
