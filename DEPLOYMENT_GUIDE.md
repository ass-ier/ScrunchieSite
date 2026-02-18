# AKEYA E-Commerce - Deployment Guide

## Production URLs

- **Frontend:** https://scrunchie-site.vercel.app
- **Backend:** https://scrunchiesite.onrender.com
- **Admin Panel:** https://scrunchiesite.onrender.com/admin

## Backend Deployment (Render)

### Initial Setup

1. **Create Render Account**
   - Go to https://render.com
   - Sign up or login

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure Service**
   ```
   Name: scrunchiesite
   Environment: Python 3
   Region: Choose closest to your users
   Branch: main (or your default branch)
   Root Directory: backend
   Build Command: pip install -r requirements.txt
   Start Command: gunicorn config.wsgi:application
   ```

4. **Add Environment Variables**
   
   Go to "Environment" tab and add:
   ```
   SECRET_KEY=<generate-secure-random-string>
   DEBUG=False
   ALLOWED_HOSTS=scrunchiesite.onrender.com
   
   # Database (Render provides PostgreSQL)
   DATABASE_URL=<provided-by-render-postgres>
   
   # Twilio (for SMS)
   TWILIO_ACCOUNT_SID=<your-twilio-sid>
   TWILIO_AUTH_TOKEN=<your-twilio-token>
   TWILIO_PHONE_NUMBER=+251929509800
   
   # Cloudinary (for images)
   CLOUDINARY_CLOUD_NAME=<your-cloud-name>
   CLOUDINARY_API_KEY=<your-api-key>
   CLOUDINARY_API_SECRET=<your-api-secret>
   
   # Python version
   PYTHON_VERSION=3.13.0
   ```

5. **Add PostgreSQL Database**
   - Click "New +" → "PostgreSQL"
   - Name it and create
   - Copy the "Internal Database URL"
   - Add it as `DATABASE_URL` in your web service environment variables

6. **Update settings.py for Production**
   
   The settings are already configured to:
   - Use PostgreSQL when `DATABASE_URL` is available
   - Allow `scrunchiesite.onrender.com` as host
   - Enable CORS for `scrunchie-site.vercel.app`

7. **Deploy**
   - Click "Manual Deploy" or push to your branch
   - Wait for build to complete
   - Check logs for any errors

### Post-Deployment Tasks

1. **Run Migrations**
   
   In Render dashboard, go to "Shell" tab:
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

2. **Collect Static Files**
   ```bash
   python manage.py collectstatic --noinput
   ```

3. **Test Backend**
   - Visit https://scrunchiesite.onrender.com/admin
   - Login with superuser credentials
   - Add product categories and products

### Backend Configuration Files Needed

Create `backend/requirements.txt` with production dependencies:
```
Django==5.0.1
djangorestframework==3.14.0
djangorestframework-simplejwt==5.3.1
django-cors-headers==4.3.1
Pillow==10.2.0
python-decouple==3.8
django-cloudinary-storage==0.3.0
cloudinary==1.36.0
twilio==9.0.0
phonenumbers==8.13.27
gunicorn==21.2.0
psycopg2-binary==2.9.9
whitenoise==6.6.0
```

Create `backend/render.yaml` (optional, for infrastructure as code):
```yaml
services:
  - type: web
    name: scrunchiesite
    env: python
    region: oregon
    plan: free
    branch: main
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn config.wsgi:application
    envVars:
      - key: PYTHON_VERSION
        value: 3.13.0
      - key: SECRET_KEY
        generateValue: true
      - key: DEBUG
        value: False
```

## Frontend Deployment (Vercel)

### Initial Setup

1. **Create Vercel Account**
   - Go to https://vercel.com
   - Sign up or login with GitHub

2. **Import Project**
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Select the repository

3. **Configure Project**
   ```
   Framework Preset: Vite
   Root Directory: frontend
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

4. **Add Environment Variables**
   
   In project settings → "Environment Variables":
   ```
   VITE_API_URL=https://scrunchiesite.onrender.com/api
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your site will be live at https://scrunchie-site.vercel.app

### Custom Domain (Optional)

1. Go to project settings → "Domains"
2. Add your custom domain
3. Update DNS records as instructed
4. Update CORS settings in backend to include your custom domain

## Configuration Updates

### Backend CORS Settings

Already configured in `backend/config/settings.py`:
```python
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://scrunchie-site.vercel.app",
]
```

### Backend Allowed Hosts

Already configured in `backend/config/settings.py`:
```python
ALLOWED_HOSTS = config('ALLOWED_HOSTS', 
    default='localhost,127.0.0.1,scrunchiesite.onrender.com').split(',')
```

### Frontend API URL

Already configured in `frontend/src/lib/api.js`:
```javascript
const baseURL = import.meta.env.PROD 
  ? 'https://scrunchiesite.onrender.com/api'
  : '/api'
```

## Testing Production Deployment

### 1. Test Backend API

