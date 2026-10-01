from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Coupon
from .serializers import CouponSerializer, CouponValidationSerializer
from django.utils import timezone
from django.db.models import F


class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    
    def get_permissions(self):
        if self.action in ['validate', 'promotions']:
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    @action(detail=False, methods=['get'])
    def promotions(self, request):
        coupons = Coupon.objects.filter(active=True, is_public=True, expiry_date__gt=timezone.now(), used_count__lt=F('usage_limit'))
        return Response(list(coupons.values('code', 'type', 'value', 'announcement', 'min_purchase_amount', 'expiry_date')))
    
    @action(detail=False, methods=['post'])
    def validate(self, request):
        """Validate a coupon code and calculate discount"""
        serializer = CouponValidationSerializer(data=request.data)
        if serializer.is_valid():
            return Response({
                'valid': True,
                'code': serializer.validated_data['code'],
                'discount_amount': float(serializer.validated_data['discount']),
                'final_amount': float(serializer.validated_data['final_amount']),
                'coupon_type': serializer.validated_data['coupon'].type,
                'coupon_value': float(serializer.validated_data['coupon'].value),
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
