from django.db import models
from django.contrib.auth import get_user_model
from products.models import Product

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
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='orders')
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
    receipt_url = models.ImageField(upload_to='receipts/')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='pending')
    admin_note = models.TextField(blank=True, null=True)
    
    # Coupon fields
    coupon = models.ForeignKey('coupons.Coupon', on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.order_id:
            from datetime import datetime
            year = datetime.now().year
            last_order = Order.objects.filter(order_id__startswith=f'ORD-{year}').order_by('-id').first()
            if last_order:
                last_num = int(last_order.order_id.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1
            self.order_id = f'ORD-{year}-{new_num:04d}'
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.order_id

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
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
