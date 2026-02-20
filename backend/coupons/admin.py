from django.contrib import admin
from .models import Coupon


@admin.register(Coupon)
class CouponAdmin(admin.ModelAdmin):
    list_display = ['code', 'type', 'value', 'expiry_date', 'used_count', 'usage_limit', 'active']
    list_filter = ['type', 'active', 'expiry_date']
    search_fields = ['code']
    readonly_fields = ['used_count', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('code', 'type', 'value', 'active')
        }),
        ('Usage Limits', {
            'fields': ('usage_limit', 'used_count', 'min_purchase_amount')
        }),
        ('Validity', {
            'fields': ('expiry_date',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
