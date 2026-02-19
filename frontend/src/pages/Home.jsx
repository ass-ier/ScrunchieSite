import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { productsAPI } from '../lib/api'
import useAuthStore from '../store/authStore'

export default function Home() {
  const [featuredProducts, setFeaturedProducts] = useState([])
  const { user } = useAuthStore()
  
  useEffect(() => {
    productsAPI.getFeatured().then(res => {
      setFeaturedProducts(res.data)
    })
  }, [])
  
  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[600px] bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 bg-accent-400 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent-300 rounded-full blur-3xl"></div>
        </div>
        
        <div className="container mx-auto px-4 h-full flex items-center relative z-10">
          <div className="max-w-2xl">
            {user && user.first_name && (
              <p className="text-2xl mb-4 text-accent-300">
                Hi, {user.first_name}! 👋
              </p>
            )}
            <h1 className="font-display text-6xl font-bold mb-6 leading-tight">
              Welcome to<br />
              <span className="text-accent-400">AKEYA</span>
            </h1>
            <p className="text-xl mb-8 text-primary-100">
              Premium handcrafted scrunchies. Elegant designs, luxurious fabrics, timeless style.
            </p>
            <Link to="/products" className="btn-secondary inline-block">
              Explore Our Collection
            </Link>
          </div>
        </div>
      </section>
      
      {/* Featured Products */}
      {featuredProducts.length > 0 && (
        <section className="py-16 bg-primary-50">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-4xl font-bold text-center mb-12">Featured Products</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProducts.map(product => (
                <Link key={product.id} to={`/products/${product.slug}`} className="card group">
                  <div className="aspect-square overflow-hidden relative">
                    <div className="absolute top-4 right-4 bg-accent-500 text-white px-3 py-1 rounded-full text-sm font-semibold z-10">
                      Featured
                    </div>
                    <img 
                      src={product.image} 
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-display text-xl font-semibold mb-2">{product.name}</h3>
                    {product.color && (
                      <p className="text-sm text-primary-500 mb-2">Color: {product.color}</p>
                    )}
                    <p className="text-primary-600 mb-4 line-clamp-2">{product.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold text-accent-500">{product.price} ETB</span>
                      <span className="text-primary-700 font-medium">View Details →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
      
      {/* Features */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-accent-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">Premium Quality</h3>
              <p className="text-primary-600">Luxurious fabrics and materials</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-accent-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">Handcrafted</h3>
              <p className="text-primary-600">Each piece carefully made</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-accent-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-primary-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">Easy Ordering</h3>
              <p className="text-primary-600">Delivery or pickup available</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
