from io import StringIO
import tempfile
from unittest.mock import Mock

from django.core import mail
from django.core.exceptions import ImproperlyConfigured
from django.core.management import call_command
from django.test import RequestFactory, TestCase, override_settings
from django.http import HttpResponse
from rest_framework.test import APIClient

from config.preview import ReadOnlyPreviewMiddleware
from orders.models import Order
from products.models import Product, StoreSettings


class FreePreviewTests(TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        overrides = override_settings(MEDIA_ROOT=directory.name)
        overrides.enable()
        self.addCleanup(overrides.disable)
        self.client = APIClient()

    def load(self):
        call_command('load_owner_preview', confirm_demo=True, stdout=StringIO())

    @override_settings(OWNER_PREVIEW_MODE=True)
    def test_catalog_and_quote_work_without_creating_an_order(self):
        self.load()
        response = self.client.get('/api/products/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 12)
        self.assertTrue(self.client.get('/api/products/settings/').data['preview_mode'])
        product = Product.objects.get(slug='demo-satin-lilac')
        response = self.client.post('/api/orders/quote/', {
            'items': [{'product_id': product.pk, 'quantity': 1, 'size': 'S'}],
            'delivery_method': 'delivery',
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total_amount'], '210.00')
        self.assertFalse(Order.objects.exists())
        product.refresh_from_db()
        self.assertEqual(product.stock, 54)

    @override_settings(OWNER_PREVIEW_MODE=True)
    def test_all_write_surfaces_reject_before_reading_invalid_uploads(self):
        for method, path in [
            ('post', '/api/orders/'),
            ('post', '/api/users/register/'),
            ('post', '/api/users/login/'),
            ('post', '/api/users/request-otp/'),
            ('post', '/api/users/reset-password/'),
            ('post', '/api/token/'),
            ('post', '/api/products/settings/'),
            ('post', '/api/coupons/'),
            ('post', '/api/reviews/'),
            ('post', '/api/wishlist/'),
            ('patch', '/api/products/demo-satin-lilac/'),
            ('delete', '/api/products/demo-satin-lilac/'),
            ('post', '/api/orders/1/verify/'),
            ('post', '/api/orders/1/reject/'),
            ('post', '/api/orders/1/retry_email/'),
            ('post', '/api/orders/1/fulfill/'),
        ]:
            with self.subTest(method=method, path=path):
                response = self.client.generic(method.upper(), path, b'not-valid-multipart', content_type='multipart/form-data')
                self.assertEqual(response.status_code, 403)
                self.assertIn('read-only owner preview', response.json()['detail'])
        self.assertFalse(Order.objects.exists())
        self.assertFalse(StoreSettings.objects.exists())

    @override_settings(OWNER_PREVIEW_MODE=True)
    def test_admin_is_not_available_even_for_get(self):
        response = self.client.get('/admin/login/')
        self.assertEqual(response.status_code, 403)
        self.assertTrue(response.json()['preview_mode'])

    @override_settings(OWNER_PREVIEW_MODE=True)
    def test_write_block_runs_before_the_view(self):
        view = Mock(return_value=HttpResponse('must not be called'))
        middleware = ReadOnlyPreviewMiddleware(view)
        request = RequestFactory().post('/api/orders/', {'email': 'test@example.com'})
        self.assertEqual(middleware(request).status_code, 403)
        view.assert_not_called()

    @override_settings(OWNER_PREVIEW_MODE=False)
    def test_regular_store_requests_are_not_changed(self):
        view = Mock(return_value=HttpResponse('normal operation'))
        request = RequestFactory().post('/api/orders/', {})
        self.assertEqual(ReadOnlyPreviewMiddleware(view)(request).content, b'normal operation')
        view.assert_called_once_with(request)

    @override_settings(EMAIL_BACKEND='config.preview.DisabledPreviewEmailBackend')
    def test_preview_email_backend_never_pretends_to_send(self):
        with self.assertRaisesMessage(ImproperlyConfigured, 'Email sending is disabled'):
            mail.send_mail('Preview', 'Disabled', 'sender@example.com', ['recipient@example.com'])
