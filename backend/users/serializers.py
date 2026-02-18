from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import OTP
import phonenumbers

User = get_user_model()

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['phone', 'first_name', 'last_name', 'email', 'password', 'password_confirm']
    
    def validate_phone(self, value):
        # Normalize phone number to international format
        try:
            parsed = phonenumbers.parse(value, 'ET')
            if not phonenumbers.is_valid_number(parsed):
                raise serializers.ValidationError('Invalid phone number')
            formatted = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            return formatted
        except phonenumbers.NumberParseException:
            raise serializers.ValidationError('Invalid phone number format')
    
    def validate(self, data):
        if data['password'] != data['password_confirm']:
            raise serializers.ValidationError({'password': 'Passwords do not match'})
        return data
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        # Create username from phone
        validated_data['username'] = validated_data['phone']
        
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.is_active = False  # Inactive until OTP verified
        user.save()
        
        return user

class OTPVerificationSerializer(serializers.Serializer):
    phone = serializers.CharField()
    code = serializers.CharField(max_length=6)

class OTPRequestSerializer(serializers.Serializer):
    phone = serializers.CharField()
    purpose = serializers.ChoiceField(choices=['registration', 'password_reset'])

class PasswordResetSerializer(serializers.Serializer):
    phone = serializers.CharField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(min_length=8)
    new_password_confirm = serializers.CharField()
    
    def validate(self, data):
        if data['new_password'] != data['new_password_confirm']:
            raise serializers.ValidationError({'new_password': 'Passwords do not match'})
        return data

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'phone', 'first_name', 'last_name', 'email', 'is_phone_verified', 'date_joined']
        read_only_fields = ['id', 'is_phone_verified', 'date_joined']
