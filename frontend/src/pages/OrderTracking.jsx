import { useState } from 'react'
import { ordersAPI } from '../lib/api'
import toast from 'react-hot-toast'

export default function OrderTracking() {
  const [orderId, setOrderId] = useState('')
  const [phone, setPhone] = useState('')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const handleTrack = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await ordersAPI.track(orderId, phone)
      setOrder(response.data)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Order not found')
      setOrder(null)
    } finally {
      setLoading(false)
    }
  }
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'verified': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-display text-4xl font-bold text-center mb-8">Track Your Order</h1>
        
        <div className="card p-6 mb-8">
          <form onSubmit={handleTrack} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Order ID</label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                required
                placeholder="ORD-2026-0001"
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="Enter your phone number"
                className="input-field"
              />
            </div>
            
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Tracking...' : 'Track Order'}
            </button>
          </form>
        </div>
        
        {order && (
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-semibold">Order Details</h2>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                {order.status.toUpperCase()}
              </span>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-primary-600">Order ID</p>
                <p className="font-semibold">{order.order_id}</p>
              </div>
              
              <div>
                <p className="text-sm text-primary-600">Customer Name</p>
                <p className="font-semibold">{order.full_name}</p>
              </div>
              
              <div>
                <p className="text-sm text-primary-600">Delivery Method</p>
                <p className="font-semibold capitalize">{order.delivery_method}</p>
              </div>
              
              <div>
                <p className="text-sm text-primary-600">
                  {order.delivery_method === 'delivery' ? 'Delivery Date' : 'Pickup Date'}
                </p>
                <p className="font-semibold">{new Date(order.selected_date).toLocaleDateString()}</p>
              </div>
              
              <div>
                <p className="text-sm text-primary-600">Payment Method</p>
                <p className="font-semibold capitalize">{order.payment_method}</p>
              </div>
              
              <div>
                <p className="text-sm text-primary-600">Total Amount</p>
                <p className="font-semibold text-xl text-accent-500">{order.total_amount} ETB</p>
              </div>
              
              {order.admin_note && (
                <div className="bg-primary-50 rounded-lg p-4">
                  <p className="text-sm text-primary-600 mb-1">Admin Note</p>
                  <p className="text-primary-900">{order.admin_note}</p>
                </div>
              )}
              
              <div className="border-t pt-4">
                <p className="text-sm text-primary-600 mb-3">Order Items</p>
                <div className="space-y-2">
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.product.name} x{item.quantity}</span>
                      <span className="font-semibold">{(item.price * item.quantity).toFixed(2)} ETB</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
