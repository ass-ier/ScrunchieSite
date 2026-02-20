from rest_framework import serializers
from .models import Coupon
from django.utils import timezone


class CouponSerializer(serializers.ModelSerializer):
    is_valid_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Coupon
        fields = ['id', 'code', 'type', 'value', 'expiry_date', 'usage_limit', 
                  'used_count', 'active', 'min_purchase_amount', 'is_valid_status', 'created_at']
        read_only_fields = ['id', 'used_count', 'created_at']
    
    def get_is_valid_status(self, obj):
        is_valid, message = obj.is_valid()
        return {'valid': is_valid, 'message': message}


class CouponValidationSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    
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
        discount = coupon.calculate_discount(amount)
        data['discount'] = discount
        data['final_amount'] = amount - discount
        data['coupon'] = coupon
        
        return data
