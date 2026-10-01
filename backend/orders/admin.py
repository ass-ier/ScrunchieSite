from django.contrib import admin
from .models import Order, OrderItem, AuditLog


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    can_delete = False
    readonly_fields = ['product', 'product_name', 'size', 'color', 'quantity', 'price']

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['order_id', 'full_name', 'email', 'status', 'total_amount', 'created_at']
    list_filter = ['status', 'payment_method', 'delivery_method']
    search_fields = ['order_id', 'full_name', 'phone', 'email']
    inlines = [OrderItemInline]
    exclude = ['receipt_url', 'tracking_token', 'checkout_key']
    readonly_fields = [field.name for field in Order._meta.fields if field.name not in ['receipt_url', 'tracking_token', 'checkout_key']]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['order', 'admin', 'action', 'previous_status', 'new_status', 'timestamp']
    readonly_fields = [field.name for field in AuditLog._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
