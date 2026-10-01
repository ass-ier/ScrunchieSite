import { useEffect, useState } from 'react'
import { ordersAPI, apiError } from '../lib/api'

const labels = { pending: 'Awaiting payment review', verified: 'Payment authenticated', rejected: 'Payment declined' }

export default function OrderTracking() {
  const [token, setToken] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('token') || '')
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const track = async (value) => {
    setLoading(true); setError('')
    try { const { data } = await ordersAPI.track(value.trim()); setOrder(data) }
    catch (error) { setOrder(null); setError(apiError(error, 'Order not found. Use the private tracking code from your confirmation.')) }
    finally { setLoading(false) }
  }
  useEffect(() => {
    const value = new URLSearchParams(window.location.hash.slice(1)).get('token')
    if (value) track(value)
  }, [])
  return <div className="max-w-3xl mx-auto px-4 py-12">
    <h1 className="text-4xl mb-4">Track your order</h1>
    <p className="text-primary-700 mb-7">Use the private tracking code from your confirmation page or the link in your order email. No account is needed.</p>
    <form onSubmit={event => { event.preventDefault(); track(token) }} className="panel space-y-4">
      <label className="field-label">Private tracking code<input required value={token} onChange={event => setToken(event.target.value)} className="input-field" autoComplete="off" spellCheck={false} /></label>
      <button disabled={loading} className="btn-primary">{loading ? 'Checking order...' : 'Check order status'}</button>
    </form>
    {error && <p role="alert" className="error-message mt-5">{error}</p>}
    {order && <section className="panel mt-7 space-y-5" aria-live="polite">
      <h2 className="text-2xl">{labels[order.status]}</h2>
      <p className="text-sm break-all">{order.order_id}</p>
      <p>{order.status === 'pending' ? 'Your receipt is with the owner for review. We will email you after a decision.' : order.status === 'verified' ? 'Your transfer has been authenticated. Thank you for shopping with AKEYA.' : 'Your payment could not be authenticated. Please read the message from the store below.'}</p>
      {order.admin_note && <div className="bg-primary-50 p-4 rounded-lg"><h3 className="font-sans font-semibold mb-2">Message from the store</h3><p className="whitespace-pre-wrap">{order.admin_note}</p></div>}
      <dl className="grid sm:grid-cols-2 gap-4 text-sm">
        <div><dt className="text-primary-700">Customer</dt><dd>{order.full_name}</dd></div>
        <div><dt className="text-primary-700">Requested date</dt><dd>{order.selected_date} · {order.delivery_method}</dd></div>
        {order.status === 'verified' && <div><dt className="text-primary-700">Fulfillment</dt><dd className="capitalize">{order.fulfillment_status}</dd></div>}
        <div><dt className="text-primary-700">Total</dt><dd className="text-xl font-semibold">{order.total_amount} ETB</dd></div>
      </dl>
      <ul className="divide-y">{order.items.map(item => <li key={item.id} className="py-3 flex justify-between gap-4 text-sm"><span>{item.product_name || item.product.name}<span className="block text-primary-700">{[item.size, item.color].filter(Boolean).join(' / ')} · Qty {item.quantity}</span></span><span>{(item.price * item.quantity).toFixed(2)} ETB</span></li>)}</ul>
    </section>}
  </div>
}
