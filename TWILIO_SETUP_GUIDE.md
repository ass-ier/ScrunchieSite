# Twilio SMS Setup Guide for Ethiopian Phone Numbers

## Overview
This guide will help you set up Twilio to send OTP SMS messages to Ethiopian phone numbers (+251) with a custom sender ID.

## Step 1: Create Twilio Account

1. Go to https://www.twilio.com/try-twilio
2. Click "Sign up" and create your account
3. Verify your email address
4. Complete the registration process

**Free Trial Benefits:**
- $15.50 USD trial credit
- Can send SMS to verified numbers
- Test your integration before going live

## Step 2: Get Your Credentials

After logging in:

1. Go to your **Twilio Console Dashboard**
2. Find your credentials:
   - **Account SID**: Starts with "AC..."
   - **Auth Token**: Click to reveal (keep this secret!)

3. Copy these to your `.env` file:
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
```

## Step 3: Get a Phone Number

### Option A: Twilio Phone Number (Easiest)

1. In Twilio Console, go to **Phone Numbers** → **Manage** → **Buy a number**
2. Select country: **United States** (or your preferred country)
3. Check capabilities: **SMS**
4. Click **Search**
5. Choose a number and click **Buy**

**Note:** This number will be the sender, not +251929509800

### Option B: Custom Sender ID (Advanced)

**Important:** Custom alphanumeric sender IDs like "+251929509800" have restrictions:

#### Restrictions:
- Not supported in all countries
- May require regulatory approval
- Ethiopia may not support custom numeric sender IDs
- Requires business verification

#### To Request Custom Sender ID:

1. Go to **Messaging** → **Services** → **Sender Pool**
2. Click **Add Senders**
3. Select **Alpha Sender**
4. Enter your desired sender ID
5. Submit for approval

**Alternative:** Use an actual Ethiopian phone number (+251) if available through Twilio.

## Step 4: Configure for Ethiopia

### Check Country Support

1. Go to https://www.twilio.com/guidelines/sms
2. Search for "Ethiopia"
3. Review:
   - SMS support status
   - Sender ID requirements
   - Regulatory requirements

### Important Notes for Ethiopia:

- **Sender ID Support:** Limited or not supported
- **Recommended:** Use Twilio phone number as sender
- **Format:** All Ethiopian numbers must be in E.164 format: `+251XXXXXXXXX`

## Step 5: Test SMS Sending

### Using Twilio Console

1. Go to **Messaging** → **Try it out** → **Send an SMS**
2. From: Your Twilio number
3. To: Your Ethiopian phone number (+251...)
4. Message: "Test message"
5. Click **Make Request**

### Using Python (Test Script)

Create `test_sms.py`:

```python
from twilio.rest import Client

account_sid = 'your_account_sid'
auth_token = 'your_auth_token'
client = Client(account_sid, auth_token)

message = client.messages.create(
    body='Test OTP: 123456',
    from_='+1234567890',  # Your Twilio number
    to='+251912345678'     # Ethiopian number
)

print(f'Message SID: {message.sid}')
print(f'Status: {message.status}')
```

Run:
```bash
pip install twilio
python test_sms.py
```

## Step 6: Update Your .env File

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890  # Your actual Twilio number
```

**Note:** Replace `+251929509800` with your actual Twilio number in the code.

## Step 7: Upgrade to Paid Account (When Ready)

### Why Upgrade?
- Send to any phone number (not just verified)
- Higher sending limits
- Better deliverability
- Access to advanced features

### How to Upgrade:
1. Go to **Billing** in Twilio Console
2. Click **Upgrade**
3. Add payment method
4. Choose a plan

### Pricing (Approximate):
- **SMS to Ethiopia:** ~$0.05 - $0.10 per message
- **Monthly base:** $0 (pay as you go)
- **Phone number:** ~$1/month

## Alternative: Africa's Talking (Recommended for Ethiopia)

If Twilio doesn't work well for Ethiopia, consider **Africa's Talking**:

### Why Africa's Talking?
- Specialized in African markets
- Better coverage in Ethiopia
- Supports custom sender IDs
- Competitive pricing

