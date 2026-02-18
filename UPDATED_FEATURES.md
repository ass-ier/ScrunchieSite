# Updated E-Commerce System - Feature Documentation

## New Features Added

### 1. User Authentication System

#### Registration with OTP Verification
- Users must register before placing orders
- Registration fields:
  - Full Name (required)
  - Phone Number (required, international format +251)
  - Email (optional)
  - Password (minimum 8 characters)
- 6-digit OTP sent via SMS from +251929509800
- OTP expires after 5 minutes
- Maximum 3 verification attempts
- Account activated only after successful OTP verification

#### Login System
- Login using Phone Number + Password
- JWT token-based authentication
- Secure session management

#### Password Reset
- Forgot password via OTP
- OTP sent to registered phone number
- Secure password reset flow

### 2. Order Management (Authenticated Users Only)

#### User Order History
- View all personal orders
- Track order status in real-time
- View admin notes and notifications
- See verification status

#### Removed Features
- Public order tracking by Order ID removed
- Only authenticated users can view their orders

### 3. Admin Product Management

#### Product CRUD Operations
- Add new products
- Edit existing products:
  - Name
  - Description
  - Price
  - Available Quantity
  - Product Images
  - Category
- Delete products
- Manage product categories

#### Inventory Control
- Real-time stock updates
- Automatic availability management:
  - Stock = 0 → Product marked unavailable
  - Stock > 0 → Product marked available
- Low stock warnings in admin panel
- Out of stock badges on frontend
- Transaction-safe stock updates (prevents race conditions)

#### Stock Management Features
- Stock reduced automatically when order placed
- Stock restored when order rejected
- Prevents checkout if quantity exceeds stock
- Select-for-update locks prevent overselling

### 4. Enhanced Security

#### Authentication & Authorization
- JWT token-based authentication
- Password hashing with Django's built-in system
- Protected admin routes
- User-specific data access

#### OTP Security
- Rate limiting (5 OTP requests per hour per IP)
- Attempt limiting (max 3 attempts per OTP)
- Time-based expiration (5 minutes)
- Secure code generation
- Prevention of brute-force attacks

#### File Upload Security
- File type validation (JPG, PNG only)
- File size validation (max 5MB)
- Secure storage via Cloudinary
- No direct file access without authorization

#### General Security
- CSRF protection
- Input sanitization
- SQL injection prevention (Django ORM)
- XSS protection
- CORS configuration

### 5. SMS Integration

#### Twilio SMS Service
- Custom sender ID: +251929509800
- OTP delivery to Ethiopian phone numbers (+251)
- Delivery status confirmation
- Rate limiting to prevent abuse

#### SMS Use Cases
- Registration OTP
- Password reset OTP
- Future: Order confirmations (optional)

## Technical Implementation

### Backend Changes

#### New Models
- **User Model** (extends AbstractUser)
  - phone (unique, required)
  - email (optional)
  - is_phone_verified
  - Custom authentication using phone number

- **OTP Model**
  - user (ForeignKey)
  - code (6 digits)
  - purpose (registration/password_reset)
  - attempts (max 3)
  - is_used
  - expires_at
  - created_at

#### Updated Models
- **Order Model**
  - Added user (ForeignKey) - links order to authenticated user
  - All other fields remain the same

- **Product Model**
  - Stock management with transactions
  - Automatic availability updates

#### New API Endpoints

**Authentication:**
- POST `/api/users/register/` - Register new user
- POST `/api/users/verify-otp/` - Verify OTP
- POST `/api/users/request-otp/` - Request new OTP
- POST `/api/users/reset-password/` - Reset password with OTP
- POST `/api/users/login/` - Login with phone + password
- GET `/api/users/me/` - Get current user info

**Orders:**
- GET `/api/orders/my_orders/` - Get user's orders (authenticated)
- POST `/api/orders/` - Create order (authenticated)
- Removed: `/api/orders/track/` (public tracking removed)

**Products (Admin):**
- POST `/api/products/` - Add product (admin only)
- PUT `/api/products/{slug}/` - Update product (admin only)
- DELETE `/api/products/{slug}/` - Delete product (admin only)

### Database Migrations Required

```bash
python manage.py makemigrations
python manage.py migrate
```

