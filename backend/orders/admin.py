from django.contrib import admin
from .models import Order, OrderItem, AuditLog

class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_id', 'full_name', 'phone', 'delivery_method', 
                    'payment_method', 'status', 'total_amount', 'created_at']
    list_filter = ['status', 'payment_method', 'delivery_method']
    search_fields = ['order_id', 'full_name', 'phone']
    inlines = [OrderItemInline]
    readonly_fields = ['order_id', 'created_at', 'updated_at']

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['order', 'admin', 'action', 'previous_status', 'new_status', 'timestamp']
    list_filter = ['action', 'timestamp']
    readonly_fields = ['order', 'admin', 'action', 'previous_status', 'new_status', 'timestamp']
