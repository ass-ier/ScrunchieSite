import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useCartStore from '../store/cartStore'
import useAuthStore from '../store/authStore'
import { ordersAPI } from '../lib/api'
import toast from 'react-hot-toast'

const PAYMENT_INFO = {
  telebirr: { number: '0987654321', name: 'Maya' },
  cbe: { account: '1000198657723', name: 'Maya' },
  dashen: { account: '123134135141', name: 'Maya' },
}

export default function Checkout() {
  const navigate = useNavigate()
  const { items, getTotal, clearCart } = useCartStore()
  const { user, isAuthenticated } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [receiptPreview, setReceiptPreview] = useState(null)
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    address: '',
    delivery_method: 'delivery',
    selected_date: '',
    delivery_notes: '',
    payment_method: 'telebirr',
    transaction_reference: '',
    receipt_url: null,
  })
  
  // Pre-fill user data if authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Please login to checkout')
      navigate('/login')
      return
    }
    
    if (user) {
      setFormData(prev => ({
        ...prev,
        full_name: user.full_name || '',
        phone: user.phone || '',
        email: user.email || '',
      }))
    }
  }, [user, isAuthenticated, navigate])
  
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB')
        return
      }
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        toast.error('Only JPG, JPEG, and PNG files are allowed')
        return
      }
      setFormData(prev => ({ ...prev, receipt_url: file }))
      setReceiptPreview(URL.createObjectURL(file))
    }
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (items.length === 0) {
      toast.error('Your cart is empty')
      return
    }
    
    if (!formData.receipt_url) {
      toast.error('Please upload payment receipt')
      return
    }
    
    if (formData.delivery_method === 'delivery' && !formData.address) {
      toast.error('Please enter delivery address')
      return
    }
    
    setLoading(true)
    
    try {
      const orderData = {
        ...formData,
        total_amount: getTotal(),
        items: items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          price: item.price,
        })),
      }
      
      const response = await ordersAPI.create(orderData)
      clearCart()
      toast.success('Order placed successfully!')
      navigate(`/order-confirmation/${response.data.order_id}`)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to place order')
    } finally {
      setLoading(false)
    }
  }
  
  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }
  
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="font-display text-4xl font-bold mb-8">Checkout</h1>
      
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <div className="card p-6">
            <h2 className="font-display text-2xl font-semibold mb-4">Customer Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Full Name *</label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Email (Optional)</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
            </div>
          </div>
          
          {/* Delivery Method */}
          <div className="card p-6">
            <h2 className="font-display text-2xl font-semibold mb-4">Delivery Method</h2>
            <div className="space-y-4">
              <div className="flex space-x-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="delivery_method"
                    value="delivery"
                    checked={formData.delivery_method === 'delivery'}
                    onChange={handleChange}
                    className="w-4 h-4"
                  />
                  <span>Delivery</span>
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="delivery_method"
                    value="pickup"
                    checked={formData.delivery_method === 'pickup'}
                    onChange={handleChange}
                    className="w-4 h-4"
                  />
                  <span>Pickup</span>
                </label>
              </div>
              
              {formData.delivery_method === 'delivery' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Delivery Address *</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                      rows={3}
                      className="input-field"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Delivery Notes (Optional)</label>
                    <textarea
                      name="delivery_notes"
                      value={formData.delivery_notes}
                      onChange={handleChange}
                      rows={2}
                      className="input-field"
                    />
                  </div>
                </>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  {formData.delivery_method === 'delivery' ? 'Delivery Date *' : 'Pickup Date *'}
                </label>
                <input
                  type="date"
                  name="selected_date"
                  value={formData.selected_date}
                  onChange={handleChange}
                  min={getTomorrowDate()}
                  required
                  className="input-field"
                />
              </div>
            </div>
          </div>
          
          {/* Payment Section */}
          <div className="card p-6">
            <h2 className="font-display text-2xl font-semibold mb-4">Payment Method</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                {Object.entries(PAYMENT_INFO).map(([key, info]) => (
                  <label key={key} className="flex items-center space-x-2 cursor-pointer p-3 rounded-lg hover:bg-primary-50">
                    <input
                      type="radio"
                      name="payment_method"
                      value={key}
                      checked={formData.payment_method === key}
                      onChange={handleChange}
                      className="w-4 h-4"
                    />
                    <span className="capitalize font-medium">{key}</span>
                  </label>
                ))}
              </div>
              
              {/* Payment Instructions */}
              <div className="bg-accent-50 border border-accent-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2">Payment Instructions</h3>
                {formData.payment_method === 'telebirr' && (
                  <div>
                    <p>Transfer to: <span className="font-bold">{PAYMENT_INFO.telebirr.number}</span></p>
                    <p>Name: <span className="font-bold">{PAYMENT_INFO.telebirr.name}</span></p>
                  </div>
                )}
                {formData.payment_method === 'cbe' && (
                  <div>
                    <p>Account: <span className="font-bold">{PAYMENT_INFO.cbe.account}</span></p>
                    <p>Name: <span className="font-bold">{PAYMENT_INFO.cbe.name}</span></p>
                  </div>
                )}
                {formData.payment_method === 'dashen' && (
                  <div>
                    <p>Account: <span className="font-bold">{PAYMENT_INFO.dashen.account}</span></p>
                    <p>Name: <span className="font-bold">{PAYMENT_INFO.dashen.name}</span></p>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Transaction Reference *</label>
                <input
                  type="text"
                  name="transaction_reference"
                  value={formData.transaction_reference}
                  onChange={handleChange}
                  required
                  placeholder="Enter transaction reference number"
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">Upload Receipt * (Max 5MB)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  onChange={handleFileChange}
                  required
                  className="input-field"
                />
                {receiptPreview && (
                  <img src={receiptPreview} alt="Receipt preview" className="mt-4 max-w-xs rounded-lg" />
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="font-display text-2xl font-semibold mb-4">Order Summary</h2>
            
            <div className="space-y-3 mb-6">
              {items.map(item => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name} x{item.quantity}</span>
                  <span>{(item.price * item.quantity).toFixed(2)} ETB</span>
                </div>
              ))}
              
              <div className="border-t pt-3">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-accent-500">{getTotal().toFixed(2)} ETB</span>
                </div>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Processing...' : 'Place Order'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