### Environment Variables

New variables in `.env`:
```
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+251929509800
```

## Frontend Changes Required

### New Pages Needed
1. **Register Page** - User registration form
2. **OTP Verification Page** - Enter 6-digit code
3. **Login Page** - Phone + password login
4. **Forgot Password Page** - Request OTP for password reset
5. **My Orders Page** - View user's order history
6. **Admin Product Management** - CRUD interface for products

### Updated Pages
1. **Checkout Page** - Requires authentication
2. **Order Tracking** - Removed (replaced with My Orders)
3. **Product Pages** - Show stock status

### Authentication Flow
1. User registers → OTP sent
2. User verifies OTP → Account activated
3. User logs in → JWT token received
4. Token stored in localStorage
5. Token sent with all authenticated requests

### Protected Routes
- Checkout
- My Orders
- Admin Dashboard
- Admin Product Management

## SMS Provider Setup

### Twilio Configuration

1. **Sign up for Twilio:**
   - Go to https://www.twilio.com/try-twilio
   - Create account (free trial available)

2. **Get Credentials:**
   - Account SID
   - Auth Token
   - Phone Number

3. **Configure Sender ID:**
   - Request custom sender ID (+251929509800)
   - Note: Custom sender IDs may require verification
   - Fallback: Use Twilio-provided number

4. **Ethiopian Phone Numbers:**
   - Ensure Twilio supports Ethiopia (+251)
   - Test SMS delivery
   - Configure international messaging

### Alternative SMS Providers
- **Africa's Talking** - Good for African markets
- **Nexmo/Vonage** - Global coverage
- **AWS SNS** - Scalable solution

## Testing

### Development Mode
- OTP codes printed to console
- No actual SMS sent (saves costs)
- Set `DEBUG=True` in `.env`

### Production Mode
- Real SMS sent via Twilio
- Set `DEBUG=False`
- Configure proper Twilio credentials

## Security Best Practices

1. **Never commit `.env` file**
2. **Use strong SECRET_KEY in production**
3. **Enable HTTPS in production**
4. **Set DEBUG=False in production**
5. **Configure proper CORS settings**
6. **Use rate limiting on all endpoints**
7. **Monitor OTP usage for abuse**
8. **Implement account lockout after failed attempts**
9. **Log all authentication attempts**
10. **Regular security audits**

## Performance Considerations

### Database Optimization
- Indexes on frequently queried fields
- Select-for-update for stock management
- Transaction management for critical operations

### Caching (Future Enhancement)
- Cache product listings
- Cache user sessions
- Redis for OTP storage

### Monitoring
- Track OTP delivery success rate
- Monitor failed login attempts
- Alert on unusual activity

## Future Enhancements

1. **Email Notifications**
   - Order confirmations
   - Status updates
   - Password reset links

2. **SMS Notifications**
   - Order status updates
   - Delivery notifications

3. **Multi-factor Authentication**
   - Optional 2FA for admin accounts

4. **Social Login**
   - Google OAuth
   - Facebook Login

5. **Advanced Analytics**
   - User behavior tracking
   - Sales analytics
   - Inventory forecasting

6. **Wishlist Feature**
   - Save products for later
   - Price drop notifications

7. **Product Reviews**
   - Customer ratings
   - Review moderation

8. **Discount Codes**
   - Promotional codes
   - Referral system

## Migration Guide

### From Old System to New System

1. **Backup existing data**
2. **Run new migrations**
3. **Create admin users**
4. **Test authentication flow**
5. **Test order creation**
6. **Test stock management**
7. **Deploy frontend changes**
8. **Monitor for issues**

### Data Migration
- Existing orders remain intact
- Need to link orders to users (manual process)
- Products retain all data
- Categories unchanged

## Support & Troubleshooting

### Common Issues

**OTP not received:**
- Check Twilio credentials
- Verify phone number format
- Check Twilio account balance
- Review Twilio logs

**Authentication errors:**
- Verify JWT token validity
- Check token expiration
- Ensure proper CORS configuration

**Stock issues:**
- Check database transactions
- Verify stock update logic
- Review order rejection flow

**File upload errors:**
- Verify Cloudinary credentials
- Check file size limits
- Validate file types
