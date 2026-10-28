"""Normalize explicit contract labels; working hours do not establish duration."""

import re

LABELS = {
    "intern": "internship",
    "internship": "internship",
    "apprenticeship": "apprenticeship",
    "alternance": "apprenticeship",
    "permanent": "permanent",
    "cdi": "permanent",
    "fixed_term": "fixed_term",
    "fixed-term": "fixed_term",
    "cdd": "fixed_term",
    "contractor": "contractor",
    "freelance": "contractor",
    "temporary": "temporary",
    "employment": "employment",
    "directhire": "employment",
}
TITLE_CONTRACTS = {
    "permanent": r"\bCDI\b|\bpermanent contract\b|contrat à durée indéterminée",
    "fixed_term": r"\bCDD\b|\bfixed[- ]term contract\b|contrat à durée déterminée",
    "apprenticeship": r"\b(?:apprenticeship|alternance|apprenti(?:e)?|apprentice)\b",
    "contractor": r"\b(?:freelance|contractor)\b",
}


def normalize_contract(value):
    if isinstance(value, dict):
        value = value.get("id")
    values = value if isinstance(value, list) else [value]
    matches = {
        LABELS[item.strip().lower()]
        for item in values
        if isinstance(item, str) and item.strip().lower() in LABELS
    }
    return next(iter(matches)) if len(matches) == 1 else "unknown"


def posting_contract(raw, title, description):
    from .engine_quality import extract_facts

    structured = {
        normalize_contract(raw.get(key))
        for key in (
            "contract_type",
            "employmentType",
            "employment_type",
            "typeOfEmployment",
            "job_type",
            "job_types",
            "positionOfferingCode",
        )
    } - {"unknown"}
    title_values = {
        contract
        for contract, pattern in TITLE_CONTRACTS.items()
        if re.search(pattern, title, re.IGNORECASE)
    }
    stage = extract_facts(title, description)["classification"]
    if stage == "confirmed":
        title_values.add("internship")
    values = structured | title_values
    if len(values) > 1:
        return "unknown"
    if values:
        return next(iter(values))
    return "unknown"
