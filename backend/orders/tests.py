import io
import json
import tempfile
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch
import smtplib

from PIL import Image
from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import close_old_connections, connection
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from products.models import Category, Product, ProductSize, StoreSettings
from coupons.models import Coupon
from .models import Order, OrderEmail, AuditLog
from .services import decide_order, deliver_email


def image_file(name='receipt.png'):
    content = io.BytesIO()
    Image.new('RGB', (12, 12), 'green').save(content, 'PNG')
    return SimpleUploadedFile(name, content.getvalue(), content_type='image/png')


class CheckoutFixture:
    def setUp(self):
        super().setUp()
        cache.clear()
        self.files = tempfile.TemporaryDirectory()
        self.addCleanup(self.files.cleanup)
        self.overrides = override_settings(MEDIA_ROOT=f'{self.files.name}/public', PRIVATE_MEDIA_ROOT=f'{self.files.name}/private')
        self.overrides.enable()
        self.addCleanup(self.overrides.disable)
        self.client = APIClient()
        self.owner = get_user_model().objects.create_user(username='owner', phone='+251911123456', password='owner-password', is_staff=True)
        category = Category.objects.create(name='Silk', slug='silk')
        self.product = Product.objects.create(name='Sage silk', slug='sage-silk', description='Silk scrunchie', price='100.00', category=category, stock=5, color='Sage', image=image_file('product.png'))
        self.size = ProductSize.objects.create(product=self.product, size='S', stock=5)
        StoreSettings.objects.create(account_name='Test store', cbe='TEST-ACCOUNT', pickup_address='Test pickup', delivery_fee='20.00')

    def payload(self, **updates):
        payload = {
            'full_name': 'Test Customer', 'phone': '+251922123456', 'email': 'customer@example.com',
            'address': 'Test delivery address', 'delivery_method': 'delivery',
            'selected_date': str(timezone.localdate() + timedelta(days=2)),
            'payment_method': 'cbe', 'transaction_reference': f'TEST-{uuid.uuid4().hex}',
            'receipt_url': image_file(), 'checkout_key': str(uuid.uuid4()), 'expected_total': '220.00',
            'items': json.dumps([{'product_id': self.product.pk, 'quantity': 2, 'size': 'S', 'price': '0.01'}]),
        }
        payload.update(updates)
        return payload

    def place(self, **updates):
        response = self.client.post('/api/orders/', self.payload(**updates), format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        return Order.objects.get(pk=response.data['id']), response


class CheckoutTests(CheckoutFixture, TestCase):
    def test_guest_checkout_uses_server_prices_and_private_receipt(self):
        order, response = self.place()
        self.assertIsNone(order.user)
        self.assertEqual(order.total_amount, Decimal('220.00'))
        self.assertEqual(order.items.get().price, Decimal('100.00'))
        self.assertEqual(order.items.get().size, 'S')
        self.assertEqual(order.items.get().color, 'Sage')
        self.product.refresh_from_db(); self.size.refresh_from_db()
        self.assertEqual((self.product.stock, self.size.stock), (3, 3))
        self.assertTrue(order.receipt_url.storage.exists(order.receipt_url.name))
        self.assertNotIn('receipt_url', response.data)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(str(order.tracking_token), mail.outbox[0].body)
        self.assertEqual(self.client.get(f'/media/{order.receipt_url.name}').status_code, 404)
        self.assertEqual(self.client.get(f'/api/orders/{order.pk}/receipt/').status_code, 401)
        self.client.force_authenticate(self.owner)
        receipt = self.client.get(f'/api/orders/{order.pk}/receipt/')
        self.assertEqual(receipt.status_code, 200)
        self.assertEqual(receipt['Cache-Control'], 'private, no-store')
        self.assertTrue(b''.join(receipt.streaming_content).startswith(b'\x89PNG'))

    def test_required_valid_email_and_receipt(self):
        for update in [{'email': ''}, {'email': 'invalid'}, {'receipt_url': SimpleUploadedFile('fake.png', b'not an image')}, {'phone': '123'}, {'selected_date': str(timezone.localdate())}]:
            response = self.client.post('/api/orders/', self.payload(**update), format='multipart')
            self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(Order.objects.exists())
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 5)

    def test_receipt_larger_than_five_megabytes_is_rejected(self):
        content = image_file().read() + b'\0' * (5 * 1024 * 1024)
        response = self.client.post('/api/orders/', self.payload(receipt_url=SimpleUploadedFile('large.png', content, content_type='image/png')), format='multipart')
        self.assertEqual(response.status_code, 400, response.data)
        self.assertFalse(Order.objects.exists())

    def test_receipt_at_five_megabyte_limit_is_accepted(self):
        image = image_file().read()
        content = image + b'\0' * (5 * 1024 * 1024 - len(image))
        self.place(receipt_url=SimpleUploadedFile('limit.png', content, content_type='image/png'))

    def test_invalid_carts_are_rejected_without_mutation(self):
        carts = [
            [], [{'product_id': 999999, 'quantity': 1}], [{'product_id': self.product.pk, 'quantity': -1}],
            [{'product_id': self.product.pk, 'quantity': 0}], [{'product_id': self.product.pk, 'quantity': 1}],
            [{'product_id': self.product.pk, 'quantity': 1, 'size': 'L'}],
            [{'product_id': self.product.pk, 'quantity': 3, 'size': 'S'}] * 2,
            [{'product_id': self.product.pk, 'quantity': 1.5, 'size': 'S'}],
        ]
        for cart in carts:
            response = self.client.post('/api/orders/', self.payload(items=json.dumps(cart)), format='multipart')
            self.assertEqual(response.status_code, 400, response.data)
        response = self.client.post('/api/orders/', self.payload(items='not-json'), format='multipart')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Order.objects.exists())

    def test_duplicate_submit_is_idempotent_and_reference_is_unique(self):
        key = str(uuid.uuid4())
        order, response = self.place(checkout_key=key, transaction_reference='BANK-1234')
        retry = self.client.post('/api/orders/', self.payload(checkout_key=key, transaction_reference='BANK-1234'), format='multipart')
        self.assertEqual(retry.status_code, 200)
        self.assertEqual(retry.data['tracking_token'], response.data['tracking_token'])
        duplicate = self.client.post('/api/orders/', self.payload(transaction_reference='bank-1234'), format='multipart')
        self.assertEqual(duplicate.status_code, 400)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 3)

    def test_quote_and_checkout_coupon_shipping_totals_match(self):
        coupon = Coupon.objects.create(code='SAVE15', type='percentage', value='15.55', expiry_date=timezone.now() + timedelta(days=1), usage_limit=1)
        response = self.client.post('/api/orders/quote/', {'items': [{'product_id': self.product.pk, 'quantity': 2, 'size': 'S'}], 'coupon_code': 'save15'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['total_amount'], '188.90')
        order, _ = self.place(coupon_code='SAVE15', expected_total='188.90')
        self.assertEqual(order.coupon, coupon)
        self.assertEqual(order.discount_amount, Decimal('31.10'))
        coupon.refresh_from_db()
        self.assertEqual(coupon.used_count, 1)
        second = self.client.post('/api/orders/', self.payload(coupon_code='SAVE15', expected_total='188.90'), format='multipart')
        self.assertEqual(second.status_code, 400)

    def test_changed_total_and_disabled_payment_are_rejected(self):
        for update in [{'expected_total': '0.01'}, {'payment_method': 'telebirr'}]:
            response = self.client.post('/api/orders/', self.payload(**update), format='multipart')
            self.assertEqual(response.status_code, 400)
        self.assertFalse(Order.objects.exists())

    def test_subtotal_cannot_overflow_even_with_a_large_discount(self):
        Product.objects.filter(pk=self.product.pk).update(price='99999999.99')
        Coupon.objects.create(code='LARGE', type='percentage', value=99, expiry_date=timezone.now() + timedelta(days=1))
        response = self.client.post('/api/orders/quote/', {
            'items': [{'product_id': self.product.pk, 'quantity': 2, 'size': 'S'}],
            'coupon_code': 'LARGE',
        }, format='json')
        self.assertEqual(response.status_code, 400)

    def test_authenticated_order_belongs_only_to_customer(self):
        customer = get_user_model().objects.create_user(username='buyer', phone='+251933123456')
        self.client.force_authenticate(customer)
        order, _ = self.place()
        self.assertEqual(order.user, customer)
        self.assertEqual(self.client.post(f'/api/orders/{order.pk}/verify/', {}).status_code, 403)
        self.assertEqual(self.client.get(f'/api/orders/{order.pk}/receipt/').status_code, 403)
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.get('/api/orders/my_orders/').data, [])
        stranger = get_user_model().objects.create_user(username='other', phone='+251944123456')
        self.client.force_authenticate(stranger)
        self.assertEqual(self.client.get(f'/api/orders/{order.pk}/').status_code, 404)

    def test_private_tracking_does_not_accept_order_id_or_phone(self):
        order, _ = self.place()
        response = self.client.post('/api/orders/track/', {'token': str(order.tracking_token)}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('receipt_url', response.data)
        self.assertNotIn('email', response.data)
        self.assertEqual(self.client.post('/api/orders/track/', {'token': str(uuid.uuid4())}, format='json').status_code, 404)
        self.assertEqual(self.client.post('/api/orders/track/', {'order_id': order.order_id, 'phone': order.phone}, format='json').status_code, 400)

    def test_review_rejection_restores_stock_once_and_emails_reason(self):
        order, _ = self.place()
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.post(f'/api/orders/{order.pk}/reject/', {}).status_code, 400)
        response = self.client.post(f'/api/orders/{order.pk}/reject/', {'note': 'Transaction not found in our account.'})
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data['email_sent'])
        self.assertEqual(len(mail.outbox), 2)
        self.assertIn('declined', mail.outbox[-1].subject)
        self.assertIn('Transaction not found', mail.outbox[-1].body)
        for action in ['reject', 'verify']:
            self.assertEqual(self.client.post(f'/api/orders/{order.pk}/{action}/', {'note': 'Repeat'}).status_code, 400)
        self.product.refresh_from_db(); self.size.refresh_from_db()
        self.assertEqual((self.product.stock, self.size.stock), (5, 5))
        self.assertEqual(AuditLog.objects.count(), 1)
        self.assertEqual(self.client.delete(f'/api/orders/{order.pk}/').status_code, 405)
        self.assertEqual(self.client.patch(f'/api/orders/{order.pk}/', {'status': 'verified'}).status_code, 405)

    def test_email_failure_preserves_decision_and_can_be_retried(self):
        order, _ = self.place()
        self.client.force_authenticate(self.owner)
        with patch('orders.services.send_mail', side_effect=smtplib.SMTPException('Unavailable')):
            response = self.client.post(f'/api/orders/{order.pk}/verify/', {'note': 'Payment matched.'})
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['email_sent'])
        order.refresh_from_db()
        self.assertEqual(order.status, 'verified')
        email = order.emails.get(kind='decision')
        self.assertIsNone(email.sent_at)
        retry = self.client.post(f'/api/orders/{order.pk}/retry_email/')
        self.assertTrue(retry.data['email_sent'])
        email.refresh_from_db()
        self.assertIsNotNone(email.sent_at)
        self.assertEqual(email.attempts, 2)
        self.assertIn('authenticated', mail.outbox[-1].subject)
        before = len(mail.outbox)
        self.client.post(f'/api/orders/{order.pk}/retry_email/')
        self.assertEqual(len(mail.outbox), before)

    def test_fulfillment_requires_authenticated_payment_and_forward_steps(self):
        order, _ = self.place()
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.post(f'/api/orders/{order.pk}/fulfill/', {'status': 'ready'}).status_code, 400)
        self.client.post(f'/api/orders/{order.pk}/verify/', {})
        self.assertEqual(self.client.post(f'/api/orders/{order.pk}/fulfill/', {'status': 'completed'}).status_code, 400)
        for step in ['ready', 'completed']:
            self.assertEqual(self.client.post(f'/api/orders/{order.pk}/fulfill/', {'status': step}).status_code, 200)
        self.assertEqual(self.client.post(f'/api/orders/{order.pk}/fulfill/', {'status': 'ready'}).status_code, 400)

    def test_unconfigured_store_cannot_accept_payments(self):
        StoreSettings.objects.all().delete()
        response = self.client.post('/api/orders/', self.payload(), format='multipart')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Order.objects.exists())

    def test_browsing_does_not_consume_checkout_rate_limit(self):
        for _ in range(35):
            self.assertEqual(self.client.get('/api/products/').status_code, 200)
        self.place()

    def test_pickup_has_no_delivery_fee(self):
        order, _ = self.place(delivery_method='pickup', address='', expected_total='200.00')
        self.assertEqual(order.delivery_fee, 0)

    def test_rejection_releases_coupon_usage_and_preserves_hidden_product(self):
        coupon = Coupon.objects.create(code='FIXED', type='fixed', value=10, usage_limit=1, expiry_date=timezone.now() + timedelta(days=1))
        order, _ = self.place(coupon_code='FIXED', expected_total='210.00')
        Product.objects.filter(pk=self.product.pk).update(is_available=False)
        self.client.force_authenticate(self.owner)
        response = self.client.post(f'/api/orders/{order.pk}/reject/', {'note': 'Transfer missing.'})
        self.assertEqual(response.status_code, 200)
        coupon.refresh_from_db(); self.product.refresh_from_db()
        self.assertEqual(coupon.used_count, 0)
        self.assertFalse(self.product.is_available)

    def test_order_keeps_product_snapshot_after_catalog_edit(self):
        order, _ = self.place()
        Product.objects.filter(pk=self.product.pk).update(name='Changed', color='Blue', price=999)
        item = order.items.get()
        self.assertEqual((item.product_name, item.color, item.price), ('Sage silk', 'Sage', Decimal('100.00')))


