from rest_framework import serializers
from .models import Coupon
from django.utils import timezone
from decimal import Decimal, ROUND_HALF_UP


class CouponSerializer(serializers.ModelSerializer):
    is_valid_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Coupon
        fields = ['id', 'code', 'type', 'value', 'expiry_date', 'usage_limit', 
                  'used_count', 'active', 'min_purchase_amount', 'is_valid_status', 'created_at', 'is_public', 'announcement']
        read_only_fields = ['id', 'used_count', 'created_at']
    
    def get_is_valid_status(self, obj):
        is_valid, message = obj.is_valid()
        return {'valid': is_valid, 'message': message}

    def validate_code(self, value):
        value = value.strip().upper()
        if not value.isascii() or not all(c.isalnum() or c in '-_' for c in value):
            raise serializers.ValidationError('Use letters, numbers, hyphens or underscores.')
        queryset = Coupon.objects.filter(code__iexact=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError('This coupon code already exists.')
        return value

    def validate(self, data):
        value = data.get('value', self.instance.value if self.instance else 0)
        kind = data.get('type', self.instance.type if self.instance else '')
        minimum = data.get('min_purchase_amount', self.instance.min_purchase_amount if self.instance else 0)
        if value <= 0 or (kind == 'percentage' and value > 100):
            raise serializers.ValidationError({'value': 'Use a positive discount; percentages cannot exceed 100.'})
        if minimum < 0:
            raise serializers.ValidationError({'min_purchase_amount': 'Minimum purchase cannot be negative.'})
        return data


class CouponValidationSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)
    
    def validate_code(self, value):
        try:
            coupon = Coupon.objects.get(code=value.upper())
            self.context['coupon'] = coupon
            return value.upper()
        except Coupon.DoesNotExist:
            raise serializers.ValidationError('Invalid coupon code')
    
    def validate(self, data):
        coupon = self.context.get('coupon')
        amount = data.get('amount')
        
        # Check if coupon is valid
        is_valid, message = coupon.is_valid()
        if not is_valid:
            raise serializers.ValidationError({'code': message})
        
        # Check minimum purchase amount
        if amount < coupon.min_purchase_amount:
            raise serializers.ValidationError({
                'amount': f'Minimum purchase amount is {coupon.min_purchase_amount} ETB'
            })
        
        # Calculate discount
        discount = coupon.calculate_discount(amount).quantize(Decimal('.01'), rounding=ROUND_HALF_UP)
        data['discount'] = discount
        data['final_amount'] = amount - discount
        data['coupon'] = coupon
        
        return data
