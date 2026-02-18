# AKEYA - Premium Scrunchies E-Commerce Platform

A full-stack e-commerce platform for selling premium handcrafted scrunchies, built with Django REST Framework and React.

## 🌐 Live Demo

- **Frontend:** https://scrunchie-site.vercel.app
- **Backend API:** https://scrunchiesite.onrender.com
- **Admin Panel:** https://scrunchiesite.onrender.com/admin

## ✨ Features

### Customer Features
- 🔐 Phone-based authentication with OTP verification
- 🛍️ Product catalog with categories
- 🛒 Shopping cart functionality
- 💳 Multiple payment methods (Telebirr, CBE, Dashen Bank)
- 📦 Order tracking and history
- 🚚 Delivery or pickup options
- 📱 Fully responsive design

### Admin Features
- 📊 Dashboard with order statistics
- 📦 Order management (verify/reject)
- 🏷️ Product management (CRUD operations)
- 📸 Image upload for products
- 📝 Audit logging for all actions
- 📉 Stock management with automatic updates
- 🔍 Order filtering and search

### Security Features
- 🔒 JWT token authentication
- 📱 SMS OTP verification (Twilio)
- 🛡️ CSRF protection
- 🔐 Password hashing
- 🚫 Rate limiting
- 📊 Audit trails

## 🛠️ Tech Stack

### Backend
- Django 5.0.1
- Django REST Framework
- PostgreSQL (production) / SQLite (development)
- Twilio (SMS)
- Cloudinary (image storage)
- JWT Authentication

### Frontend
- React 18
- Vite
- Tailwind CSS
- Zustand (state management)
- React Router
- Axios

## 🚀 Quick Start

### Prerequisites
- Python 3.13
- Node.js 18+
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd <repo-name>
   ```

2. **Backend Setup**
   ```bash
   cd backend
   source venv/bin/activate
   ./venv/bin/python3.13 -m pip install -r requirements.txt
   ./venv/bin/python3.13 manage.py migrate
   ./venv/bin/python3.13 manage.py createsuperuser
   ./venv/bin/python3.13 manage.py runserver
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:8000
   - Admin: http://localhost:8000/admin

## 📚 Documentation

- [Setup Guide](SETUP.md) - Detailed setup instructions
- [Deployment Guide](DEPLOYMENT_GUIDE.md) - Production deployment
- [Features Documentation](UPDATED_FEATURES.md) - Complete feature list
- [Next Steps](NEXT_STEPS.md) - What to do next
- [Twilio Setup](TWILIO_SETUP_GUIDE.md) - SMS configuration
- [Environment Setup](ENV_SETUP_GUIDE.md) - Environment variables

## 🎨 Design

- **Brand:** AKEYA
- **Colors:** Dark green (#0a1612) and gold (#d4af37)
- **Fonts:** Cormorant Garamond (display), Inter (body)
- **Style:** Premium, elegant, minimal

## 💳 Payment Methods

All payments to "Maya":
- **Telebirr:** 0987654321
- **CBE:** 1000198657723
- **Dashen Bank:** 123134135141

## 🔧 Configuration

### Backend Environment Variables
```env
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=localhost,127.0.0.1,scrunchiesite.onrender.com
DATABASE_URL=your-database-url
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=+251929509800
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

### Frontend Environment Variables
```env
VITE_API_URL=https://scrunchiesite.onrender.com/api
```

## 📦 Deployment

### Backend (Render)
1. Connect GitHub repository
2. Set environment variables
3. Deploy with build command: `./build.sh`
4. Start command: `gunicorn config.wsgi:application`

### Frontend (Vercel)
1. Connect GitHub repository
2. Set root directory to `frontend`
3. Set environment variables
4. Deploy automatically on push

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.

## 🧪 Testing

### Test Authentication
1. Register at `/register`
2. Verify OTP (check console in DEBUG mode)
3. Login at `/login`

### Test Shopping
1. Browse products at `/products`
2. Add to cart
3. Checkout (requires login)
4. Upload payment receipt
5. View order in "My Orders"

### Test Admin
1. Login at `/admin/login`
2. View dashboard
3. Manage products
4. Verify/reject orders

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

This project is private and proprietary.

## 👥 Support

For issues or questions:
- Check the documentation files
- Review error logs
- Contact the development team

## 🎯 Roadmap

- [ ] Email notifications
- [ ] Product reviews
- [ ] Wishlist feature
- [ ] Discount codes
- [ ] Advanced analytics
- [ ] Multi-language support
- [ ] Mobile app

---

Built with ❤️ for AKEYA
