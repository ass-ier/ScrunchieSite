import json
import phonenumbers
from rest_framework import serializers
from django.utils import timezone
from .models import Order, OrderItem, AuditLog
from products.serializers import ProductSerializer


class CheckoutItemSerializer(serializers.Serializer):
    product_id = serializers.IntegerField(min_value=1)
    quantity = serializers.IntegerField(min_value=1, max_value=100)
    size = serializers.ChoiceField(choices=['', 'S', 'M', 'L'], default='')


class QuoteSerializer(serializers.Serializer):
    items = CheckoutItemSerializer(many=True, allow_empty=False, max_length=100)
    coupon_code = serializers.CharField(max_length=50, required=False, allow_blank=True, default='')
    delivery_method = serializers.ChoiceField(choices=Order.DELIVERY_CHOICES, default='delivery')


class CheckoutSerializer(QuoteSerializer):
    checkout_key = serializers.UUIDField()
    expected_total = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    full_name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=20)
    email = serializers.EmailField(max_length=254)
    address = serializers.CharField(max_length=2000, required=False, allow_blank=True, default='')
    selected_date = serializers.DateField()
    delivery_notes = serializers.CharField(max_length=2000, required=False, allow_blank=True, default='')
    payment_method = serializers.ChoiceField(choices=Order.PAYMENT_CHOICES)
    transaction_reference = serializers.RegexField(r'^[A-Za-z0-9][A-Za-z0-9/_-]{3,199}$', max_length=200)
    receipt_url = serializers.ImageField()

    def to_internal_value(self, data):
        if hasattr(data, 'getlist'):
            data = {key: data.get(key) for key in data}
        else:
            data = dict(data)
        if isinstance(data.get('items'), str):
            try:
                data['items'] = json.loads(data['items'])
            except (ValueError, TypeError):
                raise serializers.ValidationError({'items': 'Invalid cart data.'})
        return super().to_internal_value(data)

    def validate_phone(self, value):
        try:
            number = phonenumbers.parse(value, 'ET')
            if phonenumbers.is_valid_number(number):
                return phonenumbers.format_number(number, phonenumbers.PhoneNumberFormat.E164)
        except phonenumbers.NumberParseException:
            pass
        raise serializers.ValidationError('Enter a valid phone number, including the country code.')

    def validate_selected_date(self, value):
        if value <= timezone.localdate():
            raise serializers.ValidationError('Choose a date from tomorrow onwards.')
        return value

    def validate_receipt_url(self, value):
        if value.size > 5 * 1024 * 1024 or value.image.format not in ['PNG', 'JPEG']:
            raise serializers.ValidationError('Upload a PNG or JPEG image no larger than 5 MB.')
        value.name = 'receipt.png' if value.image.format == 'PNG' else 'receipt.jpg'
        return value

    def validate(self, data):
        if data['delivery_method'] == 'delivery' and not data['address']:
            raise serializers.ValidationError({'address': 'A delivery address is required.'})
        return data


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_name', 'quantity', 'price', 'size', 'color']


class OrderTrackingSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ['id', 'order_id', 'full_name', 'phone', 'delivery_method', 'selected_date',
                  'payment_method', 'status', 'admin_note', 'fulfillment_status',
                  'subtotal', 'discount_amount', 'delivery_fee', 'total_amount', 'items', 'created_at']


class OrderSerializer(OrderTrackingSerializer):
    receipt_url = serializers.SerializerMethodField()
    email_status = serializers.SerializerMethodField()

    class Meta(OrderTrackingSerializer.Meta):
        fields = OrderTrackingSerializer.Meta.fields + [
            'email', 'address', 'delivery_notes', 'transaction_reference', 'receipt_url', 'email_status'
        ]

    def get_receipt_url(self, obj):
        return f'/orders/{obj.pk}/receipt/'

    def get_email_status(self, obj):
        return [
            {'kind': email.kind, 'status': 'sent' if email.sent_at else ('failed' if email.attempts else 'pending'),
             'attempts': email.attempts}
            for email in obj.emails.all()
        ]


class AuditLogSerializer(serializers.ModelSerializer):
    admin_email = serializers.EmailField(source='admin.email', read_only=True)

    class Meta:
        model = AuditLog
        fields = ['id', 'action', 'previous_status', 'new_status', 'note', 'admin_email', 'timestamp']
