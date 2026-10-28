"""Shared IT occupation scope; independent from contract and seniority."""

IT_DOMAINS = frozenset({"software-it", "data-ai", "cybersecurity"})
ROLE_QUERIES = ("software engineer", "data engineer", "cybersecurity")


def occupation_scope(title, description=""):
    from .job_taxonomy import CLASSIFIED, SUBDOMAINS, VERSION, classify

    result = classify(title, description)
    primary = SUBDOMAINS.get(result["primary"], {})
    status = (
        ("in_scope" if primary.get("domain") in IT_DOMAINS else "out_of_scope")
        if result["status"] in CLASSIFIED
        else "unknown"
    )
    return {
        **result,
        "scope": status,
        "taxonomy_version": VERSION,
    }


def eligible_facts(projection):
    return (
        projection["facts"].get("job_scope", {}).get("value") == "in_scope"
        and projection["europe_status"] == "in_scope"
    )


def catalogue_scope(queryset):
    """Same occupation/geography gate for public lists and retained details."""
    return queryset.filter(
        taxonomy_status__in=["classified", "broad"],
        job_subdomain__domain__slug__in=IT_DOMAINS,
        enrichment__europe_status="in_scope",
    )
