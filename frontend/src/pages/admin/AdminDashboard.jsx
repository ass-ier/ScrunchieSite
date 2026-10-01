import { useEffect, useState } from 'react'
import { ordersAPI, apiError } from '../../lib/api'
import AdminLayout from '../../components/AdminLayout'
import toast from 'react-hot-toast'

const statusLabels = { pending: 'Awaiting review', verified: 'Authenticated', rejected: 'Declined' }
const statusColors = { pending: 'bg-yellow-50 text-yellow-900', verified: 'bg-green-50 text-green-900', rejected: 'bg-red-50 text-red-800' }

function OrderDetails({ order, onClose, onUpdate }) {
  const [receipt, setReceipt] = useState('')
  const [receiptError, setReceiptError] = useState('')
  const [logs, setLogs] = useState([])
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    let url
    setReceiptError('')
    ordersAPI.receipt(order.id).then(({ data }) => {
      if (!active) return
      url = URL.createObjectURL(data)
      setReceipt(url)
    }).catch(() => { if (active) setReceiptError('Receipt could not be loaded. Retry before authenticating this payment.') })
    ordersAPI.getAuditLogs(order.id).then(({ data }) => { if (active) setLogs(data) })
      .catch(error => { if (active) setError(apiError(error, 'Unable to load order history.')) })
    return () => { active = false; if (url) URL.revokeObjectURL(url) }
  }, [order.id, refresh])

  const act = async (action) => {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const { data } = await action()
      if (data.email_sent === false) toast.error('Payment saved, but the email failed. Use Retry email.')
      else toast.success('Order updated')
      await onUpdate()
      setRefresh(value => value + 1)
    } catch (error) { setError(apiError(error, 'Unable to update this order. Please retry.')) }
    finally { setBusy(false) }
  }

  return (
    <section className="panel mt-6" aria-label="Order review">
      <div className="flex justify-between gap-4 mb-5"><h2 className="text-2xl break-all">{order.order_id}</h2><button onClick={onClose} className="underline text-sm self-start">Close</button></div>
      {error && <div role="alert" className="error-message mb-4">{error}</div>}
      <div className="grid lg:grid-cols-2 gap-8">
        <div className="min-w-0 space-y-5">
          <div><h3 className="font-sans font-semibold mb-2">Customer</h3><p>{order.full_name}</p><p className="break-all">{order.email}</p><p>{order.phone}</p></div>
          <div><h3 className="font-sans font-semibold mb-2">Transfer to review</h3>
            <p className="text-2xl font-bold">{Number(order.total_amount).toFixed(2)} ETB</p>
            <p className="capitalize">{order.payment_method}</p>
            <p className="break-all mt-2">Transaction ID: <strong className="select-all">{order.transaction_reference}</strong></p>
            <p className="text-sm mt-2 text-primary-700">Match the transaction ID, recipient and amount against your own bank or Telebirr history. A screenshot alone is not proof of payment.</p>
          </div>
          <div><h3 className="font-sans font-semibold mb-2">Items</h3>
            <ul className="divide-y">{order.items.map(item => <li key={item.id} className="py-2 flex justify-between gap-3 text-sm"><span>{item.product_name || item.product.name}<span className="block text-primary-700">{[item.size, item.color].filter(Boolean).join(' / ')} · Qty {item.quantity}</span></span><span>{(item.quantity * item.price).toFixed(2)} ETB</span></li>)}</ul>
            <p className="text-sm text-primary-700 mt-2">Discount: {order.discount_amount} ETB · Delivery: {order.delivery_fee} ETB</p>
          </div>
          <div><h3 className="font-sans font-semibold mb-2">Delivery / pickup</h3><p className="capitalize">{order.delivery_method} · {order.selected_date}</p><p className="whitespace-pre-wrap">{order.address}</p><p>{order.delivery_notes}</p></div>
          {order.status === 'pending' ? <div className="border-t pt-5 space-y-4">
            <label className="field-label">Message to customer (required when declining)<textarea className="input-field" maxLength={2000} rows={3} value={note} onChange={event => setNote(event.target.value)} /></label>
            <p className="text-sm text-primary-700">This message and your decision will be emailed to {order.email}.</p>
            <div className="flex flex-wrap gap-3">
              <button disabled={busy || !receipt} onClick={() => {
                if (window.confirm('Have you confirmed this transfer in your own account? Authenticate payment and notify the customer?')) act(() => ordersAPI.verify(order.id, note))
              }} className="btn-primary">Authenticate payment</button>
              <button disabled={busy || !note.trim()} onClick={() => {
                if (window.confirm('Decline this payment, release the reserved stock and email the customer?')) act(() => ordersAPI.reject(order.id, note))
              }} className="btn-secondary">Decline payment</button>
            </div>
          </div> : <div className="border-t pt-5 space-y-3">
            <p className="font-semibold">{statusLabels[order.status]}</p>
            <p className="whitespace-pre-wrap">{order.admin_note}</p>
            {order.status === 'verified' && <div>
              <p className="capitalize mb-3">Fulfillment: {order.fulfillment_status}</p>
              {order.fulfillment_status !== 'completed' && <button disabled={busy} className="btn-primary" onClick={() => act(() => ordersAPI.fulfill(order.id, order.fulfillment_status === 'processing' ? 'ready' : 'completed'))}>{order.fulfillment_status === 'processing' ? 'Mark ready for delivery / pickup' : 'Mark delivered / collected'}</button>}
            </div>}
          </div>}
          <div className="border-t pt-5">
            <h3 className="font-sans font-semibold mb-2">Email notifications</h3>
            {order.email_status.map(email => <p key={email.kind} className="text-sm">{email.kind === 'received' ? 'Order received' : 'Payment decision'}: {email.status === 'sent' ? 'Accepted by email server' : email.status}</p>)}
            {order.email_status.some(email => email.status !== 'sent') && <button className="btn-secondary mt-3" disabled={busy} onClick={() => act(() => ordersAPI.retryEmail(order.id))}>Retry email</button>}
          </div>
        </div>
        <div className="min-w-0">
          <h3 className="font-sans font-semibold mb-3">Private receipt</h3>
          {receiptError ? <div role="alert" className="error-message">{receiptError}<button className="underline block mt-2" onClick={() => setRefresh(value => value + 1)}>Retry receipt</button></div>
            : receipt ? <><a href={receipt} target="_blank" rel="noreferrer" className="underline text-sm">Open full-size receipt</a><img src={receipt} alt={`Transfer receipt for ${order.order_id}`} className="mt-3 w-full max-h-[700px] object-contain border rounded-lg" /></>
              : <p role="status">Loading private receipt...</p>}
          <h3 className="font-sans font-semibold mt-8 mb-3">Activity</h3>
          {logs.length ? <ul className="text-sm space-y-3">{logs.map(log => <li key={log.id}><p className="font-medium">{log.action}</p><p className="text-primary-700">{new Date(log.timestamp).toLocaleString()}</p>{log.note && <p>{log.note}</p>}</li>)}</ul> : <p className="text-sm text-primary-700">No review actions yet.</p>}
        </div>
      </div>
    </section>
  )
}

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [orders, setOrders] = useState([])
  const [filter, setFilter] = useState('pending')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const load = async () => {
    setError('')
    try {
      const [statsRes, ordersRes] = await Promise.all([ordersAPI.getStats(), ordersAPI.getAll()])
      setStats(statsRes.data)
      setOrders(ordersRes.data)
    } catch (error) { setError(apiError(error, 'Unable to load orders. Please retry.')) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  const visible = orders.filter(order => (!filter || order.status === filter) && [order.order_id, order.full_name, order.email, order.transaction_reference].some(value => value?.toLowerCase().includes(search.toLowerCase())))
  const selected = orders.find(order => order.id === selectedId)

  return (
    <AdminLayout title="Orders">
      <p className="text-primary-700 mb-6">Review transfers first, then prepare authenticated orders for your customers.</p>
      {error && <div role="alert" className="error-message mb-5">{error}<button className="underline ml-3" onClick={load}>Retry</button></div>}
      {stats && <div className="flex flex-wrap gap-x-10 gap-y-3 mb-7 text-sm"><p><strong className="text-xl mr-2">{stats.pending_orders}</strong>awaiting review</p><p><strong className="text-xl mr-2">{stats.unsent_emails}</strong>unsent emails</p><p><strong className="text-xl mr-2">{Number(stats.revenue).toFixed(2)} ETB</strong>authenticated sales</p></div>}
      <div className="flex flex-col sm:flex-row gap-4 mb-5">
        <label className="field-label sm:w-64">Payment status<select className="input-field" value={filter} onChange={event => setFilter(event.target.value)}><option value="">All orders</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        <label className="field-label flex-1">Search orders<input className="input-field" placeholder="Name, email, order or transaction ID" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <button onClick={load} className="btn-secondary self-end">Refresh</button>
      </div>
      {loading ? <p role="status">Loading orders...</p> : <div className="bg-white border border-primary-200 rounded-xl overflow-x-auto">
        <div className="md:hidden divide-y divide-primary-100">
          {visible.map(order => <article key={order.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3"><h2 className="font-sans text-base font-semibold">{order.full_name}</h2><span className={`rounded px-2 py-1 text-xs ${statusColors[order.status]}`}>{statusLabels[order.status]}</span></div>
            <p className="text-sm break-all">{order.email}</p>
            <p className="text-xs break-all text-primary-700">{order.order_id}</p>
            {order.email_status.some(email => email.status !== 'sent') && <p className="text-sm text-red-800">Email needs attention</p>}
            <div className="flex items-center justify-between gap-3"><p className="font-semibold">{order.total_amount} ETB</p><button onClick={() => setSelectedId(order.id)} className="btn-secondary text-sm">Review order</button></div>
          </article>)}
        </div>
        <table className="hidden md:table w-full text-sm">
          <thead className="bg-primary-50 text-left"><tr>{['Customer', 'Order', 'Total', 'Payment', 'Action'].map(label => <th key={label} scope="col" className="px-5 py-4">{label}</th>)}</tr></thead>
          <tbody className="divide-y divide-primary-100">{visible.map(order => <tr key={order.id} className={order.id === selectedId ? 'bg-primary-50' : ''}>
            <td className="px-5 py-4"><p className="font-semibold">{order.full_name}</p><p className="text-primary-700 break-all">{order.email}</p></td>
            <td className="px-5 py-4"><p className="max-w-48 break-all">{order.order_id}</p><p className="text-primary-700">{new Date(order.created_at).toLocaleDateString()}</p></td>
            <td className="px-5 py-4 whitespace-nowrap">{order.total_amount} ETB</td>
            <td className="px-5 py-4"><span className={`inline-block rounded px-2 py-1 whitespace-nowrap ${statusColors[order.status]}`}>{statusLabels[order.status]}</span>{order.email_status.some(email => email.status !== 'sent') && <p className="text-red-800 mt-2">Email needs attention</p>}</td>
            <td className="px-5 py-4"><button onClick={() => setSelectedId(order.id)} className="underline font-semibold py-2">Review order</button></td>
          </tr>)}</tbody>
        </table>
        {!visible.length && <p className="p-8 text-primary-700">No orders match this view.</p>}
      </div>}
      {selected && <OrderDetails key={selected.id} order={selected} onUpdate={load} onClose={() => setSelectedId(null)} />}
    </AdminLayout>
  )
}
