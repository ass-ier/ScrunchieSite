import { Outlet, Link, useNavigate } from 'react-router-dom'
import useCartStore from '../store/cartStore'
import useAuthStore from '../store/authStore'

export default function Layout() {
  const navigate = useNavigate()
  const itemCount = useCartStore(state => state.getItemCount())
  const { isAuthenticated, user, logout } = useAuthStore()
  
  const handleLogout = () => {
    logout()
    navigate('/')
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <header className="bg-dark text-cream sticky top-0 z-50 shadow-lg border-b border-accent-400/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-accent-400 to-accent-500 rounded-full flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                  <span className="text-dark font-display font-bold text-xl">A</span>
                  <div className="absolute -top-1 -right-1">
                    <svg className="w-3 h-3 text-accent-300" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                </div>
              </div>
              <div>
                <span className="font-display text-3xl font-bold tracking-wider text-accent-400">AKEYA</span>
                <p className="text-xs text-accent-300/80 tracking-widest">Premium Scrunchies</p>
              </div>
            </Link>
            
            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-cream/80 hover:text-accent-400 transition-colors font-medium">Home</Link>
              <Link to="/products" className="text-cream/80 hover:text-accent-400 transition-colors font-medium">Shop</Link>
              {isAuthenticated && (
                <Link to="/my-orders" className="text-cream/80 hover:text-accent-400 transition-colors font-medium">My Orders</Link>
              )}
            </nav>
            
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-accent-300 hidden md:block">
                    {user?.first_name || user?.phone}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-cream/80 hover:text-accent-400 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="text-sm text-cream/80 hover:text-accent-400 transition-colors font-medium"
                >
                  Login
                </Link>
              )}
              
              <Link to="/cart" className="relative group">
                <svg className="w-6 h-6 text-cream group-hover:text-accent-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                {itemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-accent-400 text-dark text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {itemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      <main className="flex-grow">
        <Outlet />
      </main>
      
      <footer className="bg-dark text-cream py-12 mt-16 border-t border-accent-400/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="font-display text-2xl font-bold text-accent-400 mb-4">AKEYA</h3>
              <p className="text-cream/70 text-sm leading-relaxed">
                Premium handcrafted scrunchies for the modern woman. Elegant, comfortable, and stylish.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-accent-300 mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/products" className="text-cream/70 hover:text-accent-400 transition-colors">Shop</Link></li>
                <li><Link to="/my-orders" className="text-cream/70 hover:text-accent-400 transition-colors">My Orders</Link></li>
                {!isAuthenticated && (
                  <li><Link to="/register" className="text-cream/70 hover:text-accent-400 transition-colors">Register</Link></li>
                )}
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-accent-300 mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-cream/70">
                <li>Addis Ababa, Ethiopia</li>
                <li>Phone: +251 929 509 800</li>
                <li>Email: hello@akeya.et</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-accent-400/20 pt-8 text-center">
            <p className="text-cream/50 text-sm">© 2026 AKEYA. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