### Setup:
1. Go to https://africastalking.com
2. Create account
3. Get API key
4. Configure sender ID

### Integration:
```python
import africastalking

username = "your_username"
api_key = "your_api_key"

africastalking.initialize(username, api_key)
sms = africastalking.SMS

response = sms.send("Your OTP is 123456", ["+251912345678"])
print(response)
```

## Troubleshooting

### SMS Not Delivered

**Check:**
1. Phone number format (must be E.164: +251...)
2. Twilio account balance
3. Number is not blocked
4. Country is supported
5. Twilio logs for error messages

**View Logs:**
- Go to **Monitor** → **Logs** → **Messaging**
- Check delivery status
- Review error codes

### Common Error Codes

- **21211:** Invalid 'To' phone number
- **21408:** Permission to send SMS not enabled
- **21610:** Unverified number (trial account)
- **30003:** Unreachable destination
- **30005:** Unknown destination

### Phone Number Format Issues

**Correct Format:**
```
+251912345678  ✓
251912345678   ✗ (missing +)
0912345678     ✗ (local format)
```

**Normalize in Code:**
```python
import phonenumbers

def normalize_phone(phone, country='ET'):
    parsed = phonenumbers.parse(phone, country)
    return phonenumbers.format_number(
        parsed, 
        phonenumbers.PhoneNumberFormat.E164
    )

# Usage
phone = normalize_phone('0912345678')  # Returns: +251912345678
```

## Development vs Production

### Development Mode
```python
# In settings.py or .env
DEBUG = True

# In utils.py
if settings.DEBUG:
    # Print OTP to console instead of sending SMS
    print(f'OTP: {otp_code}')
else:
    # Send actual SMS
    send_otp_sms(phone, otp_code)
```

### Production Mode
- Set `DEBUG=False`
- Use actual Twilio credentials
- Monitor SMS delivery rates
- Set up alerts for failures

## Security Best Practices

1. **Never commit credentials to Git**
2. **Use environment variables**
3. **Rotate Auth Token regularly**
4. **Enable IP whitelisting** (Twilio Console → Settings)
5. **Monitor usage** for unusual activity
6. **Set spending limits** to prevent abuse
7. **Use webhook signatures** to verify Twilio requests

## Rate Limiting

### Twilio Limits
- **Trial:** 1 message per second
- **Paid:** Higher limits (contact support)

### Application Limits
```python
# In settings.py
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '5/hour',  # 5 OTP requests per hour
    }
}
```

## Monitoring & Analytics

### Track in Twilio Console:
- Message delivery rates
- Failed messages
- Cost per message
- Usage trends

### Application Monitoring:
```python
import logging

logger = logging.getLogger(__name__)

def send_otp_sms(phone, code):
    try:
        # Send SMS
        logger.info(f'OTP sent to {phone}')
    except Exception as e:
        logger.error(f'Failed to send OTP: {e}')
```

## Cost Optimization

1. **Use SMS only when necessary**
2. **Implement OTP expiration** (5 minutes)
3. **Limit resend attempts** (max 3)
4. **Cache OTPs** to avoid duplicate sends
5. **Use email as alternative** when possible

## Support Resources

- **Twilio Docs:** https://www.twilio.com/docs/sms
- **Twilio Support:** https://support.twilio.com
- **Community Forum:** https://www.twilio.com/community
- **Status Page:** https://status.twilio.com

## Quick Reference

### Test Phone Numbers (Trial Mode)
Twilio provides test numbers that always succeed:
- `+15005550006` - Valid number

### Webhook URLs (Future)
For delivery status callbacks:
```
https://yourdomain.com/api/sms/status/
```

### Sample OTP Message
```
Your verification code is: 123456
Valid for 5 minutes.
Do not share this code.
```

## Next Steps

1. ✅ Create Twilio account
2. ✅ Get credentials
3. ✅ Get phone number
4. ✅ Test SMS sending
5. ✅ Update .env file
6. ✅ Test OTP flow
7. ✅ Monitor delivery
8. ✅ Upgrade when ready
