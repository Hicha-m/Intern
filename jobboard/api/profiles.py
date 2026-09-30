from io import BytesIO

from django.http import FileResponse, HttpResponse
from django.urls import path

from jobboard.api.core import APIError, body, endpoint, model_data, paginate
from jobboard.models import CandidateProfile, Document, SearchPreference
from jobboard.services import documents as ds
from jobboard.services import profiles as ps

DOCUMENT_FIELDS = (
    "id",
    "kind",
    "original_name",
    "mime_type",
    "byte_size",
    "sha256",
    "status",
    "created_at",
)


@endpoint(["GET", "PATCH"])
def profile(request):
    if request.method == "PATCH":
        return ps.profile_data(
            ps.update_profile(
                request.user, body(request, (*ps.PROFILE_FIELDS, "skill_ids"))
            )
        )
    item = CandidateProfile.objects.filter(user=request.user).first()
    return ps.profile_data(item) if item else {"profile": None}


@endpoint(["GET", "PUT"])
def preferences(request):
    if request.method == "PUT":
        return ps.preference_data(
            ps.update_preferences(
                request.user,
                body(request, (*ps.PREFERENCE_FIELDS, *ps.PREFERENCE_RELATIONS)),
            )
        )
    item = SearchPreference.objects.filter(profile__user=request.user).first()
    return ps.preference_data(item) if item else {"preferences": None}


def children_view(name):
    model, fields = ps.CHILDREN[name]

    @endpoint(["GET", "POST"])
    def collection(request):
        if request.method == "GET":
            return paginate(
                model.objects.filter(profile__user=request.user).order_by("id"),
                request,
                lambda row: model_data(row, ("id", *fields)),
            )
        row = ps.mutate_child(request.user, name, body(request, fields))
        return model_data(row, ("id", *fields))

    @endpoint(["PATCH", "DELETE"])
    def detail(request, pk):
        if request.method == "DELETE":
            ps.mutate_child(request.user, name, pk=pk, delete=True)
            return HttpResponse(status=204)
        row = ps.mutate_child(request.user, name, body(request, fields), pk=pk)
        return model_data(row, ("id", *fields))

    return collection, detail


@endpoint(["GET", "POST"])
def documents(request):
    if request.method == "GET":
        return paginate(
            Document.objects.filter(owner=request.user).order_by("-created_at", "-id"),
            request,
            lambda row: model_data(row, DOCUMENT_FIELDS),
        )
    if (
        set(request.POST) - {"kind"}
        or set(request.FILES) != {"file"}
        or len(request.FILES.getlist("file")) != 1
        or len(request.POST.getlist("kind")) != 1
    ):
        raise APIError("invalid_upload", "Supply exactly one file and one kind field.")
    row = ds.upload_document(request.user, request.FILES["file"], request.POST["kind"])
    return model_data(row, DOCUMENT_FIELDS)


@endpoint(["GET"])
def download(request, pk):
    document = Document.objects.filter(pk=pk, owner=request.user).first()
    if document is None:
        raise APIError("not_found", "Resource not found.", status=404)
    response = FileResponse(
        BytesIO(ds.read_document(document)),
        as_attachment=True,
        filename=document.original_name or "document.pdf",
        content_type="application/pdf",
    )
    response["X-Content-Type-Options"] = "nosniff"
    response["Content-Security-Policy"] = "sandbox; default-src 'none'"
    return response


@endpoint(["DELETE"])
def delete_document(request, pk):
    ds.delete_document(request.user, pk)
    return HttpResponse(status=204)


@endpoint(["PUT"])
def resume(request):
    data = body(request, ("document_id",), required=("document_id",))
    if type(data["document_id"]) is not int:
        raise APIError("invalid_id", "document_id must be an integer.")
    return ps.profile_data(ds.set_resume(request.user, data["document_id"]))


urlpatterns = [
    path("profile/", profile),
    path("preferences/", preferences),
    path("profile/resume/", resume),
    path("documents/", documents),
    path("documents/<int:pk>/download/", download),
    path("documents/<int:pk>/", delete_document),
]
for name in ps.CHILDREN:
    collection, detail = children_view(name)
    urlpatterns += [
        path(f"profile/{name}/", collection),
        path(f"profile/{name}/<int:pk>/", detail),
    ]
