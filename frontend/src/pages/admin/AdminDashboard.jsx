import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ordersAPI } from '../../lib/api'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const [filters, setFilters] = useState({ status: '', payment_method: '', search: '' })
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [adminNote, setAdminNote] = useState('')
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadData()
  }, [filters])
  
  const loadData = async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        ordersAPI.getStats(),
        ordersAPI.getAll(filters)
      ])
      setStats(statsRes.data)
      setOrders(ordersRes.data.results || ordersRes.data)
      setLoading(false)
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('Session expired')
        navigate('/admin/login')
      }
    }
  }
  
  const handleVerify = async (orderId) => {
    try {
      await ordersAPI.verify(orderId, adminNote)
      toast.success('Order verified')
      setShowModal(false)
      setAdminNote('')
      loadData()
    } catch (error) {
      toast.error('Failed to verify order')
    }
  }
  
  const handleReject = async (orderId) => {
    try {
      await ordersAPI.reject(orderId, adminNote)
      toast.success('Order rejected')
      setShowModal(false)
      setAdminNote('')
      loadData()
    } catch (error) {
      toast.error('Failed to reject order')
    }
  }
  
  const handleDelete = async (orderId) => {
    if (!confirm('Are you sure you want to delete this order?')) return
    
    try {
      await ordersAPI.delete(orderId)
      toast.success('Order deleted')
      loadData()
    } catch (error) {
      toast.error('Failed to delete order')
    }
  }
  
  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/admin/login')
  }
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'verified': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }
  
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="bg-primary-700 text-white py-4 shadow-lg">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
          <button onClick={handleLogout} className="btn-secondary text-sm">
            Logout
          </button>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow">
            <p className="text-sm text-primary-600 mb-1">Total Orders</p>
            <p className="text-3xl font-bold">{stats.total_orders}</p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-6 shadow">
            <p className="text-sm text-yellow-700 mb-1">Pending</p>
            <p className="text-3xl font-bold text-yellow-800">{stats.pending_orders}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-6 shadow">
            <p className="text-sm text-green-700 mb-1">Verified</p>
            <p className="text-3xl font-bold text-green-800">{stats.verified_orders}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-6 shadow">
            <p className="text-sm text-red-700 mb-1">Rejected</p>
            <p className="text-3xl font-bold text-red-800">{stats.rejected_orders}</p>
          </div>
          <div className="bg-accent-50 rounded-lg p-6 shadow">
            <p className="text-sm text-accent-700 mb-1">Revenue</p>
            <p className="text-3xl font-bold text-accent-600">{stats.revenue} ETB</p>
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white rounded-lg p-6 shadow mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="input-field"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Payment Method</label>
              <select
                value={filters.payment_method}
                onChange={(e) => setFilters({ ...filters, payment_method: e.target.value })}
                className="input-field"
              >
                <option value="">All</option>
                <option value="telebirr">Telebirr</option>
                <option value="cbe">CBE</option>
                <option value="dashen">Dashen Bank</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Order ID, Name, Phone"
                className="input-field"
              />
            </div>
          </div>
        </div>
        
        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary-700 text-white">
                <tr>
                  <th className="px-4 py-3 text-left">Order ID</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Phone</th>
                  <th className="px-4 py-3 text-left">Method</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Payment</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.filter(order => 
                  order.order_id.toLowerCase().includes(filters.search.toLowerCase()) ||
                  order.full_name.toLowerCase().includes(filters.search.toLowerCase()) ||
                  order.phone.includes(filters.search)
                ).map(order => (
                  <tr key={order.id} className="hover:bg-primary-50">
                    <td className="px-4 py-3 font-mono text-sm">{order.order_id}</td>
                    <td className="px-4 py-3">{order.full_name}</td>
                    <td className="px-4 py-3">{order.phone}</td>
                    <td className="px-4 py-3 capitalize">{order.delivery_method}</td>
                    <td className="px-4 py-3">{new Date(order.selected_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 capitalize">{order.payment_method}</td>
                    <td className="px-4 py-3 font-semibold">{order.total_amount} ETB</td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedOrder(order)
                            setShowModal(true)
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm"
                        >
                          View
                        </button>
                        {order.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleVerify(order.id)}
                              className="text-green-600 hover:text-green-700 text-sm"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => handleReject(order.id)}
                              className="text-red-600 hover:text-red-700 text-sm"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(order.id)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Order Detail Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-2xl font-bold">Order Details</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-primary-600">Order ID</p>
                  <p className="font-semibold">{selectedOrder.order_id}</p>
                </div>
                <div>
                  <p className="text-sm text-primary-600">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-primary-600">Customer</p>
                  <p className="font-semibold">{selectedOrder.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-primary-600">Phone</p>
                  <p className="font-semibold">{selectedOrder.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-primary-600">Email</p>
                  <p className="font-semibold">{selectedOrder.email || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-primary-600">Delivery Method</p>
                  <p className="font-semibold capitalize">{selectedOrder.delivery_method}</p>
                </div>
                {selectedOrder.address && (
                  <div className="col-span-2">
                    <p className="text-sm text-primary-600">Address</p>
                    <p className="font-semibold">{selectedOrder.address}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-primary-600">Payment Method</p>
                  <p className="font-semibold capitalize">{selectedOrder.payment_method}</p>
                </div>
                <div>
                  <p className="text-sm text-primary-600">Transaction Ref</p>
                  <p className="font-semibold">{selectedOrder.transaction_reference}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-primary-600 mb-2">Payment Receipt</p>
                <img src={selectedOrder.receipt_url} alt="Receipt" className="max-w-full rounded-lg" />
              </div>
              
              <div>
                <p className="text-sm text-primary-600 mb-2">Order Items</p>
                <div className="space-y-2">
                  {selectedOrder.items.map(item => (
                    <div key={item.id} className="flex justify-between bg-primary-50 p-3 rounded">
                      <span>{item.product.name} x{item.quantity}</span>
                      <span className="font-semibold">{(item.price * item.quantity).toFixed(2)} ETB</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span className="text-accent-500">{selectedOrder.total_amount} ETB</span>
                  </div>
                </div>
              </div>
              
              {selectedOrder.status === 'pending' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Admin Note</label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={3}
                    className="input-field"
                    placeholder="Add a note (optional)"
                  />
                  
                  <div className="flex space-x-4 mt-4">
                    <button
                      onClick={() => handleVerify(selectedOrder.id)}
                      className="btn-primary flex-1"
                    >
                      Verify Order
                    </button>
                    <button
                      onClick={() => handleReject(selectedOrder.id)}
                      className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 flex-1"
                    >
                      Reject Order
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
