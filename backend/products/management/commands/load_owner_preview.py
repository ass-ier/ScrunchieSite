import hashlib
import json
from pathlib import Path

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from rest_framework.exceptions import ValidationError

from coupons.models import Coupon
from coupons.serializers import CouponSerializer
from orders.models import Order
from products.models import Category, Product, StoreSettings
from products.serializers import CategorySerializer, ProductSerializer, StoreSettingsSerializer


PREVIEW_DIRECTORY = Path(__file__).resolve().parents[2] / 'owner_preview'


class Command(BaseCommand):
    help = 'Load the bundled local storefront snapshot into an empty preview database. Never imports users, orders or receipts.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm-demo', action='store_true',
            help='Confirm this is a preview store, not a live shop accepting payments.',
        )

    def handle(self, *args, **options):
        if not options['confirm_demo']:
            raise CommandError('Use --confirm-demo only for an empty owner-preview store.')
        if any(model.objects.exists() for model in [Product, Category, StoreSettings, Coupon, Order]):
            raise CommandError(
                'Refusing to overwrite existing catalog, settings or orders. '
                'This command is one-time setup for an empty preview database; existing data is unchanged.'
            )
        try:
            snapshot = json.loads((PREVIEW_DIRECTORY / 'catalog.json').read_text())
        except (OSError, ValueError) as error:
            raise CommandError(f'Cannot read the bundled preview snapshot: {error}') from error
        if snapshot.get('schema_version') != 1 or not snapshot.get('products'):
            raise CommandError('The bundled preview snapshot is empty or unsupported.')

        images = {}
        for entry in snapshot['images']:
            name = entry['file']
            if Path(name).name != name or not name.endswith('.webp'):
                raise CommandError('Invalid bundled image path.')
            try:
                content = (PREVIEW_DIRECTORY / 'images' / name).read_bytes()
            except OSError as error:
                raise CommandError(f'Cannot read bundled image {name}: {error}') from error
            if hashlib.sha256(content).hexdigest() != entry['sha256']:
                raise CommandError(f'Bundled image checksum mismatch: {name}')
            images[name] = content

        saved_files = []
        try:
            with transaction.atomic():
                categories = {}
                for entry in snapshot['categories']:
                    serializer = CategorySerializer(data=entry)
                    serializer.is_valid(raise_exception=True)
                    category = serializer.save()
                    categories[category.slug] = category.pk
                store = StoreSettingsSerializer(data=snapshot['store'])
                store.is_valid(raise_exception=True)
                products = []
                for entry in snapshot['products']:
                    data = dict(entry)
                    category = data.pop('category_slug')
                    image = data.pop('image_file')
                    if category not in categories or image not in images:
                        raise CommandError('A preview product references a missing category or image.')
                    serializer = ProductSerializer(data={
                        **data, 'category_id': categories[category],
                        'image': SimpleUploadedFile(image, images[image], content_type='image/webp'),
                    })
                    serializer.is_valid(raise_exception=True)
                    products.append(serializer)
                for serializer in products:
                    product = serializer.save()
                    saved_files.append((product.image.storage, product.image.name))
                for entry in snapshot['promotions']:
                    serializer = CouponSerializer(data=entry)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                store.save(pk=1)
        except (ValidationError, CommandError) as error:
            for storage, name in saved_files:
                storage.delete(name)
            raise CommandError(f'Preview import cancelled: {error}') from error

        self.stdout.write(self.style.SUCCESS(
            f"Loaded {len(snapshot['products'])} products, {len(categories)} categories, "
            f"{len(snapshot['promotions'])} promotions and the local demo settings."
        ))
        self.stdout.write(f'Product images saved under {settings.MEDIA_ROOT}.')
        self.stdout.write('Preview only: payment details are demonstration values. Do not send real transfers.')