class ConcurrentCheckoutTests(CheckoutFixture, TransactionTestCase):
    def test_simultaneous_retry_returns_the_same_order(self):
        if connection.vendor != 'postgresql':
            self.skipTest('Row-lock concurrency requires PostgreSQL.')
        Product.objects.filter(pk=self.product.pk).update(stock=2)
        ProductSize.objects.filter(pk=self.size.pk).update(stock=2)
        key = str(uuid.uuid4())

        def checkout(_):
            close_old_connections()
            try:
                response = APIClient().post('/api/orders/', self.payload(checkout_key=key, transaction_reference='RETRY-1234'), format='multipart')
                return response.status_code, response.data.get('id')
            finally:
                connection.close()

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(checkout, range(2)))
        self.assertEqual(sorted(code for code, _ in results), [200, 201])
        self.assertEqual(len(set(pk for _, pk in results)), 1)
        self.assertEqual(Order.objects.count(), 1)

    def test_last_stock_cannot_be_sold_twice(self):
        if connection.vendor != 'postgresql':
            self.skipTest('Row-lock concurrency requires PostgreSQL.')
        Product.objects.filter(pk=self.product.pk).update(stock=2)
        ProductSize.objects.filter(pk=self.size.pk).update(stock=2)

        def checkout(_):
            close_old_connections()
            try:
                client = APIClient()
                response = client.post('/api/orders/', self.payload(), format='multipart')
                return response.status_code
            finally:
                connection.close()

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(checkout, range(2)))
        self.assertEqual(sorted(results), [201, 400])
        self.assertEqual(Order.objects.count(), 1)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 0)

    def test_concurrent_rejections_restore_stock_only_once(self):
        if connection.vendor != 'postgresql':
            self.skipTest('Row-lock concurrency requires PostgreSQL.')
        order, _ = self.place()

        def reject(_):
            close_old_connections()
            try:
                client = APIClient()
                client.force_authenticate(self.owner)
                return client.post(f'/api/orders/{order.pk}/reject/', {'note': 'No transfer found.'}).status_code
            finally:
                connection.close()

        with ThreadPoolExecutor(max_workers=2) as executor:
            results = list(executor.map(reject, range(2)))
        self.assertEqual(sorted(results), [200, 400])
        self.product.refresh_from_db(); self.size.refresh_from_db()
        self.assertEqual((self.product.stock, self.size.stock), (5, 5))
        self.assertEqual(AuditLog.objects.count(), 1)
