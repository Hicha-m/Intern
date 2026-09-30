"""Bounded, public Greenhouse board reads. No submission credentials involved."""

import hashlib
import html
import json
import re
from html.parser import HTMLParser
from urllib.parse import urlsplit

import httpx

MAX_RESPONSE_BYTES = 20 * 1024 * 1024


class CatalogueImportError(Exception):
    def __init__(self, code):
        self.code = code
        super().__init__(code)


class _Text(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)


def normalize_snapshot(payload):
    if not isinstance(payload, dict) or not isinstance(payload.get("jobs"), list):
        raise CatalogueImportError("invalid_snapshot")
    total = (
        payload.get("meta", {}).get("total")
        if isinstance(payload.get("meta"), dict)
        else None
    )
    jobs = payload["jobs"]
    if type(total) is not int or total != len(jobs):
        raise CatalogueImportError("incomplete_snapshot")
    normalized, ids = [], set()
    for job in jobs:
        if (
            not isinstance(job, dict)
            or type(job.get("id")) is not int
            or job["id"] <= 0
        ):
            raise CatalogueImportError("invalid_job")
        external_id = str(job["id"])
        title, content, url = (
            job.get("title"),
            job.get("content"),
            job.get("absolute_url"),
        )
        if (
            external_id in ids
            or not isinstance(title, str)
            or not title.strip()
            or len(title) > 300
        ):
            raise CatalogueImportError("invalid_job")
        if not isinstance(content, str) or not isinstance(url, str) or len(url) > 2048:
            raise CatalogueImportError("invalid_job")
        parsed = urlsplit(url)
        if (
            parsed.scheme != "https"
            or not parsed.hostname
            or parsed.username
            or parsed.password
        ):
            raise CatalogueImportError("invalid_job_url")
        location = job.get("location")
        location = location.get("name") if isinstance(location, dict) else None
        if location is not None and (
            not isinstance(location, str) or len(location) > 240
        ):
            raise CatalogueImportError("invalid_location")
        parser = _Text()
        parser.feed(html.unescape(content))
        normalized.append(
            {
                "external_id": external_id,
                "title": title.strip(),
                "description": "\n".join(parser.parts),
                "url": url,
                "location": location.strip() if location else None,
                "hash": hashlib.sha256(
                    json.dumps(
                        job, sort_keys=True, separators=(",", ":"), allow_nan=False
                    ).encode()
                ).hexdigest(),
                "raw": job,
            }
        )
        ids.add(external_id)
    return normalized


def fetch_snapshot(board_key):
    if not isinstance(board_key, str) or not re.fullmatch(
        r"[A-Za-z0-9_-]{1,240}", board_key
    ):
        raise CatalogueImportError("invalid_board_key")
    url = f"https://boards-api.greenhouse.io/v1/boards/{board_key}/jobs?content=true"
    try:
        with httpx.Client(
            timeout=20, follow_redirects=False, trust_env=False
        ) as client:
            with client.stream(
                "GET", url, headers={"Accept": "application/json"}
            ) as response:
                if response.status_code != 200:
                    raise CatalogueImportError("upstream_http_error")
                data = bytearray()
                for chunk in response.iter_bytes():
                    data.extend(chunk)
                    if len(data) > MAX_RESPONSE_BYTES:
                        raise CatalogueImportError("response_too_large")
        payload = json.loads(data)
        normalize_snapshot(
            payload
        )  # Validate the whole response before touching catalogue rows.
        return payload
    except (httpx.HTTPError, ValueError, TypeError, OverflowError) as exc:
        raise CatalogueImportError("upstream_invalid_response") from exc
