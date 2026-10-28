"""Global IT catalogue dimensions, enforced even when writes bypass the API."""

from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import IntegrityError, connection, transaction
from django.db.migrations.executor import MigrationExecutor
from django.test import TestCase, TransactionTestCase

from jobboard.models import (
    CandidateProfile,
    Company,
    Offer,
    PreferenceContract,
    SearchPreference,
)
from jobboard.models.choices import ContractType


class EmploymentSchemaTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.company = Company.objects.create(name="Schema test company")

    def offer(self, **values):
        return Offer.objects.create(
            company=self.company,
            title="Backend engineer",
            description="Develop backend services in Python.",
            **values,
        )

    def test_explicit_and_legacy_contracts_remain_independent_of_seniority(self):
        for contract in (
            "internship",
            "apprenticeship",
            "permanent",
            "fixed_term",
            "contractor",
            "employment",
            "temporary",
            "unknown",
        ):
            with self.subTest(contract=contract), transaction.atomic():
                self.assertIn(contract, ContractType.values)
                offer = self.offer(contract_type=contract, seniority="senior")
                offer.full_clean(exclude=["taxonomy_evidence"])
                offer.refresh_from_db()
                self.assertEqual(offer.contract_type, contract)
                self.assertEqual(offer.seniority, "senior")

    def test_unknown_experience_is_distinct_from_explicit_zero_and_fractional_years(
        self,
    ):
        unknown = self.offer()
        self.assertIsNone(unknown.experience_years_min)
        self.assertIsNone(unknown.experience_years_max)
        for minimum, maximum in ((0, 0), (Decimal("0.50"), 2), (3, None), (None, 5)):
            with self.subTest(minimum=minimum, maximum=maximum):
                offer = self.offer(
                    experience_years_min=minimum, experience_years_max=maximum
                )
                offer.full_clean(exclude=["taxonomy_evidence"])
                offer.refresh_from_db()
                self.assertEqual(offer.experience_years_min, minimum)
                self.assertEqual(offer.experience_years_max, maximum)
                self.assertEqual(offer.seniority, "unknown")
                self.assertEqual(offer.contract_type, "unknown")

    def test_database_rejects_negative_and_reversed_experience_bounds(self):
        for values in (
            {"experience_years_min": -1},
            {"experience_years_max": Decimal("-0.50")},
            {"experience_years_min": 5, "experience_years_max": 2},
        ):
            with self.subTest(values=values):
                with self.assertRaises(IntegrityError), transaction.atomic():
                    self.offer(**values)

    def test_contract_preferences_accept_new_values_without_accepting_invalid_values(
        self,
    ):
        user = get_user_model().objects.create_user(username="employment-preferences")
        profile = CandidateProfile.objects.create(user=user, full_name="Candidate")
        preference = SearchPreference.objects.create(profile=profile)
        for contract in ("permanent", "fixed_term", "employment", "temporary"):
            with self.subTest(contract=contract), transaction.atomic():
                PreferenceContract.objects.create(preference=preference, value=contract)
        for contract in ("invalid", "unknown"):
            with self.subTest(contract=contract):
                with self.assertRaises(IntegrityError), transaction.atomic():
                    PreferenceContract.objects.create(
                        preference=preference, value=contract
                    )

    def test_invalid_contract_and_seniority_are_rejected_by_database(self):
        for values in ({"contract_type": "invalid"}, {"seniority": "invalid"}):
            with self.subTest(values=values):
                with self.assertRaises(IntegrityError), transaction.atomic():
                    self.offer(**values)


