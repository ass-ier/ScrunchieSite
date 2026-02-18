from django.urls import path
from .views import (
    register, verify_otp, request_otp, reset_password, 
    login, CurrentUserView
)

urlpatterns = [
    path('register/', register, name='register'),
    path('verify-otp/', verify_otp, name='verify_otp'),
    path('request-otp/', request_otp, name='request_otp'),
    path('reset-password/', reset_password, name='reset_password'),
    path('login/', login, name='login'),
    path('me/', CurrentUserView.as_view(), name='current_user'),
]
