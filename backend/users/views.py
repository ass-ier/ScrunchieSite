from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from .models import OTP
from .serializers import (
    UserRegistrationSerializer, OTPVerificationSerializer,
    OTPRequestSerializer, PasswordResetSerializer, UserSerializer
)
from .utils import send_otp_sms, send_test_otp
from django.conf import settings

User = get_user_model()

class OTPRateThrottle(AnonRateThrottle):
    rate = '5/hour'  # Max 5 OTP requests per hour per IP

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([OTPRateThrottle])
def register(request):
    """
    Register a new user and send OTP
    """
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        
        # Generate OTP
        otp_code = OTP.generate_code()
        expires_at = timezone.now() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
        
        otp = OTP.objects.create(
            user=user,
            code=otp_code,
            purpose='registration',
            expires_at=expires_at
        )
        
        # Send OTP via SMS
        # Use send_test_otp for development, send_otp_sms for production
        if settings.DEBUG:
            success, message_id = send_test_otp(user.phone, otp_code)
        else:
            success, message_id = send_otp_sms(user.phone, otp_code)
        
        if not success:
            return Response(
                {'error': 'Failed to send OTP. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            'message': 'Registration successful. OTP sent to your phone.',
            'phone': user.phone,
            'expires_in_minutes': settings.OTP_EXPIRY_MINUTES
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    """
    Verify OTP and activate user account
    """
    serializer = OTPVerificationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    phone = serializer.validated_data['phone']
    code = serializer.validated_data['code']
    
    try:
        user = User.objects.get(phone=phone)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get latest unused OTP
    otp = user.otps.filter(
        purpose='registration',
        is_used=False
    ).first()
    
    if not otp:
        return Response(
            {'error': 'No valid OTP found. Please request a new one.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if not otp.is_valid():
        if otp.attempts >= 3:
            return Response(
                {'error': 'Maximum attempts exceeded. Please request a new OTP.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if timezone.now() > otp.expires_at:
            return Response(
                {'error': 'OTP expired. Please request a new one.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    if otp.verify(code):
        user.is_active = True
        user.is_phone_verified = True
        user.save()
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'Phone verified successfully',
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data
        }, status=status.HTTP_200_OK)
    
    attempts_left = 3 - otp.attempts
    return Response(
        {'error': f'Invalid OTP. {attempts_left} attempts remaining.'},
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([OTPRateThrottle])
def request_otp(request):
    """
    Request new OTP (for password reset or resend)
    """
    serializer = OTPRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    phone = serializer.validated_data['phone']
    purpose = serializer.validated_data['purpose']
    
    try:
        user = User.objects.get(phone=phone)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Generate new OTP
    otp_code = OTP.generate_code()
    expires_at = timezone.now() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
    
    otp = OTP.objects.create(
        user=user,
        code=otp_code,
        purpose=purpose,
        expires_at=expires_at
    )
    
    # Send OTP
    if settings.DEBUG:
        success, message_id = send_test_otp(user.phone, otp_code)
    else:
        success, message_id = send_otp_sms(user.phone, otp_code)
    
    if not success:
        return Response(
            {'error': 'Failed to send OTP. Please try again.'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    return Response({
        'message': 'OTP sent successfully',
        'expires_in_minutes': settings.OTP_EXPIRY_MINUTES
    }, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """
    Reset password using OTP
    """
    serializer = PasswordResetSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    phone = serializer.validated_data['phone']
    code = serializer.validated_data['code']
    new_password = serializer.validated_data['new_password']
    
    try:
        user = User.objects.get(phone=phone)
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get latest unused password reset OTP
    otp = user.otps.filter(
        purpose='password_reset',
        is_used=False
    ).first()
    
    if not otp or not otp.is_valid():
        return Response(
            {'error': 'Invalid or expired OTP'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if otp.verify(code):
        user.set_password(new_password)
        user.save()
        
        return Response({
            'message': 'Password reset successfully'
        }, status=status.HTTP_200_OK)
    
    attempts_left = 3 - otp.attempts
    return Response(
        {'error': f'Invalid OTP. {attempts_left} attempts remaining.'},
        status=status.HTTP_400_BAD_REQUEST
    )

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    Login with phone and password
    """
    phone = request.data.get('phone')
    password = request.data.get('password')
    
    if not phone or not password:
        return Response(
            {'error': 'Phone and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        user = User.objects.get(phone=phone)
    except User.DoesNotExist:
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    if not user.check_password(password):
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    if not user.is_active:
        return Response(
            {'error': 'Account not verified. Please verify your phone number.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data
    }, status=status.HTTP_200_OK)

class CurrentUserView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserSerializer
    
    def get_object(self):
        return self.request.user
