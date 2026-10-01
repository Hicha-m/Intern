"""Shared, bounded multilingual search for the catalogue and saved searches."""

import re
import unicodedata
from functools import reduce
from operator import and_, or_

from django.contrib.postgres.search import (
    SearchQuery,
    SearchRank,
    SearchVector,
    SearchVectorField,
)
from django.db.models import F, Func

# Deliberately small, reviewed equivalents; never change the publication boundary.
ALIASES = (
    ("stage", "stages", "internship", "intern", "praktikum", "tirocinio"),
    (
        "développeur",
        "developpeur",
        "développement logiciel",
        "software developer",
        "software engineer",
        "software engineering",
        "softwareentwicklung",
    ),
    ("science des données", "data science", "data scientist"),
    ("analyse de données", "data analyst", "data analytics"),
    ("apprentissage automatique", "machine learning"),
    ("ressources humaines", "human resources", "personalwesen"),
    ("comptabilité", "comptabilite", "accounting", "buchhaltung"),
    ("chaîne logistique", "supply chain"),
    ("cybersécurité", "cybersecurite", "cybersecurity", "cyber security"),
)


def normalized(value):
    return "".join(
        c
        for c in unicodedata.normalize("NFKD", value.casefold())
        if not unicodedata.combining(c)
    )


ALIAS_MAP = {normalized(alias): group for group in ALIASES for alias in group}
MAX_ALIAS_WORDS = max(len(alias.split()) for alias in ALIAS_MAP)


def search_query(text):
    # Explicit web-search operators and quoted phrases retain PostgreSQL semantics.
    if re.search(r'"|(?:^|\s)-\S|\bOR\b', text):
        return SearchQuery(text, config="simple", search_type="websearch")
    words = text.split()
    clauses = []
    offset = 0
    while offset < len(words):
        for size in range(min(MAX_ALIAS_WORDS, len(words) - offset), 0, -1):
            phrase = " ".join(words[offset : offset + size])
            group = ALIAS_MAP.get(normalized(phrase))
            if group:
                clauses.append(
                    reduce(
                        or_,
                        (
                            SearchQuery(alias, config="simple", search_type="phrase")
                            for alias in group
                        ),
                    )
                )
                offset += size
                break
        else:
            clauses.append(SearchQuery(words[offset], config="simple"))
            offset += 1
    return reduce(and_, clauses)


def search_offers(queryset, text):
    text = text.strip()
    if not text:
        return queryset
    query = search_query(text)
    # Company participates in mixed queries (e.g. 'Bosch software'), without
    # copying company names into every offer when an employer is renamed.
    company = SearchVector("company__name", config="simple", weight="A")
    title = SearchVector("title", config="simple", weight="A")
    document = Func(
        F("search_vector"),
        company,
        function="",
        template="(%(expressions)s)",
        arg_joiner=" || ",
        output_field=SearchVectorField(),
    )
    return (
        queryset.annotate(
            search_document=document,
        )
        .filter(search_document=query)
        .annotate(
            search_rank=SearchRank(document, query)
            + 4 * SearchRank(title + company, query),
        )
    )
