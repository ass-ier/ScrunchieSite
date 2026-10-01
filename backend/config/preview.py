from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.core.mail.backends.base import BaseEmailBackend
from django.http import JsonResponse


class ReadOnlyPreviewMiddleware:
    """Reject writes before request bodies, uploaded receipts or sessions are read."""

    read_only_posts = {'/api/orders/quote/', '/api/coupons/validate/'}

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if settings.OWNER_PREVIEW_MODE:
            safe_read = request.method in {'GET', 'HEAD', 'OPTIONS'}
            price_preview = request.method == 'POST' and request.path in self.read_only_posts
            if request.path.startswith('/admin/') or not (safe_read or price_preview):
                return JsonResponse({
                    'detail': 'This is a read-only owner preview. Orders, receipt uploads, account sign-in and admin changes are disabled. Do not send payments.',
                    'preview_mode': True,
                }, status=403)
        return self.get_response(request)


class DisabledPreviewEmailBackend(BaseEmailBackend):
    def send_messages(self, email_messages):
        raise ImproperlyConfigured('Email sending is disabled in OWNER_PREVIEW_MODE.')
