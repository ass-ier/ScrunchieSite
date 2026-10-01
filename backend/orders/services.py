from collections import Counter
from decimal import Decimal, ROUND_HALF_UP
import logging
import smtplib

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from coupons.models import Coupon
from products.models import Product, ProductSize, StoreSettings
from .models import AuditLog, Order, OrderEmail

logger = logging.getLogger(__name__)


def price_order(items, coupon_code='', delivery_method='delivery', lock=False):
    products = Product.objects.order_by('id')
    if lock:
        products = products.select_for_update()
    products = {p.pk: p for p in products.filter(pk__in=[i['product_id'] for i in items])}
    sizes = ProductSize.objects.filter(product_id__in=products).order_by('id')
    if lock:
        sizes = sizes.select_for_update()
    sizes = {(s.product_id, s.size): s for s in sizes}
    totals, size_totals = Counter(), Counter()
    lines = []
    for item in items:
        product = products.get(item['product_id'])
        if not product or not product.is_available:
            raise ValidationError({'items': 'A product is no longer available. Update your cart.'})
        size = item.get('size', '')
        product_sizes = [s for (pid, _), s in sizes.items() if pid == product.pk]
        if product_sizes and (product.pk, size) not in sizes:
            raise ValidationError({'items': f'Choose an available size for {product.name}.'})
        if not product_sizes and size:
            raise ValidationError({'items': f'{product.name} does not offer that size.'})
        quantity = item['quantity']
        totals[product.pk] += quantity
        if size:
            size_totals[(product.pk, size)] += quantity
        lines.append({
            'product': product, 'product_name': product.name, 'size': size,
            'color': product.color, 'quantity': quantity, 'price': product.price,
        })
    for pid, quantity in totals.items():
        if products[pid].stock < quantity:
            raise ValidationError({'items': f'Not enough stock for {products[pid].name}.'})
    for key, quantity in size_totals.items():
        if sizes[key].stock < quantity:
            raise ValidationError({'items': f'Not enough stock for {products[key[0]].name}, size {key[1]}.'})
    subtotal = sum((line['price'] * line['quantity'] for line in lines), Decimal('0'))
    if subtotal > Decimal('99999999.99'):
        raise ValidationError({'items': 'The merchandise subtotal cannot exceed 99,999,999.99 ETB.'})
    coupon, discount = None, Decimal('0')
    if coupon_code:
        coupons = Coupon.objects.select_for_update() if lock else Coupon.objects
        coupon = coupons.filter(code=coupon_code.upper()).first()
        if not coupon:
            raise ValidationError({'coupon_code': 'Invalid coupon code.'})
        valid, message = coupon.is_valid()
        if not valid:
            raise ValidationError({'coupon_code': message})
        if subtotal < coupon.min_purchase_amount:
            raise ValidationError({'coupon_code': f'Minimum purchase is {coupon.min_purchase_amount} ETB.'})
        discount = coupon.calculate_discount(subtotal).quantize(Decimal('.01'), rounding=ROUND_HALF_UP)
    store = StoreSettings.objects.first() or StoreSettings()
    if not store.account_name or not any([store.telebirr, store.cbe, store.dashen]):
        raise ValidationError({'payment_method': 'Checkout is not open yet. Please contact the store.'})
    if delivery_method == 'pickup' and not store.pickup_address:
        raise ValidationError({'delivery_method': 'Pickup is not currently available.'})
    fee = store.delivery_fee if delivery_method == 'delivery' else Decimal('0')
    total = subtotal - discount + fee
    if total <= 0 or total > Decimal('99999999.99'):
        raise ValidationError({'items': 'The order total must be between 0.01 and 99,999,999.99 ETB.'})
    return {
        'lines': lines, 'products': products, 'sizes': sizes, 'totals': totals,
        'size_totals': size_totals, 'coupon': coupon, 'subtotal': subtotal,
        'discount_amount': discount, 'delivery_fee': fee, 'total_amount': total, 'store': store,
    }


@transaction.atomic
def decide_order(order_id, admin, decision, note):
    order = Order.objects.select_for_update().get(pk=order_id)
    if order.status != 'pending':
        raise ValidationError({'status': 'This payment has already been reviewed. Refresh the order.'})
    if not order.email:
        raise ValidationError({'email': 'This legacy order has no email address. Have an administrator correct the customer contact before reviewing it.'})
    if decision == 'rejected' and not note.strip():
        raise ValidationError({'note': 'Explain why the payment was declined. This is emailed to the customer.'})
    if decision == 'rejected':
        quantities = Counter()
        sizes = Counter()
        for item in order.items.all():
            quantities[item.product_id] += item.quantity
            if item.size:
                sizes[(item.product_id, item.size)] += item.quantity
        for product in Product.objects.select_for_update().filter(pk__in=quantities).order_by('pk'):
            product.stock += quantities[product.pk]
            product.save(update_fields=['stock'])
        for size in ProductSize.objects.select_for_update().filter(product_id__in=quantities).order_by('pk'):
            size.stock += sizes[(size.product_id, size.size)]
            size.save(update_fields=['stock'])
        if order.coupon_id:
            coupon = Coupon.objects.select_for_update().get(pk=order.coupon_id)
            coupon.used_count = max(0, coupon.used_count - 1)
            coupon.save(update_fields=['used_count'])
    order.status, order.admin_note = decision, note.strip()
    order.save(update_fields=['status', 'admin_note', 'updated_at'])
    AuditLog.objects.create(order=order, admin=admin, action='Payment reviewed',
                            previous_status='pending', new_status=decision, note=order.admin_note)
    email = OrderEmail.objects.create(order=order, kind='decision')
    return email.pk


def deliver_email(email_id):
    # A database outbox retains failures; the row lock prevents concurrent retries.
    with transaction.atomic():
        email = OrderEmail.objects.select_for_update().select_related('order').get(pk=email_id)
        if email.sent_at:
            return True
        order = email.order
        tracking_url = f'{settings.FRONTEND_URL}/track-order#token={order.tracking_token}'
        if email.kind == 'received':
            subject = f'AKEYA: order {order.order_id} received'
            payment_state = {'pending': 'awaiting review', 'verified': 'authenticated', 'rejected': 'declined'}[order.status]
            message = f'We received your order and transfer receipt. Your payment is {payment_state}.'
        elif order.status == 'verified':
            subject = f'AKEYA: payment authenticated for {order.order_id}'
            message = 'Your payment has been authenticated. We will prepare your order.'
        else:
            subject = f'AKEYA: payment declined for {order.order_id}'
            message = 'Your payment could not be authenticated. Your order will not be fulfilled.'
        body = (
            f'Hello {order.full_name},\n\n{message}\n\n'
            f'Order: {order.order_id}\nTotal: {order.total_amount} ETB\n'
            f'Delivery/pickup date requested: {order.selected_date}\n'
        )
        if email.kind == 'decision' and order.admin_note:
            body += f'\nMessage from the store: {order.admin_note}\n'
        body += f'\nTrack your order (keep this link private):\n{tracking_url}\n\nAKEYA'
        email.attempts += 1
        try:
            if send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [order.email], fail_silently=False) != 1:
                raise smtplib.SMTPException('Email backend did not accept the message.')
        except (smtplib.SMTPException, OSError) as exc:
            email.last_error = type(exc).__name__
            email.save(update_fields=['attempts', 'last_error'])
            logger.warning('Order email %s failed (%s); retained for retry.', email.pk, type(exc).__name__)
            return False
        email.sent_at, email.last_error = timezone.now(), ''
        email.save(update_fields=['sent_at', 'attempts', 'last_error'])
        return True
