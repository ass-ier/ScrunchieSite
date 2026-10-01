import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { couponsAPI } from '../lib/api'

export default function StoreAnnouncements({ settings, settingsError }) {
  const announcement = settings?.announcement || ''
  const [promotions, setPromotions] = useState([])
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    couponsAPI.promotions().then(offers => {
      if (!active) return
      setPromotions(offers.data)
    }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [])
  if (error || settingsError) return <p role="status" className="text-center text-sm py-2 px-4 bg-primary-50">Store announcements could not be loaded. Refresh to check current offers.</p>
  if (!announcement && !promotions.length && !settings?.preview_mode) return null
  return <aside aria-label="Store announcements" className="bg-accent-100 text-primary-900 text-sm px-4 py-3 text-center space-y-2">
    {settings?.preview_mode && <p className="font-semibold">Owner preview · Browse the collection and checkout layout. Payments, uploads, sign-in and admin changes are disabled.</p>}
    {announcement && <p>{announcement}</p>}
    {promotions.map(promotion => <p key={promotion.code}>
      {promotion.announcement && `${promotion.announcement} — `}
      <strong>{Number(promotion.value)}{promotion.type === 'percentage' ? '%' : ' ETB'} off</strong>{' '}
      with code <strong className="select-all">{promotion.code}</strong>.
      {Number(promotion.min_purchase_amount) > 0 && ` Orders from ${promotion.min_purchase_amount} ETB.`}
      {' '}Ends {new Date(promotion.expiry_date).toLocaleDateString()}. <Link to="/products" className="underline underline-offset-2">Shop now</Link>
    </p>)}
  </aside>
}
