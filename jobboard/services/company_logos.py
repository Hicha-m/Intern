"""Extract employer branding from their existing source boards and cache safe PNGs."""

import hashlib
import io
import re
import time
import warnings
from html.parser import HTMLParser
from urllib.parse import urljoin, urlsplit

from PIL import Image, UnidentifiedImageError

from jobboard.integrations.greenhouse_catalogue import CatalogueImportError
from jobboard.integrations.public_html import fetch_public
from jobboard.integrations.storage import storage_bucket, write_object

ATS_HOSTS = {
    "jobs.ashbyhq.com",
    "jobs.lever.co",
    "job-boards.greenhouse.io",
    "boards.greenhouse.io",
    "careers.smartrecruiters.com",
}


class LogoParser(HTMLParser):
    def __init__(self, page_url, company_name):
        super().__init__(convert_charrefs=True)
        self.page_url = page_url
        self.company_name = company_name.casefold()
        self.candidates = []
        self.homepages = []

    def add(self, url, priority):
        if not url:
            return
        url = urljoin(self.page_url, url)
        parts = urlsplit(url)
        if (
            parts.scheme == "https"
            and parts.hostname
            and not parts.path.lower().endswith(".svg")
        ):
            self.candidates.append((priority, url))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if (
            tag == "a"
            and "logo" in (attrs.get("class") or "").casefold()
            and attrs.get("href")
        ):
            target = urljoin(self.page_url, attrs["href"])
            host = urlsplit(target).hostname
            if (
                host
                and host != urlsplit(self.page_url).hostname
                and host not in ATS_HOSTS
                and not host.endswith(".recruitee.com")
            ):
                self.homepages.append(target)
        if tag == "link" and "/api/images/org-theme-logo/" in (attrs.get("href") or ""):
            self.add(attrs["href"], 0)
        if tag == "img":
            description = " ".join(
                (attrs.get(key) or "") for key in ("alt", "class", "id")
            ).casefold()
            if (
                "logo" in description
                and "footer" not in description
                and not any(
                    vendor in description
                    for vendor in (
                        "lever logo",
                        "greenhouse logo",
                        "smartrecruiters logo",
                        "ashby logo",
                    )
                )
            ):
                self.add(attrs.get("src"), 0 if self.company_name in description else 2)
        if (
            tag == "meta"
            and attrs.get("property") == "og:image"
            and "/api/images/org-theme-logo/" in (attrs.get("content") or "")
        ):
            self.add(attrs.get("content"), 0)
        # ATS favicons belong to the platform, not to the employer.
        if tag == "link" and urlsplit(self.page_url).hostname not in ATS_HOSTS:
            rel = attrs.get("rel") or ""
            if "apple-touch-icon" in rel:
                self.add(attrs.get("href"), -21)
            elif "icon" in rel.split():
                sizes = re.findall(r"(\d+)x\d+", attrs.get("sizes") or "")
                size = max((int(value) for value in sizes), default=16)
                self.add(attrs.get("href"), -20 - min(size, 512) / 512)

    def urls(self):
        return list(
            dict.fromkeys(
                url for _, url in sorted(self.candidates, key=lambda item: item[0])
            )
        )[:8]


def normalize_logo(data):
    """Decode only raster formats; bound pixels and strip metadata by re-encoding."""
    with warnings.catch_warnings():
        warnings.simplefilter("error", Image.DecompressionBombWarning)
        try:
            with Image.open(
                io.BytesIO(data), formats=["PNG", "JPEG", "WEBP", "GIF", "ICO"]
            ) as source:
                if source.width * source.height > 4_000_000 or min(source.size) < 8:
                    raise CatalogueImportError("invalid_logo_dimensions")
                source.seek(0)
                image = source.convert("RGBA")
                image.thumbnail((256, 256), Image.Resampling.LANCZOS)
                output = io.BytesIO()
                image.save(output, format="PNG")
                return output.getvalue()
        except (
            UnidentifiedImageError,
            OSError,
            ValueError,
            Image.DecompressionBombError,
            Image.DecompressionBombWarning,
        ) as exc:
            raise CatalogueImportError("invalid_logo_image") from exc


def cache_logo(company, image_url, deadline=None):
    _, data = fetch_public(image_url, deadline=deadline, image=True)
    png = normalize_logo(data)
    digest = hashlib.sha256(png).hexdigest()
    key = f"company-logos/{company.pk}/{digest}.png"
    try:
        write_object(storage_bucket(), key, png, content_type="image/png")
    except FileExistsError:
        pass
    company.logo_object_key = key
    company.logo_next_attempt_at = None
    company.logo_last_error = ""
    company.save(
        update_fields=[
            "logo_object_key",
            "logo_next_attempt_at",
            "logo_last_error",
            "updated_at",
        ]
    )
    return key


def extract_logo(company, *, page_url=None):
    pages = ([page_url] if page_url else []) + (
        [company.website_url] if company.website_url else []
    )
    pages += list(company.source_boards.values_list("base_url", flat=True))
    if company.domain and not company.website_url:
        pages.append(f"https://{company.domain}/")
    failures = []
    deadline = time.monotonic() + 45
    pages = list(dict.fromkeys(pages))[:3]
    for page in pages:
        if time.monotonic() >= deadline:
            break
        try:
            final_url, html = fetch_public(page, deadline=deadline)
            parser = LogoParser(final_url, company.name)
            parser.feed(html)
            for homepage in parser.homepages:
                if homepage not in pages and len(pages) < 3:
                    pages.append(homepage)
            for url in parser.urls():
                try:
                    return cache_logo(company, url, deadline)
                except CatalogueImportError as exc:
                    failures.append(str(exc))
        except (CatalogueImportError, ValueError) as exc:
            failures.append(str(exc))
    raise CatalogueImportError(
        "logo_not_found"
        + (": " + ", ".join(dict.fromkeys(failures)) if failures else "")
    )


def process_logo_jobs(limit=5):
    """New companies are due by default. Lease work before doing any network I/O."""
    import logging
    from datetime import timedelta

    from django.db import transaction
    from django.db.models import Q
    from django.utils import timezone

    from jobboard.models import Company

    processed = 0
    for _ in range(limit):
        with transaction.atomic():
            company = (
                Company.objects.select_for_update(skip_locked=True)
                .filter(
                    Q(logo_object_key__isnull=True) | Q(logo_object_key=""),
                    logo_next_attempt_at__lte=timezone.now(),
                )
                .order_by("logo_next_attempt_at", "pk")
                .first()
            )
            if company is None:
                break
            company.logo_attempts += 1
            company.logo_next_attempt_at = timezone.now() + timedelta(minutes=10)
            company.save(update_fields=["logo_attempts", "logo_next_attempt_at"])
        try:
            extract_logo(company)
        except Exception as exc:
            # Keep the queue alive; unexpected errors remain visible in worker logs.
            if not isinstance(exc, CatalogueImportError):
                logging.getLogger(__name__).exception(
                    "Company logo extraction failed for %s", company.pk
                )
            delay = min(7 * 24 * 60, 10 * 2 ** min(company.logo_attempts - 1, 10))
            Company.objects.filter(
                pk=company.pk, logo_object_key=company.logo_object_key
            ).update(
                logo_next_attempt_at=timezone.now() + timedelta(minutes=delay),
                logo_last_error=str(exc)[:240],
            )
        processed += 1
    return processed
