import io
import socket
import tempfile
from unittest.mock import MagicMock, patch

from django.contrib.auth import get_user_model
from django.test import SimpleTestCase, TestCase, override_settings
from PIL import Image

from jobboard.api.read_serializers import CompanySerializer
from jobboard.integrations.greenhouse_catalogue import CatalogueImportError
from jobboard.integrations.public_html import fetch_public
from jobboard.models import Company
from jobboard.services.company_logos import LogoParser, cache_logo, normalize_logo


def png():
    output = io.BytesIO()
    Image.new("RGB", (64, 32), "red").save(output, format="PNG")
    return output.getvalue()


class LogoExtractionTests(SimpleTestCase):
    def test_platform_icon_is_not_an_employer_logo(self):
        parser = LogoParser("https://jobs.ashbyhq.com/example", "Example")
        parser.feed(
            '<link rel="icon" href="/ashby.png"><meta property="og:image" content="https://app.ashbyhq.com/api/images/org-theme-logo/company/image">'
        )
        self.assertEqual(
            parser.urls(),
            ["https://app.ashbyhq.com/api/images/org-theme-logo/company/image"],
        )

    def test_logo_has_priority_and_vendor_footer_is_excluded(self):
        parser = LogoParser("https://jobs.lever.co/example", "Example")
        parser.feed(
            '<img alt="Lever logo" src="/lever.png"><img alt="Example logo" src="https://cdn.example.com/logo.png">'
        )
        self.assertEqual(parser.urls(), ["https://cdn.example.com/logo.png"])

    def test_employer_icon_is_preferred_to_customer_marketing_images(self):
        parser = LogoParser("https://example.com", "Example")
        parser.feed(
            '<img alt="Customer using Example logo" src="/customer.png"><link rel="apple-touch-icon" href="/brand.png">'
        )
        self.assertEqual(parser.urls()[0], "https://example.com/brand.png")

    def test_text_only_ats_brand_link_can_lead_to_the_official_site(self):
        parser = LogoParser("https://example.recruitee.com", "Example")
        parser.feed('<a class="navigation-logo" href="https://example.com">Example</a>')
        self.assertEqual(parser.homepages, ["https://example.com"])

    def test_raster_validation_rejects_html_svg_and_oversized_dimensions(self):
        for data in (
            b"<html>not a logo</html>",
            b'<svg xmlns="http://www.w3.org/2000/svg"/>',
        ):
            with self.assertRaises(CatalogueImportError):
                normalize_logo(data)
        output = io.BytesIO()
        Image.new("RGB", (2001, 2000)).save(output, format="PNG")
        with self.assertRaises(CatalogueImportError):
            normalize_logo(output.getvalue())
        self.assertTrue(normalize_logo(png()).startswith(b"\x89PNG"))

    def test_cross_host_redirect_still_rejects_private_dns(self):
        response = MagicMock(status=302)
        response.getheader.return_value = "https://internal.example/logo.png"

        def addresses(host, *args, **kwargs):
            ip = "1.1.1.1" if host == "public.example" else "127.0.0.1"
            return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", (ip, 443))]

        with (
            patch("socket.getaddrinfo", side_effect=addresses),
            patch("jobboard.integrations.public_html.PinnedHTTPSConnection") as conn,
        ):
            conn.return_value.getresponse.return_value = response
            with self.assertRaises(CatalogueImportError):
                fetch_public("https://public.example/logo.png", image=True)
            self.assertEqual(conn.call_count, 1)


