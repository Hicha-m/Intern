"""Explicit experience statements; no inference from contract, seniority or duration."""

import re
from decimal import Decimal

from django.db import transaction
from django.db.models import F

from jobboard.models import ExperienceEvidence, ExperienceExtraction

from .offer_content import section_kind
from .requirement_text import source_sentences
from .skill_requirements import NEGATED, PREFERRED, REQUIRED, description_fields

VERSION = "experience-1"
NUMBER = r"(?<![\w.,])\d{1,3}(?:[.,]\d{1,2})?"
UNIT = r"(?:years?|ans?|années?|months?|mois)\b"
RANGE = re.compile(
    rf"({NUMBER})\s*(?:-|–|to|à|and|et)\s*(\d{{1,3}}(?:[.,]\d{{1,2}})?)\s*({UNIT})",
    re.I,
)
SINGLE = re.compile(rf"({NUMBER})\s*(\+)?\s*({UNIT})", re.I)
EXPERIENCE = re.compile(r"\b(?:experience|expérience)s?\b", re.I)
NO_EXPERIENCE = re.compile(
    r"\b(?:no (?:prior |previous |professional )?experience (?:is )?(?:required|necessary)|sans expérience|aucune expérience (?:n.est )?(?:requise|exigée))\b",
    re.I,
)


def extract_experience(text, initial_section="other"):
    for part in source_sentences(text, initial_section):
        ordinal = 0
        for clause in re.split(r";|\bbut\b|\bmais\b", part["visible"], flags=re.I):
            if not EXPERIENCE.search(clause):
                continue
            if re.search(
                r"\b(?:company|entreprise|founded|fondée|anniversary|anniversaire)\b",
                clause,
                re.I,
            ):
                continue
            preferred, required = (
                bool(PREFERRED.search(clause)),
                bool(REQUIRED.search(clause)),
            )
            qualification = (
                "unspecified"
                if preferred and required
                else "preferred"
                if preferred or part["section"] == "preferred"
                else "required"
                if required or part["section"] == "requirements"
                else "unspecified"
            )
            common = {key: part[key] for key in ("start", "end", "excerpt")}
            common.update(alternative=bool(re.search(r"\b(?:or|ou)\b", clause, re.I)))
            if NO_EXPERIENCE.search(clause):
                yield {
                    **common,
                    "qualification": "not_required",
                    "comparison": "none_required",
                    "minimum": Decimal("0"),
                    "maximum": None,
                    "stated": None,
                    "unit": "year",
                    "inclusive": True,
                    "ordinal": ordinal,
                }
                ordinal += 1
                continue
            if NEGATED.search(clause):
                qualification = "negated"
            ranges = list(RANGE.finditer(clause))
            singles = [
                match
                for match in SINGLE.finditer(clause)
                if not any(a.start() <= match.start() < a.end() for a in ranges)
            ]
            for match in sorted([*ranges, *singles], key=lambda match: match.start()):
                minimum = maximum = stated = None
                inclusive = True
                if match in ranges:
                    minimum = Decimal(match[1].replace(",", "."))
                    maximum = Decimal(match[2].replace(",", "."))
                    if maximum < minimum:
                        continue
                    unit = match[3]
                    comparison = "range"
                else:
                    value = Decimal(match[1].replace(",", "."))
                    unit = match[3]
                    before, after = (
                        clause[max(0, match.start() - 35) : match.start()],
                        clause[match.end() : match.end() + 25],
                    )
                    if re.search(
                        r"(?:at most|up to|no more than|maximum|max\.?|jusqu[’\x27]à|moins de|less than)\s*$",
                        before,
                        re.I,
                    ):
                        maximum, comparison = value, "maximum"
                        inclusive = not bool(
                            re.search(r"less than|moins de", before, re.I)
                        )
                    elif (
                        match[2]
                        or re.search(
                            r"(?:at least|minimum|min\.?|au moins|more than|plus de)\s*$",
                            before,
                            re.I,
                        )
                        or re.match(r"\s*(?:or more|minimum|au minimum)\b", after, re.I)
                        or re.search(r"\b(?:minimum|au minimum)\b", after, re.I)
                    ):
                        minimum, comparison = value, "minimum"
                        inclusive = not bool(
                            re.search(r"more than|plus de", before, re.I)
                        )
                    else:
                        stated, comparison = value, "stated"
                yield {
                    **common,
                    "qualification": qualification,
                    "comparison": comparison,
                    "minimum": minimum,
                    "maximum": maximum,
                    "stated": stated,
                    "unit": "month"
                    if unit.casefold().startswith(("month", "mois"))
                    else "year",
                    "inclusive": inclusive,
                    "ordinal": ordinal,
                }
                ordinal += 1


@transaction.atomic
def extract_revision_experience(revision):
    type(revision).objects.select_for_update().get(pk=revision.pk)
    existing = ExperienceExtraction.objects.filter(
        revision=revision, version=VERSION
    ).first()
    if existing:
        return existing
    fields = description_fields(revision.payload)
    status = (
        "no_description"
        if not fields
        else "too_large"
        if sum(len(text) for _, text in fields) > 200000
        else "processed"
    )
    extraction = ExperienceExtraction.objects.create(
        revision=revision,
        version=VERSION,
        status=status,
        processed_fields=[path for path, _ in fields],
    )
    if status != "processed":
        return extraction
    for path, text in fields:
        initial = "other"
        group = re.fullmatch(r"lists\.(\d+)\.content", path)
        if group:
            initial = section_kind(
                revision.payload["lists"][int(group[1])].get("text", "")
            )
        for fact in extract_experience(text, initial):
            ExperienceEvidence.objects.create(
                extraction=extraction, json_path=path, **fact
            )
    return extraction


def current_experience_evidence(offers):
    from .engine_filters import fresh_sources

    return ExperienceEvidence.objects.filter(
        extraction__version=VERSION,
        extraction__revision__source_id__in=fresh_sources().values("pk"),
        extraction__revision__source__offer_id__in=offers.values("pk"),
        extraction__revision__raw_hash=F("extraction__revision__source__content_hash"),
    )
