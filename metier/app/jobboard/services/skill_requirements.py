"""Conservative FR/EN skill mentions with literal source excerpts and offsets."""

import re

from django.db import transaction
from django.db.models import Q

from jobboard.models import Skill, SkillEvidence, SkillExtraction

from .offer_content import section_kind

VERSION = "skills-1"
# Occupational aliases classify roles, not technologies. Reuse Skill slugs while
# keeping this initial technical vocabulary explicit and versioned separately.
VOCABULARY = {
    "python": ("Python", ["Python"]),
    "javascript": ("JavaScript", ["JavaScript"]),
    "typescript": ("TypeScript", ["TypeScript"]),
    "java": ("Java", ["Java"]),
    "cpp": ("C++", ["C++"]),
    "csharp": ("C#", ["C#"]),
    "sql": ("SQL", ["SQL"]),
    "postgresql": ("PostgreSQL", ["PostgreSQL", "Postgres"]),
    "react": ("React", ["React", "React.js"]),
    "vue": ("Vue.js", ["Vue.js", "VueJS"]),
    "nodejs": ("Node.js", ["Node.js", "NodeJS"]),
    "django": ("Django", ["Django"]),
    "fastapi": ("FastAPI", ["FastAPI"]),
    "docker": ("Docker", ["Docker"]),
    "kubernetes": ("Kubernetes", ["Kubernetes", "K8s"]),
    "git": ("Git", ["Git"]),
    "linux": ("Linux", ["Linux"]),
    "terraform": ("Terraform", ["Terraform"]),
    "aws": ("AWS", ["AWS", "Amazon Web Services"]),
    "azure": ("Azure", ["Azure"]),
    "rust": ("Rust", ["Rust"]),
    "golang": ("Go", ["Golang"]),
    "tensorflow": ("TensorFlow", ["TensorFlow"]),
    "pytorch": ("PyTorch", ["PyTorch"]),
}
ALIASES = {
    alias.casefold(): slug
    for slug, (_, aliases) in VOCABULARY.items()
    for alias in aliases
}
PATTERN = re.compile(
    r"(?<![\w+#])(?:"
    + "|".join(re.escape(alias) for alias in sorted(ALIASES, key=len, reverse=True))
    + r")(?![\w+#])",
    re.I,
)
REQUIRED = re.compile(
    r"\b(?:must|required|mandatory|essential|obligatoire|exig[ée]e?s?|indispensable|requis[es]*)\b",
    re.I,
)
PREFERRED = re.compile(
    r"\b(?:preferred|desirable|bonus|nice to have|un plus|souhait[ée]e?s?|appr[ée]ci[ée]e?s?|atout)\b",
    re.I,
)
NEGATED = re.compile(
    r"\b(?:not required|not necessary|no .{0,60}required|pas .{0,40}(?:requis|obligatoire)|non (?:requis|obligatoire)|aucune .{0,40}(?:requise|exigée))\b",
    re.I,
)


def description_fields(payload, prefix=""):
    if not isinstance(payload, dict):
        return []
    result = []
    # Explicit known description fields; never mine company profiles or URLs.
    for key in (
        "descriptionPlain",
        "descriptionHtml",
        "description",
        "content",
        "jobDescription",
    ):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            result.append((prefix + key, value))
            break
    if not result and isinstance(payload.get("jobPostingInfo"), dict):
        result.extend(
            description_fields(payload["jobPostingInfo"], prefix + "jobPostingInfo.")
        )
    if isinstance(payload.get("lists"), list):
        for index, item in enumerate(payload["lists"][:100]):
            if isinstance(item, dict) and isinstance(item.get("content"), str):
                result.append((f"{prefix}lists.{index}.content", item["content"]))
    return result


def extract_mentions(text, initial_section="other"):
    from .requirement_text import source_sentences

    for part in source_sentences(text, initial_section):
        visible, section = part["visible"], part["section"]
        matches = [
            match
            for match in PATTERN.finditer(visible)
            if not (
                match.group().casefold() == "react"
                and re.match(r"\s+(?:to|quickly)\b", visible[match.end() :], re.I)
            )
        ]
        if not matches:
            continue
        negated = bool(NEGATED.search(visible))
        preferred = bool(PREFERRED.search(visible))
        required = bool(REQUIRED.search(visible))
        conflicting_negation = negated and bool(
            REQUIRED.search(NEGATED.sub("", visible))
        )
        if conflicting_negation or (
            len(matches) > 1 and preferred and (required or negated)
        ):
            qualification, reason = "unspecified", "mixed_cues"
        elif negated:
            qualification, reason = "negated", "explicit_negation"
        elif preferred or section == "preferred":
            qualification, reason = "preferred", "preference_cue"
        elif required or section == "requirements":
            qualification, reason = "required", "requirement_cue"
        else:
            qualification, reason = "unspecified", "mention_only"
        start = part["start"]
        # Excerpt is an exact slice of the retained field, including HTML.
        for match in matches:
            yield dict(
                skill_slug=ALIASES[match.group().casefold()],
                qualification=qualification,
                start=start,
                end=part["end"],
                excerpt=part["excerpt"],
                matched_text=match.group(),
                alternative=bool(re.search(r"\b(?:or|ou)\b", visible, re.I)),
                reason=reason,
            )


@transaction.atomic
def extract_revision_skills(revision):
    # Serialize replays of the same immutable source revision.
    type(revision).objects.select_for_update().get(pk=revision.pk)
    existing = SkillExtraction.objects.filter(
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
    extraction = SkillExtraction.objects.create(
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
        for mention in extract_mentions(text, initial_section=initial):
            slug = mention.pop("skill_slug")
            skill = Skill.objects.filter(slug=slug).first()
            if skill is None:
                names = Q()
                for alias in VOCABULARY[slug][1]:
                    names |= Q(name__iexact=alias)
                skill = Skill.objects.filter(names).order_by("pk").first()
            if skill is None:
                skill, _ = Skill.objects.get_or_create(
                    slug=slug, defaults={"name": VOCABULARY[slug][0]}
                )
            SkillEvidence.objects.get_or_create(
                extraction=extraction,
                skill=skill,
                json_path=path,
                start=mention["start"],
                defaults={
                    key: value for key, value in mention.items() if key != "start"
                },
            )
    return extraction


def current_skill_evidence(offers):
    """Select only current, active source evidence within an explicit offer corpus."""
    from django.db.models import F

    from .engine_filters import fresh_sources

    return SkillEvidence.objects.filter(
        extraction__version=VERSION,
        extraction__revision__source_id__in=fresh_sources().values("pk"),
        extraction__revision__source__offer_id__in=offers.values("pk"),
        extraction__revision__raw_hash=F("extraction__revision__source__content_hash"),
        extraction__revision__source__source_status="active",
        extraction__revision__source__board__enabled=True,
    )