class CachedLogoTests(TestCase):
    def test_cached_logo_serialization_and_authenticated_delivery(self):
        company = Company.objects.create(name="Example")
        self.assertIsNone(CompanySerializer(company).data["logo_url"])
        with (
            tempfile.TemporaryDirectory() as root,
            override_settings(
                PRIVATE_STORAGE_BACKEND="local", PRIVATE_STORAGE_ROOT=root
            ),
            patch(
                "jobboard.services.company_logos.fetch_public",
                return_value=("https://example.com/logo.png", png()),
            ) as fetch,
        ):
            cache_logo(company, "https://example.com/logo.png")
            cache_logo(company, "https://example.com/logo.png")
            self.assertEqual(fetch.call_count, 2)
            url = CompanySerializer(company).data["logo_url"]
            self.assertIn(f"/companies/{company.pk}/logo/", url)
            self.assertIn(self.client.get(url).status_code, (401, 403))
            user = get_user_model().objects.create_user(
                username="logo-test", password="test-password"
            )
            self.client.force_login(user)
            response = self.client.get(url)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response["Content-Type"], "image/png")
            self.assertTrue(response.content.startswith(b"\x89PNG"))
            self.assertEqual(
                fetch.call_count, 2, "Serving a logo must not make network calls"
            )
            company.logo_object_key = "documents/private.pdf"
            company.save()
            self.assertEqual(self.client.get(url).status_code, 404)


class LogoQueueTests(TestCase):
    def test_new_company_is_automatically_due_and_retry_is_delayed(self):
        from django.utils import timezone

        from jobboard.services.company_logos import process_logo_jobs

        company = Company.objects.create(name="New employer")
        self.assertLessEqual(company.logo_next_attempt_at, timezone.now())
        with patch(
            "jobboard.services.company_logos.extract_logo",
            side_effect=CatalogueImportError("public_fetch_failed"),
        ) as extract:
            self.assertEqual(process_logo_jobs(), 1)
            self.assertEqual(process_logo_jobs(), 0)
            extract.assert_called_once()
        company.refresh_from_db()
        self.assertEqual(company.logo_attempts, 1)
        self.assertGreater(company.logo_next_attempt_at, timezone.now())
        self.assertEqual(company.logo_last_error, "public_fetch_failed")

    def test_successful_retry_stops_future_jobs(self):
        from jobboard.services.company_logos import process_logo_jobs

        company = Company.objects.create(
            name="New employer", logo_last_error="old failure", logo_attempts=1
        )
        with (
            tempfile.TemporaryDirectory() as root,
            override_settings(
                PRIVATE_STORAGE_BACKEND="local", PRIVATE_STORAGE_ROOT=root
            ),
            patch(
                "jobboard.services.company_logos.fetch_public",
                return_value=("https://example.com/logo.png", png()),
            ),
            patch(
                "jobboard.services.company_logos.extract_logo",
                side_effect=lambda company: cache_logo(
                    company, "https://example.com/logo.png"
                ),
            ),
        ):
            self.assertEqual(process_logo_jobs(), 1)
            self.assertEqual(process_logo_jobs(), 0)
        company.refresh_from_db()
        self.assertIsNone(company.logo_next_attempt_at)
        self.assertEqual(company.logo_last_error, "")
        self.assertTrue(company.logo_object_key)

    def test_catalogue_worker_consumes_logo_queue(self):
        from django.core.management import call_command

        with (
            patch(
                "jobboard.management.commands.run_catalogue_worker.close_old_connections"
            ),
            patch(
                "jobboard.management.commands.run_catalogue_worker.process_logo_jobs",
                return_value=1,
            ) as logos,
            patch(
                "jobboard.management.commands.run_catalogue_worker.schedule_due",
                return_value=0,
            ),
            patch(
                "jobboard.management.commands.run_catalogue_worker.process_one",
                return_value=False,
            ),
            patch("jobboard.services.engine_discovery.run_discovery"),
            patch("jobboard.services.engine_search_discovery.run_search_discovery"),
            patch("jobboard.services.engine_alerts.run_alerts"),
            patch("jobboard.services.engine_external.process_external_opportunities"),
        ):
            call_command("run_catalogue_worker", once=True, stdout=io.StringIO())
            logos.assert_called_once_with(limit=5)
