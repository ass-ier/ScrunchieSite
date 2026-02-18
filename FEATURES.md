# Azmud Bakehouse - Feature Documentation

## Customer Features

### 1. Home Page
- Hero section with brand introduction
- Featured products showcase
- Key features highlight (Premium Quality, Fresh Daily, Easy Ordering)
- Responsive design with smooth animations

### 2. Products Page
- Grid layout of all products
- Category filtering
- Product search
- Stock availability indicator
- Hover effects and transitions

### 3. Product Detail Page
- Large product image
- Detailed description
- Price display
- Quantity selector
- Add to Cart / Buy Now buttons
- Stock validation

### 4. Shopping Cart
- View all cart items
- Update quantities
- Remove items
- Real-time total calculation
- Persistent cart (localStorage)

### 5. Checkout Page
#### Customer Information
- Full Name (required)
- Phone Number (required)
- Email (optional)

#### Delivery Method
- Radio selection: Delivery or Pickup
- If Delivery:
  - Address field (required)
  - Delivery notes (optional)
  - Delivery date picker
- If Pickup:
  - Pickup date picker only
- Date validation (no past dates)

#### Payment Section
- Payment method selection:
  - Telebirr
  - CBE
  - Dashen Bank
- Dynamic payment instructions display
- Transaction reference input
- Receipt upload (max 5MB, JPG/PNG only)
- Image preview before submission

### 6. Order Confirmation
- Success message
- Order ID display
- Next steps information
- Links to track order or continue shopping

### 7. Order Tracking
- Track by Order ID + Phone Number
- View order details
- Check order status
- View admin notes
- See order items and total

## Admin Features

### 1. Admin Login
- Secure JWT authentication
- Email + Password
- Session management

### 2. Admin Dashboard

#### Statistics Overview
- Total Orders
- Pending Orders
- Verified Orders
- Rejected Orders
- Total Revenue (verified orders only)

#### Order Management
- View all orders in table format
- Columns:
  - Order ID
  - Customer Name
  - Phone
  - Delivery/Pickup
  - Selected Date
  - Payment Method
  - Transaction Reference
  - Amount
  - Status
  - Actions

#### Filters & Search
- Filter by status (All, Pending, Verified, Rejected)
- Filter by payment method
- Search by Order ID, Customer Name, or Phone

#### Order Actions
- View full order details
- View payment receipt (modal)
- Verify order (with optional note)
- Reject order (with optional note)
- Delete fraudulent orders

#### Order Detail Modal
- Complete customer information
- Payment receipt image
- Order items breakdown
- Total amount
- Admin note field
- Verify/Reject buttons

### 3. Audit Logs
- Track all admin actions
- Record status changes
- Timestamp all modifications
- Store admin who made changes

## Security Features

### 1. Input Validation
- Server-side validation for all inputs
- File type validation (images only)
- File size validation (max 5MB)
- Required field validation
- Date validation (no past dates)

### 2. Authentication & Authorization
- JWT token-based authentication
- Protected admin routes
- Token expiration handling
- Secure password hashing

### 3. File Upload Security
- File type restriction
- File size limitation
- Secure storage (Cloudinary)
- No direct file access without authorization

### 4. API Security
- CORS configuration
- Rate limiting
- CSRF protection
- SQL injection prevention (Django ORM)

### 5. Data Protection
- Sensitive data encryption
- Secure environment variables
- No hardcoded credentials

## Design Features

### Color Scheme (AKEYA Brand)
- Primary: Deep Green (#1a3a2e, #2d5a4a)
- Accent: Gold/Beige (#d4af37, #f5e6d3)
- Background: Cream (#faf8f3)
- Text: Dark Green (#0f2419)

### Typography
- Display Font: Playfair Display (headings)
- Body Font: Inter (content)

### UI Components
- Smooth transitions and animations
- Hover effects on cards and buttons
- Toast notifications for user feedback
- Loading states
- Modal dialogs
- Responsive grid layouts

### Responsive Design
- Mobile-first approach
- Breakpoints: sm, md, lg, xl
- Touch-friendly buttons
- Optimized images
- Flexible layouts

## Technical Features

### Frontend
- React 18 with Hooks
- React Router for navigation
- Zustand for state management
- Axios for API calls
- Tailwind CSS for styling
- React Hot Toast for notifications
- Vite for fast development

### Backend
- Django REST Framework
- JWT Authentication
- PostgreSQL database
- Cloudinary storage
- CORS handling
- Rate limiting
- Automatic order ID generation

### Database Schema
- Products & Categories
- Orders & Order Items
- Audit Logs
- User management

## Workflow

### Customer Order Flow
1. Browse products
2. Add to cart
3. Proceed to checkout
4. Fill customer information
5. Choose delivery/pickup method
6. Select date
7. Choose payment method
8. Transfer money manually
9. Upload receipt
10. Submit order
11. Receive order confirmation
12. Track order status

### Admin Verification Flow
1. Login to admin dashboard
2. View pending orders
3. Click to view order details
4. Check payment receipt
5. Verify or reject order
6. Add admin note (optional)
7. Customer receives notification
8. Order status updated
9. Audit log created

## Future Enhancements (Optional)
- Email notifications
- SMS notifications
- Inventory management
- Low stock alerts
- Export orders to CSV
- Dashboard charts
- Multi-admin roles
- Customer accounts
- Order history
- Wishlist feature
- Product reviews
- Discount codes
- Dark mode toggle
