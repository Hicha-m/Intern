"""Versioned source evidence; distinct from the canonical offer/skill summary."""

from django.db import models
from django.utils import timezone

from .constraints import allowed


class SkillExtraction(models.Model):
    revision = models.ForeignKey(
        "SourceRevision", on_delete=models.PROTECT, related_name="skill_extractions"
    )
    version = models.CharField(max_length=40)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    status = models.CharField(max_length=24)
    processed_fields = models.JSONField(default=list)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["revision", "version"], name="skill_extraction_unique"
            ),
            allowed(
                "status",
                ("processed", "no_description", "too_large"),
                "skill_extraction_status_valid",
            ),
        ]


class SkillEvidence(models.Model):
    extraction = models.ForeignKey(
        SkillExtraction, on_delete=models.CASCADE, related_name="evidence"
    )
    skill = models.ForeignKey("Skill", on_delete=models.PROTECT)
    qualification = models.CharField(max_length=16)
    json_path = models.CharField(max_length=160)
    start = models.PositiveIntegerField()
    end = models.PositiveIntegerField()
    excerpt = models.TextField()
    matched_text = models.CharField(max_length=160)
    alternative = models.BooleanField(default=False)
    reason = models.CharField(max_length=40)
    confidence = models.FloatField(null=True, blank=True)

    class Meta:
        constraints = [
            allowed(
                "qualification",
                ("required", "preferred", "unspecified", "negated"),
                "skill_evidence_qualification_valid",
            ),
            models.UniqueConstraint(
                fields=["extraction", "skill", "json_path", "start"],
                name="skill_evidence_unique",
            ),
            models.CheckConstraint(
                condition=models.Q(end__gt=models.F("start")),
                name="skill_evidence_offsets_valid",
            ),
        ]
