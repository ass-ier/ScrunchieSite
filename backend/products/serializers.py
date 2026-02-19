from rest_framework import serializers
from .models import Product, Category, ProductSize

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']

class ProductSizeSerializer(serializers.ModelSerializer):
    size_display = serializers.CharField(source='get_size_display', read_only=True)
    
    class Meta:
        model = ProductSize
        fields = ['id', 'size', 'size_display', 'stock']

class ProductSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    sizes = ProductSizeSerializer(many=True, read_only=True)
    
    class Meta:
        model = Product
        fields = ['id', 'name', 'slug', 'description', 'price', 'category', 
                  'image', 'stock', 'is_available', 'is_featured', 'color', 
                  'sizes', 'created_at']
