from django.db import models
from django.contrib.auth import get_user_model
from products.models import Product
import uuid
from .storage import ReceiptStorage, receipt_path

User = get_user_model()

class Order(models.Model):
    DELIVERY_CHOICES = [
        ('delivery', 'Delivery'),
        ('pickup', 'Pickup'),
    ]
    
    PAYMENT_CHOICES = [
        ('telebirr', 'Telebirr'),
        ('cbe', 'CBE'),
        ('dashen', 'Dashen Bank'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending Verification'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    order_id = models.CharField(max_length=50, unique=True, editable=False)
    full_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    delivery_method = models.CharField(max_length=10, choices=DELIVERY_CHOICES)
    selected_date = models.DateField()
    delivery_notes = models.TextField(blank=True, null=True)
    payment_method = models.CharField(max_length=10, choices=PAYMENT_CHOICES)
    transaction_reference = models.CharField(max_length=200)
    receipt_url = models.ImageField(upload_to=receipt_path, storage=ReceiptStorage())
    checkout_key = models.UUIDField(unique=True, null=True, editable=False)
    tracking_token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    payment_reference_key = models.CharField(max_length=220, unique=True, null=True, editable=False)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    admin_note = models.TextField(blank=True, null=True)
    
    # Coupon fields
    coupon = models.ForeignKey('coupons.Coupon', on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    fulfillment_status = models.CharField(max_length=12, default='processing', choices=[
        ('processing', 'Processing'), ('ready', 'Ready'), ('completed', 'Completed')
    ])
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.order_id:
            self.order_id = f'ORD-{uuid.uuid4().hex.upper()}'
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.order_id

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    product_name = models.CharField(max_length=200, blank=True)
    size = models.CharField(max_length=1, blank=True)
    color = models.CharField(max_length=50, blank=True)
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    
    def __str__(self):
        return f'{self.quantity}x {self.product.name}'

class AuditLog(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='audit_logs')
    admin = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=100)
    previous_status = models.CharField(max_length=10, blank=True, null=True)
    new_status = models.CharField(max_length=10, blank=True, null=True)
    note = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f'{self.order.order_id} - {self.action}'


class OrderEmail(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='emails')
    kind = models.CharField(max_length=10, choices=[('received', 'Received'), ('decision', 'Decision')])
    sent_at = models.DateTimeField(null=True, blank=True)
    attempts = models.PositiveIntegerField(default=0)
    last_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['order', 'kind'], name='one_order_email_per_kind')]
