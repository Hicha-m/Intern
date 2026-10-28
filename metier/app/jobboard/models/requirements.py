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


class ExperienceExtraction(models.Model):
    revision = models.ForeignKey(
        "SourceRevision",
        on_delete=models.PROTECT,
        related_name="experience_extractions",
    )
    version = models.CharField(max_length=40)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    status = models.CharField(max_length=24)
    processed_fields = models.JSONField(default=list)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["revision", "version"], name="experience_extraction_unique"
            ),
            allowed(
                "status",
                ("processed", "no_description", "too_large"),
                "experience_extraction_status_valid",
            ),
        ]


class ExperienceEvidence(models.Model):
    extraction = models.ForeignKey(
        ExperienceExtraction, on_delete=models.CASCADE, related_name="evidence"
    )
    qualification = models.CharField(max_length=16)
    comparison = models.CharField(max_length=20)
    minimum = models.DecimalField(max_digits=7, decimal_places=2, null=True)
    maximum = models.DecimalField(max_digits=7, decimal_places=2, null=True)
    stated = models.DecimalField(max_digits=7, decimal_places=2, null=True)
    unit = models.CharField(max_length=8)
    inclusive = models.BooleanField(default=True)
    alternative = models.BooleanField(default=False)
    json_path = models.CharField(max_length=160)
    start = models.PositiveIntegerField()
    end = models.PositiveIntegerField()
    ordinal = models.PositiveIntegerField()
    excerpt = models.TextField()
    confidence = models.FloatField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["extraction", "json_path", "start", "ordinal"],
                name="experience_evidence_unique",
            ),
            allowed(
                "qualification",
                ("required", "preferred", "unspecified", "negated", "not_required"),
                "experience_qualification_valid",
            ),
            allowed(
                "comparison",
                ("minimum", "maximum", "range", "stated", "none_required"),
                "experience_comparison_valid",
            ),
            allowed("unit", ("year", "month"), "experience_unit_valid"),
            models.CheckConstraint(
                condition=models.Q(stated__isnull=True) | models.Q(stated__gte=0),
                name="experience_stated_nonnegative",
            ),
            models.CheckConstraint(
                condition=models.Q(end__gt=models.F("start")),
                name="experience_offsets_valid",
            ),
            models.CheckConstraint(
                condition=models.Q(minimum__isnull=True) | models.Q(minimum__gte=0),
                name="experience_min_nonnegative",
            ),
            models.CheckConstraint(
                condition=models.Q(maximum__isnull=True) | models.Q(maximum__gte=0),
                name="experience_max_nonnegative",
            ),
            models.CheckConstraint(
                condition=models.Q(minimum__isnull=True)
                | models.Q(maximum__isnull=True)
                | models.Q(maximum__gte=models.F("minimum")),
                name="experience_bounds_ordered",
            ),
        ]
