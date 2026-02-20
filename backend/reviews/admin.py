from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['user', 'product', 'rating', 'is_verified_purchase', 'created_at']
    list_filter = ['rating', 'created_at']
    search_fields = ['user__phone', 'product__name', 'comment']
    raw_id_fields = ['user', 'product', 'order_item']
    readonly_fields = ['created_at', 'updated_at']
