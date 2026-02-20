import { useState, useEffect } from 'react'
import { ordersAPI } from '../lib/api'
import toast from 'react-hot-toast'
import Breadcrumbs from '../components/Breadcrumbs'

export default function MyOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState(null)
  
  useEffect(() => {
    loadOrders()
  }, [])
  
  const loadOrders = async () => {
    try {
      const response = await ordersAPI.getMyOrders()
      setOrders(response.data)
    } catch (error) {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'verified': return 'bg-green-100 text-green-800 border-green-200'
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }
  
  if (loading) {
    return (
      <div>
        <Breadcrumbs />
        <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-500 mx-auto"></div>
        <p className="mt-4 text-primary-600">Loading your orders...</p>
      </div>
      </div>
    )
  }
  
  return (
    <div>
      <Breadcrumbs />
      <div className="container mx-auto px-4 py-12">
      <h1 className="font-display text-4xl font-bold text-center mb-12 text-dark">My Orders</h1>
      
      {orders.length === 0 ? (
        <div className="text-center py-16">
          <svg className="w-24 h-24 mx-auto text-primary-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <h2 className="font-display text-2xl font-semibold text-primary-700 mb-2">No Orders Yet</h2>
          <p className="text-primary-600 mb-6">Start shopping to see your orders here</p>
          <a href="/products" className="btn-primary inline-block">
            Browse Products
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => (
            <div key={order.id} className="card p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                <div>
                  <h3 className="font-display text-xl font-semibold text-dark mb-1">
                    Order {order.order_id}
                  </h3>
                  <p className="text-sm text-primary-600">
                    {new Date(order.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                
                <div className="mt-4 md:mt-0 flex items-center space-x-4">
                  <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="text-accent-500 hover:text-accent-600 font-medium text-sm"
                  >
                    View Details
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-primary-600">Delivery Method</p>
                  <p className="font-semibold text-dark capitalize">{order.delivery_method}</p>
                </div>
                <div>
                  <p className="text-primary-600">Date</p>
                  <p className="font-semibold text-dark">
                    {new Date(order.selected_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-primary-600">Total Amount</p>
                  <p className="font-semibold text-accent-600 text-lg">{order.total_amount} ETB</p>
                </div>
              </div>
              
              {order.admin_note && (
                <div className="mt-4 bg-accent-50 border border-accent-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-accent-800 mb-1">Admin Note:</p>
                  <p className="text-sm text-accent-700">{order.admin_note}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-cream rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold text-dark">Order Details</h2>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-primary-500 hover:text-primary-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-primary-600">Order ID</p>
                  <p className="font-semibold text-dark">{selectedOrder.order_id}</p>
                </div>
                <div>
                  <p className="text-primary-600">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-primary-600">Customer Name</p>
                  <p className="font-semibold text-dark">{selectedOrder.full_name}</p>
                </div>
                <div>
                  <p className="text-primary-600">Phone</p>
                  <p className="font-semibold text-dark">{selectedOrder.phone}</p>
                </div>
                <div>
                  <p className="text-primary-600">Delivery Method</p>
                  <p className="font-semibold text-dark capitalize">{selectedOrder.delivery_method}</p>
                </div>
                <div>
                  <p className="text-primary-600">Date</p>
                  <p className="font-semibold text-dark">
                    {new Date(selectedOrder.selected_date).toLocaleDateString()}
                  </p>
                </div>
                {selectedOrder.address && (
                  <div className="col-span-2">
                    <p className="text-primary-600">Address</p>
                    <p className="font-semibold text-dark">{selectedOrder.address}</p>
                  </div>
                )}
                <div>
                  <p className="text-primary-600">Payment Method</p>
                  <p className="font-semibold text-dark capitalize">{selectedOrder.payment_method}</p>
                </div>
                <div>
                  <p className="text-primary-600">Transaction Ref</p>
                  <p className="font-semibold text-dark">{selectedOrder.transaction_reference}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-primary-600 mb-3">Order Items</p>
                <div className="space-y-2">
                  {selectedOrder.items.map(item => (
                    <div key={item.id} className="flex justify-between bg-primary-50 p-3 rounded-lg">
                      <span className="text-dark">{item.product.name} x{item.quantity}</span>
                      <span className="font-semibold text-dark">{(item.price * item.quantity).toFixed(2)} ETB</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span className="text-dark">Total</span>
                    <span className="text-accent-600">{selectedOrder.total_amount} ETB</span>
                  </div>
                </div>
              </div>
              
              {selectedOrder.admin_note && (
                <div className="bg-accent-50 border border-accent-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-accent-800 mb-1">Admin Note:</p>
                  <p className="text-sm text-accent-700">{selectedOrder.admin_note}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
