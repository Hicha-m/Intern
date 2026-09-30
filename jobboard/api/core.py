"""Small HTTP boundary shared by the native Django API."""

import json
from functools import wraps

from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist, ValidationError
from django.core.paginator import EmptyPage, Paginator
from django.db import IntegrityError, models
from django.http import Http404, HttpResponseBase, JsonResponse
from django.http.request import RequestDataTooBig


class APIError(Exception):
    def __init__(self, code, message, status=400, details=None):
        super().__init__(message)
        self.code, self.message, self.status = code, message, status
        self.details = details or {}


def error_response(code, message, status=400, details=None):
    return JsonResponse(
        {"error": {"code": code, "message": message, "details": details or {}}},
        status=status,
    )


def endpoint(methods, auth=True):
    def decorate(view):
        @wraps(view)
        def wrapped(request, *args, **kwargs):
            try:
                if request.method not in methods:
                    response = error_response(
                        "method_not_allowed", "Method not allowed.", 405
                    )
                    response["Allow"] = ", ".join(methods)
                    return response
                if auth and (
                    not request.user.is_authenticated or not request.user.is_active
                ):
                    raise APIError(
                        "authentication_required", "Sign in to continue.", 401
                    )
                result = view(request, *args, **kwargs)
                response = (
                    result
                    if isinstance(result, HttpResponseBase)
                    else JsonResponse(result, safe=isinstance(result, dict))
                )
            except APIError as exc:
                response = error_response(
                    exc.code, exc.message, exc.status, exc.details
                )
            except ValidationError as exc:
                details = (
                    exc.message_dict
                    if hasattr(exc, "message_dict")
                    else {"fields": exc.messages}
                )
                response = error_response(
                    "validation_error", "Invalid input.", details=details
                )
            except (ObjectDoesNotExist, Http404):
                response = error_response("not_found", "Resource not found.", 404)
            except RequestDataTooBig:
                response = error_response("too_large", "Request is too large.", 413)
            except IntegrityError:
                response = error_response(
                    "conflict", "This operation conflicts with existing data.", 409
                )
            response["Cache-Control"] = "no-store"
            return response

        return wrapped

    return decorate


def body(request, allowed, required=()):
    if request.content_type != "application/json":
        raise APIError("invalid_content_type", "Use application/json.", 415)
    try:
        data = json.loads(
            request.body,
            parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)),
        )
    except (ValueError, UnicodeDecodeError):
        raise APIError("invalid_json", "Invalid JSON object.") from None
    if not isinstance(data, dict):
        raise APIError("invalid_json", "Expected a JSON object.")
    extra = set(data) - set(allowed)
    missing = set(required) - set(data)
    if extra or missing:
        raise APIError(
            "invalid_fields",
            "Check the request fields.",
            details={"unknown": sorted(extra), "missing": sorted(missing)},
        )
    return data


def integer(value, name="id", minimum=1, maximum=2147483647):
    if isinstance(value, bool) or not isinstance(value, (str, int)):
        raise APIError("invalid_integer", f"{name} must be an integer.")
    try:
        result = int(value)
    except (ValueError, TypeError):
        raise APIError("invalid_integer", f"{name} must be an integer.") from None
    if str(result) != str(value) or not minimum <= result <= maximum:
        raise APIError("invalid_integer", f"{name} is out of range.")
    return result


def paginate(queryset, request, serializer):
    page_number = integer(request.GET.get("page", "1"), "page")
    page_size = integer(request.GET.get("page_size", "20"), "page_size", maximum=100)
    paginator = Paginator(queryset, page_size)
    try:
        page = paginator.page(page_number)
    except EmptyPage:
        raise APIError("not_found", "Page not found.", 404) from None
    return {
        "results": [serializer(item) for item in page.object_list],
        "count": paginator.count,
        "page": page.number,
        "page_size": page_size,
    }


def model_data(instance, fields):
    return {name: getattr(instance, name) for name in fields}


def lock_user(user):
    """First lock in every private write; serializes writes against deletion."""
    account = get_user_model().objects.select_for_update().get(pk=user.pk)
    if not account.is_active:
        raise APIError("account_inactive", "Account is inactive.", 403)
    return account


def apply_fields(instance, data, allowed):
    if set(data) - set(allowed):
        raise APIError("invalid_fields", "Unknown fields.")
    for name, value in data.items():
        field = instance._meta.get_field(
            name.removesuffix("_id") if name.endswith("_id") else name
        )
        if value is not None:
            if isinstance(field, models.BooleanField) and not isinstance(value, bool):
                raise APIError("invalid_field", f"{name} must be a boolean.")
            if isinstance(
                field, (models.CharField, models.TextField, models.DateField)
            ) and not isinstance(value, str):
                raise APIError("invalid_field", f"{name} must be text.")
            if isinstance(field, (models.IntegerField, models.ForeignKey)) and (
                not isinstance(value, int) or isinstance(value, bool)
            ):
                raise APIError("invalid_field", f"{name} must be an integer.")
        setattr(instance, name, value)
    instance.full_clean()
    instance.save()
    return instance


def csrf_failure(request, reason=""):
    return error_response("csrf_failed", "Refresh the CSRF token and retry.", 403)


def not_found(request, exception=None):
    return error_response("not_found", "Resource not found.", 404)


def server_error(request):
    return error_response("server_error", "An unexpected error occurred.", 500)
