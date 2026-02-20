from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db.models import Q, F
from django.db import transaction
from .models import Order, AuditLog
from .serializers import OrderSerializer, OrderTrackingSerializer, AuditLogSerializer
from products.models import Product

class OrderViewSet(viewsets.ModelViewSet):
    queryset = Order.objects.all()
    serializer_class = OrderSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['order_id', 'full_name', 'phone']
    ordering_fields = ['created_at', 'total_amount']
    
    def get_permissions(self):
        if self.action in ['create']:
            return [IsAuthenticated()]
        elif self.action in ['list', 'retrieve', 'my_orders']:
            return [IsAuthenticated()]
        return [IsAdminUser()]
    
    def get_queryset(self):
        user = self.request.user
        
        # Admin sees all orders
        if user.is_staff:
            queryset = Order.objects.all().order_by('-created_at')
            
            # Apply filters
            status_filter = self.request.query_params.get('status', None)
            payment_filter = self.request.query_params.get('payment_method', None)
            date_from = self.request.query_params.get('date_from', None)
            date_to = self.request.query_params.get('date_to', None)
            
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            if payment_filter:
                queryset = queryset.filter(payment_method=payment_filter)
            if date_from:
                queryset = queryset.filter(created_at__gte=date_from)
            if date_to:
                queryset = queryset.filter(created_at__lte=date_to)
            
            return queryset
        
        # Regular users see only their orders
        return Order.objects.filter(user=user).order_by('-created_at')
    
    @transaction.atomic
    def create(self, request):
        """
        Create order with stock validation and coupon support
        """
        items_data = request.data.get('items', [])
        coupon_code = request.data.get('coupon_code', '').strip()
        
        # Calculate subtotal
        subtotal = 0
        for item_data in items_data:
            product = Product.objects.select_for_update().get(id=item_data['product_id'])
            if product.stock < item_data['quantity']:
                return Response(
                    {'error': f'{product.name} has insufficient stock. Available: {product.stock}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            subtotal += item_data['price'] * item_data['quantity']
        
        # Validate and apply coupon if provided
        coupon = None
        discount_amount = 0
        if coupon_code:
            from coupons.models import Coupon
            try:
                coupon = Coupon.objects.get(code=coupon_code)
                is_valid, message = coupon.is_valid()
                if not is_valid:
                    return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)
                
                if subtotal < coupon.min_purchase_amount:
                    return Response(
                        {'error': f'Minimum purchase amount of {coupon.min_purchase_amount} required'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                discount_amount = coupon.calculate_discount(subtotal)
            except Coupon.DoesNotExist:
                return Response({'error': 'Invalid coupon code'}, status=status.HTTP_400_BAD_REQUEST)
        
        total_amount = subtotal - discount_amount
        
        # Create order
        order_data = request.data.copy()
        order_data.pop('coupon_code', None)
        order_data['subtotal'] = subtotal
        order_data['discount_amount'] = discount_amount
        order_data['total_amount'] = total_amount
        order_data['coupon'] = coupon.id if coupon else None
        
        serializer = self.get_serializer(data=order_data)
        if serializer.is_valid():
            order = serializer.save(user=request.user)
            
            # Reduce stock
            for item in order.items.all():
                product = Product.objects.select_for_update().get(id=item.product.id)
                product.stock -= item.quantity
                if product.stock == 0:
                    product.is_available = False
                product.save()
            
            # Mark coupon as used
            if coupon:
                coupon.use()
            
            return Response(
                OrderSerializer(order).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_orders(self, request):
        """
        Get current user's orders
        """
        orders = Order.objects.filter(user=request.user).order_by('-created_at')
        serializer = OrderTrackingSerializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def verify(self, request, pk=None):
        order = self.get_object()
        previous_status = order.status
        order.status = 'verified'
        order.admin_note = request.data.get('note', '')
        order.save()
        
        AuditLog.objects.create(
            order=order,
            admin=request.user,
            action='Order Verified',
            previous_status=previous_status,
            new_status='verified',
            note=order.admin_note
        )
        
        return Response({'message': 'Order verified successfully'})
    
    @action(detail=True, methods=['post'], permission_classes=[IsAdminUser])
    def reject(self, request, pk=None):
        order = self.get_object()
        previous_status = order.status
        order.status = 'rejected'
        order.admin_note = request.data.get('note', '')
        order.save()
        
        # Restore stock
        with transaction.atomic():
            for item in order.items.all():
                product = Product.objects.select_for_update().get(id=item.product.id)
                product.stock += item.quantity
                product.is_available = True
                product.save()
        
        AuditLog.objects.create(
            order=order,
            admin=request.user,
            action='Order Rejected',
            previous_status=previous_status,
            new_status='rejected',
            note=order.admin_note
        )
        
        return Response({'message': 'Order rejected and stock restored'})
    
    @action(detail=True, methods=['get'], permission_classes=[IsAdminUser])
    def audit_logs(self, request, pk=None):
        order = self.get_object()
        logs = order.audit_logs.all().order_by('-timestamp')
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAdminUser])
    def stats(self, request):
        total_orders = Order.objects.count()
        pending_orders = Order.objects.filter(status='pending').count()
        verified_orders = Order.objects.filter(status='verified').count()
        rejected_orders = Order.objects.filter(status='rejected').count()
        
        from django.db.models import Sum
        revenue = Order.objects.filter(status='verified').aggregate(
            total=Sum('total_amount')
        )['total'] or 0
        
        return Response({
            'total_orders': total_orders,
            'pending_orders': pending_orders,
            'verified_orders': verified_orders,
            'rejected_orders': rejected_orders,
            'revenue': revenue
        })
