# AKEYA E-Commerce Setup Guide

## Prerequisites

- Python 3.13 (installed at `./venv/bin/python3.13`)
- Node.js 18+ and npm
- Git

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Activate virtual environment
source venv/bin/activate

# Install dependencies (using Python 3.13)
./venv/bin/python3.13 -m pip install -r requirements.txt

# Configure environment variables
# Edit backend/.env file with your settings (already created)

# Run migrations
./venv/bin/python3.13 manage.py makemigrations
./venv/bin/python3.13 manage.py migrate

# Create superuser for admin access
./venv/bin/python3.13 manage.py createsuperuser

# Start development server
./venv/bin/python3.13 manage.py runserver
```

Backend will run at: http://localhost:8000
Admin panel: http://localhost:8000/admin

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run at: http://localhost:5173

## Configuration

### Environment Variables

The `backend/.env` file has been created with default values. Update these settings:

#### Required for Production:
- `SECRET_KEY` - Change to a secure random string
- `DEBUG` - Set to False in production
- `ALLOWED_HOSTS` - Add your domain

#### Optional (Twilio SMS):
- `TWILIO_ACCOUNT_SID` - From https://www.twilio.com/console
- `TWILIO_AUTH_TOKEN` - From Twilio console
- `TWILIO_PHONE_NUMBER` - Set to +251929509800

**Note:** In DEBUG mode, OTP codes are printed to the console instead of being sent via SMS.

#### Optional (Cloudinary):
- `CLOUDINARY_CLOUD_NAME` - From https://cloudinary.com
- `CLOUDINARY_API_KEY` - From Cloudinary dashboard
- `CLOUDINARY_API_SECRET` - From Cloudinary dashboard

**Note:** Currently using local file storage. Uncomment Cloudinary settings in `backend/config/settings.py` to enable cloud storage.

## Database

Using SQLite by default (no configuration needed). Database file: `backend/db.sqlite3`

To use PostgreSQL instead:
1. Install PostgreSQL
2. Uncomment PostgreSQL settings in `backend/config/settings.py`
3. Update database credentials in `.env`

## Initial Data Setup

### 1. Create Admin User

```bash
cd backend
./venv/bin/python3.13 manage.py createsuperuser
```

### 2. Add Product Categories

Login to admin panel (http://localhost:8000/admin) and add categories:
- Silk Scrunchies
- Velvet Scrunchies
- Satin Scrunchies
- Cotton Scrunchies

### 3. Add Products

Use the admin panel or the frontend admin interface at:
http://localhost:5173/admin/products

## Testing the System

### 1. Test Authentication Flow

1. Register new user at http://localhost:5173/register
2. Enter phone number (format: +251912345678 or 0912345678)
3. Check console for OTP code (in DEBUG mode)
4. Verify OTP at http://localhost:5173/verify-otp
5. Login at http://localhost:5173/login

### 2. Test Order Flow

1. Browse products at http://localhost:5173/products
2. Add items to cart
3. Proceed to checkout (requires login)
4. Fill in delivery details
5. Select payment method
6. Upload payment receipt
7. Submit order
8. View order in "My Orders"

### 3. Test Admin Functions

1. Login to admin at http://localhost:5173/admin/login
2. View dashboard with order statistics
3. Manage products (add/edit/delete)
4. Verify/reject orders
5. View audit logs

## Payment Methods

All payments to "Maya":
- **Telebirr:** 0987654321
- **CBE:** 1000198657723
- **Dashen Bank:** 123134135141

## Troubleshooting

### Backend Issues

**Django not found:**
```bash
# Make sure you're using the correct Python
./venv/bin/python3.13 manage.py runserver
```

**Migration errors:**
```bash
# Delete database and start fresh
rm db.sqlite3
./venv/bin/python3.13 manage.py migrate
./venv/bin/python3.13 manage.py createsuperuser
```

**Media files not loading:**
- Check that `MEDIA_ROOT` exists: `backend/media/`
- Verify media URL configuration in `backend/config/urls.py`
- In production, use Cloudinary or configure proper static file serving

### Frontend Issues

**Port already in use:**
```bash
# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
npm run dev
```

**API connection errors:**
- Verify backend is running on port 8000
- Check CORS settings in `backend/config/settings.py`
- Verify API proxy in `frontend/vite.config.js`

### Authentication Issues

**OTP not received:**
- In DEBUG mode, check console output for OTP code
- For production, verify Twilio credentials
- Check phone number format (+251 or 09...)

**Token expired:**
- Tokens expire after 1 hour
- Refresh token or login again

## Production Deployment

### Backend

1. Set environment variables:
   ```
   DEBUG=False
   SECRET_KEY=<secure-random-string>
   ALLOWED_HOSTS=yourdomain.com
   ```

2. Configure Cloudinary for media storage

3. Set up Twilio for SMS delivery

4. Use PostgreSQL instead of SQLite

5. Configure static file serving

6. Use gunicorn or uwsgi

### Frontend

1. Build production bundle:
   ```bash
   npm run build
   ```

2. Deploy `dist/` folder to hosting service

3. Update API base URL in production

## Additional Resources

- Django Documentation: https://docs.djangoproject.com/
- React Documentation: https://react.dev/
- Tailwind CSS: https://tailwindcss.com/
- Twilio SMS: https://www.twilio.com/docs/sms
- Cloudinary: https://cloudinary.com/documentation

## Support

For issues or questions:
1. Check `UPDATED_FEATURES.md` for feature documentation
2. Check `TWILIO_SETUP_GUIDE.md` for SMS setup
3. Check `ENV_SETUP_GUIDE.md` for environment configuration
