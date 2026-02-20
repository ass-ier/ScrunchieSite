import { Link, useLocation } from 'react-router-dom'

export default function Breadcrumbs({ customItems }) {
  const location = useLocation()
  
  // If custom items are provided, use them
  if (customItems) {
    return (
      <nav className="container mx-auto px-4 py-4">
        <ol className="flex items-center space-x-2 text-sm">
          {customItems.map((item, index) => (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <svg className="w-4 h-4 mx-2 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              )}
              {item.path ? (
                <Link 
                  to={item.path} 
                  className="text-primary-600 hover:text-accent-500 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-primary-800 font-medium">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    )
  }
  
  // Auto-generate breadcrumbs from path
  const pathnames = location.pathname.split('/').filter(x => x)
  
  // Don't show breadcrumbs on home page
  if (pathnames.length === 0) {
    return null
  }
  
  const breadcrumbNameMap = {
    'products': 'Shop',
    'cart': 'Cart',
    'checkout': 'Checkout',
    'my-orders': 'My Orders',
    'wishlist': 'Wishlist',
    'order-confirmation': 'Order Confirmation',
    'admin': 'Admin',
    'dashboard': 'Dashboard',
    'login': 'Login',
    'register': 'Register',
    'verify-otp': 'Verify OTP',
    'forgot-password': 'Forgot Password',
  }
  
  return (
    <nav className="container mx-auto px-4 py-4">
      <ol className="flex items-center space-x-2 text-sm">
        <li>
          <Link to="/" className="text-primary-600 hover:text-accent-500 transition-colors">
            Home
          </Link>
        </li>
        
        {pathnames.map((name, index) => {
          const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`
          const isLast = index === pathnames.length - 1
          const displayName = breadcrumbNameMap[name] || name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
          
          return (
            <li key={name} className="flex items-center">
              <svg className="w-4 h-4 mx-2 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              {isLast ? (
                <span className="text-primary-800 font-medium">{displayName}</span>
              ) : (
                <Link 
                  to={routeTo} 
                  className="text-primary-600 hover:text-accent-500 transition-colors"
                >
                  {displayName}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