class EmploymentMigrationTests(TransactionTestCase):
    old_target = [("jobboard", "0034_recruiter_applicant_integrity")]
    new_target = [("jobboard", "0035_employment_dimensions")]

    def migrate(self, target):
        executor = MigrationExecutor(connection)
        executor.migrate(target)
        return executor.loader.project_state(target).apps

    def tearDown(self):
        executor = MigrationExecutor(connection)
        self.migrate(executor.loader.graph.leaf_nodes())
        super().tearDown()

    def test_upgrade_preserves_legacy_data_and_rollback_protects_new_facts(self):
        old = self.migrate(self.old_target)
        company = old.get_model("jobboard", "Company").objects.create(name="Legacy IT")
        OldOffer = old.get_model("jobboard", "Offer")
        legacy = {
            contract: OldOffer.objects.create(
                title="Senior backend engineer",
                description="Legacy description",
                company_id=company.pk,
                contract_type=contract,
                seniority="unknown",
            ).pk
            for contract in ("employment", "temporary", "internship", "unknown")
        }
        board = old.get_model("jobboard", "SourceBoard").objects.create(
            provider="test", board_key="legacy-it", base_url="https://example.test"
        )
        source = old.get_model("jobboard", "OfferSource").objects.create(
            offer_id=legacy["employment"],
            board_id=board.pk,
            external_id="legacy-1",
            origin_url="https://example.test/1",
            apply_url="https://example.test/1",
            content_hash="a" * 64,
        )
        user = old.get_model("auth", "User").objects.create(
            username="legacy-employment"
        )
        profile = old.get_model("jobboard", "CandidateProfile").objects.create(
            user_id=user.pk, full_name="Legacy candidate"
        )
        preference = old.get_model("jobboard", "SearchPreference").objects.create(
            profile_id=profile.pk
        )
        contract_preference = old.get_model(
            "jobboard", "PreferenceContract"
        ).objects.create(preference_id=preference.pk, value="employment")

        new = self.migrate(self.new_target)
        NewOffer = new.get_model("jobboard", "Offer")
        NewPreference = new.get_model("jobboard", "PreferenceContract")
        for contract, pk in legacy.items():
            offer = NewOffer.objects.get(pk=pk)
            self.assertEqual(offer.contract_type, contract)
            self.assertEqual(offer.seniority, "unknown")
            self.assertIsNone(offer.experience_years_min)
            self.assertIsNone(offer.experience_years_max)
            self.assertEqual(offer.description, "Legacy description")
        self.assertEqual(
            new.get_model("jobboard", "OfferSource").objects.get(pk=source.pk).offer_id,
            legacy["employment"],
        )
        self.assertEqual(
            NewPreference.objects.get(pk=contract_preference.pk).value, "employment"
        )

        # Reject each potentially lossy rollback before removing any schema/data.
        for values in (
            {"contract_type": "permanent"},
            {"experience_years_min": Decimal("0.50")},
            {"experience_years_max": Decimal("2.00")},
        ):
            with self.subTest(values=values):
                NewOffer.objects.filter(pk=legacy["unknown"]).update(**values)
                with self.assertRaisesMessage(
                    RuntimeError, "Cannot reverse employment dimensions"
                ):
                    self.migrate(self.old_target)
                current = NewOffer.objects.get(pk=legacy["unknown"])
                for name, value in values.items():
                    self.assertEqual(getattr(current, name), value)
                NewOffer.objects.filter(pk=current.pk).update(
                    contract_type="unknown",
                    experience_years_min=None,
                    experience_years_max=None,
                )
        NewPreference.objects.filter(pk=contract_preference.pk).update(
            value="fixed_term"
        )
        with self.assertRaisesMessage(
            RuntimeError, "Cannot reverse employment dimensions"
        ):
            self.migrate(self.old_target)
        self.assertEqual(
            NewPreference.objects.get(pk=contract_preference.pk).value, "fixed_term"
        )
        NewPreference.objects.filter(pk=contract_preference.pk).update(
            value="employment"
        )

        restored = self.migrate(self.old_target)
        for contract, pk in legacy.items():
            self.assertEqual(
                restored.get_model("jobboard", "Offer")
                .objects.get(pk=pk)
                .contract_type,
                contract,
            )
        self.assertEqual(
            restored.get_model("jobboard", "OfferSource")
            .objects.get(pk=source.pk)
            .offer_id,
            legacy["employment"],
        )
