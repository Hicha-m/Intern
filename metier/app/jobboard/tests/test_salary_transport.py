"""Transport provenance before deciding whether a salary is employer published."""

import json
from io import StringIO
from types import SimpleNamespace
from unittest.mock import patch

from bs4 import BeautifulSoup
from django.test import SimpleTestCase, TestCase

from jobboard.integrations.jobspy_catalogue import normalize_record
from jobboard.integrations.jobspy_runner import (
    capture_compensation,
    compensation_payload,
    main,
)
from jobboard.models import (
    CompensationBand,
    DiscoveryQuery,
    OfferSource,
    SourceRevision,
)
from jobboard.services.jobspy_collection import ingest
from jobboard.tests.test_jobspy_collection import record


class SalaryTransportTests(SimpleTestCase):
    def job(self, **changes):
        compensation = SimpleNamespace(
            min_amount=20.5,
            max_amount=None,
            currency="EUR",
            interval=SimpleNamespace(value="hourly"),
        )
        return SimpleNamespace(id="one", compensation=compensation, **changes)

    def test_original_estimate_and_missing_currency_remain_distinguishable(self):
        for site, raw, original in [
            (
                "indeed",
                {
                    "compensation": {
                        "baseSalary": None,
                        "estimated": {"baseSalary": {"range": {"min": 25000}}},
                    }
                },
                {
                    "baseSalary": None,
                    "estimated": {"baseSalary": {"range": {"min": 25000}}},
                },
            ),
            (
                "glassdoor",
                {
                    "jobview": {
                        "header": {
                            "payPeriod": "ANNUAL",
                            "payPeriodAdjustedPay": {"p10": 20000, "p90": 30000},
                        }
                    }
                },
                {
                    "payPeriod": "ANNUAL",
                    "payPeriodAdjustedPay": {"p10": 20000, "p90": 30000},
                },
            ),
        ]:
            with self.subTest(site=site):
                job = self.job()
                adapter = SimpleNamespace(_process_job=lambda raw: job)
                sources = capture_compensation(adapter, site)
                self.assertIs(adapter._process_job(raw), job)
                payload = compensation_payload(job, sources)
                self.assertEqual(payload["source"], original)
                self.assertEqual(payload["eligibility"], "unverified")

    def test_linkedin_text_and_unknown_period_are_not_annualized(self):
        job = self.job()
        job.compensation.interval = None
        adapter = SimpleNamespace(_process_job=lambda raw, identity, full: job)
        sources = capture_compensation(adapter, "linkedin")
        adapter._process_job(
            BeautifulSoup(
                '<span class="job-search-card__salary-info">€ 20,50 par heure</span>',
                "html.parser",
            ),
            "1",
            True,
        )
        payload = compensation_payload(job, sources)
        self.assertEqual(payload["source"]["text"], "€ 20,50 par heure")
        self.assertIsNone(payload["interval"])
        self.assertEqual(payload["minimum"], "20.5")
        self.assertIsNone(payload["maximum"])

    def test_absent_and_invalid_amounts_never_become_zero(self):
        self.assertIsNone(
            compensation_payload(SimpleNamespace(id="none", compensation=None), {})
        )
        job = self.job()
        for value in [float("nan"), float("inf"), "broken", True]:
            job.compensation.min_amount = value
            self.assertIsNone(compensation_payload(job, {})["minimum"])

    def test_normalized_row_preserves_salary_input_and_changes_its_hash(self):
        raw = record(
            compensation={
                "eligibility": "unverified",
                "minimum": "20.50",
                "interval": "hourly",
            }
        )
        row, _ = normalize_record(raw, "linkedin")
        self.assertEqual(row["compensation_input"], raw["compensation"])
        changed, _ = normalize_record(
            record(compensation={**raw["compensation"], "minimum": "21.50"}), "linkedin"
        )
        self.assertNotEqual(row["hash"], changed["hash"])

    def test_runner_exports_the_original_salary_and_parsed_fields(self):
        job = self.job()
        for field in (
            "location",
            "date_posted",
            "job_type",
            "company_logo",
            "company_url_direct",
            "job_url_direct",
        ):
            setattr(job, field, None)
        job.title = "Backend Engineer"
        job.company_name = "Example"
        job.job_url = "https://www.linkedin.com/jobs/view/123"
        job.description = "Build services."
        job.is_remote = False
        raw = BeautifulSoup(
            '<span class="job-search-card__salary-info">EUR 20.50 hourly</span>',
            "html.parser",
        )
        adapter = SimpleNamespace(_process_job=lambda raw, *args: job)
        adapter.scrape = lambda options: SimpleNamespace(
            jobs=[adapter._process_job(raw, "123", True)]
        )
        options = dict(
            site="linkedin",
            term="software",
            location="France",
            country_name="France",
            limit=1,
            offset=0,
        )
        output = StringIO()
        with (
            patch("jobspy.linkedin.LinkedIn", return_value=adapter),
            patch("sys.stdin", StringIO(json.dumps(options))),
            patch("sys.stdout", output),
        ):
            main()
        salary = json.loads(output.getvalue())[0]["compensation"]
        self.assertEqual(salary["source"]["text"], "EUR 20.50 hourly")
        self.assertEqual(salary["minimum"], "20.5")
        self.assertEqual(salary["interval"], "hourly")
        self.assertEqual(salary["eligibility"], "unverified")


class PersistedSalaryTransportTests(TestCase):
    def test_salary_survives_import_and_revisions_without_publishing_an_estimate(self):
        query = DiscoveryQuery.objects.create(
            provider="jobspy_linkedin", country="FR", language="fr", term="software"
        )
        raw = record(
            compensation={
                "schema_version": "jobspy-salary-1",
                "eligibility": "unverified",
                "minimum": "20.50",
                "maximum": None,
                "currency": "EUR",
                "interval": "hourly",
                "source": {"text": "20,50 € par heure"},
            }
        )
        self.assertEqual(ingest(query, [raw]), 1)
        source = OfferSource.objects.get()
        self.assertEqual(source.raw_payload["compensation"], raw["compensation"])
        self.assertEqual(
            source.revisions.get().payload["compensation"], raw["compensation"]
        )
        self.assertEqual(CompensationBand.objects.count(), 0)
        ingest(query, [raw])
        self.assertEqual(SourceRevision.objects.count(), 1)
        updated = {**raw, "compensation": {**raw["compensation"], "minimum": "21.50"}}
        ingest(query, [updated])
        self.assertEqual(SourceRevision.objects.count(), 2)
        self.assertTrue(
            SourceRevision.objects.filter(
                payload__compensation__minimum="20.50"
            ).exists()
        )
