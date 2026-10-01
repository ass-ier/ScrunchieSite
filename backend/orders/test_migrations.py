from datetime import date
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import TransactionTestCase


class LegacyOrderMigrationTests(TransactionTestCase):
    def test_existing_orders_get_distinct_tokens_and_product_snapshots(self):
        executor = MigrationExecutor(connection)
        latest = executor.loader.graph.leaf_nodes()
        self.addCleanup(lambda: MigrationExecutor(connection).migrate(latest))
        previous = [('orders', '0003_order_coupon_order_discount_amount_order_subtotal'),
                    ('products', '0003_productimage')]
        executor.migrate(previous)
        apps = executor.loader.project_state(previous).apps
        User = apps.get_model('users', 'User')
        Category = apps.get_model('products', 'Category')
        Product = apps.get_model('products', 'Product')
        Order = apps.get_model('orders', 'Order')
        OrderItem = apps.get_model('orders', 'OrderItem')
        user = User.objects.create(username='legacy', phone='+251911123456')
        category = Category.objects.create(name='Legacy', slug='legacy')
        product = Product.objects.create(name='Original product', color='Gold', category=category, slug='original', description='Legacy', price=100, stock=5, image='products/legacy.png')
        for index in range(2):
            order = Order.objects.create(user=user, order_id=f'OLD-{index}', full_name='Legacy customer', phone=user.phone, email='legacy@example.com',
                                         delivery_method='pickup', selected_date=date(2026, 9, 1), payment_method='cbe', transaction_reference='DUPLICATE-OLD',
                                         receipt_url='receipts/old.png', total_amount=100)
            OrderItem.objects.create(order=order, product=product, quantity=1, price=100)
        executor = MigrationExecutor(connection)
        executor.migrate(latest)
        apps = executor.loader.project_state(latest).apps
        orders = apps.get_model('orders', 'Order').objects.filter(order_id__startswith='OLD-')
        self.assertEqual(len(set(orders.values_list('tracking_token', flat=True))), 2)
        self.assertEqual(orders.filter(payment_reference_key='cbe:DUPLICATE-OLD').count(), 1)
        self.assertEqual(apps.get_model('orders', 'OrderItem').objects.filter(product_name='Original product', color='Gold').count(), 2)
