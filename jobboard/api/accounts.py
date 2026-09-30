from django.contrib.auth import logout
from django.http import FileResponse, JsonResponse
from django.urls import path

from jobboard.api.core import body, endpoint
from jobboard.services.accounts import export_account, request_deletion


@endpoint(["GET"])
def export(request):
    response = FileResponse(
        export_account(request.user),
        as_attachment=True,
        filename="intern-account.zip",
        content_type="application/zip",
    )
    response["Cache-Control"] = "no-store"
    return response


@endpoint(["POST"])
def delete(request):
    data = body(request, {"password"}, required=("password",))
    deletion = request_deletion(request.user, data["password"])
    logout(request)
    return JsonResponse({"id": deletion.pk, "status": deletion.status}, status=202)


urlpatterns = [
    path("account/export/", export, name="account-export"),
    path("account/delete/", delete, name="account-delete"),
]
