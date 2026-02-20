from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone


class Coupon(models.Model):
    TYPE_CHOICES = [
        ('percentage', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    ]
    
    code = models.CharField(max_length=50, unique=True)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    value = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    expiry_date = models.DateTimeField()
    usage_limit = models.IntegerField(default=1, validators=[MinValueValidator(1)])
    used_count = models.IntegerField(default=0)
    active = models.BooleanField(default=True)
    min_purchase_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f'{self.code} ({self.get_type_display()})'
    
    def is_valid(self):
        """Check if coupon is valid"""
        if not self.active:
            return False, 'Coupon is inactive'
        if timezone.now() > self.expiry_date:
            return False, 'Coupon has expired'
        if self.used_count >= self.usage_limit:
            return False, 'Coupon usage limit reached'
        return True, 'Valid'
    
    def calculate_discount(self, amount):
        """Calculate discount amount"""
        if amount < self.min_purchase_amount:
            return 0
        
        if self.type == 'percentage':
            discount = (amount * self.value) / 100
        else:
            discount = self.value
        
        # Discount cannot exceed the total amount
        return min(discount, amount)
    
    def use(self):
        """Increment usage count"""
        self.used_count += 1
        self.save()
