"""IT jobs survive collection and publication at every contract and seniority."""

from datetime import timedelta
from io import StringIO
from types import SimpleNamespace
from unittest.mock import Mock, patch

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase
from django.utils import timezone

from jobboard import models as m
from jobboard.integrations.jobspy_catalogue import normalize_record
from jobboard.integrations.jobspy_runner import main as jobspy_main
from jobboard.integrations.public_catalogue import CatalogueSnapshot, _posting
from jobboard.services.catalogue import import_board
from jobboard.services.employment_contracts import posting_contract
from jobboard.services.engine_quality import extract_facts


class OccupationScopeTests(SimpleTestCase):
    def test_runner_collects_all_contracts_by_default_and_preserves_explicit_stage(
        self,
    ):
        from jobspy.model import JobType

        for extra, expected in (
            ("", None),
            (', "contract_type": "internship"', JobType.INTERNSHIP),
        ):
            adapter = SimpleNamespace(
                scrape=Mock(return_value=SimpleNamespace(jobs=[]))
            )
            options = (
                '{"site":"linkedin","term":"backend","location":"France","country_name":"France","limit":1,"offset":0'
                + extra
                + "}"
            )
            with (
                patch("jobspy.linkedin.LinkedIn", return_value=adapter),
                patch("sys.stdin", StringIO(options)),
                patch("sys.stdout", StringIO()),
            ):
                jobspy_main()
            self.assertEqual(adapter.scrape.call_args.args[0].job_type, expected)

    def test_it_occupation_is_independent_of_internship_and_seniority(self):
        for title in (
            "Senior Backend Engineer",
            "Data Engineer CDI",
            "Pentester CDD",
            "Software Engineering Apprenticeship",
            "Frontend Developer Freelance",
            "Backend Developer Intern",
        ):
            with self.subTest(title=title):
                facts = extract_facts(title, "Develop backend services.")
                self.assertEqual(facts["facts"]["job_scope"]["value"], "in_scope")

    def test_non_it_and_ambiguous_roles_are_not_rescued_by_a_skills_list(self):
        self.assertEqual(
            extract_facts("Marketing internship", "Python and SQL appreciated.")[
                "facts"
            ]["job_scope"]["value"],
            "out_of_scope",
        )
        self.assertEqual(
            extract_facts("Opportunity", "Join us.")["facts"]["job_scope"]["value"],
            "unknown",
        )

    def test_working_hours_never_become_a_permanent_contract(self):
        for value in ("full_time", "part_time", "FullTime", None):
            with self.subTest(value=value):
                self.assertEqual(
                    posting_contract({"job_types": [value]}, "Backend Engineer", ""),
                    "unknown",
                )
        for title, expected in (
            ("Backend Engineer CDI", "permanent"),
            ("Backend Engineer CDD", "fixed_term"),
            ("Backend Engineering Apprenticeship", "apprenticeship"),
            ("Backend Engineer Freelance", "contractor"),
        ):
            self.assertEqual(posting_contract({}, title, ""), expected)
        self.assertEqual(
            posting_contract({"contract_type": "CDD"}, "Backend Engineer CDI", ""),
            "unknown",
        )

    def test_jobspy_retains_non_internship_it_roles_and_unknown_contract(self):
        for title, types, expected in (
            ("Senior Backend Engineer CDI", ["full_time"], "permanent"),
            ("Data Engineer CDD", [], "fixed_term"),
            ("Frontend Developer", ["full_time"], "unknown"),
            ("Software Engineering Apprenticeship", [], "apprenticeship"),
        ):
            with self.subTest(title=title):
                row, _ = normalize_record(
                    {
                        "url": "https://www.linkedin.com/jobs/view/123",
                        "company": "Example",
                        "title": title,
                        "description": "Build and maintain software services with the team.",
                        "location": "Paris, France",
                        "country": "FR",
                        "job_types": types,
                    },
                    "linkedin",
                )
                self.assertIsNotNone(row)
                self.assertEqual(row["contract_type"], expected)


