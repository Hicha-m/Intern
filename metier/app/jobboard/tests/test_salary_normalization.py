"""Salary projections retain period, source and unknowns without estimating missing data."""

from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import SimpleTestCase, TestCase, TransactionTestCase

from jobboard.models import (
    CompensationBand,
    DiscoveryQuery,
    OfferSource,
    SourceRevision,
)
from jobboard.services.jobspy_collection import ingest
from jobboard.services.salary_normalization import normalize_salary
from jobboard.tests.test_jobspy_collection import record


def salary(minimum="20.50", maximum="30.75", period="HOUR", currency="EUR"):
    return {
        "site": "indeed",
        "compensation": {
            "schema_version": "jobspy-salary-1",
            "source": {
                "baseSalary": {
                    "range": {"min": minimum, "max": maximum},
                    "unitOfWork": period,
                },
                "currencyCode": currency,
            },
        },
    }


class SalaryNormalizationTests(SimpleTestCase):
    def test_structured_values_preserve_decimals_period_and_unknown_gross_net(self):
        result = normalize_salary(salary())
        self.assertEqual(result["status"], "published")
        self.assertEqual(result["minimum"], "20.50")
        self.assertEqual(result["maximum"], "30.75")
        self.assertEqual(result["period"], "hour")
        self.assertEqual(result["gross_net"], "unknown")
        self.assertTrue(result["comparable"])
        self.assertIsNone(normalize_salary(salary(maximum=None))["maximum"])

    def test_estimates_are_separate_and_do_not_borrow_published_currency(self):
        raw = salary()
        source = raw["compensation"]["source"]
        source["estimated"] = {
            "baseSalary": source.pop("baseSalary"),
            "currencyCode": "USD",
        }
        result = normalize_salary(raw)
        self.assertEqual(result["status"], "estimated")
        self.assertEqual(result["currency"], "USD")
        source["baseSalary"] = salary()["compensation"]["source"]["baseSalary"]
        self.assertEqual(normalize_salary(raw)["currency"], "EUR")

    def test_missing_currency_or_unit_never_inherits_runner_defaults(self):
        for currency, period in [
            (None, "YEAR"),
            ("€", "YEAR"),
            ("EUR", None),
            ("EUR", {}),
        ]:
            with self.subTest(currency=currency, period=period):
                result = normalize_salary(salary(period=period, currency=currency))
                self.assertFalse(result["comparable"])
                self.assertEqual(result["status"], "published")

    def test_bad_bounds_are_not_repaired_or_rounded(self):
        for low, high in [
            ("40", "20"),
            ("-1", "20"),
            ("NaN", "20"),
            (True, "20"),
            ("1.234", "20"),
            ("100000000000000", None),
        ]:
            self.assertEqual(normalize_salary(salary(low, high))["status"], "invalid")
        self.assertEqual(normalize_salary(salary(None, None))["status"], "missing")
        self.assertEqual(normalize_salary({})["status"], "missing")
        self.assertEqual(
            normalize_salary({**salary(), "site": "glassdoor"})["status"], "unknown"
        )


