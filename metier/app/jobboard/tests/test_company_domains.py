import io
import json
from unittest.mock import patch

from django.core.management import call_command
from django.test import SimpleTestCase, TestCase

from jobboard.integrations.greenhouse_catalogue import CatalogueImportError
from jobboard.models import Company, Offer, OfferSource, SourceBoard
from jobboard.services.company_domains import employer_homepage, enrich_company_domain
from jobboard.services.company_logos import extract_logo


class CompanyDomainTests(TestCase):
    def source(self, company, payload=None):
        board = SourceBoard.objects.create(
            company=company,
            provider="jobspy",
            instance="global",
            board_key=f"company-{company.pk}",
            base_url="https://www.linkedin.com",
        )
        offer = Offer.objects.create(
            company=company, title="Stage", description="Stage"
        )
        return OfferSource.objects.create(
            offer=offer,
            board=board,
            external_id=str(company.pk),
            origin_url=f"https://www.linkedin.com/jobs/view/{company.pk}",
            apply_url=f"https://www.linkedin.com/jobs/view/{company.pk}",
            content_hash="a" * 64,
            raw_payload=payload or {},
        )

    def test_source_website_survives_failed_logo_download(self):
        company = Company.objects.create(name="Example")
        self.source(
            company,
            {
                "company": "Example",
                "company_website": "https://example.com/",
                "company_logo": "https://cdn.example.com/logo.png",
            },
        )
        with (
            patch(
                "jobboard.services.company_logos.fetch_public",
                side_effect=CatalogueImportError("public_http_error"),
            ),
            self.assertRaises(CatalogueImportError),
        ):
            extract_logo(company)
        company.refresh_from_db()
        self.assertEqual(company.domain, "example.com")
        self.assertEqual(company.website_url, "https://example.com/")
        self.assertIsNone(company.logo_object_key)

    def test_source_website_is_saved_before_successful_logo_early_return(self):
        company = Company.objects.create(name="Example")
        self.source(
            company,
            {
                "company": "Example",
                "company_website": "https://example.com/",
                "company_logo": "https://cdn.example.com/logo.png",
            },
        )
        with patch("jobboard.services.company_logos.cache_logo", return_value="cached"):
            self.assertEqual(extract_logo(company), "cached")
        company.refresh_from_db()
        self.assertEqual(company.domain, "example.com")

    def test_matching_structured_organization_without_logo_records_domain(self):
        company = Company.objects.create(name="Example")
        self.source(company)
        html = (
            '<script type="application/ld+json">'
            + json.dumps(
                {
                    "@type": "JobPosting",
                    "hiringOrganization": {
                        "@type": "Organization",
                        "name": "Example",
                        "url": "https://example.com/",
                    },
                }
            )
            + "</script>"
        )
        with (
            patch(
                "jobboard.services.company_logos.fetch_public",
                side_effect=lambda url, **kwargs: (url, html),
            ),
            self.assertRaises(CatalogueImportError),
        ):
            extract_logo(company)
        company.refresh_from_db()
        self.assertEqual(company.domain, "example.com")
        self.assertIsNone(company.logo_object_key)

    def test_known_website_records_domain_even_when_page_cannot_be_read(self):
        company = Company.objects.create(
            name="Example", website_url="https://example.com/"
        )
        with (
            patch(
                "jobboard.services.company_logos.fetch_public",
                side_effect=CatalogueImportError("public_http_error"),
            ),
            self.assertRaises(CatalogueImportError),
        ):
            extract_logo(company)
        company.refresh_from_db()
        self.assertEqual(company.domain, "example.com")

    def test_cached_logo_does_not_prevent_domain_enrichment(self):
        company = Company.objects.create(
            name="Example", logo_object_key="existing-logo.png"
        )
        self.source(
            company,
            {"company": "Example", "company_website": "https://example.com/about"},
        )
        with patch("jobboard.services.company_domains.fetch_public") as fetch:
            self.assertEqual(enrich_company_domain(company), "example.com")
            fetch.assert_not_called()
        company.refresh_from_db()
        self.assertEqual(company.website_url, "https://example.com/")
        self.assertEqual(company.logo_object_key, "existing-logo.png")

    def test_domain_only_reads_html_and_never_downloads_images(self):
        company = Company.objects.create(name="Example")
        self.source(company)
        html = (
            '<script type="application/ld+json">'
            + json.dumps(
                {
                    "@type": "Organization",
                    "name": "Example",
                    "url": "https://example.com/",
                    "logo": "https://cdn.example.com/logo.png",
                }
            )
            + "</script>"
        )
        with patch(
            "jobboard.services.company_domains.fetch_public",
            side_effect=lambda url, **kwargs: (url, html),
        ) as fetch:
            self.assertEqual(enrich_company_domain(company), "example.com")
            fetch.assert_called_once()
            self.assertNotIn("image", fetch.call_args.kwargs)
        company.refresh_from_db()
        self.assertIsNone(company.logo_object_key)

    def test_foreign_company_metadata_and_platform_urls_are_rejected(self):
        company = Company.objects.create(name="Example")
        source = self.source(
            company, {"company": "Other", "company_website": "https://other.com/"}
        )
        for payload in (
            source.raw_payload,
            {
                "company": "Example",
                "company_website": "https://fr.linkedin.com/company/example",
            },
        ):
            source.raw_payload = payload
            source.save(update_fields=["raw_payload"])
            with self.assertRaises(CatalogueImportError):
                enrich_company_domain(company, metadata_only=True)
        company.refresh_from_db()
        self.assertIsNone(company.domain)

    def test_conflicting_source_websites_are_not_resolved_by_first_match(self):
        company = Company.objects.create(name="Example")
        first = self.source(
            company, {"company": "Example", "company_website": "https://example.com/"}
        )
        OfferSource.objects.create(
            offer=first.offer,
            board=first.board,
            external_id="second",
            origin_url="https://www.linkedin.com/jobs/view/456",
            apply_url="https://www.linkedin.com/jobs/view/456",
            content_hash="b" * 64,
            raw_payload={"company": "Example", "company_website": "https://other.com/"},
        )
        with patch("jobboard.services.company_domains.fetch_public") as fetch:
            with self.assertRaisesMessage(
                CatalogueImportError, "company_domain_conflict"
            ):
                enrich_company_domain(company)
            fetch.assert_not_called()
        company.refresh_from_db()
        self.assertIsNone(company.domain)

    def test_existing_identity_is_preserved(self):
        company = Company.objects.create(
            name="Example", domain="official.com", website_url="https://official.com/"
        )
        self.source(
            company, {"company": "Example", "company_website": "https://other.com/"}
        )
        self.assertEqual(
            enrich_company_domain(company, metadata_only=True), "official.com"
        )
        company.refresh_from_db()
        self.assertEqual(company.domain, "official.com")
        self.assertEqual(company.website_url, "https://official.com/")

    def test_backfill_command_includes_cached_logos_and_resumes_by_id(self):
        skipped = Company.objects.create(
            name="Earlier", website_url="https://earlier.com/"
        )
        company = Company.objects.create(
            name="Example",
            website_url="https://example.com/",
            logo_object_key="existing-logo.png",
        )
        later = Company.objects.create(name="Later", website_url="https://later.com/")
        output = io.StringIO()
        with patch("jobboard.services.company_domains.fetch_public") as fetch:
            call_command(
                "enrich_company_domains",
                metadata_only=True,
                after_id=skipped.pk,
                limit=1,
                stdout=output,
            )
            fetch.assert_not_called()
        for item in (skipped, company, later):
            item.refresh_from_db()
        self.assertIsNone(skipped.domain)
        self.assertEqual(company.domain, "example.com")
        self.assertIsNone(later.domain)
        self.assertIn(f"last company ID: {company.pk}", output.getvalue())


class CompanyHomepageTests(SimpleTestCase):
    def test_normalizes_explicit_https_website_to_homepage(self):
        self.assertEqual(
            employer_homepage("https://www.example.com/en/about?source=jobs"),
            "https://www.example.com/",
        )

    def test_rejects_platforms_credentials_ports_and_private_addresses(self):
        for value in (
            None,
            "http://example.com",
            "https://user:password@example.com",
            "https://example.com:444/",
            "https://127.0.0.1/",
            "https://[::1]/",
            "https://localhost/",
            "https://example.recruitee.com/jobs",
            "https://example.com\n/",
        ):
            with self.subTest(value=value):
                self.assertIsNone(employer_homepage(value))
