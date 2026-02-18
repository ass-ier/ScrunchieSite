import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { productsAPI } from '../lib/api'
import useCartStore from '../store/cartStore'
import toast from 'react-hot-toast'

export default function ProductDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const addItem = useCartStore(state => state.addItem)
  
  useEffect(() => {
    productsAPI.getBySlug(slug).then(res => {
      setProduct(res.data)
    })
  }, [slug])
  
  const handleAddToCart = () => {
    addItem(product, quantity)
    toast.success('Added to cart!')
  }
  
  const handleBuyNow = () => {
    addItem(product, quantity)
    navigate('/cart')
  }
  
  if (!product) {
    return <div className="container mx-auto px-4 py-16 text-center">Loading...</div>
  }
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="aspect-square rounded-2xl overflow-hidden">
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
        </div>
        
        <div className="flex flex-col justify-center">
          <h1 className="font-display text-4xl font-bold mb-4">{product.name}</h1>
          <p className="text-3xl font-bold text-accent-500 mb-6">{product.price} ETB</p>
          
          <p className="text-primary-600 text-lg mb-8 leading-relaxed">
            {product.description}
          </p>
          
          {product.stock > 0 ? (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Quantity</label>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-lg bg-primary-100 hover:bg-primary-200 flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="text-xl font-semibold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="w-10 h-10 rounded-lg bg-primary-100 hover:bg-primary-200 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                <p className="text-sm text-primary-500 mt-2">{product.stock} available</p>
              </div>
              
              <div className="flex space-x-4">
                <button onClick={handleAddToCart} className="btn-primary flex-1">
                  Add to Cart
                </button>
                <button onClick={handleBuyNow} className="btn-secondary flex-1">
                  Buy Now
                </button>
              </div>
            </>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              This product is currently out of stock
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
