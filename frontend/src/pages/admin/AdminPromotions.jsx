import { useEffect, useState } from 'react'
import { couponsAPI, apiError } from '../../lib/api'
import AdminLayout from '../../components/AdminLayout'
import toast from 'react-hot-toast'

const empty = () => ({ code: '', type: 'percentage', value: '', expiry_date: '', usage_limit: 100, min_purchase_amount: 0, active: true, is_public: true, announcement: '' })
const localDateTime = (value) => {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

export default function AdminPromotions() {
  const [coupons, setCoupons] = useState([])
  const [form, setForm] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const load = async () => {
    try { const { data } = await couponsAPI.getAll(); setCoupons(data) }
    catch (error) { setError(apiError(error, 'Unable to load promotions.')) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  const change = event => setForm(prev => ({ ...prev, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))
  const save = async event => {
    event.preventDefault()
    setBusy(true); setError('')
    try {
      const data = { ...form, code: form.code.trim().toUpperCase(), expiry_date: new Date(form.expiry_date).toISOString() }
      if (editingId) await couponsAPI.update(editingId, data)
      else await couponsAPI.create(data)
      setForm(null); await load(); toast.success('Promotion saved')
    } catch (error) { setError(apiError(error, 'Unable to save this promotion.')) }
    finally { setBusy(false) }
  }
  const toggle = async coupon => {
    setBusy(true); setError('')
    try { await couponsAPI.update(coupon.id, { active: !coupon.active }); await load() }
    catch (error) { setError(apiError(error, 'Unable to update promotion.')) }
    finally { setBusy(false) }
  }
  return <AdminLayout title="Promotions">
    <p className="text-primary-700 mb-6">Create discount codes and choose which offers appear in your shop. Expired or fully used promotions disappear automatically.</p>
    {error && <div role="alert" className="error-message mb-5">{error}<button className="underline ml-3" onClick={() => { setError(''); load() }}>Retry loading</button></div>}
    {form ? <form onSubmit={save} className="panel max-w-2xl space-y-5">
      <h2 className="text-2xl">{editingId ? 'Edit promotion' : 'New promotion'}</h2>
      <label className="field-label">Discount code<input name="code" required maxLength={50} pattern="[A-Za-z0-9_\-]+" value={form.code} onChange={change} className="input-field uppercase" /></label>
      <div className="grid sm:grid-cols-2 gap-4">
        <label className="field-label">Discount type<select name="type" value={form.type} onChange={change} className="input-field"><option value="percentage">Percentage off</option><option value="fixed">Fixed amount (ETB)</option></select></label>
        <label className="field-label">{form.type === 'percentage' ? 'Percentage' : 'Amount (ETB)'}<input name="value" type="number" min="0.01" max={form.type === 'percentage' ? 100 : 99999999.99} step="0.01" required value={form.value} onChange={change} className="input-field" /></label>
        <label className="field-label">Expires at (your local time)<input name="expiry_date" type="datetime-local" required value={form.expiry_date} onChange={change} className="input-field" /></label>
        <label className="field-label">Total redemptions allowed<input name="usage_limit" type="number" min="1" max="1000000" required value={form.usage_limit} onChange={change} className="input-field" /></label>
      </div>
      <label className="field-label">Minimum purchase (ETB)<input name="min_purchase_amount" type="number" min="0" max="99999999.99" step="0.01" required value={form.min_purchase_amount} onChange={change} className="input-field" /></label>
      <label className="field-label">Announcement text<input name="announcement" maxLength={200} placeholder="e.g. A little treat for your next order" value={form.announcement} onChange={change} className="input-field" /></label>
      <label className="flex items-center gap-3"><input name="is_public" type="checkbox" checked={form.is_public} onChange={change} />Show this promotion in the shop</label>
      <label className="flex items-center gap-3"><input name="active" type="checkbox" checked={form.active} onChange={change} />Allow customers to use this code</label>
      <div className="flex gap-3"><button disabled={busy} className="btn-primary">{busy ? 'Saving...' : 'Save promotion'}</button><button type="button" disabled={busy} onClick={() => setForm(null)} className="btn-secondary">Cancel</button></div>
    </form> : <>
      <button className="btn-primary mb-6" onClick={() => { setEditingId(null); setForm(empty()); setError('') }}>Create promotion</button>
      {loading ? <p role="status">Loading promotions...</p> : <div className="space-y-4">{coupons.map(coupon => <article key={coupon.id} className="panel flex flex-wrap items-start justify-between gap-5">
        <div><h2 className="text-2xl">{coupon.code}</h2><p>{coupon.type === 'percentage' ? `${coupon.value}% off` : `${coupon.value} ETB off`}</p><p className="text-sm text-primary-700 mt-2">{coupon.used_count} / {coupon.usage_limit} uses · {coupon.is_valid_status.message}</p><p className="text-sm">Expires {new Date(coupon.expiry_date).toLocaleString()}{coupon.is_public ? ' · Announced in shop' : ' · Private code'}</p></div>
        <div className="flex gap-3"><button disabled={busy} className="btn-secondary" onClick={() => { setEditingId(coupon.id); setForm({ ...coupon, expiry_date: localDateTime(coupon.expiry_date) }); setError('') }}>Edit</button><button disabled={busy} className="underline text-sm" onClick={() => toggle(coupon)}>{coupon.active ? 'Pause' : 'Activate'}</button></div>
      </article>)}{!coupons.length && <p className="panel">No promotions yet. Create a code to announce your first offer.</p>}</div>}
    </>}
  </AdminLayout>
}
