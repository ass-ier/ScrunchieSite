import { NavLink, Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'

export default function AdminLayout({ title, children }) {
  const navigate = useNavigate()
  const logout = useAuthStore(state => state.logout)
  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-dark text-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-4">
          <Link to="/admin/dashboard" className="text-accent-300 font-display text-2xl font-bold">AKEYA <span className="font-sans text-sm text-cream ml-2">Store management</span></Link>
          <div className="flex items-center gap-5 text-sm">
            <Link to="/products" className="underline underline-offset-4">View shop</Link>
            <button onClick={() => { logout(); navigate('/admin/login') }}>Sign out</button>
          </div>
        </div>
        <nav aria-label="Store management" className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-wrap gap-x-6">
          {[['dashboard', 'Orders'], ['products', 'Products'], ['promotions', 'Promotions'], ['settings', 'Store settings']].map(([path, label]) => (
            <NavLink key={path} to={`/admin/${path}`} className={({ isActive }) => `py-3 border-b-2 text-sm font-medium ${isActive ? 'border-accent-300 text-accent-300' : 'border-transparent text-cream'}`}>{label}</NavLink>
          ))}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <h1 className="text-3xl sm:text-4xl mb-6">{title}</h1>
        {children}
      </main>
    </div>
  )
}
