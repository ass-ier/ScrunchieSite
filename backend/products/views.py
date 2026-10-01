from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q
from django.db.models.deletion import ProtectedError
from rest_framework.exceptions import ValidationError
from .models import Product, Category, StoreSettings
from .serializers import ProductSerializer, CategorySerializer, StoreSettingsSerializer

class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    lookup_field = 'slug'

    def get_queryset(self):
        if self.request.user.is_staff:
            return Category.objects.all()
        return Category.objects.filter(products__is_available=True).distinct()
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return [IsAdminUser()]

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError({'detail': 'Move products to another category before deleting this one.'})


class StoreSettingsViewSet(viewsets.ViewSet):
    def get_permissions(self):
        return [AllowAny()] if self.action == 'list' else [IsAdminUser()]

    def list(self, request):
        return Response(StoreSettingsSerializer(StoreSettings.objects.first() or StoreSettings()).data)

    def create(self, request):
        instance, _ = StoreSettings.objects.get_or_create(pk=1)
        serializer = StoreSettingsSerializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

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
        
        return queryset.select_related('category').prefetch_related('sizes', 'images')
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured products"""
        featured_products = Product.objects.filter(is_featured=True, is_available=True)
        serializer = self.get_serializer(featured_products, many=True)
        return Response(serializer.data)
    
    @transaction.atomic
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        instance = Product.objects.select_for_update().get(pk=instance.pk)
        serializer = self.get_serializer(instance, data=request.data, partial=kwargs.get('partial', False))
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    def perform_destroy(self, instance):
        try:
            instance.delete()
        except ProtectedError:
            raise ValidationError({'detail': 'This product belongs to an order. Hide it instead to preserve order history.'})
