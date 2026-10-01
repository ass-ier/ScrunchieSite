import json
from datetime import timedelta
from django.utils import timezone
from orders.tests import CheckoutFixture, image_file
from django.test import TestCase
from coupons.models import Coupon
from .models import Product
from django.core.management import call_command, CommandError
from django.test import override_settings
from io import StringIO


class CatalogTests(CheckoutFixture, TestCase):
    def test_color_options_link_only_visible_variants_of_same_style(self):
        self.product.style = 'satin'
        self.product.color_hex = '#6a8360'
        self.product.save()
        rose = Product.objects.create(name='Rose', slug='rose-variant', style='satin', color='Rose', color_hex='#d69caa',
                                      price=100, category=self.product.category, stock=3, image=image_file())
        Product.objects.create(name='Hidden', slug='hidden-variant', style='satin', is_available=False,
                               price=100, category=self.product.category, stock=2, image=image_file())
        response = self.client.get('/api/products/sage-silk/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual({option['id'] for option in response.data['color_options']}, {self.product.pk, rose.pk})
        self.assertEqual(response.data['color_hex'], '#6a8360')

    def test_invalid_swatch_cannot_be_saved(self):
        self.client.force_authenticate(self.owner)
        response = self.client.patch('/api/products/sage-silk/', {'color_hex': 'not-a-color'}, format='json')
        self.assertEqual(response.status_code, 400)

    @override_settings(DEBUG=True)
    def test_demo_seed_is_repeatable_without_resetting_stock_or_orders(self):
        self.product.slug = 'satin-scrunchie'
        self.product.save()
        order, _ = self.place()
        call_command('seed_demo_catalog', replace_preview=True, stdout=StringIO())
        self.assertEqual(Product.objects.filter(slug__startswith='demo-').count(), 12)
        sample = Product.objects.get(slug='demo-satin-lilac')
        self.assertEqual(sample.stock, 54)
        self.assertEqual(sample.sizes.count(), 3)
        sample.stock = 49
        sample.save()
        sample.sizes.filter(size='S').update(stock=13)
        call_command('seed_demo_catalog', replace_preview=True, stdout=StringIO())
        sample.refresh_from_db(); self.product.refresh_from_db(); order.refresh_from_db()
        self.assertEqual(sample.stock, 49)
        self.assertFalse(self.product.is_available)
        self.assertEqual(order.items.get().product_id, self.product.pk)

    @override_settings(DEBUG=False)
    def test_demo_seed_refuses_production(self):
        with self.assertRaises(CommandError):
            call_command('seed_demo_catalog', stdout=StringIO())

    def test_owner_can_save_category_color_sizes_featured_and_images(self):
        self.client.force_authenticate(self.owner)
        response = self.client.post('/api/products/', {
            'name': 'Rose scrunchie', 'slug': 'rose', 'description': 'Soft silk',
            'price': '125.50', 'category_id': self.product.category_id, 'stock': 99,
            'color': 'Rose', 'is_featured': True, 'is_available': True, 'image': image_file(),
            'gallery_images': [image_file('gallery.png')],
            'sizes_data': json.dumps([{'size': 'S', 'stock': 2}, {'size': 'M', 'stock': 4}]),
        }, format='multipart')
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['stock'], 6)
        self.assertEqual(response.data['category']['id'], self.product.category_id)
        self.assertEqual(response.data['color'], 'Rose')
        self.assertEqual(len(response.data['sizes']), 2)
        self.assertEqual(len(response.data['images']), 1)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/products/featured/').data[0]['slug'], 'rose')
        self.assertEqual(self.client.patch('/api/products/rose/', {'price': '1'}).status_code, 401)

    def test_hiding_product_is_not_overridden_by_stock(self):
        self.client.force_authenticate(self.owner)
        response = self.client.patch('/api/products/sage-silk/', {'is_available': False}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get('/api/products/sage-silk/').status_code, 404)

    def test_multipart_edit_keeps_existing_image(self):
        image = self.product.image.name
        self.client.force_authenticate(self.owner)
        response = self.client.patch('/api/products/sage-silk/', {
            'name': 'Updated name', 'category_id': self.product.category_id,
            'price': '130.00', 'color': 'Green', 'stock': '7',
            'sizes_data': json.dumps([{'size': 'S', 'stock': 7}]),
        }, format='multipart')
        self.assertEqual(response.status_code, 200, response.data)
        self.product.refresh_from_db()
        self.assertEqual(self.product.image.name, image)
        self.assertEqual(self.product.stock, 7)

    def test_product_review_statistics_load_for_guests(self):
        response = self.client.get('/api/reviews/product_stats/', {'product_id': self.product.pk})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['total_reviews'], 0)

    def test_ordered_products_cannot_be_deleted_or_pending_sizes_removed(self):
        self.place()
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.delete('/api/products/sage-silk/').status_code, 400)
        response = self.client.patch('/api/products/sage-silk/', {'sizes_data': []}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_invalid_product_data_does_not_partially_write(self):
        self.client.force_authenticate(self.owner)
        for data in [{'stock': -1}, {'price': '-2'}, {'sizes_data': [{'size': 'S', 'stock': 1}, {'size': 'S', 'stock': 2}]}]:
            self.assertEqual(self.client.patch('/api/products/sage-silk/', data, format='json').status_code, 400)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 5)

    def test_only_active_public_unexpired_promotions_are_announced(self):
        base = dict(type='percentage', value=10, expiry_date=timezone.now() + timedelta(days=1), usage_limit=5, is_public=True)
        public = Coupon.objects.create(code='PUBLIC', **base)
        for code, changes in [('PRIVATE', {'is_public': False}), ('EXPIRED', {'expiry_date': timezone.now() - timedelta(days=1)}), ('PAUSED', {'active': False}), ('USED', {'used_count': 5})]:
            Coupon.objects.create(code=code, **{**base, **changes})
        self.assertEqual([coupon['code'] for coupon in self.client.get('/api/coupons/promotions/').data], ['PUBLIC'])
        self.assertEqual(self.client.get('/api/coupons/').status_code, 401)
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.patch(f'/api/coupons/{public.pk}/', {'value': 101}, format='json').status_code, 400)

    def test_settings_require_owner_and_valid_account_holder(self):
        response = self.client.post('/api/products/settings/', {'cbe': 'TEST'}, format='json')
        self.assertEqual(response.status_code, 401)
        self.client.force_authenticate(self.owner)
        response = self.client.post('/api/products/settings/', {'cbe': 'TEST', 'account_name': '', 'delivery_fee': 0}, format='json')
        self.assertEqual(response.status_code, 400)

    def test_owner_social_links_save_and_are_publicly_readable(self):
        self.client.force_authenticate(self.owner)
        data = self.client.get('/api/products/settings/').data
        links = {
            'instagram_url': 'https://www.instagram.com/test-store/',
            'tiktok_url': 'https://www.tiktok.com/@test-store',
            'telegram_url': 'https://t.me/test_store',
        }
        response = self.client.post('/api/products/settings/', {**data, **links}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.client.force_authenticate(None)
        public = self.client.get('/api/products/settings/')
        for field, value in links.items():
            self.assertEqual(public.data[field], value)
        self.assertEqual(self.client.post('/api/products/settings/', links, format='json').status_code, 401)

    def test_social_links_reject_unsafe_and_wrong_platform_urls(self):
        self.client.force_authenticate(self.owner)
        data = self.client.get('/api/products/settings/').data
        for field, url in [
            ('instagram_url', 'javascript:alert(1)'),
            ('instagram_url', 'http://instagram.com/profile'),
            ('instagram_url', 'https://instagram.com.evil.example/profile'),
            ('instagram_url', 'https://evil.example@instagram.com/profile'),
            ('instagram_url', 'https://instagram.com/'),
            ('tiktok_url', 'https://instagram.com/profile'),
            ('telegram_url', 'https://t.me:8443/channel'),
        ]:
            with self.subTest(field=field, url=url):
                response = self.client.post('/api/products/settings/', {**data, field: url}, format='json')
                self.assertEqual(response.status_code, 400, response.data)
                self.assertIn(field, response.data)

    def test_social_links_can_be_cleared_without_affecting_store_details(self):
        self.client.force_authenticate(self.owner)
        data = self.client.get('/api/products/settings/').data
        self.client.post('/api/products/settings/', {**data, 'instagram_url': 'https://instagram.com/test-store/'}, format='json')
        response = self.client.post('/api/products/settings/', {**data, 'instagram_url': ''}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['instagram_url'], '')
        self.assertEqual(response.data['cbe'], data['cbe'])

    def test_owner_login_returns_staff_role_and_cannot_escalate_profile(self):
        response = self.client.post('/api/users/login/', {'phone': '0911123456', 'password': 'owner-password'}, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertTrue(response.data['user']['is_staff'])
        self.client.force_authenticate(self.owner)
        self.client.patch('/api/users/me/', {'is_staff': False}, format='json')
        self.owner.refresh_from_db()
        self.assertTrue(self.owner.is_staff)
