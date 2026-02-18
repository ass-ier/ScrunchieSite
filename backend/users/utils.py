from django.conf import settings
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
import logging

logger = logging.getLogger(__name__)

def send_otp_sms(phone_number, otp_code):
    """
    Send OTP via Twilio SMS
    The sender will appear as +251929509800 if configured in Twilio
    """
    try:
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        
        message = client.messages.create(
            body=f'Your verification code is: {otp_code}. Valid for 5 minutes. Do not share this code.',
            from_=settings.TWILIO_PHONE_NUMBER,
            to=phone_number
        )
        
        logger.info(f'OTP sent to {phone_number}: {message.sid}')
        return True, message.sid
        
    except TwilioRestException as e:
        logger.error(f'Failed to send OTP to {phone_number}: {str(e)}')
        return False, str(e)
    except Exception as e:
        logger.error(f'Unexpected error sending OTP: {str(e)}')
        return False, str(e)

def send_test_otp(phone_number, otp_code):
    """
    For development/testing - just log the OTP
    """
    logger.info(f'TEST OTP for {phone_number}: {otp_code}')
    print(f'\n=== TEST OTP ===')
    print(f'Phone: {phone_number}')
    print(f'Code: {otp_code}')
    print(f'================\n')
    return True, 'test'
