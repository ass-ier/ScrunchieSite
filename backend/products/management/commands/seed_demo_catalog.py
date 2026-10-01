import json
from pathlib import Path
from django.conf import settings
from django.core.files import File
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from products.models import Category, Product, ProductSize, StoreSettings
from coupons.models import Coupon


class Command(BaseCommand):
    help = 'Create an illustrative, fully stocked sample catalog in development only.'

    def add_arguments(self, parser):
        parser.add_argument('--replace-preview', action='store_true', help='Hide the original satin-scrunchie preview product, preserving its orders.')
        parser.add_argument('--refresh-images', action='store_true', help='Replace only sample product illustrations; keep stock and product edits.')

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError('Demo catalog seeding is disabled in production.')
        directory = settings.BASE_DIR.parent / 'frontend' / 'public' / 'catalog'
        catalog = json.loads((directory / 'catalog.json').read_text())
        missing = [item['slug'] for item in catalog if not (directory / f"{item['slug']}.webp").is_file()]
        if missing:
            raise CommandError(f'Missing sample illustrations: {", ".join(missing)}')
        with transaction.atomic():
            for index, item in enumerate(catalog):
                category, _ = Category.objects.get_or_create(slug=item['style'], defaults={'name': item['category']})
                product, created = Product.objects.get_or_create(slug=item['slug'], defaults={
                    'name': item['name'], 'style': item['style'], 'color': item['color'], 'color_hex': item['color_hex'],
                    'category': category, 'price': item['price'], 'stock': 54,
                    'is_featured': index % 3 == 0, 'is_available': True,
                    'description': f"A {item['color'].lower()} scrunchie from the {item['category']} collection. "
                                   'Illustrative sample product for exploring the store; images, pricing and stock are demonstration data.',
                })
                if created or options['refresh_images']:
                    previous_image = product.image.name
                    with (directory / f"{item['slug']}.webp").open('rb') as photo:
                        product.image.save(f"{item['slug']}.webp", File(photo))
                    if previous_image and previous_image != product.image.name and previous_image.startswith('products/demo-'):
                        product.image.storage.delete(previous_image)
                if created:
                    ProductSize.objects.bulk_create([ProductSize(product=product, size=size, stock=18) for size in ['S', 'M', 'L']])
            if options['replace_preview']:
                Product.objects.filter(slug='satin-scrunchie').update(is_available=False, is_featured=False)
                Coupon.objects.filter(code__in=['PREVIEW10', 'BROWSER20']).update(active=False)
            store, _ = StoreSettings.objects.get_or_create(pk=1)
            store.announcement = 'Preview collection · Illustrative products & sample prices. Please do not send real payments.'
            store.save(update_fields=['announcement'])
        self.stdout.write(self.style.SUCCESS('12 sample products ready. Existing sample stock and order history were preserved.'))