class PersistedSalaryNormalizationTests(TestCase):
    def setUp(self):
        self.query = DiscoveryQuery.objects.create(
            provider="jobspy_indeed", country="FR", language="fr", term="software"
        )

    def import_salary(self, payload):
        raw = record(
            url="https://www.indeed.com/viewjob?jk=salary1",
            compensation=payload.get("compensation"),
        )
        ingest(self.query, [raw])
        return OfferSource.objects.get()

    def test_publish_update_remove_and_replay_preserve_original_evidence(self):
        source = self.import_salary(salary())
        band = CompensationBand.objects.get()
        original_revision = band.source_revision_id
        self.assertEqual(str(band.minimum), "20.50")
        self.assertEqual(band.period, "hour")
        self.assertEqual(band.source_revision.source_id, source.pk)
        self.assertEqual(source.salary_projection["status"], "published")
        self.import_salary(salary())
        self.assertEqual(CompensationBand.objects.get().pk, band.pk)
        self.assertEqual(SourceRevision.objects.count(), 1)
        self.import_salary(salary("22.25"))
        band.refresh_from_db()
        self.assertNotEqual(band.source_revision_id, original_revision)
        self.assertEqual(
            SourceRevision.objects.get(pk=original_revision).payload["compensation"][
                "source"
            ]["baseSalary"]["range"]["min"],
            "20.50",
        )
        manual = CompensationBand.objects.create(
            offer=source.offer, source=source, minimum=10, currency="GBP", period="day"
        )
        source = self.import_salary({})
        self.assertEqual(source.salary_projection["status"], "missing")
        self.assertEqual(
            list(CompensationBand.objects.values_list("pk", flat=True)), [manual.pk]
        )
        self.assertEqual(SourceRevision.objects.count(), 3)

    def test_estimated_or_incomplete_values_do_not_create_published_bands(self):
        raw = salary()
        source_raw = raw["compensation"]["source"]
        source_raw["estimated"] = {
            "baseSalary": source_raw.pop("baseSalary"),
            "currencyCode": "EUR",
        }
        source = self.import_salary(raw)
        self.assertEqual(source.salary_projection["status"], "estimated")
        self.assertFalse(CompensationBand.objects.exists())
        self.import_salary(salary(currency=None))
        self.assertFalse(CompensationBand.objects.exists())

    def test_extractor_projection_is_unique_per_source(self):
        source = self.import_salary(salary())
        with self.assertRaises(IntegrityError), transaction.atomic():
            CompensationBand.objects.create(
                offer=source.offer,
                source=source,
                minimum=10,
                currency="EUR",
                period="hour",
                extraction_version="salary-1",
            )

    def test_revision_from_another_source_is_rejected_by_postgresql(self):
        source = self.import_salary(salary())
        other = OfferSource.objects.create(
            offer=source.offer,
            board=source.board,
            external_id="other",
            origin_url="https://example.test/other",
            apply_url="https://example.test/other",
            content_hash="b" * 64,
        )
        revision = SourceRevision.objects.create(
            source=other, raw_hash="b" * 64, semantic_hash="b" * 64, payload={}
        )
        with self.assertRaises(IntegrityError), transaction.atomic():
            CompensationBand.objects.filter(source=source).update(
                source_revision=revision
            )
        self.assertEqual(
            CompensationBand.objects.get(source=source).source_revision.source_id,
            source.pk,
        )


class SalaryMigrationTests(TransactionTestCase):
    def migrate(self, name):
        executor = MigrationExecutor(connection)
        targets = [("jobboard", name)]
        executor.migrate(targets)
        return executor.loader.project_state(targets).apps

    def tearDown(self):
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
        super().tearDown()

    def test_upgrade_old_writer_and_guarded_return_preserve_source(self):
        old = self.migrate("0038_discovery_attempt")
        company = old.get_model("jobboard", "Company").objects.create(
            name="Salary migration"
        )
        board = old.get_model("jobboard", "SourceBoard").objects.create(
            company_id=company.pk, provider="jobspy", board_key="salary-migration"
        )
        offer = old.get_model("jobboard", "Offer").objects.create(
            company_id=company.pk, title="Backend Engineer"
        )
        Source = old.get_model("jobboard", "OfferSource")
        source = Source.objects.create(
            offer_id=offer.pk,
            board_id=board.pk,
            external_id="one",
            origin_url="https://example.test/1",
            apply_url="https://example.test/1",
            content_hash="a" * 64,
        )
        new = self.migrate("0039_salary_provenance")
        NewSource = new.get_model("jobboard", "OfferSource")
        self.assertEqual(NewSource.objects.get(pk=source.pk).salary_projection, {})
        legacy_write = Source.objects.create(
            offer_id=offer.pk,
            board_id=board.pk,
            external_id="two",
            origin_url="https://example.test/2",
            apply_url="https://example.test/2",
            content_hash="b" * 64,
        )
        self.assertEqual(
            NewSource.objects.get(pk=legacy_write.pk).salary_projection, {}
        )
        NewSource.objects.filter(pk=source.pk).update(
            salary_projection={"status": "missing"}
        )
        with self.assertRaisesMessage(RuntimeError, "Cannot discard salary provenance"):
            self.migrate("0038_discovery_attempt")
        NewSource.objects.filter(pk=source.pk).update(salary_projection={})
        restored = self.migrate("0038_discovery_attempt")
        self.assertEqual(
            restored.get_model("jobboard", "OfferSource")
            .objects.get(pk=source.pk)
            .content_hash,
            "a" * 64,
        )
