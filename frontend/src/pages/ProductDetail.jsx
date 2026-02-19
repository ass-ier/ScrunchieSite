import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { productsAPI } from '../lib/api'
import useCartStore from '../store/cartStore'
import toast from 'react-hot-toast'

export default function ProductDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const addItem = useCartStore(state => state.addItem)
  
  useEffect(() => {
    productsAPI.getBySlug(slug).then(res => {
      setProduct(res.data)
      // Auto-select first available size if sizes exist
      if (res.data.sizes && res.data.sizes.length > 0) {
        const firstAvailable = res.data.sizes.find(s => s.stock > 0)
        if (firstAvailable) {
          setSelectedSize(firstAvailable.size)
        }
      }
    })
  }, [slug])
  
  const getSelectedSizeStock = () => {
    if (!product || !product.sizes || !selectedSize) return product?.stock || 0
    const sizeObj = product.sizes.find(s => s.size === selectedSize)
    return sizeObj ? sizeObj.stock : 0
  }
  
  const isSizeAvailable = (size) => {
    const sizeObj = product.sizes.find(s => s.size === size)
    return sizeObj && sizeObj.stock > 0
  }
  
  const handleAddToCart = () => {
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast.error('Please select a size')
      return
    }
    addItem(product, quantity, selectedSize)
    toast.success('Added to cart!')
  }
  
  const handleBuyNow = () => {
    if (product.sizes && product.sizes.length > 0 && !selectedSize) {
      toast.error('Please select a size')
      return
    }
    addItem(product, quantity, selectedSize)
    navigate('/cart')
  }
  
  const maxStock = getSelectedSizeStock()
  const hasStock = product?.sizes && product.sizes.length > 0 
    ? (selectedSize && isSizeAvailable(selectedSize))
    : (product?.stock > 0)
  
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
          
          {product.color && (
            <div className="mb-4">
              <span className="text-sm font-medium text-primary-600">Color: </span>
              <span className="text-primary-800 font-semibold">{product.color}</span>
            </div>
          )}
          
          <p className="text-primary-600 text-lg mb-8 leading-relaxed">
            {product.description}
          </p>
          
          {/* Size Selection */}
          {product.sizes && product.sizes.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3">Select Size</label>
              <div className="flex space-x-3">
                {product.sizes.map(sizeObj => (
                  <button
                    key={sizeObj.size}
                    onClick={() => {
                      if (isSizeAvailable(sizeObj.size)) {
                        setSelectedSize(sizeObj.size)
                        setQuantity(1)
                      }
                    }}
                    disabled={!isSizeAvailable(sizeObj.size)}
                    className={`
                      px-6 py-3 rounded-lg font-semibold transition-all
                      ${selectedSize === sizeObj.size 
                        ? 'bg-primary-700 text-white' 
                        : isSizeAvailable(sizeObj.size)
                          ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    {sizeObj.size_display}
                    {!isSizeAvailable(sizeObj.size) && (
                      <span className="block text-xs mt-1">Out of Stock</span>
                    )}
                    {isSizeAvailable(sizeObj.size) && (
                      <span className="block text-xs mt-1">{sizeObj.stock} left</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {hasStock ? (
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
                    onClick={() => setQuantity(Math.min(maxStock, quantity + 1))}
                    className="w-10 h-10 rounded-lg bg-primary-100 hover:bg-primary-200 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                <p className="text-sm text-primary-500 mt-2">{maxStock} available</p>
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
              {product.sizes && product.sizes.length > 0 
                ? 'Please select an available size'
                : 'This product is currently out of stock'
              }
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
