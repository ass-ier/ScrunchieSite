from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Coupon
from .serializers import CouponSerializer, CouponValidationSerializer


class CouponViewSet(viewsets.ModelViewSet):
    queryset = Coupon.objects.all()
    serializer_class = CouponSerializer
    
    def get_permissions(self):
        if self.action in ['validate']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]
    
    @action(detail=False, methods=['post'])
    def validate(self, request):
        """Validate a coupon code and calculate discount"""
        serializer = CouponValidationSerializer(data=request.data)
        if serializer.is_valid():
            return Response({
                'valid': True,
                'code': serializer.validated_data['code'],
                'discount': serializer.validated_data['discount'],
                'final_amount': serializer.validated_data['final_amount'],
                'coupon_type': serializer.validated_data['coupon'].type,
                'coupon_value': serializer.validated_data['coupon'].value,
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
