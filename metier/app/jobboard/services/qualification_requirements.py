"""Explicit credentials and existing language rules, with source provenance."""

import re

from django.db import transaction
from django.db.models import F

from jobboard.models import QualificationEvidence, QualificationExtraction

from .offer_content import section_kind
from .offer_languages import LANGUAGE_RULE_VERSION, language_facts
from .requirement_text import source_sentences
from .skill_requirements import NEGATED, PREFERRED, REQUIRED, description_fields

VERSION = "qualifications-1-" + LANGUAGE_RULE_VERSION
EDUCATION = {
    "bac": r"Bac\s*\+\s*[1-8]",
    "bachelor": r"bachelor(?:['’]s)?(?:\s+degree)?",
    "master": r"master(?:['’]s)?(?:\s+degree)?",
    "bsc": r"B\.?Sc\.?",
    "msc": r"M\.?Sc\.?",
    "phd": r"Ph\.?D\.?|doctorat",
    "mba": r"MBA",
    "licence": r"licence\s+(?:professionnelle|en\s+\w+)|diplôme de licence",
    "bts": r"BTS",
    "dut": r"DUT",
}
CERTIFICATIONS = {
    "cissp": r"CISSP",
    "cism": r"CISM",
    "ceh": r"CEH",
    "oscp": r"OSCP",
    "comptia-security-plus": r"CompTIA\s+Security\+",
    "comptia-network-plus": r"CompTIA\s+Network\+",
    "cka": r"Certified Kubernetes Administrator|CKA",
    "ckad": r"Certified Kubernetes Application Developer|CKAD",
    "az-900": r"AZ-900",
    "az-104": r"AZ-104",
    "az-305": r"AZ-305",
    "aws-solutions-architect-associate": r"AWS Certified Solutions Architect\s*[-–]?\s*Associate",
    "aws-solutions-architect-professional": r"AWS Certified Solutions Architect\s*[-–]?\s*Professional",
    "aws-solutions-architect": r"AWS Certified Solutions Architect",
}
NO_DEGREE = re.compile(
    r"\b(?:no (?:formal )?degree (?:is )?required|aucun diplôme (?:n.est )?(?:requis|exigé)|diplôme (?:non requis|pas obligatoire))\b",
    re.I,
)


def prose(text):
    return re.sub(r"https?://\S+|www\.\S+", " ", text, flags=re.I)


def named_matches(text, vocabulary):
    # Long aliases win at a shared offset; do not count a generic certification
    # again inside its explicitly named associate/professional form.
    patterns = [
        (code, re.compile(r"(?<!\w)(?:" + alias + r")(?!\w)", re.I))
        for code, alias in vocabulary.items()
    ]
    candidates = [
        (match.start(), match.end(), code, match.group())
        for code, pattern in patterns
        for match in pattern.finditer(text)
    ]
    accepted = []
    for start, end, code, label in sorted(
        candidates, key=lambda row: (row[0], -(row[1] - row[0]))
    ):
        if any(start < b and end > a for a, b, _, _ in accepted):
            continue
        if (
            code == "master"
            and label.casefold() == "master"
            and not re.match(
                r"\s+(?:en|in|of|de|required|preferred|requis|obligatoire|souhait)",
                text[end:],
                re.I,
            )
        ):
            continue
        accepted.append((start, end, code, label))
    return accepted


def extract_qualifications(text, initial_section="other"):
    for part in source_sentences(text, initial_section, abbreviations=True):
        ordinal = 0
        for clause in re.split(
            r";|\bbut\b|\bmais\b", prose(part["visible"]), flags=re.I
        ):
            matches = [
                ("education", *item) for item in named_matches(clause, EDUCATION)
            ] + [
                ("certification", *item)
                for item in named_matches(clause, CERTIFICATIONS)
            ]
            required, preferred, negated = (
                bool(REQUIRED.search(clause)),
                bool(PREFERRED.search(clause)),
                bool(
                    NEGATED.search(clause)
                    or re.search(
                        r"\b(?:(?:non|pas)\s+(?:requis[es]*|exig[ée]e?s?|obligatoires?)|not (?:required|mandatory|necessary))\b",
                        clause,
                        re.I,
                    )
                ),
            )
            qualification = (
                "unspecified"
                if (required and preferred)
                else "negated"
                if negated
                else "preferred"
                if preferred or part["section"] == "preferred"
                else "required"
                if required or part["section"] == "requirements"
                else "unspecified"
            )
            common = {key: part[key] for key in ("start", "end", "excerpt")}
            common["alternative"] = bool(re.search(r"\b(?:or|ou)\b|/", clause, re.I))
            if NO_DEGREE.search(clause):
                yield {
                    **common,
                    "kind": "education",
                    "code": "no-degree-required",
                    "qualification": "not_required",
                    "value": {"named_text": NO_DEGREE.search(clause).group()},
                    "ordinal": ordinal,
                }
                ordinal += 1
            for kind, start, end, code, label in matches:
                if code == "bac":
                    code = "bac+" + re.search(r"[1-8]", label).group()
                yield {
                    **common,
                    "kind": kind,
                    "code": code,
                    "qualification": qualification,
                    "value": {"named_text": label},
                    "ordinal": ordinal,
                }
                ordinal += 1
        groups = (
            language_facts(prose(part["visible"]), VERSION)
            .get("language_requirements", {})
            .get("value", [])
        )
        for group in groups:
            yield {
                **{key: part[key] for key in ("start", "end", "excerpt")},
                "kind": "language",
                "code": "|".join(group["codes"]),
                "qualification": {
                    "required": "required",
                    "preferred": "preferred",
                    "optional": "not_required",
                    "unknown": "unspecified",
                }[group["modality"]],
                "value": group,
                "alternative": group["operator"] == "any",
                "ordinal": ordinal,
            }
            ordinal += 1


@transaction.atomic
def extract_revision_qualifications(revision):
    type(revision).objects.select_for_update().get(pk=revision.pk)
    existing = QualificationExtraction.objects.filter(
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
    extraction = QualificationExtraction.objects.create(
        revision=revision,
        version=VERSION,
        status=status,
        processed_fields=[path for path, _ in fields],
    )
    if status != "processed":
        return extraction
    summaries = {}
    for path, text in fields:
        initial = "other"
        group = re.fullmatch(r"lists\.(\d+)\.content", path)
        if group:
            initial = section_kind(
                revision.payload["lists"][int(group[1])].get("text", "")
            )
        parts = list(source_sentences(text, initial, abbreviations=True))
        summaries[path] = language_facts(
            "\n\n".join(prose(part["visible"]) for part in parts), VERSION
        )
        for fact in extract_qualifications(text, initial):
            QualificationEvidence.objects.create(
                extraction=extraction, json_path=path, **fact
            )
    extraction.language_summary = summaries
    extraction.save(update_fields=["language_summary"])
    return extraction


def current_qualification_evidence(offers):
    from .engine_filters import fresh_sources

    return QualificationEvidence.objects.filter(
        extraction__version=VERSION,
        extraction__revision__source_id__in=fresh_sources().values("pk"),
        extraction__revision__source__offer_id__in=offers.values("pk"),
        extraction__revision__raw_hash=F("extraction__revision__source__content_hash"),
    )
