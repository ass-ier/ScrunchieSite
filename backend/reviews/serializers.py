from rest_framework import serializers
from .models import Review
from orders.models import OrderItem


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.first_name', read_only=True)
    is_verified_purchase = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Review
        fields = ['id', 'user_name', 'product', 'rating', 'comment', 'is_verified_purchase', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        user = self.context['request'].user
        product = data.get('product')
        
        # Check if user already reviewed this product
        if Review.objects.filter(user=user, product=product).exists():
            raise serializers.ValidationError('You have already reviewed this product.')
        
        # Check if user has a verified order with this product
        verified_order_item = OrderItem.objects.filter(
            order__user=user,
            order__status='verified',
            product=product
        ).first()
        
        if not verified_order_item:
            raise serializers.ValidationError('You can only review products you have purchased.')
        
        # Store the order_item for verified purchase badge
        data['order_item'] = verified_order_item
        
        return data
    
    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
