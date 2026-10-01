"""Conservative, offline extraction. Unknown is a first-class result, never a denial.

This initial ruleset deliberately leaves unsupported languages/forms unresolved. It
is not a claim that the European corpus acceptance thresholds have been reached.
"""

import hashlib
import json
import re
from datetime import date
from html import unescape

from django.db import transaction
from django.utils import timezone

EXTRACTOR_VERSION = "rules-8"
EUROPE_SCOPE_VERSION = "europe-2026-09-30-v1"
EUROPE_COUNTRIES = frozenset(
    [
        "AL",
        "AD",
        "AT",
        "BY",
        "BE",
        "BA",
        "BG",
        "HR",
        "CY",
        "CZ",
        "DK",
        "EE",
        "FI",
        "FR",
        "DE",
        "GR",
        "HU",
        "IS",
        "IE",
        "IT",
        "XK",
        "LV",
        "LI",
        "LT",
        "LU",
        "MT",
        "MD",
        "MC",
        "ME",
        "NL",
        "MK",
        "NO",
        "PL",
        "PT",
        "RO",
        "SM",
        "RS",
        "SK",
        "SI",
        "ES",
        "SE",
        "CH",
        "UA",
        "GB",
        "VA",
        "FO",
        "GI",
    ]
)
# Transcontinental/Caucasus locations remain unresolved in this first ruleset.
AMBIGUOUS_COUNTRIES = frozenset(["RU", "TR", "KZ", "AM", "AZ", "GE"])
COUNTRY_ALIASES = {
    "FR": ("france",),
    "DE": ("germany", "deutschland", "allemagne"),
    "GB": ("united kingdom", "uk", "great britain", "royaume-uni"),
    "CH": ("switzerland", "suisse", "schweiz"),
    "ES": ("spain", "españa", "espagne"),
    "IT": ("italy", "italia", "italie"),
    "NL": ("netherlands", "nederland", "pays-bas"),
    "BE": ("belgium", "belgique", "belgië"),
    "PT": ("portugal",),
    "PL": ("poland", "polska", "pologne"),
    "AT": ("austria", "österreich", "autriche"),
    "IE": ("ireland", "irlande"),
    "SE": ("sweden", "sverige", "suède"),
    "NO": ("norway", "norge", "norvège"),
    "DK": ("denmark", "danmark", "danemark"),
    "FI": ("finland", "suomi", "finlande"),
    "CZ": (
        "czechia",
        "czech republic",
    ),
    "RO": ("romania", "roumanie"),
    "GR": ("greece", "grèce"),
    "LU": ("luxembourg",),
    "US": ("united states", "usa"),
    "CA": ("canada",),
    "IN": ("india", "inde"),
    "AU": ("australia",),
    "SG": ("singapore",),
    "TR": ("turkey", "türkiye"),
    "RU": ("russia",),
    "KZ": ("kazakhstan",),
}
STRONG_INTERN = r"\b(?:internship|stagiaire|stagiair|stagista|(?:pflicht|freiwilliges?\s+)?praktikum|tirocinio|tirocinante|estágio|estagiári[oa]|staż|prácticas)\b"
INTERN = STRONG_INTERN + r"|\b(?:intern|stage|praktikant(?:in)?)\b"
FRENCH_STAGE_CONTEXT = r"\b(?:(?:ce|votre)\s+stage|convention\s+de\s+stage|stage\s+de\s+\d{1,2}(?:\s*(?:à|[-–])\s*\d{1,2})?\s*mois)\b"
APPRENTICESHIP_TITLE = r"\b(?:apprenticeships?|apprentices?|apprenti(?:e)?s?|apprentissage|alternance|ausbildung|duales\s+studium)\b"
NON_INTERNSHIP_TITLE = r"\b(?:working[ -]+students?|werkstudent(?:in|en)?|student[ -]+jobs?|graduate\s+(?:program(?:me)?s?|schemes?)|(?:ph\.?d\.?|doctoral)\s+scholarships?)\b"
RECRUITING_EVENT_TITLE = r"\b(?:career\s+(?:week|fair)|business\s+course|talent\s+class)\b"
AMBIGUOUS_STUDENT_TITLE = r"\b(?:student\s+position|thesis|abschlussarbeit)\b"
NEGATIVE_TITLE = r"\b(?:director|directeur|directrice|head|senior|sr\.?|vice president|vp)\b|\b(?:internship|intern|stage|stages)\s+(?:program\s+)?(?:manager|coordinator|coördinator)\b|\b(?:responsable|coordinateur|coordinatrice)\s+(?:des?\s+)?stages?\b|\bstage\s+(?:manager|lighting|technician)\b"
DOMAIN_RULES = {
    "it-data": r"\b(?:software|developer|développeur|informatique|data|machine learning|cybersecurity)\b",
    "engineering-industry": r"\b(?:engineer|engineering|ingénieur|mechanical|mécanique|industrial)\b",
    "science-research": r"\b(?:research|recherche|laboratory|biolog|chemistry|physics)\b",
    "health": r"\b(?:health|nursing|medical|santé|clinique)\b",
    "finance-accounting": r"\b(?:finance|financial|accounting|comptabilité|audit)\b",
    "legal": r"\b(?:legal|juridique|droit|rechtswissenschaft)\b",
    "marketing-communication": r"\b(?:marketing|communication|social media)\b",
    "sales": r"\b(?:sales|vente|commercial|business development)\b",
    "human-resources": r"\b(?:human resources|ressources humaines|recruitment|recrutement)\b",
    "design-arts": r"\b(?:design|graphic|arts|graphisme)\b",
    "operations-logistics": r"\b(?:operations|logistics|logistique|supply chain)\b",
    "hospitality-tourism": r"\b(?:hospitality|tourism|tourisme|hôtellerie|hotel)\b",
    "public-nonprofit": r"\b(?:nonprofit|non-profit|ngo|ong|public policy)\b",
}
LANGUAGES = {
    "en": "english|anglais",
    "fr": "french|français",
    "de": "german|deutsch|allemand",
    "es": "spanish|espagnol",
    "it": "italian|italien",
    "pt": "portuguese|portugais",
    "nl": "dutch|néerlandais",
    "pl": "polish|polonais",
}