class PublicITCatalogueTests(TestCase):
    def setUp(self):
        self.company = m.Company.objects.create(name="IT publisher")
        self.board = m.SourceBoard.objects.create(
            provider="smartrecruiters",
            board_key="it-publisher",
            company=self.company,
            base_url="https://example.test",
        )

    def row(self, identity, title, contract="unknown"):
        raw = {
            "title": title,
            "description": "Develop backend services.",
            "contract_type": contract,
        }
        row = _posting(
            raw,
            identity,
            title,
            raw["description"],
            f"https://example.test/{identity}",
            f"https://example.test/{identity}",
            ["Paris, France"],
        )
        row["location_details"] = [{"name": "Paris, France", "country": "FR"}]
        return row

    def import_rows(self, rows, scope=None):
        with patch(
            "jobboard.services.catalogue.fetch_normalized",
            return_value=CatalogueSnapshot(rows, scope=scope),
        ):
            return import_board(self.board.pk)

    def test_list_detail_and_explicit_stage_filter_include_every_it_contract(self):
        contracts = (
            "internship",
            "apprenticeship",
            "permanent",
            "fixed_term",
            "contractor",
            "unknown",
        )
        self.import_rows(
            [
                self.row(str(i), f"Backend Engineer {i}", contract)
                for i, contract in enumerate(contracts)
            ]
            + [self.row("non-it", "Marketing internship", "internship")]
        )
        response = self.client.get("/api/v1/offers/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            {r["contract_type"] for r in response.json()["results"]}, set(contracts)
        )
        stages = self.client.get("/api/v1/offers/?contract_type=internship").json()
        self.assertEqual(stages["count"], 1)
        for offer in m.Offer.objects.exclude(title="Marketing internship"):
            self.assertEqual(
                self.client.get(f"/api/v1/offers/{offer.pk}/").status_code, 200
            )
        outside = m.Offer.objects.get(title="Marketing internship")
        self.assertEqual(
            self.client.get(f"/api/v1/offers/{outside.pk}/").status_code, 404
        )

    def test_scope_transition_never_closes_historical_non_it_sources(self):
        keep = self.row("keep", "Backend engineer CDI")
        self.import_rows(
            [
                keep,
                self.row("missing", "Data Engineer"),
                self.row("outside", "Marketing internship"),
            ]
        )
        outside = self.board.sources.get(external_id="outside")
        m.SourceObservation.objects.update_or_create(
            source=outside,
            defaults={
                "missing_count": 3,
                "missing_since": timezone.now() - timedelta(days=1),
            },
        )
        self.import_rows([keep], scope="europe-it-v2")
        self.assertEqual(outside.observation.missing_count, 0)
        self.import_rows([keep], scope="europe-it-v2")
        missing = self.board.sources.get(external_id="missing")
        self.assertEqual(missing.observation.missing_count, 1)
        m.SourceObservation.objects.filter(source=missing).update(
            missing_since=timezone.now() - timedelta(hours=7)
        )
        self.import_rows([keep], scope="europe-it-v2")
        outside.refresh_from_db()
        missing.refresh_from_db()
        self.assertEqual(outside.source_status, "active")
        self.assertEqual(missing.source_status, "closed")

    def test_stale_or_disabled_sources_and_expired_it_jobs_remain_hidden(self):
        self.import_rows([self.row("senior", "Senior Backend Engineer CDI")])
        source = self.board.sources.get()
        m.OfferSource.objects.filter(pk=source.pk).update(
            last_checked_at=timezone.now() - timedelta(days=4)
        )
        self.assertEqual(self.client.get("/api/v1/offers/").json()["count"], 0)

        m.OfferSource.objects.filter(pk=source.pk).update(
            last_checked_at=timezone.now()
        )
        self.assertEqual(self.client.get("/api/v1/offers/").json()["count"], 1)
        m.Offer.objects.filter(pk=source.offer_id).update(
            expires_at=timezone.now() - timedelta(days=1)
        )
        self.assertEqual(self.client.get("/api/v1/offers/").json()["count"], 0)

    def test_recommendations_accept_primary_it_occupation_without_secondary_domains(
        self,
    ):
        self.import_rows([self.row("primary-only", "Senior Backend Engineer CDI")])
        user = get_user_model().objects.create_user(username="primary-it-candidate")
        profile = m.CandidateProfile.objects.create(
            user=user, full_name="Test candidate"
        )
        preference = m.SearchPreference.objects.create(profile=profile)
        m.PreferenceContract.objects.create(preference=preference, value="permanent")
        m.PreferenceWorkMode.objects.create(preference=preference, value="onsite")
        self.client.force_login(user)
        response = self.client.get("/api/v1/recommendations/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["count"], 1)
