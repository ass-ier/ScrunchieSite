from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from django.http import JsonResponse
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

urlpatterns = [
    path('api/health/', lambda request: JsonResponse({'status': 'ok'})),
    path('admin/', admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/products/', include('products.urls')),
    path('api/orders/', include('orders.urls')),
    path('api/users/', include('users.urls')),
    path('api/wishlist/', include('wishlist.urls')),
    path('api/reviews/', include('reviews.urls')),
    path('api/coupons/', include('coupons.urls')),
]

# Only product photography is public. Receipts are served by the staff-only API.
urlpatterns += [
    re_path(r'^media/products/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT / 'products'}),
]
