"""Recruiter publication and candidate searches share explicit contract/level values."""

from types import SimpleNamespace

from django.contrib.auth import get_user_model
from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import (
    Client,
    SimpleTestCase,
    TestCase,
    TransactionTestCase,
    override_settings,
)

from jobboard import models as m


class LegacyEmploymentHashTests(SimpleTestCase):
    def test_unknown_level_keeps_the_historical_content_hash(self):
        from jobboard.services.engine_quality import semantic_hash

        offer = SimpleNamespace(
            title="Backend Developer",
            description="Build services.",
            contract_type="unknown",
            work_mode="unknown",
            seniority="unknown",
            locations=SimpleNamespace(all=lambda: []),
        )
        # Fingerprint of this fixture under E1.2, before the seniority field was read.
        historical = "dbf779c468dd08544c9dcffb571335e23af27c96990a5300a3263e734d6a68d2"
        self.assertEqual(semantic_hash(offer), historical)
        offer.seniority = "senior"
        self.assertNotEqual(semantic_hash(offer), historical)


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class EmploymentFlowTests(TestCase):
    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.user = get_user_model().objects.create_user(
            username="employment-recruiter"
        )
        self.owner = m.RecruiterProfile.objects.create(
            user=self.user,
            full_name="Recruiter",
            company_name="Employment test",
            website_url="https://employment.example.test",
            email_verified=True,
            verification_status="verified",
        )
        self.client.force_login(self.user)

    def write(self, path, values, method="post"):
        token = self.client.get("/api/v1/auth/csrf/").json()["csrf_token"]
        return getattr(self.client, method)(
            "/api/v1/" + path,
            values,
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )

    def publish(self, **values):
        response = self.write(
            "recruiter/jobs/",
            {
                "title": "Backend Developer",
                "description": "Build backend services with our team.",
                "location": "Paris",
                "country_code": "FR",
                "status": "active",
                **values,
            },
        )
        self.assertEqual(response.status_code, 201, response.content)
        return response.json()

    def test_every_contract_is_publishable_with_independent_seniority(self):
        for contract, level in (
            ("internship", "entry"),
            ("apprenticeship", "entry"),
            ("permanent", "senior"),
            ("fixed_term", "mid"),
            ("contractor", "lead"),
            ("employment", "unknown"),
            ("temporary", "mid"),
            ("unknown", "unknown"),
        ):
            with self.subTest(contract=contract):
                job = self.publish(contract_type=contract, seniority=level)
                self.assertEqual(job["contract_type"], contract)
                self.assertEqual(job["seniority"], level)
                detail = self.client.get(f"/api/v1/offers/{job['offer_id']}/")
                self.assertEqual(detail.status_code, 200, detail.content)
                self.assertEqual(detail.json()["contract_type"], contract)
                self.assertEqual(detail.json()["seniority"], level)

    def test_defaults_do_not_invent_contract_or_level_from_title(self):
        job = self.publish(title="Senior Backend Developer")
        self.assertEqual(job["contract_type"], "unknown")
        self.assertEqual(job["seniority"], "unknown")
        changed = self.write(
            f"recruiter/jobs/{job['id']}/", {"contract_type": "fixed_term"}, "patch"
        )
        self.assertEqual(changed.status_code, 200)
        self.assertEqual(changed.json()["seniority"], "unknown")
        offer = m.Offer.objects.get(pk=job["offer_id"])
        self.assertEqual(offer.contract_type, "fixed_term")
        self.assertEqual(offer.seniority, "unknown")

    def test_contract_and_seniority_filters_are_exact_and_combinable(self):
        senior = self.publish(contract_type="permanent", seniority="senior")
        self.publish(contract_type="permanent", seniority="entry")
        self.publish(contract_type="fixed_term", seniority="senior")
        self.publish()
        for criteria, expected in (
            ("contract_type=permanent", 2),
            ("seniority=senior", 2),
            ("contract_type=permanent&seniority=senior&include_unknown=true", 1),
            ("contract_type=unknown&seniority=unknown", 1),
        ):
            response = self.client.get("/api/v1/offers/?" + criteria)
            self.assertEqual(response.status_code, 200, response.content)
            self.assertEqual(response.json()["count"], expected)
        result = self.client.get(
            "/api/v1/offers/?contract_type=permanent&seniority=senior"
        ).json()
        self.assertEqual(result["results"][0]["id"], senior["offer_id"])
        self.assertEqual(
            self.client.get("/api/v1/offers/?seniority=invalid").status_code, 400
        )

    def test_invalid_values_and_other_roles_cannot_publish(self):
        for values in ({"contract_type": "invalid"}, {"seniority": "invalid"}):
            response = self.write(
                "recruiter/jobs/", {"title": "Backend Developer", **values}
            )
            self.assertEqual(response.status_code, 400)
        self.assertFalse(self.owner.jobs.exists())
        candidate = get_user_model().objects.create_user(
            username="employment-candidate"
        )
        self.client.force_login(candidate)
        self.assertEqual(
            self.write("recruiter/jobs/", {"title": "Backend Developer"}).status_code,
            403,
        )

    def test_saved_search_preserves_both_filters(self):
        from jobboard.services.engine_matching import preselect_offers

        selected = self.publish(contract_type="permanent", seniority="senior")
        self.publish(contract_type="permanent", seniority="unknown")
        candidate = get_user_model().objects.create_user(
            username="saved-employment-search"
        )
        m.CandidateProfile.objects.create(user=candidate, full_name="Candidate")
        self.client.force_login(candidate)
        criteria = {
            "contract_type": "permanent",
            "seniority": "senior",
            "unknown_policy": "include",
        }
        response = self.write(
            "saved-searches/", {"name": "Senior CDI", "criteria": criteria}
        )
        self.assertEqual(response.status_code, 201, response.content)
        self.assertEqual(response.json()["criteria"], criteria)
        self.assertEqual(
            list(
                preselect_offers(m.Offer.objects.all(), criteria).values_list(
                    "pk", flat=True
                )
            ),
            [selected["offer_id"]],
        )

    def test_level_edit_has_a_source_revision_and_refreshes_projection(self):
        job = self.publish(contract_type="permanent", seniority="entry")
        source = m.OfferSource.objects.get(offer_id=job["offer_id"])
        previous = source.offer.enrichment.content_version
        response = self.write(
            f"recruiter/jobs/{job['id']}/", {"seniority": "senior"}, "patch"
        )
        self.assertEqual(response.status_code, 200)
        source.refresh_from_db()
        self.assertEqual(source.raw_payload["seniority"], "senior")
        self.assertEqual(source.revisions.count(), 2)
        self.assertEqual(source.offer.enrichment.content_version, previous + 1)
        duplicate = self.write(f"recruiter/jobs/{job['id']}/duplicate/", {})
        self.assertEqual(duplicate.status_code, 201)
        self.assertEqual(duplicate.json()["seniority"], "senior")
        self.assertEqual(duplicate.json()["contract_type"], "permanent")

    def test_database_enforces_contract_and_level_choices(self):
        for values in ({"contract_type": "invalid"}, {"seniority": "invalid"}):
            with self.subTest(values=values):
                with self.assertRaises(IntegrityError), transaction.atomic():
                    m.RecruiterJob.objects.create(
                        owner=self.owner, title="Backend", **values
                    )