```bash
# Test health check
curl https://scrunchiesite.onrender.com/api/products/

# Test admin panel
open https://scrunchiesite.onrender.com/admin
```

### 2. Test Frontend

1. Visit https://scrunchie-site.vercel.app
2. Register a new user
3. Check backend logs for OTP code (or SMS if Twilio configured)
4. Complete registration and login
5. Browse products
6. Add to cart
7. Complete checkout
8. View order in "My Orders"

### 3. Test Admin Functions

1. Visit https://scrunchie-site.vercel.app/admin/login
2. Login with superuser credentials
3. View dashboard
4. Manage products
5. Verify/reject orders

## Monitoring & Maintenance

### Render Monitoring

- Check logs in Render dashboard
- Set up alerts for errors
- Monitor resource usage
- Check database size

### Vercel Monitoring

- Check deployment logs
- Monitor build times
- Check analytics
- Set up error tracking (Sentry recommended)

### Database Backups

Render provides automatic backups for paid plans. For free tier:
1. Manually export database periodically
2. Use `pg_dump` to backup
3. Store backups securely

### SSL Certificates

Both Render and Vercel provide automatic SSL certificates. No configuration needed.

## Troubleshooting

### Backend Issues

**500 Internal Server Error:**
- Check Render logs
- Verify environment variables
- Check database connection
- Verify migrations are run

**CORS Errors:**
- Verify frontend URL in CORS_ALLOWED_ORIGINS
- Check CORS headers in response
- Verify credentials are being sent

**Database Connection Error:**
- Check DATABASE_URL is set correctly
- Verify PostgreSQL service is running
- Check database credentials

**Static Files Not Loading:**
- Run `python manage.py collectstatic`
- Check STATIC_ROOT and STATIC_URL settings
- Verify WhiteNoise is installed

### Frontend Issues

**API Connection Failed:**
- Verify backend URL in environment variables
- Check CORS settings on backend
- Verify backend is running

**Build Failed:**
- Check build logs in Vercel
- Verify all dependencies are in package.json
- Check for syntax errors

**Environment Variables Not Working:**
- Verify variables start with `VITE_`
- Redeploy after adding variables
- Check variables are set in Vercel dashboard

## Security Checklist

- [x] DEBUG=False in production
- [x] Secure SECRET_KEY generated
- [x] ALLOWED_HOSTS configured
- [x] CORS properly configured
- [x] HTTPS enabled (automatic)
- [ ] Configure Cloudinary for image storage
- [ ] Configure Twilio for SMS
- [ ] Set up database backups
- [ ] Configure error monitoring (Sentry)
- [ ] Set up rate limiting
- [ ] Configure firewall rules
- [ ] Enable 2FA for admin accounts
- [ ] Regular security audits

## Performance Optimization

### Backend

1. **Enable Caching**
   - Use Redis for session storage
   - Cache product listings
   - Cache user sessions

2. **Database Optimization**
   - Add indexes on frequently queried fields
   - Use select_related and prefetch_related
   - Monitor slow queries

3. **Static Files**
   - Use CDN for static files
   - Enable compression
   - Set proper cache headers

### Frontend

1. **Code Splitting**
   - Lazy load routes
   - Split vendor bundles
   - Optimize images

2. **Caching**
   - Configure service worker
   - Cache API responses
   - Use browser cache

3. **Performance Monitoring**
   - Use Lighthouse
   - Monitor Core Web Vitals
   - Set up performance budgets

## Scaling Considerations

### When to Scale

- Response times > 1 second
- Database CPU > 80%
- Memory usage > 80%
- Error rate > 1%

### Scaling Options

**Render:**
- Upgrade to paid plan for more resources
- Add horizontal scaling (multiple instances)
- Upgrade database plan

**Vercel:**
- Automatically scales
- Upgrade for more bandwidth
- Add edge functions for better performance

## Cost Estimates

### Free Tier (Current)

- **Render:** Free tier (750 hours/month)
- **Vercel:** Free tier (100GB bandwidth)
- **Total:** $0/month

### Paid Plans (Recommended for Production)

- **Render Starter:** $7/month (web service)
- **Render PostgreSQL:** $7/month (database)
- **Vercel Pro:** $20/month (better performance)
- **Cloudinary:** $0-89/month (based on usage)
- **Twilio:** Pay-as-you-go (SMS costs)
- **Total:** ~$34-50/month

## Support & Resources

- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Django Deployment:** https://docs.djangoproject.com/en/5.0/howto/deployment/
- **Vite Deployment:** https://vitejs.dev/guide/static-deploy.html

## Rollback Procedure

### Backend (Render)

1. Go to Render dashboard
2. Select your service
3. Go to "Events" tab
4. Click "Rollback" on previous successful deployment

### Frontend (Vercel)

1. Go to Vercel dashboard
2. Select your project
3. Go to "Deployments" tab
4. Click "..." on previous deployment
5. Click "Promote to Production"

---

**Deployment Complete!** Your AKEYA e-commerce site is now live. 🚀
