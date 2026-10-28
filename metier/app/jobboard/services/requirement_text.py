"""Source sentence boundaries preserve original Unicode offsets and literal excerpts."""

import re

from .engine_quality import plain_text
from .offer_content import section_kind


def source_sentences(text, initial_section="other", *, abbreviations=False):
    section = initial_section
    hidden = list(
        re.finditer(
            r"<(script|style|template|noscript)\b[^>]*>.*?</\1\s*>", text, re.I | re.S
        )
    )
    searchable = list(text)
    for match in hidden:
        searchable[match.start() : match.end()] = [
            "\n" if char == "\n" else " " for char in match.group()
        ]
    searchable = "".join(searchable)
    restore_abbreviations = abbreviations and "\ue000" not in text
    if restore_abbreviations:
        searchable = re.sub(
            r"\b(?:Ph\.D\.|B\.Sc\.|M\.Sc\.)",
            lambda match: match.group().replace(".", "\ue000"),
            searchable,
            flags=re.I,
        )
    for segment in re.finditer(
        r".+?(?:\n|</(?:p|li|h[1-6]|div)>|<br\s*/?>|$)", searchable, re.I | re.S
    ):
        raw = segment.group()
        heading = section_kind(
            plain_text(
                raw.replace("\ue000", ".") if restore_abbreviations else raw
            ).strip()
        )
        if (
            heading != "other"
            and len(
                plain_text(
                    raw.replace("\ue000", ".") if restore_abbreviations else raw
                ).strip()
            )
            < 120
        ):
            section = heading
            continue
        if section in {"about_company", "benefits", "recruitment"}:
            continue
        for sentence in re.finditer(r".+?(?:[.!?](?=\s|$)|$)", raw, re.S):
            start = segment.start() + sentence.start()
            end = start + len(sentence.group())
            yield {
                "start": start,
                "end": end,
                "excerpt": text[start:end],
                "visible": plain_text(
                    sentence.group().replace("\ue000", ".")
                    if restore_abbreviations
                    else sentence.group()
                ),
                "section": section,
            }
