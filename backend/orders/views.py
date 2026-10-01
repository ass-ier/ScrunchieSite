from django.db import IntegrityError, transaction
from django.db.models import Sum
from django.http import FileResponse, Http404
from rest_framework import filters, mixins, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from rest_framework.throttling import SimpleRateThrottle
from .models import Order, OrderItem, OrderEmail, AuditLog
from .serializers import CheckoutSerializer, QuoteSerializer, OrderSerializer, OrderTrackingSerializer, AuditLogSerializer
from .services import price_order, decide_order, deliver_email


class CheckoutThrottle(SimpleRateThrottle):
    scope = 'checkout'
    rate = '30/hour'

    def get_cache_key(self, request, view):
        identity = f'user-{request.user.pk}' if request.user.is_authenticated else self.get_ident(request)
        return self.cache_format % {'scope': self.scope, 'ident': identity}


class TrackingThrottle(CheckoutThrottle):
    scope = 'tracking'
    rate = '120/hour'


class OrderViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = OrderSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['order_id', 'full_name', 'phone', 'email', 'transaction_reference']
    ordering_fields = ['created_at', 'total_amount']

    def get_permissions(self):
        if self.action in ['create', 'quote', 'track']:
            return [AllowAny()]
        if self.action in ['list', 'retrieve', 'my_orders']:
            return [IsAuthenticated()]
        return [IsAdminUser()]

    def get_throttles(self):
        if self.action == 'create':
            return [CheckoutThrottle()]
        if self.action == 'track':
            return [TrackingThrottle()]
        return super().get_throttles()

    def get_queryset(self):
        queryset = Order.objects.select_related('coupon').prefetch_related('items__product__sizes', 'items__product__images', 'emails').order_by('-created_at')
        if not self.request.user.is_staff:
            return queryset.filter(user=self.request.user)
        for field in ['status', 'payment_method']:
            if self.request.query_params.get(field):
                queryset = queryset.filter(**{field: self.request.query_params[field]})
        return queryset

    @action(detail=False, methods=['post'])
    def quote(self, request):
        serializer = QuoteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quote = price_order(**serializer.validated_data)
        return Response({
            **{key: str(quote[key]) for key in ['subtotal', 'discount_amount', 'delivery_fee', 'total_amount']},
            'items': [{key: str(value) if key == 'price' else value for key, value in line.items() if key != 'product'} for line in quote['lines']],
        })

    def create(self, request):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data.copy()
        existing = Order.objects.filter(checkout_key=data['checkout_key']).first()
        if existing:
            return self.created_response(existing, 200)
        try:
            with transaction.atomic():
                quote = price_order(data.pop('items'), data.pop('coupon_code'), data['delivery_method'], lock=True)
                if data.pop('expected_total') != quote['total_amount']:
                    raise ValidationError({'expected_total': 'Your total has changed. Review the updated total before submitting.'})
                if not getattr(quote['store'], data['payment_method']):
                    raise ValidationError({'payment_method': 'This payment method is not currently available.'})
                reference = f"{data['payment_method']}:{data['transaction_reference'].upper()}"
                if Order.objects.filter(payment_reference_key=reference).exists():
                    raise ValidationError({'transaction_reference': 'This transaction ID was already submitted. Track the original order or contact the store.'})
                order = Order.objects.create(
                    **data, payment_reference_key=reference,
                    user=request.user if request.user.is_authenticated else None,
                    **{key: quote[key] for key in ['subtotal', 'discount_amount', 'delivery_fee', 'total_amount', 'coupon']},
                )
                OrderItem.objects.bulk_create([OrderItem(order=order, **line) for line in quote['lines']])
                for pid, quantity in quote['totals'].items():
                    product = quote['products'][pid]
                    product.stock -= quantity
                    product.save(update_fields=['stock'])
                for key, quantity in quote['size_totals'].items():
                    size = quote['sizes'][key]
                    size.stock -= quantity
                    size.save(update_fields=['stock'])
                if quote['coupon']:
                    quote['coupon'].use()
                email = OrderEmail.objects.create(order=order, kind='received')
        except ValidationError:
            # A simultaneous retry can wait on stock locks until the first
            # submission commits. Return that order rather than a stale stock error.
            existing = Order.objects.filter(checkout_key=data['checkout_key']).first()
            if existing:
                return self.created_response(existing, 200)
            raise
        except IntegrityError:
            existing = Order.objects.filter(checkout_key=data['checkout_key']).first()
            if existing:
                return self.created_response(existing, 200)
            if Order.objects.filter(payment_reference_key=reference).exists():
                raise ValidationError({'transaction_reference': 'This transaction ID was already submitted.'})
            raise
        deliver_email(email.pk)
        return self.created_response(order, 201)

    def created_response(self, order, code):
        return Response({
            **OrderTrackingSerializer(order, context=self.get_serializer_context()).data,
            'tracking_token': str(order.tracking_token),
            'email_sent': order.emails.filter(kind='received', sent_at__isnull=False).exists(),
        }, status=code)

    @action(detail=False, methods=['post'])
    def track(self, request):
        token = serializers.UUIDField().run_validation(request.data.get('token'))
        order = Order.objects.filter(tracking_token=token).first()
        if not order:
            raise Http404
        return Response(OrderTrackingSerializer(order, context=self.get_serializer_context()).data)

    @action(detail=False, methods=['get'])
    def my_orders(self, request):
        return Response(OrderTrackingSerializer(self.get_queryset().filter(user=request.user), many=True, context=self.get_serializer_context()).data)

    def review(self, request, decision):
        order = self.get_object()
        note = serializers.CharField(max_length=2000, allow_blank=True).run_validation(request.data.get('note', ''))
        email_id = decide_order(order.pk, request.user, decision, note)
        sent = deliver_email(email_id)
        return Response({'status': decision, 'email_sent': sent,
                         'message': 'Payment reviewed.' if sent else 'Payment reviewed. Email failed; retry from the order.'})

    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        return self.review(request, 'verified')

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        return self.review(request, 'rejected')

    @action(detail=True, methods=['post'])
    def retry_email(self, request, pk=None):
        order = self.get_object()
        results = [deliver_email(pk) for pk in order.emails.filter(sent_at__isnull=True).values_list('pk', flat=True)]
        return Response({'email_sent': all(results)}, status=200 if all(results) else 503)

    @action(detail=True, methods=['get'])
    def receipt(self, request, pk=None):
        order = self.get_object()
        try:
            response = FileResponse(order.receipt_url.open('rb'), content_type='image/png' if order.receipt_url.name.lower().endswith('.png') else 'image/jpeg')
        except FileNotFoundError:
            raise Http404('Receipt file is unavailable. Contact the administrator.')
        response['Cache-Control'] = 'private, no-store'
        response['X-Content-Type-Options'] = 'nosniff'
        return response

    @action(detail=True, methods=['post'])
    def fulfill(self, request, pk=None):
        self.get_object()
        value = serializers.ChoiceField(choices=['ready', 'completed']).run_validation(request.data.get('status'))
        with transaction.atomic():
            order = Order.objects.select_for_update().get(pk=pk)
            if order.status != 'verified' or (order.fulfillment_status, value) not in [('processing', 'ready'), ('ready', 'completed')]:
                raise ValidationError({'status': 'Only authenticated orders can advance to the next fulfillment step.'})
            order.fulfillment_status = value
            order.save(update_fields=['fulfillment_status', 'updated_at'])
            AuditLog.objects.create(order=order, admin=request.user, action=f'Fulfillment: {value}')
        return Response({'fulfillment_status': value})

    @action(detail=True, methods=['get'])
    def audit_logs(self, request, pk=None):
        return Response(AuditLogSerializer(self.get_object().audit_logs.order_by('-timestamp'), many=True).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        return Response({
            'total_orders': Order.objects.count(),
            **{f'{state}_orders': Order.objects.filter(status=state).count() for state in ['pending', 'verified', 'rejected']},
            'revenue': Order.objects.filter(status='verified').aggregate(total=Sum('total_amount'))['total'] or 0,
            'unsent_emails': OrderEmail.objects.filter(sent_at__isnull=True).count(),
        })
