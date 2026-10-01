import hashlib
import json
import tempfile
from io import StringIO
from pathlib import Path
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import CommandError, call_command
from django.test import TestCase, override_settings
from coupons.models import Coupon
from orders.models import Order
from products.management.commands.load_owner_preview import PREVIEW_DIRECTORY
from products.models import Category, Product, StoreSettings


class OwnerPreviewTests(TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        overrides = override_settings(MEDIA_ROOT=directory.name)
        overrides.enable()
        self.addCleanup(overrides.disable)
        self.snapshot = json.loads((PREVIEW_DIRECTORY / 'catalog.json').read_text())

    def load(self):
        call_command('load_owner_preview', confirm_demo=True, stdout=StringIO())

    @override_settings(DEBUG=False)
    def test_production_safe_import_matches_the_bundled_local_storefront(self):
        self.load()
        self.assertEqual(Product.objects.count(), 12)
        self.assertEqual(Category.objects.count(), 4)
        self.assertEqual(Product.objects.filter(is_featured=True).count(), 4)
        hashes = {entry['file']: entry['sha256'] for entry in self.snapshot['images']}
        for entry in self.snapshot['products']:
            product = Product.objects.get(slug=entry['slug'])
            for field in ['name', 'description', 'stock', 'color', 'style', 'color_hex', 'is_featured', 'is_available']:
                self.assertEqual(getattr(product, field), entry[field])
            self.assertEqual(str(product.price), entry['price'])
            self.assertEqual(product.category.slug, entry['category_slug'])
            self.assertEqual(list(product.sizes.values('size', 'stock')), entry['sizes_data'])
            with product.image.open('rb') as image:
                self.assertEqual(hashlib.sha256(image.read()).hexdigest(), hashes[entry['image_file']])
        store = StoreSettings.objects.get(pk=1)
        for field, value in self.snapshot['store'].items():
            actual = getattr(store, field)
            self.assertEqual(str(actual) if field == 'delivery_fee' else actual, value)
        self.assertEqual(Product.objects.get(slug='demo-satin-moss').stock, 53)
        self.assertEqual(get_user_model().objects.count(), 0)
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(Coupon.objects.count(), 0)

    def test_confirmation_is_required_even_in_development(self):
        with self.assertRaisesMessage(CommandError, '--confirm-demo'):
            call_command('load_owner_preview', stdout=StringIO())
        self.assertFalse(Product.objects.exists())

    def test_rerun_preserves_catalog_and_owner_edits(self):
        self.load()
        Product.objects.filter(slug='demo-satin-moss').update(stock=7)
        with self.assertRaisesMessage(CommandError, 'Refusing to overwrite'):
            self.load()
        self.assertEqual(Product.objects.get(slug='demo-satin-moss').stock, 7)
        self.assertEqual(Product.objects.count(), 12)

    def test_existing_settings_are_never_overwritten(self):
        StoreSettings.objects.create(pk=1, announcement='Existing shop')
        with self.assertRaisesMessage(CommandError, 'Refusing to overwrite'):
            self.load()
        self.assertEqual(StoreSettings.objects.get(pk=1).announcement, 'Existing shop')
        self.assertFalse(Product.objects.exists())

    def test_missing_images_fail_before_database_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'catalog.json').write_text(json.dumps(self.snapshot))
            with patch('products.management.commands.load_owner_preview.PREVIEW_DIRECTORY', root):
                with self.assertRaisesMessage(CommandError, 'Cannot read bundled image'):
                    self.load()
        self.assertFalse(Category.objects.exists())
        self.assertFalse(Product.objects.exists())

    def test_corrupt_images_fail_before_database_changes(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'catalog.json').write_text(json.dumps(self.snapshot))
            (root / 'images').mkdir()
            (root / 'images' / self.snapshot['images'][0]['file']).write_bytes(b'corrupt')
            with patch('products.management.commands.load_owner_preview.PREVIEW_DIRECTORY', root):
                with self.assertRaisesMessage(CommandError, 'checksum mismatch'):
                    self.load()
        self.assertFalse(Category.objects.exists())
