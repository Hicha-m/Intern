"""Inspected Eightfold PCSX public endpoints, without authenticated fallback."""

import re
import time
from urllib.parse import urlencode, urlsplit

from .greenhouse_catalogue import CatalogueImportError
from .personio_catalogue import html_text
from .public_catalogue import CatalogueSnapshot, _posting, read_json
from .public_html import validate_url

# API host, tenant domain, public job host, employer.
BOARDS = {
    "nvidia": ("nvidia.eightfold.ai", "nvidia.com", "jobs.nvidia.com", "NVIDIA"),
    "dolby": ("dolby.eightfold.ai", "dolby.com", "dolby.eightfold.ai", "Dolby"),
    "bayer": ("bayer.eightfold.ai", "bayer.com", "bayer.eightfold.ai", "Bayer"),
    "microsoft": (
        "apply.careers.microsoft.com",
        "microsoft.com",
        "apply.careers.microsoft.com",
        "Microsoft",
    ),
}
TERMS = ("intern", "Praktikum", "stage", "tirocinio")
MAX_PAGES = 20
MAX_DETAILS = 120
REQUEST_INTERVAL = 2.0


def parse_eightfold_url(url):
    for key, (host, _, public, _) in BOARDS.items():
        if urlsplit(url).hostname in (host, public):
            parts = validate_url(url, {host, public})
            if parts.query or not re.fullmatch(
                r"/?(?:careers/?|careers/job/[0-9]+/?)?", parts.path
            ):
                raise CatalogueImportError("expected_board_url")
            return {
                "provider": "eightfold",
                "instance": "global",
                "board_key": key,
                "canonical": f"https://{host}/careers",
            }
    raise CatalogueImportError("unsupported_source_url")


def locations(job):
    values = job.get("standardizedLocations")
    if not isinstance(values, list) or len(values) > 100:
        raise CatalogueImportError("eightfold_missing_locations")
    result = []
    from jobboard.services.engine_quality import structured_country_code

    for value in values:
        if not isinstance(value, str) or len(value) > 240:
            raise CatalogueImportError("invalid_location")
        parts = [part.strip() for part in value.split(",")]
        code = (
            (
                parts[-1]
                if re.fullmatch(r"[A-Z]{2}", parts[-1])
                else structured_country_code(parts[-1])
            )
            if len(parts) > 1
            else None
        )
        result.append({"name": value, "country": code or ""})
    return result


def normalize_eightfold(job, key, expected_id):
    from jobboard.services.engine_quality import extract_facts, structured_country_code

    if not isinstance(job, dict) or str(job.get("id")) != expected_id:
        raise CatalogueImportError("eightfold_identity_mismatch")
    description = job.get("jobDescription")
    if not isinstance(description, str) or not 40 <= len(description.strip()) <= 200000:
        raise CatalogueImportError("eightfold_missing_description")
    description = html_text(description)
    if len(description.strip()) < 40:
        raise CatalogueImportError("eightfold_missing_description")
    places = locations(job)
    mode = {
        "remote": "remote",
        "hybrid": "hybrid",
        "onsite": "onsite",
        "on-site": "onsite",
    }.get(job.get("workLocationOption"), "unknown")
    facts = extract_facts(
        job.get("name") or "",
        description,
        locations=[
            {"name": p["name"], "country_code": structured_country_code(p["country"])}
            for p in places
        ],
        work_mode=mode,
    )
    if facts["classification"] != "confirmed" or facts["europe_status"] != "in_scope":
        return None
    # Numeric Eightfold id is stable; upstream displayJobId retained as evidence only.
    url = f"https://{BOARDS[key][2]}/careers/job/{expected_id}"
    raw = {
        field: job.get(field)
        for field in [
            "id",
            "displayJobId",
            "atsJobId",
            "name",
            "standardizedLocations",
            "jobDescription",
            "workLocationOption",
            "postedTs",
        ]
    }
    row = _posting(
        raw,
        expected_id,
        job.get("name"),
        description,
        url,
        url,
        [p["name"] for p in places],
    )
    row.update(location_details=places, work_mode=mode)
    return row


def fetch_eightfold(key):
    from jobboard.services.engine_quality import EUROPE_COUNTRIES, INTERN

    if key not in BOARDS:
        raise CatalogueImportError("unknown_eightfold_board")
    host, domain, _, _ = BOARDS[key]
    deadline = time.monotonic() + 300
    used = 0
    next_request_at = 0.0

    def read(endpoint, **params):
        nonlocal used, next_request_at
        delay = max(0.0, next_request_at - time.monotonic())
        if delay:
            time.sleep(delay)
        if time.monotonic() >= deadline:
            raise CatalogueImportError("eightfold_deadline")
        next_request_at = time.monotonic() + REQUEST_INTERVAL
        payload = read_json(
            f"https://{host}/api/pcsx/{endpoint}?"
            + urlencode({"domain": domain, **params}),
            deadline=deadline,
        )
        import json

        used += len(json.dumps(payload).encode())
        if used > 30 * 1024 * 1024:
            raise CatalogueImportError("eightfold_byte_budget")
        if (
            not isinstance(payload, dict)
            or payload.get("status") != 200
            or not isinstance(payload.get("data"), dict)
        ):
            raise CatalogueImportError("eightfold_invalid_response")
        return payload["data"]

    rows, errors, seen = [], [], set()
    details = 0
    for term in TERMS:
        expected_count = None
        page_seen = set()
        for page in range(MAX_PAGES):
            data = read("search", query=term, start=page * 10, sort_by="timestamp")
            count, batch = data.get("count"), data.get("positions")
            if (
                type(count) is not int
                or count < 0
                or not isinstance(batch, list)
                or len(batch) > 10
            ):
                raise CatalogueImportError("eightfold_invalid_page")
            if expected_count is None:
                expected_count = count
            if count != expected_count or len(batch) != max(
                0, min(10, count - page * 10)
            ):
                raise CatalogueImportError("eightfold_changed_page")
            for job in batch:
                if not isinstance(job, dict) or not re.fullmatch(
                    r"[0-9]{1,30}", str(job.get("id", ""))
                ):
                    raise CatalogueImportError("eightfold_invalid_identity")
                identity = str(job["id"])
                if identity in page_seen:
                    raise CatalogueImportError("eightfold_duplicate_page")
                page_seen.add(identity)
                if identity in seen:
                    continue
                seen.add(identity)
                if not isinstance(job.get("name"), str) or not re.search(
                    INTERN, job["name"], re.IGNORECASE
                ):
                    continue
                try:
                    places = locations(job)
                    if (
                        places
                        and all(p["country"] for p in places)
                        and not any(p["country"] in EUROPE_COUNTRIES for p in places)
                    ):
                        continue
                    details += 1
                    if details > MAX_DETAILS:
                        raise CatalogueImportError("eightfold_detail_budget")
                    detail = read("position_details", position_id=identity, hl="en")
                    row = normalize_eightfold(detail, key, identity)
                    if row is not None:
                        rows.append(row)
                except CatalogueImportError as exc:
                    errors.append({"external_id": identity, "code": exc.code})
                    if exc.code in (
                        "upstream_rate_limited",
                        "eightfold_deadline",
                        "eightfold_byte_budget",
                        "eightfold_detail_budget",
                    ):
                        return CatalogueSnapshot(rows, complete=False, errors=errors)
            if (page + 1) * 10 >= count:
                break
        else:
            errors.append({"code": "eightfold_page_cap", "term": term})
    return CatalogueSnapshot(rows, complete=False, errors=errors)
