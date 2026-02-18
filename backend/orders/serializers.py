from rest_framework import serializers
from .models import Order, OrderItem, AuditLog
from products.serializers import ProductSerializer

class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    product_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = OrderItem
        fields = ['id', 'product', 'product_id', 'quantity', 'price']

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True)
    
    class Meta:
        model = Order
        fields = ['id', 'order_id', 'full_name', 'phone', 'email', 'address',
                  'delivery_method', 'selected_date', 'delivery_notes', 
                  'payment_method', 'transaction_reference', 'receipt_url',
                  'status', 'admin_note', 'total_amount', 'items', 'created_at']
        read_only_fields = ['order_id', 'status', 'admin_note', 'created_at']
    
    def create(self, validated_data):
        items_data = validated_data.pop('items')
        order = Order.objects.create(**validated_data)
        
        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)
        
        return order

class OrderTrackingSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    
    class Meta:
        model = Order
        fields = ['order_id', 'full_name', 'phone', 'delivery_method', 
                  'selected_date', 'payment_method', 'status', 'admin_note',
                  'total_amount', 'items', 'created_at']

class AuditLogSerializer(serializers.ModelSerializer):
    admin_email = serializers.EmailField(source='admin.email', read_only=True)
    
    class Meta:
        model = AuditLog
        fields = ['id', 'action', 'previous_status', 'new_status', 
                  'note', 'admin_email', 'timestamp']
