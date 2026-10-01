from django.db import models
from django.core.validators import MinValueValidator, RegexValidator
from decimal import Decimal

class Category(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Categories'

    def __str__(self):
        return self.name

class Product(models.Model):
    SIZE_CHOICES = [
        ('S', 'Small'),
        ('M', 'Medium'),
        ('L', 'Large'),
    ]
    
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name='products')
    image = models.ImageField(upload_to='products/')  # Keep for backward compatibility
    stock = models.PositiveIntegerField(default=0)
    is_available = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    color = models.CharField(max_length=50, blank=True, default='')
    color_hex = models.CharField(max_length=7, blank=True, default='', validators=[RegexValidator(r'^#[0-9a-fA-F]{6}$', 'Use a six-digit hex color, such as #b4a0d2.')])
    style = models.SlugField(blank=True, default='', help_text='Products with the same style are linked as color options.')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class ProductSize(models.Model):
    SIZE_CHOICES = [
        ('S', 'Small'),
        ('M', 'Medium'),
        ('L', 'Large'),
    ]
    
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='sizes')
    size = models.CharField(max_length=1, choices=SIZE_CHOICES)
    stock = models.PositiveIntegerField(default=0)
    
    class Meta:
        unique_together = ['product', 'size']
        ordering = ['size']
    
    def __str__(self):
        return f'{self.product.name} - {self.get_size_display()}'

class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    image = models.ImageField(upload_to='products/gallery/')
    alt_text = models.CharField(max_length=200, blank=True)
    is_primary = models.BooleanField(default=False)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['order', '-is_primary', 'created_at']
    
    def __str__(self):
        return f'{self.product.name} - Image {self.order}'
    
    def save(self, *args, **kwargs):
        # If this is set as primary, unset other primary images
        if self.is_primary:
            ProductImage.objects.filter(product=self.product, is_primary=True).update(is_primary=False)
        super().save(*args, **kwargs)


class StoreSettings(models.Model):
    account_name = models.CharField(max_length=200, blank=True)
    telebirr = models.CharField(max_length=100, blank=True)
    cbe = models.CharField(max_length=100, blank=True)
    dashen = models.CharField(max_length=100, blank=True)
    pickup_address = models.CharField(max_length=500, blank=True)
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0, validators=[MinValueValidator(0)])
    announcement = models.CharField(max_length=300, blank=True)
    instagram_url = models.URLField(max_length=500, blank=True)
    tiktok_url = models.URLField(max_length=500, blank=True)
    telegram_url = models.URLField(max_length=500, blank=True)
