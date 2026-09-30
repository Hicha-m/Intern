from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.utils.crypto import salted_hmac

from jobboard.api.core import APIError
from jobboard.models import RequestThrottle


def throttle(scope, identity, limit=None, seconds=900):
    key = salted_hmac("intern-throttle", f"{scope}:{identity}").hexdigest()
    now = timezone.now()
    with transaction.atomic():
        # get_or_create resolves a racing first insertion through its unique key.
        RequestThrottle.objects.get_or_create(
            key=key, defaults={"expires_at": now + timedelta(seconds=seconds)}
        )
        counter = RequestThrottle.objects.select_for_update().get(key=key)
        if counter.expires_at <= now:
            counter.count = 0
            counter.expires_at = now + timedelta(seconds=seconds)
        counter.count += 1
        counter.save(update_fields=["count", "expires_at"])
        exceeded = counter.count > (limit or settings.AUTH_RATE_LIMIT)
    if exceeded:
        raise APIError("rate_limited", "Too many attempts. Try again later.", 429)
