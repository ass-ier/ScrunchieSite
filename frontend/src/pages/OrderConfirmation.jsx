import { useParams, Link, useLocation } from 'react-router-dom'
import Breadcrumbs from '../components/Breadcrumbs'

export default function OrderConfirmation() {
  const { orderId } = useParams()
  const { state } = useLocation()
  const token = sessionStorage.getItem(`order-${orderId}`)
  
  const breadcrumbItems = [
    { label: 'Home', path: '/' },
    { label: 'Order Confirmation', path: null }
  ]
  
  return (
    <div>
      <Breadcrumbs customItems={breadcrumbItems} />
      <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        <div className="order-celebration w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        
        <h1 className="font-display text-4xl font-bold mb-4">Order Placed Successfully!</h1>
        <p className="text-xl text-primary-600 mb-8">
          Your order has been received and is pending verification.
        </p>
        
        <div className="bg-accent-50 border border-accent-200 rounded-lg p-6 mb-8">
          <p className="text-sm text-primary-600 mb-2">Your Order ID</p>
          <p className="text-xl font-bold text-primary-900 break-all">{orderId}</p>
          {token && <div className="mt-5 text-left">
            <p className="text-sm mb-2">Save this private tracking code. Anyone with it can view your order status.</p>
            <p className="break-all font-semibold select-all">{token}</p>
          </div>}
          {state?.email && <p className="text-sm mt-4 break-all">Payment decisions will be sent to {state.email}.</p>}
          {state?.emailSent === false && <p role="status" className="text-sm mt-4">Your order was saved, but the confirmation email is delayed. Save your tracking code; the owner can retry the email.</p>}
        </div>
        
        <div className="bg-white rounded-lg p-6 mb-8 text-left">
          <h2 className="font-display text-xl font-semibold mb-4">What's Next?</h2>
          <ul className="space-y-3 text-primary-600">
            <li className="flex items-start">
              <span className="text-accent-500 mr-2">1.</span>
              Our team will verify your payment receipt
            </li>
            <li className="flex items-start">
              <span className="text-accent-500 mr-2">2.</span>
              You'll receive an email when your payment is authenticated or declined
            </li>
            <li className="flex items-start">
              <span className="text-accent-500 mr-2">3.</span>
              Your order will be prepared for delivery/pickup
            </li>
          </ul>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to={token ? `/track-order#token=${token}` : '/track-order'} className="btn-primary">
            Track Your Order
          </Link>
          <Link to="/products" className="btn-secondary">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
    </div>
  )
}
