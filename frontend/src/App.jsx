import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import Home from './pages/Home'
import Products from './pages/Products'
import ProductDetail from './pages/ProductDetail'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderConfirmation from './pages/OrderConfirmation'
import OrderTracking from './pages/OrderTracking'
import MyOrders from './pages/MyOrders'
import Wishlist from './pages/Wishlist'
import Register from './pages/auth/Register'
import VerifyOTP from './pages/auth/VerifyOTP'
import Login from './pages/auth/Login'
import ForgotPassword from './pages/auth/ForgotPassword'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminProducts from './pages/admin/AdminProducts'
import AdminPromotions from './pages/admin/AdminPromotions'
import AdminSettings from './pages/admin/AdminSettings'
import ProtectedRoute from './components/ProtectedRoute'
import MotionProvider from './components/MotionProvider'
import './motion.css'

function App() {
  return (
    <Router>
      <MotionProvider>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="products" element={<Products />} />
          <Route path="products/:slug" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="track-order" element={<OrderTracking />} />
          <Route path="order-confirmation/:orderId" element={<OrderConfirmation />} />
          <Route path="my-orders" element={
            <ProtectedRoute>
              <MyOrders />
            </ProtectedRoute>
          } />
          <Route path="wishlist" element={
            <ProtectedRoute>
              <Wishlist />
            </ProtectedRoute>
          } />
          <Route path="*" element={<div className="container mx-auto px-4 py-16"><h1 className="text-3xl mb-4">Page not found</h1><a href="/products" className="btn-primary">Return to the shop</a></div>} />
        </Route>
        
        <Route path="/register" element={<Register />} />
        <Route path="/verify-otp" element={<VerifyOTP />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={
          <ProtectedRoute requireAdmin>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/products" element={
          <ProtectedRoute requireAdmin>
            <AdminProducts />
          </ProtectedRoute>
        } />
        <Route path="/admin/promotions" element={<ProtectedRoute requireAdmin><AdminPromotions /></ProtectedRoute>} />
        <Route path="/admin/settings" element={<ProtectedRoute requireAdmin><AdminSettings /></ProtectedRoute>} />
      </Routes>
      </MotionProvider>
    </Router>
  )
}

export default App
