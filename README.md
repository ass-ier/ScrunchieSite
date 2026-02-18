# Azmud Bakehouse E-Commerce Platform

Modern e-commerce system with manual bank transfer verification, admin dashboard, and order tracking.

## Features
- Customer-facing website with product catalog
- Secure checkout with delivery/pickup options
- Manual payment verification (Telebirr, CBE, Dashen Bank)
- Admin dashboard with order management
- Order tracking system
- Fraud prevention & audit logs
- Responsive design with premium aesthetic

## Tech Stack
- Frontend: React + Tailwind CSS + Vite
- Backend: Django REST Framework
- Database: PostgreSQL
- Storage: Cloudinary
- Authentication: JWT

## Setup Instructions

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Color Theme
- Primary: Deep Green (#1a3a2e, #2d5a4a)
- Accent: Gold/Beige (#d4af37, #f5e6d3)
- Background: Cream/White (#faf8f3)
- Text: Dark Green (#0f2419)
