# Deployment Checklist for AKEYA E-Commerce

## ✅ Configuration Complete

### Backend Configuration
- [x] CORS settings updated for production
  - `https://scrunchie-site.vercel.app` added
- [x] ALLOWED_HOSTS updated
  - `scrunchiesite.onrender.com` added
- [x] Database configuration
  - PostgreSQL support via DATABASE_URL
  - SQLite fallback for development
- [x] Static files configuration
  - WhiteNoise middleware added
  - Static files compression enabled
- [x] Security settings
  - SSL redirect for production
  - Secure cookies
  - HSTS enabled
- [x] Production dependencies
  - gunicorn
  - psycopg2-binary
  - whitenoise
  - dj-database-url

### Frontend Configuration
- [x] API URL configuration
  - Production: `https://scrunchiesite.onrender.com/api`
  - Development: `/api` (proxy)
- [x] Environment files created
  - `.env.development`
  - `.env.production`
- [x] CORS credentials enabled

## 📋 Pre-Deployment Tasks

### Backend (Render)

1. **Create Render Account**
   - [ ] Sign up at https://render.com
   - [ ] Verify email

2. **Create PostgreSQL Database**
   - [ ] Click "New +" → "PostgreSQL"
   - [ ] Name: `akeya-db`
   - [ ] Copy Internal Database URL

3. **Create Web Service**
   - [ ] Click "New +" → "Web Service"
   - [ ] Connect GitHub repository
   - [ ] Configure:
     ```
     Name: scrunchiesite
     Environment: Python 3
     Build Command: ./build.sh
     Start Command: gunicorn config.wsgi:application
     ```

4. **Set Environment Variables**
   - [ ] `SECRET_KEY` - Generate secure random string
   - [ ] `DEBUG=False`
   - [ ] `ALLOWED_HOSTS=scrunchiesite.onrender.com`
   - [ ] `DATABASE_URL` - From PostgreSQL service
   - [ ] `PYTHON_VERSION=3.13.0`
   - [ ] `TWILIO_ACCOUNT_SID` - From Twilio
   - [ ] `TWILIO_AUTH_TOKEN` - From Twilio
   - [ ] `TWILIO_PHONE_NUMBER=+251929509800`
   - [ ] `CLOUDINARY_CLOUD_NAME` - From Cloudinary
   - [ ] `CLOUDINARY_API_KEY` - From Cloudinary
   - [ ] `CLOUDINARY_API_SECRET` - From Cloudinary

5. **Deploy**
   - [ ] Click "Manual Deploy"
   - [ ] Wait for build to complete
   - [ ] Check logs for errors

6. **Post-Deployment**
   - [ ] Run migrations (automatic via build.sh)
   - [ ] Create superuser via Shell:
     ```bash
     python manage.py createsuperuser
     ```
   - [ ] Test admin login
   - [ ] Add product categories
   - [ ] Add test products

### Frontend (Vercel)

1. **Create Vercel Account**
   - [ ] Sign up at https://vercel.com
   - [ ] Connect GitHub account

2. **Import Project**
   - [ ] Click "Add New..." → "Project"
   - [ ] Select repository
   - [ ] Configure:
     ```
     Framework: Vite
     Root Directory: frontend
     Build Command: npm run build
     Output Directory: dist
     ```

3. **Set Environment Variables**
   - [ ] `VITE_API_URL=https://scrunchiesite.onrender.com/api`

4. **Deploy**
   - [ ] Click "Deploy"
   - [ ] Wait for build to complete
   - [ ] Check deployment logs

5. **Post-Deployment**
   - [ ] Test frontend loads
   - [ ] Test API connection
   - [ ] Test authentication flow
   - [ ] Test product browsing
   - [ ] Test checkout process

## 🧪 Testing Checklist

### Backend API Tests
- [ ] GET `/api/products/` - List products
- [ ] GET `/api/products/categories/` - List categories
- [ ] POST `/api/users/register/` - Register user
- [ ] POST `/api/users/verify-otp/` - Verify OTP
- [ ] POST `/api/users/login/` - Login
- [ ] GET `/api/orders/my_orders/` - Get user orders (authenticated)
- [ ] Admin panel accessible at `/admin`

### Frontend Tests
- [ ] Home page loads
- [ ] Products page loads
- [ ] Product detail page loads
- [ ] Cart functionality works
- [ ] Registration flow works
- [ ] OTP verification works
- [ ] Login works
- [ ] Checkout requires authentication
- [ ] Order submission works
- [ ] My Orders page shows orders
- [ ] Admin login works
- [ ] Admin dashboard loads
- [ ] Product management works
- [ ] Order verification works

### Integration Tests
- [ ] Frontend can reach backend API
- [ ] CORS headers are correct
- [ ] Authentication tokens work
- [ ] File uploads work (product images, receipts)
- [ ] SMS OTP delivery works (if Twilio configured)
- [ ] Email notifications work (if configured)

## 🔒 Security Checklist

- [x] DEBUG=False in production
- [x] Secure SECRET_KEY generated
- [x] ALLOWED_HOSTS configured
- [x] CORS properly configured
- [x] HTTPS enabled (automatic on Render/Vercel)
- [x] Secure cookies enabled
- [x] CSRF protection enabled
- [x] XSS protection enabled
- [x] HSTS enabled
- [ ] Cloudinary configured for secure image storage
- [ ] Twilio configured for SMS
- [ ] Rate limiting configured
- [ ] Database backups enabled
- [ ] Error monitoring set up (Sentry recommended)

## 📊 Monitoring Setup

### Backend Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure logging
- [ ] Set up uptime monitoring
- [ ] Configure alerts for errors
- [ ] Monitor database performance
- [ ] Track API response times

### Frontend Monitoring
- [ ] Set up error tracking (Sentry)
- [ ] Configure analytics (Google Analytics)
- [ ] Monitor Core Web Vitals
- [ ] Track user flows
- [ ] Monitor build times

## 🚀 Go-Live Checklist

### Final Checks
- [ ] All environment variables set correctly
- [ ] Database migrations applied
- [ ] Static files collected
- [ ] Admin user created
- [ ] Product categories added
- [ ] Test products added
- [ ] Payment information verified
- [ ] SMS delivery tested
- [ ] Email delivery tested (if configured)
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Team trained on admin panel

### Launch
- [ ] Announce to stakeholders
- [ ] Monitor error logs
- [ ] Monitor user registrations
- [ ] Monitor order submissions
- [ ] Be ready for support requests

## 📝 Post-Launch Tasks

### Week 1
- [ ] Monitor error rates
- [ ] Check user feedback
- [ ] Fix critical bugs
- [ ] Optimize slow queries
- [ ] Add missing features

### Month 1
- [ ] Analyze user behavior
- [ ] Optimize conversion funnel
- [ ] Add requested features
- [ ] Improve performance
- [ ] Scale if needed

## 🆘 Rollback Plan

If something goes wrong:

### Backend Rollback
1. Go to Render dashboard
2. Select service
3. Go to "Events" tab
4. Click "Rollback" on previous deployment

### Frontend Rollback
1. Go to Vercel dashboard
2. Select project
3. Go to "Deployments" tab
4. Promote previous deployment to production

### Database Rollback
1. Restore from backup
2. Run migrations to previous state
3. Verify data integrity

## 📞 Support Contacts

- **Technical Issues:** Check logs and documentation
- **Render Support:** https://render.com/docs
- **Vercel Support:** https://vercel.com/docs
- **Twilio Support:** https://www.twilio.com/docs
- **Cloudinary Support:** https://cloudinary.com/documentation

---

**Ready to deploy!** Follow this checklist step by step. 🚀