def published_offers(queryset):
    """Publication policy: confirmed European internships only.

    Offer.status remains the source lifecycle; uncertain/out-of-scope rows are
    retained for audit and future extraction, never falsely marked closed.
    Freshness and expiry are applied by the catalogue API on top of this policy.
    """
    return queryset.filter(
        status="open",
        enrichment__classification="confirmed",
        enrichment__europe_status="in_scope",
    )


def structured_country_code(value):
    """Resolve an explicit source country, never a city-name guess."""
    value = value.strip()
    if value.upper() in EUROPE_COUNTRIES | AMBIGUOUS_COUNTRIES | set(COUNTRY_ALIASES):
        return value.upper()
    for code, aliases in COUNTRY_ALIASES.items():
        if value.casefold() in aliases:
            return code
    return None


def plain_text(value):
    return re.sub(r"\s+", " ", unescape(re.sub(r"<[^>]+>", " ", value or ""))).strip()


def semantic_hash(offer):
    """Exclude polling timestamps, tracking URLs and formatting-only changes."""
    content = {
        "title": plain_text(offer.title).casefold(),
        "description": plain_text(offer.description).casefold(),
        "contract_type": offer.contract_type,
        "work_mode": offer.work_mode,
        "locations": sorted(
            (loc.name.casefold(), loc.country_code or "")
            for loc in offer.locations.all()
        ),
    }
    return hashlib.sha256(
        json.dumps(content, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()


def extract_facts(
    title, description, *, contract_type="unknown", locations=(), work_mode="unknown"
):
    """Pure deterministic projection. Evidence is always a literal excerpt or field path."""
    title, description = plain_text(title), plain_text(description)
    text = title + ". " + description
    facts = {}

    def fact(field, value, evidence, *, required=False, path=None):
        facts[field] = {
            "value": value,
            "evidence_text": evidence,
            "json_path": path,
            "method": "rule",
            "extractor_version": EXTRACTOR_VERSION,
            "required": required,
            "source_revision_id": None,
        }

    # Explicit apprenticeship titles override mislabelled ATS internship metadata.
    # Description mentions alone never exclude an otherwise legitimate internship.
    negative = (
        re.search(NEGATIVE_TITLE, title, re.IGNORECASE)
        or re.search(APPRENTICESHIP_TITLE, title, re.IGNORECASE)
        or re.search(NON_INTERNSHIP_TITLE, title, re.IGNORECASE)
        or re.search(RECRUITING_EVENT_TITLE, title, re.IGNORECASE)
    )
    signal = re.search(INTERN, title, re.IGNORECASE)
    corroborated = re.search(
        STRONG_INTERN,
        description,
        re.IGNORECASE,
    )
    french_stage = signal and re.search(
        FRENCH_STAGE_CONTEXT, description, re.IGNORECASE
    )
    swedish_stage = (
        re.search(r"\b(?:praktik|praktikant|LIA)\b", title, re.IGNORECASE)
        and re.search(r"\b(?:praktikperiod(?:en)?|praktiken|praktikplats|LIA-praktik)\b", description, re.IGNORECASE)
    )
    if negative:
        classification = "not_internship"
        fact("classification", classification, title)
    elif re.search(AMBIGUOUS_STUDENT_TITLE, title, re.IGNORECASE) and not signal:
        # A thesis/student role alone does not establish an internship. Preserve
        # explicit Internship Thesis/Praktikum titles instead of banning research.
        classification = "uncertain"
        fact("classification", classification, title)
    elif contract_type == "internship":
        classification = "confirmed"
        fact("classification", classification, "internship", path="offer.contract_type")
    elif swedish_stage or signal and (
        corroborated or french_stage or re.search(STRONG_INTERN, title, re.IGNORECASE)
    ):
        classification = "confirmed"
        fact(
            "classification",
            classification,
            french_stage.group() if french_stage else title,
        )
    else:
        classification = "uncertain"
        fact("classification", classification, title)

    domain = "unclassified"
    for slug, pattern in DOMAIN_RULES.items():
        match = re.search(pattern, title, re.IGNORECASE)
        if match:
            domain = slug
            fact("domain", domain, match.group())
            break

    country_codes, unresolved = set(), False
    for location in locations:
        name = location.get("name", "")
        code = location.get("country_code")
        found = (
            {code.upper()}
            if code
            else {
                key
                for key, aliases in COUNTRY_ALIASES.items()
                if any(
                    re.search(
                        r"(?<!\w)" + re.escape(alias) + r"(?!\w)", name, re.IGNORECASE
                    )
                    for alias in aliases
                )
            }
        )
        country_codes.update(found)
        unresolved |= not bool(found) or bool(found & AMBIGUOUS_COUNTRIES)
    if country_codes:
        fact(
            "country_codes",
            sorted(country_codes),
            "; ".join(loc.get("name", "") for loc in locations),
            path="offer.locations",
        )
    # Remote office locations alone are not evidence of permitted residence.
    if work_mode == "remote":
        europe_status = "unknown"
    elif country_codes & EUROPE_COUNTRIES:
        europe_status = "in_scope"
    elif country_codes and not unresolved:
        europe_status = "out_of_scope"
    else:
        europe_status = "unknown"

    # Only internship/duration phrases, never unrelated years of experience.
    units = r"months?|mois|monate?n?|maanden?|miesiące|miesięcy|mes(?:es)?|mesi|weeks?|semaines?|wochen|settimane|semanas"
    duration = re.search(
        r"(?:duration|durée|dauer|duración|durata|duração|duur|czas trwania|internship(?:\s+of)?|stage(?:\s+de)?|praktikum(?:\s+für)?)\s*[:\-]?\s*(\d{1,2})(?:\s*(?:-|–|to|à|bis|a)\s*(\d{1,2}))?\s*[- ]?\s*("
        + units
        + r")\b",
        text,
        re.IGNORECASE,
    )
    if not duration:
        duration = re.search(
            r"\b(\d{1,2})(?:\s*(?:-|–|to)\s*(\d{1,2}))?\s*[- ]?\s*("
            + units
            + r")\s+(?:internship|stage|praktikum)\b",
            text,
            re.IGNORECASE,
        )
    if duration:
        context = text[
            max(0, text.rfind(".", 0, duration.start()) + 1) : text.find(
                ".", duration.end()
            )
            if "." in text[duration.end() :]
            else len(text)
        ]
        duration_required = not bool(
            re.search(
                r"preferred|ideally|optional|souhait|idéal|preferibil",
                context,
                re.IGNORECASE,
            )
        )
        minimum, maximum = int(duration[1]), int(duration[2] or duration[1])
        if 0 < minimum <= maximum <= 60:
            unit = (
                "weeks"
                if re.match(
                    r"week|semaine|wochen|settimane|semana", duration[3], re.IGNORECASE
                )
                else "months"
            )
            fact(
                "duration",
                {
                    "minimum": minimum,
                    "maximum": maximum,
                    "unit": unit,
                    "original_unit": duration[3],
                },
                duration.group(),
                required=duration_required,
            )

    start = re.search(
        r"(?:start(?:\s+date)?|starting|début|beginn|inizio)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2})\b",
        text,
        re.IGNORECASE,
    )
    if start:
        try:
            date.fromisoformat(start[1])
        except ValueError:
            pass
        else:
            # A preferred/flexible date cannot establish an eligibility denial.
            sentence_start = text.rfind(".", 0, start.start()) + 1
            sentence_end = text.find(".", start.end())
            context = text[
                sentence_start : sentence_end if sentence_end >= 0 else len(text)
            ]
            required = not bool(
                re.search(
                    r"preferred|ideally|optional|flexible|negotiable|souhait|idéal|indicatif|preferibil|not required",
                    context,
                    re.IGNORECASE,
                )
            )
            fact("start_date", start[1], start.group(), required=required)

    required_languages = []
    for sentence in re.split(r"[.;\n]", description):
        # Preference/negation cannot support a blocking language requirement.
        if re.search(
            r"preferred|optional|not required|souhait|appréci|un plus|nicht erforderlich",
            sentence,
            re.IGNORECASE,
        ):
            continue
        if not re.search(
            r"required|mandatory|must|fluent|fluency|obligatoire|exigé|courant|maîtrise|erforderlich",
            sentence,
            re.IGNORECASE,
        ):
            continue
        for code, aliases in LANGUAGES.items():
            if re.search(r"\b(?:" + aliases + r")\b", sentence, re.IGNORECASE):
                required_languages.append(
                    {"code": code, "evidence_text": sentence.strip()}
                )
    if required_languages:
        fact(
            "required_languages",
            required_languages,
            " | ".join(item["evidence_text"] for item in required_languages),
            required=True,
        )

    no_sponsor = re.search(
        r"(?:visa sponsorship (?:is )?not (?:available|provided|offered)|(?:cannot|do not|will not) (?:provide |offer )?(?:visa )?sponsor(?:ship)?|no visa sponsorship)",
        description,
        re.IGNORECASE,
    )
    yes_sponsor = re.search(
        r"(?:visa sponsorship (?:is )?(?:available|provided|offered)|we (?:provide|offer) visa sponsorship)",
        description,
        re.IGNORECASE,
    )
    if no_sponsor and not yes_sponsor:
        fact("sponsorship_available", False, no_sponsor.group(), required=True)
    elif yes_sponsor and not no_sponsor:
        fact("sponsorship_available", True, yes_sponsor.group())
    return {
        "classification": classification,
        "domain": domain,
        "country_codes": sorted(country_codes),
        "europe_status": europe_status,
        "facts": facts,
    }


@transaction.atomic
def enrich_offer(offer):
    """Idempotent projection with content versions; never contacts an external service."""
    from jobboard.models import Offer, OfferEnrichment, SourceRevision

    offer = Offer.objects.select_for_update().get(pk=offer.pk)
    digest = semantic_hash(offer)
    previous = OfferEnrichment.objects.filter(offer=offer).first()
    if (
        previous
        and previous.semantic_hash == digest
        and previous.extractor_version == EXTRACTOR_VERSION
    ):
        return previous
    projection = extract_facts(
        offer.title,
        offer.description,
        contract_type=offer.contract_type,
        locations=list(offer.locations.values("name", "country_code")),
        work_mode=offer.work_mode,
    )
    revisions = list(
        SourceRevision.objects.filter(source__offer=offer).order_by(
            "-created_at", "-pk"
        )[:20]
    )
    # Match literal evidence to a retained revision. Unmatched projections remain
    # explicitly unsourced and cannot become blocking matching conditions.
    for value in projection["facts"].values():
        excerpts = value["evidence_text"].split(" | ")
        for revision in revisions:
            serialized = plain_text(json.dumps(revision.payload, ensure_ascii=False))
            if all(excerpt and excerpt in serialized for excerpt in excerpts):
                value["source_revision_id"] = revision.pk
                value["observed_at"] = revision.created_at.isoformat()
                break
    projection.update(
        semantic_hash=digest,
        event_at=timezone.now(),
        extractor_version=EXTRACTOR_VERSION,
        content_version=(previous.content_version + 1 if previous else 1),
    )
    result, _ = OfferEnrichment.objects.update_or_create(
        offer=offer, defaults=projection
    )
    return result
