from rest_framework import serializers
from django.db import transaction
from .models import Product, Category, ProductSize, ProductImage, StoreSettings
import json
from urllib.parse import urlsplit


def validate_image(image):
    if image.size > 5 * 1024 * 1024 or image.image.format not in ['PNG', 'JPEG', 'WEBP']:
        raise serializers.ValidationError('Use a JPEG, PNG or WebP image no larger than 5 MB.')
    return image

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']

class ProductSizeSerializer(serializers.ModelSerializer):
    size_display = serializers.CharField(source='get_size_display', read_only=True)
    
    class Meta:
        model = ProductSize
        fields = ['id', 'size', 'size_display', 'stock']


class SizeInputSerializer(serializers.Serializer):
    size = serializers.ChoiceField(choices=['S', 'M', 'L'])
    stock = serializers.IntegerField(min_value=0, max_value=1000000)

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ['id', 'image', 'alt_text', 'is_primary', 'order']

class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    sizes = ProductSizeSerializer(many=True, read_only=True)
    images = ProductImageSerializer(many=True, read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(source='category', queryset=Category.objects.all(), write_only=True)
    sizes_data = SizeInputSerializer(many=True, required=False, write_only=True)
    gallery_images = serializers.ListField(child=serializers.ImageField(validators=[validate_image]), max_length=8, required=False, write_only=True)
    remove_image_ids = serializers.ListField(child=serializers.IntegerField(min_value=1), required=False, write_only=True)
    stock = serializers.IntegerField(min_value=0, max_value=1000000)
    image = serializers.ImageField(validators=[validate_image])
    color_options = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'description', 'price', 'category', 
                  'image', 'images', 'stock', 'is_available', 'is_featured', 'color', 
                  'sizes', 'created_at', 'category_id', 'sizes_data', 'gallery_images', 'remove_image_ids',
                  'style', 'color_hex', 'color_options']
        read_only_fields = ['created_at']

    def get_color_options(self, obj):
        if not obj.style or getattr(self.context.get('view'), 'action', None) != 'retrieve':
            return []
        return list(Product.objects.filter(style=obj.style, is_available=True).order_by('id').values('id', 'slug', 'color', 'color_hex', 'stock'))

    def to_internal_value(self, data):
        if hasattr(data, 'getlist'):
            gallery = data.getlist('gallery_images')
            data = {key: data.get(key) for key in data}
            if gallery:
                data['gallery_images'] = gallery
        else:
            data = dict(data)
        for field in ['sizes_data', 'remove_image_ids']:
            if isinstance(data.get(field), str):
                try:
                    data[field] = json.loads(data[field])
                except ValueError:
                    raise serializers.ValidationError({field: 'Invalid list.'})
        return super().to_internal_value(data)

    def validate(self, data):
        sizes = data.get('sizes_data')
        if sizes is not None:
            codes = [size['size'] for size in sizes]
            if len(codes) != len(set(codes)):
                raise serializers.ValidationError({'sizes_data': 'Each size must appear only once.'})
            if sizes:
                data['stock'] = sum(size['stock'] for size in sizes)
            if self.instance:
                removed = self.instance.sizes.exclude(size__in=codes).values_list('size', flat=True)
                if self.instance.orderitem_set.filter(order__status='pending', size__in=removed).exists():
                    raise serializers.ValidationError({'sizes_data': 'Review pending orders before removing their sizes.'})
        elif self.instance and self.instance.sizes.exists() and 'stock' in data:
            if data['stock'] != sum(self.instance.sizes.values_list('stock', flat=True)):
                raise serializers.ValidationError({'stock': 'Update size quantities to change the stock for this product.'})
        removed_images = data.get('remove_image_ids', [])
        if removed_images and (not self.instance or self.instance.images.filter(pk__in=removed_images).count() != len(set(removed_images))):
            raise serializers.ValidationError({'remove_image_ids': 'Select images belonging to this product.'})
        return data

    def save_related(self, product, sizes, gallery, removed):
        if sizes is not None:
            product.sizes.exclude(size__in=[s['size'] for s in sizes]).delete()
            for size in sizes:
                ProductSize.objects.update_or_create(product=product, size=size['size'], defaults={'stock': size['stock']})
        product.images.filter(pk__in=removed).delete()
        for image in gallery:
            ProductImage.objects.create(product=product, image=image, alt_text=product.name)
        return product

    @transaction.atomic
    def create(self, validated_data):
        sizes = validated_data.pop('sizes_data', None)
        gallery = validated_data.pop('gallery_images', [])
        removed = validated_data.pop('remove_image_ids', [])
        product = super().create(validated_data)
        return self.save_related(product, sizes, gallery, removed)

    @transaction.atomic
    def update(self, instance, validated_data):
        sizes = validated_data.pop('sizes_data', None)
        gallery = validated_data.pop('gallery_images', [])
        removed = validated_data.pop('remove_image_ids', [])
        product = super().update(instance, validated_data)
        return self.save_related(product, sizes, gallery, removed)


class StoreSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreSettings
        fields = ['account_name', 'telebirr', 'cbe', 'dashen', 'pickup_address', 'delivery_fee', 'announcement',
                  'instagram_url', 'tiktok_url', 'telegram_url']

    def validate(self, data):
        hosts = {
            'instagram_url': {'instagram.com', 'www.instagram.com'},
            'tiktok_url': {'tiktok.com', 'www.tiktok.com'},
            'telegram_url': {'t.me', 'telegram.me', 'www.telegram.me'},
        }
        for field, allowed_hosts in hosts.items():
            value = data.get(field, '')
            if not value:
                continue
            parts = urlsplit(value)
            if (parts.scheme != 'https' or parts.hostname not in allowed_hosts
                    or parts.username or parts.password or parts.netloc != parts.hostname
                    or not parts.path.strip('/')):
                raise serializers.ValidationError({field: 'Use the full HTTPS profile or channel link for this platform.'})
        if any(data.get(key) for key in ['telebirr', 'cbe', 'dashen']) and not data.get('account_name'):
            raise serializers.ValidationError({'account_name': 'Provide the account holder name for bank transfers.'})
        return data
