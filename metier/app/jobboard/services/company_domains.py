"""Source-backed employer identity, independent of logo downloads."""

import time
from urllib.parse import urlsplit

from django.utils import timezone

from jobboard.integrations.greenhouse_catalogue import CatalogueImportError
from jobboard.integrations.public_html import fetch_public
from jobboard.models import Company, OfferSource
from jobboard.services.company_logos import (
    LogoParser,
    employer_domain,
    platform_host,
    same_name,
)


def employer_homepage(value):
    """Normalize an explicit website URL; never derive it from an employer name."""
    if not isinstance(value, str) or not value or len(value) > 2048:
        return None
    if any(ord(char) < 33 for char in value):
        return None
    try:
        parts = urlsplit(value if "://" in value else "https://" + value)
        if (
            parts.scheme != "https"
            or parts.username
            or parts.password
            or parts.port not in (None, 443)
            or not parts.hostname
        ):
            return None
        domain = employer_domain("https://" + parts.hostname + "/")
    except ValueError:
        return None
    return "https://" + domain + "/" if domain else None


def company_identity_sources(company):
    sources = (
        OfferSource.objects.filter(
            offer__company=company,
            source_status="active",
            board__provider__in=["wttj", "jobspy"],
        )
        .select_related("board")
        .order_by("-last_seen_at", "pk")[:4]
    )
    return [
        source
        for source in sources
        if isinstance(source.raw_payload, dict)
        and isinstance(source.raw_payload.get("company"), str)
        and same_name(source.raw_payload["company"], company.name)
    ]


def source_homepages(sources):
    return list(
        dict.fromkeys(
            homepage
            for source in sources
            if (
                homepage := employer_homepage(source.raw_payload.get("company_website"))
            )
        )
    )


def domain_key(domain):
    return domain.removeprefix("www.")


def conflicting_homepages(homepages):
    return len({domain_key(employer_domain(page)) for page in homepages}) > 1


def record_company_domain(company, homepage):
    homepage = employer_homepage(homepage)
    if not homepage:
        return None
    domain = employer_domain(homepage)
    current_domain = employer_domain(company.domain)
    current_homepage = employer_homepage(company.website_url)
    if current_domain and domain_key(current_domain) != domain_key(domain):
        return None
    if current_homepage and domain_key(employer_domain(current_homepage)) != domain_key(
        domain
    ):
        return None
    changes = {}
    if not current_domain:
        changes["domain"] = domain
    if not current_homepage:
        changes["website_url"] = homepage
    if changes:
        # A concurrent enrichment or operator edit must not be overwritten.
        updated = Company.objects.filter(
            pk=company.pk,
            domain=company.domain,
            website_url=company.website_url,
        ).update(**changes, updated_at=timezone.now())
        if updated:
            for field, value in changes.items():
                setattr(company, field, value)
        else:
            company.refresh_from_db(fields=["domain", "website_url"])
    return employer_domain(company.domain)


def record_known_company_domain(company, homepages):
    for value in (company.website_url, company.domain):
        if domain := record_company_domain(company, value):
            return domain
    # Conflicting source websites remain unresolved rather than choosing one.
    if homepages and not conflicting_homepages(homepages):
        return record_company_domain(company, homepages[0])
    return None


def employer_pages(company, *, page_url=None, homepages=()):
    pages = [page_url] if page_url else []
    if company.website_url:
        pages.append(company.website_url)
    pages += list(homepages)
    pages += list(
        company.source_boards.order_by("pk").values_list("base_url", flat=True)
    )
    if company.domain and not company.website_url:
        pages.append(f"https://{company.domain}/")
    pages += list(
        OfferSource.objects.filter(offer__company=company, source_status="active")
        .order_by("-last_seen_at", "pk")
        .values_list("origin_url", flat=True)[:2]
    )

    def useful_page(page):
        try:
            parts = urlsplit(page)
            return (
                parts.scheme == "https"
                and parts.hostname
                and not (platform_host(parts.hostname) and parts.path in ("", "/"))
            )
        except ValueError:
            return False

    return [page for page in dict.fromkeys(pages) if useful_page(page)][:5]


def record_page_domain(company, final_url, parser):
    homepages = list(dict.fromkeys(parser.structured_homepages))
    if homepages:
        return (
            record_company_domain(company, homepages[0])
            if not conflicting_homepages(homepages)
            else None
        )
    if not platform_host(urlsplit(final_url).hostname):
        return record_company_domain(company, final_url)
    return None


def enrich_company_domain(company, *, page_url=None, metadata_only=False):
    """Resolve identity even for companies with cached, missing or broken logos."""
    homepages = source_homepages(company_identity_sources(company))
    if domain := record_known_company_domain(company, homepages):
        return domain
    if conflicting_homepages(homepages) and not page_url:
        raise CatalogueImportError("company_domain_conflict")
    if metadata_only:
        raise CatalogueImportError("company_domain_not_found")
    deadline = time.monotonic() + 45
    pages = employer_pages(company, page_url=page_url, homepages=homepages)
    for page in pages:
        if time.monotonic() >= deadline:
            break
        try:
            final_url, html = fetch_public(page, deadline=deadline)
            parser = LogoParser(final_url, company.name)
            parser.feed(html)
            if domain := record_page_domain(company, final_url, parser):
                return domain
            if conflicting_homepages(parser.structured_homepages):
                continue
            for homepage in parser.homepages:
                if homepage not in pages and len(pages) < 5:
                    pages.append(homepage)
        except (CatalogueImportError, ValueError):
            continue
    raise CatalogueImportError("company_domain_not_found")
