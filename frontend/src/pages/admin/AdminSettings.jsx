import { useEffect, useState } from 'react'
import { productsAPI, apiError } from '../../lib/api'
import AdminLayout from '../../components/AdminLayout'
import toast from 'react-hot-toast'

export default function AdminSettings() {
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const load = () => productsAPI.getSettings().then(({ data }) => { setForm(data); setError('') })
    .catch(error => setError(apiError(error, 'Unable to load store settings.')))
  useEffect(() => { load() }, [])
  const change = event => setForm(prev => ({ ...prev, [event.target.name]: event.target.value }))
  const save = async event => {
    event.preventDefault(); setSaving(true); setError('')
    try { await productsAPI.saveSettings(form); toast.success('Store settings saved') }
    catch (error) { setError(apiError(error, 'Unable to save settings.')) }
    finally { setSaving(false) }
  }
  return <AdminLayout title="Store settings">
    <p className="text-primary-700 mb-6">Set the real transfer details before opening checkout. Empty payment methods will not be shown to customers.</p>
    {error && <div role="alert" className="error-message mb-5">{error}<button className="underline ml-3" onClick={load}>Reload settings</button></div>}
    {!form ? <p role="status">{error ? 'Settings could not be loaded.' : 'Loading settings...'}</p> : <form onSubmit={save} className="panel max-w-2xl space-y-5">
      <h2 className="text-2xl">Bank transfers</h2>
      <label className="field-label">Account holder name<input name="account_name" maxLength={200} value={form.account_name} onChange={change} className="input-field" /></label>
      {[['telebirr', 'Telebirr phone number'], ['cbe', 'CBE account number'], ['dashen', 'Dashen Bank account number']].map(([key, label]) => <label key={key} className="field-label">{label}<input name={key} maxLength={100} value={form[key]} onChange={change} className="input-field" /></label>)}
      <h2 className="text-2xl pt-4">Delivery &amp; announcements</h2>
      <label className="field-label">Delivery fee (ETB)<input name="delivery_fee" type="number" min="0" max="99999999.99" step="0.01" required value={form.delivery_fee} onChange={change} className="input-field" /></label>
      <label className="field-label">Pickup address (leave blank to disable pickup)<textarea name="pickup_address" maxLength={500} rows={2} value={form.pickup_address} onChange={change} className="input-field" /></label>
      <label className="field-label">Store announcement (optional)<textarea name="announcement" maxLength={300} rows={2} value={form.announcement} onChange={change} className="input-field" /></label>
      <p className="text-sm text-primary-700">The announcement appears above the storefront. Use Promotions for discount codes.</p>
      <h2 className="text-2xl pt-4">Social links</h2>
      <p className="text-sm text-primary-700">These icons appear beneath the AKEYA description in the footer. Add your full HTTPS profile or channel URLs. Leave a field empty to keep its icon unlinked.</p>
      {[
        ['instagram_url', 'Instagram', 'https://www.instagram.com/your-profile/'],
        ['tiktok_url', 'TikTok', 'https://www.tiktok.com/@your-profile'],
        ['telegram_url', 'Telegram', 'https://t.me/your-channel'],
      ].map(([key, label, placeholder]) => <label key={key} className="field-label">{label} URL<input type="url" name={key} maxLength={500} value={form[key] || ''} placeholder={placeholder} autoComplete="off" onChange={change} className="input-field" /></label>)}
      <button className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save store settings'}</button>
    </form>}
  </AdminLayout>
}