class RecruiterEmploymentMigrationTests(TransactionTestCase):
    old_target = [("jobboard", "0035_employment_dimensions")]
    new_target = [("jobboard", "0036_recruiter_employment_dimensions")]

    def migrate(self, target):
        executor = MigrationExecutor(connection)
        executor.migrate(target)
        return executor.loader.project_state(target).apps

    def tearDown(self):
        executor = MigrationExecutor(connection)
        self.migrate(executor.loader.graph.leaf_nodes())
        super().tearDown()

    def test_upgrade_and_guarded_rollback_preserve_legacy_contracts(self):
        old = self.migrate(self.old_target)
        user = old.get_model("auth", "User").objects.create(
            username="legacy-recruiter-contract"
        )
        owner = old.get_model("jobboard", "RecruiterProfile").objects.create(
            user_id=user.pk, full_name="Legacy"
        )
        legacy = {
            contract: old.get_model("jobboard", "RecruiterJob")
            .objects.create(
                owner_id=owner.pk,
                title="Backend Developer",
                contract_type=contract,
            )
            .pk
            for contract in ("internship", "apprenticeship", "employment")
        }
        new = self.migrate(self.new_target)
        Job = new.get_model("jobboard", "RecruiterJob")
        for contract, pk in legacy.items():
            job = Job.objects.get(pk=pk)
            self.assertEqual(job.contract_type, contract)
            self.assertEqual(job.seniority, "unknown")
        # The previous app omits the new column: the persistent SQL default keeps
        # its writes valid during an additive deployment or application rollback.
        legacy_write = old.get_model("jobboard", "RecruiterJob").objects.create(
            owner_id=owner.pk,
            title="Old app write",
            contract_type="employment",
        )
        self.assertEqual(Job.objects.get(pk=legacy_write.pk).seniority, "unknown")
        self.assertEqual(
            Job.objects.create(owner_id=owner.pk, title="New draft").contract_type,
            "unknown",
        )
        Job.objects.exclude(pk__in=legacy.values()).delete()
        pk = legacy["employment"]
        for changes in ({"contract_type": "permanent"}, {"seniority": "senior"}):
            with self.subTest(changes=changes):
                Job.objects.filter(pk=pk).update(**changes)
                with self.assertRaisesMessage(
                    RuntimeError, "Cannot reverse recruiter employment dimensions"
                ):
                    self.migrate(self.old_target)
                current = Job.objects.get(pk=pk)
                for field, value in changes.items():
                    self.assertEqual(getattr(current, field), value)
                Job.objects.filter(pk=pk).update(
                    contract_type="employment", seniority="unknown"
                )
        restored = self.migrate(self.old_target)
        for contract, pk in legacy.items():
            self.assertEqual(
                restored.get_model("jobboard", "RecruiterJob")
                .objects.get(pk=pk)
                .contract_type,
                contract,
            )
