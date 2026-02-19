from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q
from .models import Product, Category, ProductSize
from .serializers import ProductSerializer, CategorySerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = 'slug'
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAdminUser()]

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description', 'color']
    ordering_fields = ['price', 'created_at', 'stock']
    ordering = ['-created_at']
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'featured']:
            return [AllowAny()]
        return [IsAdminUser()]
    
    def get_queryset(self):
        # Admin sees all products
        if self.request.user.is_authenticated and self.request.user.is_staff:
            queryset = Product.objects.all()
        else:
            # Customers see only available products
            queryset = Product.objects.filter(is_available=True)
        
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category__slug=category)
        
        # Filter by size
        size = self.request.query_params.get('size', None)
        if size:
            queryset = queryset.filter(sizes__size=size.upper()).distinct()
        
        # Filter by color
        color = self.request.query_params.get('color', None)
        if color:
            queryset = queryset.filter(color__icontains=color)
        
        # Search by name
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(description__icontains=search) |
                Q(color__icontains=search)
            )
        
        return queryset
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured products"""
        featured_products = Product.objects.filter(is_featured=True, is_available=True)
        serializer = self.get_serializer(featured_products, many=True)
        return Response(serializer.data)
    
    @transaction.atomic
    def update(self, request, *args, **kwargs):
        """
        Update product with stock management
        """
        instance = self.get_object()
        old_stock = instance.stock
        
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
        if serializer.is_valid():
            product = serializer.save()
            
            # Auto-update availability based on stock
            if product.stock == 0:
                product.is_available = False
                product.save()
            elif product.stock > 0 and not product.is_available:
                product.is_available = True
                product.save()
            
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
