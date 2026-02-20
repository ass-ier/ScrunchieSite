import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import useCartStore from '../store/cartStore'
import { productsAPI } from '../lib/api'
import Breadcrumbs from '../components/Breadcrumbs'

export default function Cart() {
  const navigate = useNavigate()
  const { items, updateQuantity, removeItem, getTotal } = useCartStore()
  const [products, setProducts] = useState({})
  
  // Fetch product details to get current stock
  useEffect(() => {
    const fetchProducts = async () => {
      const productMap = {}
      for (const item of items) {
        if (!productMap[item.slug]) {
          try {
            const res = await productsAPI.getBySlug(item.slug)
            productMap[item.slug] = res.data
          } catch (error) {
            console.error('Error fetching product:', error)
          }
        }
      }
      setProducts(productMap)
    }
    
    if (items.length > 0) {
      fetchProducts()
    }
  }, [items.length])
  
  const getMaxStock = (item) => {
    const product = products[item.slug]
    if (!product) return item.stock || 0
    
    if (item.selectedSize && product.sizes) {
      const sizeObj = product.sizes.find(s => s.size === item.selectedSize)
      return sizeObj ? sizeObj.stock : 0
    }
    return product.stock || 0
  }
  
  if (items.length === 0) {
    return (
      <div>
        <Breadcrumbs />
        <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-4xl font-bold mb-4">Your Cart is Empty</h1>
        <p className="text-primary-600 mb-8">Add some items to get started!</p>
        <Link to="/products" className="btn-primary inline-block">
          Browse Products
        </Link>
      </div>
      </div>
    )
  }
  
  return (
    <div>
      <Breadcrumbs />
      <div className="container mx-auto px-4 py-12">
      <h1 className="font-display text-4xl font-bold mb-8">Shopping Cart</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => {
            const maxStock = getMaxStock(item)
            return (
              <div key={item.cartItemKey} className="card flex items-center p-6">
                <img 
                  src={item.image} 
                  alt={item.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
                
                <div className="flex-grow ml-6">
                  <h3 className="font-display text-xl font-semibold">{item.name}</h3>
                  {item.selectedSize && (
                    <p className="text-sm text-primary-600">Size: {item.selectedSize}</p>
                  )}
                  <p className="text-accent-500 font-bold">{item.price} ETB</p>
                  {maxStock < item.quantity && (
                    <p className="text-sm text-red-600 mt-1">
                      Only {maxStock} available
                    </p>
                  )}
                </div>
                
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => updateQuantity(item.cartItemKey, item.quantity - 1, maxStock)}
                    className="w-8 h-8 rounded bg-primary-100 hover:bg-primary-200"
                  >
                    -
                  </button>
                  <span className="font-semibold w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.cartItemKey, item.quantity + 1, maxStock)}
                    disabled={item.quantity >= maxStock}
                    className={`w-8 h-8 rounded ${
                      item.quantity >= maxStock 
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                        : 'bg-primary-100 hover:bg-primary-200'
                    }`}
                  >
                    +
                  </button>
                </div>
                
                <button
                  onClick={() => removeItem(item.cartItemKey)}
                  className="ml-6 text-red-600 hover:text-red-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
        
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="font-display text-2xl font-bold mb-6">Order Summary</h2>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold">{getTotal().toFixed(2)} ETB</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total</span>
                  <span className="text-accent-500">{getTotal().toFixed(2)} ETB</span>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => navigate('/checkout')}
              className="btn-primary w-full"
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
  )
}
