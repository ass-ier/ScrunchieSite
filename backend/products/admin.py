from django.contrib import admin
from .models import Product, Category, ProductSize

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'created_at']
    prepopulated_fields = {'slug': ('name',)}

class ProductSizeInline(admin.TabularInline):
    model = ProductSize
    extra = 3
    fields = ['size', 'stock']

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price', 'stock', 'color', 'is_available', 'is_featured', 'created_at']
    list_filter = ['category', 'is_available', 'is_featured', 'color']
    search_fields = ['name', 'description', 'color']
    prepopulated_fields = {'slug': ('name',)}
    list_editable = ['is_featured']
    actions = ['mark_as_featured', 'mark_as_not_featured']
    inlines = [ProductSizeInline]
    
    def mark_as_featured(self, request, queryset):
        updated = queryset.update(is_featured=True)
        self.message_user(request, f'{updated} products marked as featured.')
    mark_as_featured.short_description = 'Mark selected products as featured'
    
    def mark_as_not_featured(self, request, queryset):
        updated = queryset.update(is_featured=False)
        self.message_user(request, f'{updated} products unmarked as featured.')
    mark_as_not_featured.short_description = 'Remove featured status'
