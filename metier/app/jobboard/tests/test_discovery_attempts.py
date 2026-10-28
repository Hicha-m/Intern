"""Attempt history covers every query runner, even without employer imports."""

from importlib import import_module
from types import SimpleNamespace
from unittest.mock import patch

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase
from django.utils import timezone

from jobboard.integrations.greenhouse_catalogue import CatalogueImportError
from jobboard.models import DiscoveryAttempt, DiscoveryQuery


class DiscoveryAttemptTests(TestCase):
    providers = ["jobspy", "eures", "wttj", "jobtech", "bundesagentur", "nav"]

    def query(self, name):
        return DiscoveryQuery.objects.create(
            provider="jobspy_indeed" if name == "jobspy" else name,
            country="FR",
            language="fr",
            term="software",
            cursor="5",
        )

    def page(self, records=(), more=False):
        return SimpleNamespace(
            records=list(records),
            next_cursor="6" if more else "",
            truncated=more,
            total=10,
            scanned=0,
            at_tail=not more,
        )

    def test_success_progress_and_counts_are_per_attempt(self):
        for name in self.providers:
            with self.subTest(provider=name):
                module = import_module(f"jobboard.services.{name}_collection")
                query = self.query(name)
                response = [{}] if name == "jobspy" else self.page([{}], True)
                with (
                    patch.object(module, "collect", return_value=response),
                    patch.object(module, "ingest", return_value=0),
                ):
                    module.run_queries(query_id=query.pk)
                attempt = query.attempts.get()
                self.assertEqual(attempt.outcome, "partial")
                self.assertEqual(attempt.received_count, 1)
                self.assertEqual(attempt.imported_count, 0)
                self.assertEqual(attempt.cursor_before, "5")
                self.assertEqual(attempt.request["provider"], query.provider)
                self.assertEqual(attempt.cursor_after, "6")
                self.assertIsNotNone(attempt.finished_at)

    def test_errors_retain_cursor_and_do_not_erase_prior_attempts(self):
        for name in self.providers:
            with self.subTest(provider=name):
                module = import_module(f"jobboard.services.{name}_collection")
                query = self.query(name)
                for code, expected in [
                    ("upstream_rate_limited", "failed"),
                    ("jobspy_empty_unconfirmed", "empty_uncertain"),
                ]:
                    DiscoveryQuery.objects.filter(pk=query.pk).update(
                        next_run_at=timezone.now()
                    )
                    with patch.object(
                        module, "collect", side_effect=CatalogueImportError(code)
                    ):
                        module.run_queries(query_id=query.pk)
                    attempt = query.attempts.latest("pk")
                    self.assertEqual(attempt.outcome, expected)
                    self.assertEqual(attempt.cursor_after, "5")
                    self.assertIsNone(attempt.received_count)
                self.assertEqual(query.attempts.count(), 2)

    def test_confirmed_empty_pages_are_retained_without_imports(self):
        for name in self.providers[1:]:
            with self.subTest(provider=name):
                module = import_module(f"jobboard.services.{name}_collection")
                query = self.query(name)
                with (
                    patch.object(module, "collect", return_value=self.page()),
                    patch.object(module, "ingest", return_value=0),
                ):
                    module.run_queries(query_id=query.pk)
                attempt = query.attempts.get()
                self.assertEqual(attempt.outcome, "empty_confirmed")
                self.assertEqual(attempt.received_count, 0)
                self.assertEqual(attempt.cursor_after, "")

    def test_import_rollback_keeps_attempt_failure_and_original_cursor(self):
        from jobboard.services import eures_collection as module

        query = self.query("eures")
        with (
            patch.object(module, "collect", return_value=self.page([{}], True)),
            patch.object(module, "ingest", side_effect=ValueError("private text")),
        ):
            module.run_queries(query_id=query.pk)
        query.refresh_from_db()
        self.assertEqual(query.cursor, "5")
        self.assertEqual(query.attempts.get().outcome, "failed")
        self.assertNotIn("private", query.attempts.get().error_code)
        self.assertEqual(DiscoveryAttempt.objects.count(), 1)


class AttemptMigrationTests(TransactionTestCase):
    def migrate(self, name):
        executor = MigrationExecutor(connection)
        target = [("jobboard", name)]
        executor.migrate(target)
        return executor.loader.project_state(target).apps

    def tearDown(self):
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
        super().tearDown()

    def test_migration_preserves_queries_and_refuses_evidence_loss(self):
        import uuid

        old = self.migrate("0037_collection_outcome")
        query = old.get_model("jobboard", "DiscoveryQuery").objects.create(
            provider="eures", country="FR", language="fr", cursor="5"
        )
        new = self.migrate("0038_discovery_attempt")
        Attempt = new.get_model("jobboard", "DiscoveryAttempt")
        self.assertEqual(Attempt.objects.count(), 0)
        Attempt.objects.create(query_id=query.pk, lease_token=uuid.uuid4())
        with self.assertRaisesMessage(
            RuntimeError, "Cannot discard discovery attempts"
        ):
            self.migrate("0037_collection_outcome")
        self.assertEqual(Attempt.objects.count(), 1)
        Attempt.objects.all().delete()  # Explicit cleanup of this test's fictitious evidence.
        restored = self.migrate("0037_collection_outcome")
        self.assertEqual(
            restored.get_model("jobboard", "DiscoveryQuery")
            .objects.get(pk=query.pk)
            .cursor,
            "5",
        )
