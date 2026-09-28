from django.contrib import admin

from . import models as m


@admin.register(m.Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "domain")
    search_fields = ("name", "domain")


@admin.register(m.Role, m.Skill)
class TaxonomyAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(m.Location)
class LocationAdmin(admin.ModelAdmin):
    list_display = ("name", "country_code", "region", "canonical_key")
    search_fields = ("name", "canonical_key")
    list_filter = ("country_code",)


class OfferLocationInline(admin.TabularInline):
    model = m.OfferLocation
    extra = 0
    autocomplete_fields = ("location",)


class OfferSkillInline(admin.TabularInline):
    model = m.OfferSkill
    extra = 0
    autocomplete_fields = ("skill",)


@admin.register(m.Offer)
class OfferAdmin(admin.ModelAdmin):
    list_display = ("title", "company", "contract_type", "work_mode", "status")
    list_filter = ("status", "contract_type", "work_mode")
    search_fields = ("title", "company__name")
    autocomplete_fields = ("company", "role")
    readonly_fields = ("created_at", "updated_at", "search_vector")
    inlines = (OfferLocationInline, OfferSkillInline)


class OperationalReadOnlyAdmin(admin.ModelAdmin):
    """Inspection only: admin must not bypass approval and document lifecycle services.

    Private application data is restricted to superusers. Normal staff catalogue
    permissions do not implicitly grant access to resumes, answers or runs.
    """

    actions = None
    list_per_page = 50

    def has_module_permission(self, request):
        return request.user.is_active and request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return request.user.is_active and request.user.is_superuser

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


for model in (
    m.CandidateProfile,
    m.CandidateSkill,
    m.Document,
    m.Experience,
    m.Education,
    m.Project,
    m.WorkAuthorization,
    m.SearchPreference,
    m.PreferenceRole,
    m.PreferenceLocation,
    m.PreferenceContract,
    m.PreferenceWorkMode,
    m.SourceBoard,
    m.ImportRun,
    m.OfferSource,
    m.CompensationBand,
    m.SavedOffer,
    m.Application,
    m.ApplicationRevision,
    m.RevisionDocument,
    m.SubmissionAuthorization,
    m.AgentRun,
    m.ApplicationEvent,
    m.Interview,
    m.ApplicationTask,
    m.OutboxMessage,
    m.DeletionRequest,
):
    admin.site.register(model, OperationalReadOnlyAdmin)
