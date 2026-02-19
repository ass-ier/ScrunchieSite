# Twilio SMS - Quick Start Guide

## 🚀 5-Minute Setup

### Step 1: Create Twilio Account (2 minutes)

1. Go to: https://www.twilio.com/try-twilio
2. Sign up (you get $15 free credit!)
3. Verify your email

### Step 2: Get Your Credentials (1 minute)

1. Login to Twilio Console: https://console.twilio.com
2. You'll see on the dashboard:
   - **Account SID** (starts with AC...)
   - **Auth Token** (click eye icon to reveal)
3. Copy both!

### Step 3: Get a Phone Number (1 minute)

1. In Twilio Console, click **Get a Trial Number**
2. Click **Choose this Number**
3. Done! Copy this number (e.g., +1234567890)

### Step 4: Update Your .env File (1 minute)

Open `backend/.env` and update:

```bash
TWILIO_ACCOUNT_SID=AC1234567890abcdef1234567890abcd
TWILIO_AUTH_TOKEN=your_auth_token_here_32_chars
TWILIO_PHONE_NUMBER=+12345678900
```

**Important:** Replace the values with YOUR actual credentials!

### Step 5: Test It! (30 seconds)

1. Start your backend server
2. Try to register a new user
3. Check your terminal/console - you'll see the OTP printed!

```
=== OTP CODE ===
Phone: +251912345678
Code: 123456
Purpose: registration
================
```

## 📱 For Production (Real SMS)

### Current Behavior:
- **DEBUG=True**: OTP printed to console (no SMS sent)
- **DEBUG=False**: Real SMS sent via Twilio

### To Send Real SMS:

1. In `backend/.env`, set:
   ```bash
   DEBUG=False
   ```

2. Restart your server

3. Now OTPs will be sent as actual SMS!

## ⚠️ Important Notes

### Trial Account Limitations:
- Can only send SMS to **verified phone numbers**
- To verify a number:
  1. Go to Twilio Console
  2. Click **Phone Numbers** → **Verified Caller IDs**
  3. Click **+** to add your Ethiopian number
  4. Enter number in format: `+251912345678`
  5. Verify via call or SMS

### Ethiopian Phone Numbers:
- Must use international format: `+251912345678`
- Or local format: `0912345678` (app converts automatically)

### Costs (After Free Credit):
- SMS to Ethiopia: ~$0.05-0.10 per message
- Phone number rental: ~$1/month
- No monthly fees, pay only for what you use

## 🔧 Troubleshooting

### "OTP not received"
- **In DEBUG mode?** Check your terminal/console for the OTP
- **In production?** Check Twilio logs at https://console.twilio.com/monitor/logs/sms

### "Invalid credentials"
- Double-check Account SID and Auth Token
- Make sure no extra spaces in .env file
- Restart your server after changing .env

### "Unverified number" error
- You're on trial account
- Add the phone number to verified caller IDs (see above)
- Or upgrade to paid account

## 💰 Upgrade to Paid (Optional)

### When to Upgrade:
- Want to send to any number (not just verified)
- Need higher sending limits
- Ready for production

### How to Upgrade:
1. Go to: https://console.twilio.com/billing
2. Click **Upgrade**
3. Add payment method
4. That's it!

## 🎯 Quick Test

Want to test if Twilio works? Run this in your terminal:

```bash
cd backend
source venv/bin/activate
python
```

Then paste:

```python
from twilio.rest import Client

# Replace with your credentials
account_sid = 'AC...'
auth_token = 'your_token'
from_number = '+1234567890'  # Your Twilio number
to_number = '+251912345678'   # Your phone

client = Client(account_sid, auth_token)
message = client.messages.create(
    body='Test from AKEYA!',
    from_=from_number,
    to=to_number
)

print(f'Message sent! SID: {message.sid}')
```

## 📚 More Help

- Full guide: See `TWILIO_SETUP_GUIDE.md`
- Twilio docs: https://www.twilio.com/docs/sms
- Support: https://support.twilio.com

---

**That's it!** You're ready to send OTPs! 🎉
