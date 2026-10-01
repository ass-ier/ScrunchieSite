import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useCartStore from '../store/cartStore'
import useAuthStore from '../store/authStore'
import { ordersAPI, productsAPI, apiError } from '../lib/api'
import Breadcrumbs from '../components/Breadcrumbs'

const methodNames = { telebirr: 'Telebirr', cbe: 'Commercial Bank of Ethiopia', dashen: 'Dashen Bank' }
const money = (value) => `${Number(value).toFixed(2)} ETB`

export default function Checkout() {
  const navigate = useNavigate()
  const { items, clearCart } = useCartStore()
  const user = useAuthStore(state => state.user)
  const [store, setStore] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [quote, setQuote] = useState(null)
  const [receipt, setReceipt] = useState(null)
  const [preview, setPreview] = useState('')
  const [checkoutKey] = useState(() => crypto.randomUUID())
  const submitting = useRef(false)
  const [form, setForm] = useState({
    full_name: [user?.first_name, user?.last_name].filter(Boolean).join(' '),
    phone: user?.phone || '', email: user?.email || '', address: '',
    delivery_method: 'delivery', selected_date: '', delivery_notes: '',
    payment_method: '', transaction_reference: '', coupon_code: '',
  })
  const cartItems = items.map(item => ({ product_id: item.id, quantity: item.quantity, size: item.selectedSize || '' }))
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' })
  const change = (event) => setForm(prev => ({ ...prev, [event.target.name]: event.target.value }))

  useEffect(() => {
    let active = true
    productsAPI.getSettings().then(({ data }) => {
      if (!active) return
      setStore(data)
      setForm(prev => ({ ...prev, payment_method: Object.keys(methodNames).find(key => data[key]) || '' }))
    }).catch(error => { if (active) setError(apiError(error, 'Unable to load payment details. Refresh this page to retry.')) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!receipt) { setPreview(''); return }
    const url = URL.createObjectURL(receipt)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [receipt])

  const getQuote = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { data } = await ordersAPI.quote({ items: cartItems, coupon_code: form.coupon_code, delivery_method: form.delivery_method })
      setQuote(data)
    } catch (error) {
      setError(apiError(error, 'Unable to calculate your order. Try again.'))
    } finally { setBusy(false) }
  }

  const submitOrder = async (event) => {
    event.preventDefault()
    if (submitting.current) return
    if (!receipt) { setError('Please upload a screenshot of your transfer receipt.'); return }
    submitting.current = true
    setBusy(true)
    setError('')
    try {
      const { data } = await ordersAPI.create({
        ...form, items: cartItems, receipt_url: receipt,
        expected_total: quote.total_amount, checkout_key: checkoutKey,
      })
      sessionStorage.setItem(`order-${data.order_id}`, data.tracking_token)
      clearCart()
      navigate(`/order-confirmation/${data.order_id}`, { state: { email: form.email, emailSent: data.email_sent } })
    } catch (error) {
      setError(apiError(error, 'Your order could not be confirmed. Retry with the same transaction ID; do not transfer again.'))
    } finally { setBusy(false); submitting.current = false }
  }

  if (!items.length) return <div className="container mx-auto px-4 py-16"><h1 className="text-3xl mb-4">Your cart is empty</h1><Link to="/products" className="btn-primary inline-block">Browse scrunchies</Link></div>

  return (
    <div>
      <Breadcrumbs />
      <div className="max-w-6xl mx-auto px-4 py-10">
        <h1 className="text-4xl mb-3">Checkout</h1>
        <p className="text-primary-700 mb-8">No account needed. Transfer your payment, then send us the receipt for review.</p>
        <ol className="flex gap-5 text-sm mb-8" aria-label="Checkout progress">
          <li aria-current={!quote ? 'step' : undefined} className={!quote ? 'font-bold' : ''}>1. Your details</li>
          <li aria-current={quote ? 'step' : undefined} className={quote ? 'font-bold' : ''}>2. Transfer &amp; receipt</li>
        </ol>
        {error && <div role="alert" className="error-message mb-6">{error}</div>}
        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-10 items-start">
          <form onSubmit={quote ? submitOrder : getQuote} data-stage={quote ? 'payment' : 'details'} className="checkout-form space-y-7 min-w-0">
            {!quote ? (
              <>
                <section className="panel space-y-4">
                  <h2 className="text-2xl">Your details</h2>
                  <label className="field-label">Full name<input name="full_name" autoComplete="name" maxLength={200} required value={form.full_name} onChange={change} className="input-field" /></label>
                  <label className="field-label">Phone number<input name="phone" type="tel" autoComplete="tel" maxLength={20} placeholder="+251..." required value={form.phone} onChange={change} className="input-field" /></label>
                  <label className="field-label">Email address<input name="email" type="email" autoComplete="email" maxLength={254} required value={form.email} onChange={change} aria-describedby="email-purpose" className="input-field" /></label>
                  <p id="email-purpose" className="text-sm text-primary-700">We will use this email to send your order confirmation and let you know whether your payment has been authenticated or declined. It will not subscribe you to marketing emails.</p>
                </section>
                <section className="panel space-y-4">
                  <h2 className="text-2xl">Delivery or pickup</h2>
                  <label className="field-label">Receive your order<select name="delivery_method" value={form.delivery_method} onChange={change} className="input-field">
                    <option value="delivery">Delivery</option>
                    {store?.pickup_address && <option value="pickup">Pickup</option>}
                  </select></label>
                  {form.delivery_method === 'delivery'
                    ? <label className="field-label">Delivery address<textarea name="address" required maxLength={2000} value={form.address} onChange={change} autoComplete="street-address" rows={3} className="input-field" /></label>
                    : <p className="text-primary-700">Pickup location: {store?.pickup_address}</p>}
                  <label className="field-label">Requested {form.delivery_method} date<input name="selected_date" type="date" min={tomorrow} required value={form.selected_date} onChange={change} className="input-field" /></label>
                  <label className="field-label">Delivery notes (optional)<textarea name="delivery_notes" maxLength={2000} value={form.delivery_notes} onChange={change} rows={2} className="input-field" /></label>
                  <label className="field-label">Discount code (optional)<input name="coupon_code" maxLength={50} value={form.coupon_code} onChange={change} className="input-field uppercase" /></label>
                </section>
                <button disabled={busy || !store} className="btn-primary w-full">{busy ? 'Checking prices and availability...' : 'Review total & payment details'}</button>
              </>
            ) : (
              <>
                <section className="panel space-y-4">
                  <div className="flex justify-between gap-4"><h2 className="text-2xl">Transfer {money(quote.total_amount)}</h2><button type="button" disabled={busy} onClick={() => { setQuote(null); setError('') }} className="text-sm underline">Edit details</button></div>
                  <p className="text-sm text-primary-700">Send exactly this total. Use the account holder name below to double-check the recipient before transferring.</p>
                  <p className="text-sm text-primary-700">Stock is reserved when you submit the order, not while this page is open. Submit promptly after transferring. If availability changes, keep your receipt and contact the store; do not transfer again.</p>
                  <label className="field-label">Payment method<select name="payment_method" required value={form.payment_method} onChange={change} className="input-field">
                    {Object.entries(methodNames).filter(([key]) => store?.[key]).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
                  </select></label>
                  <dl className="bg-primary-50 rounded-lg p-5 space-y-2 break-words">
                    <dt className="text-sm">Account / phone number</dt><dd className="text-xl font-bold select-all">{store?.[form.payment_method]}</dd>
                    <dt className="text-sm">Account holder</dt><dd className="font-semibold">{store?.account_name}</dd>
                  </dl>
                  <label className="field-label">Transaction ID<input name="transaction_reference" required minLength={4} maxLength={200} pattern="[A-Za-z0-9][A-Za-z0-9_\/\-]{3,199}" value={form.transaction_reference} onChange={change} placeholder="Paste the ID from your transfer receipt" className="input-field" /></label>
                  <label className="field-label">Transfer receipt screenshot<input type="file" required accept="image/png,image/jpeg" className="input-field" onChange={event => {
                    const file = event.target.files?.[0]
                    setReceipt(null)
                    if (!file) return
                    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size > 5 * 1024 * 1024) {
                      event.target.value = ''
                      setError('Choose a JPEG or PNG screenshot no larger than 5 MB.')
                      return
                    }
                    setReceipt(file); setError('')
                  }} /></label>
                  <p className="text-sm text-primary-700">JPEG or PNG, up to 5 MB. Only the store owner can view your receipt. Hide unrelated balances or transactions before uploading.</p>
                  {preview && <img src={preview} alt="Your selected transfer receipt" className="max-h-72 max-w-full rounded object-contain" />}
                </section>
                <p className="text-sm text-primary-700">We will email <strong>{form.email}</strong> after review. Submitting a receipt does not mean the payment is approved.</p>
                <button type="submit" disabled={busy || !receipt} className="btn-primary w-full">{busy ? 'Submitting your order...' : 'Submit receipt & place order'}</button>
              </>
            )}
          </form>
          <aside className="panel lg:sticky lg:top-28">
            <h2 className="text-2xl mb-5">Your order</h2>
            <ul className="divide-y divide-primary-100">
              {(quote?.items || items).map((item, index) => <li key={item.cartItemKey || index} className="py-3 flex justify-between gap-4 text-sm">
                <span>{item.product_name || item.name}<span className="block text-primary-600">{[item.size || item.selectedSize, item.color].filter(Boolean).join(' / ')} · Qty {item.quantity}</span></span>
                <span className="whitespace-nowrap">{money(Number(item.price) * item.quantity)}</span>
              </li>)}
            </ul>
            {quote ? <dl className="border-t border-primary-200 pt-4 mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(quote.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Discount</dt><dd>-{money(quote.discount_amount)}</dd></div>
              <div className="flex justify-between"><dt>Delivery</dt><dd>{money(quote.delivery_fee)}</dd></div>
              <div className="flex justify-between text-xl font-bold"><dt>Total</dt><dd>{money(quote.total_amount)}</dd></div>
            </dl> : <p className="mt-5 text-sm text-primary-700">Current prices, stock, delivery costs and discounts will be checked before you transfer.</p>}
            <Link to="/cart" className="inline-block mt-5 underline text-sm">Return to cart</Link>
          </aside>
        </div>
      </div>
    </div>
  )
}
