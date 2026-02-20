import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { productsAPI, reviewsAPI } from '../lib/api'
import useCartStore from '../store/cartStore'
import useWishlistStore from '../store/wishlistStore'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'
import Breadcrumbs from '../components/Breadcrumbs'

export default function ProductDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [selectedSize, setSelectedSize] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [reviews, setReviews] = useState([])
  const [reviewStats, setReviewStats] = useState(null)
  
  const addItem = useCartStore(state => state.addItem)
  const { isAuthenticated } = useAuthStore()
  const { addToWishlist, removeFromWishlist, isInWishlist, getWishlistItemId, fetchWishlist } = useWishlistStore()
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlist()
    }
  }, [isAuthenticated, fetchWishlist])
  
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
      
      // Fetch reviews
      reviewsAPI.getByProduct(res.data.id).then(reviewRes => {
        setReviews(reviewRes.data)
      }).catch(err => console.error('Failed to fetch reviews:', err))
      
      // Fetch review stats
      reviewsAPI.getStats(res.data.id).then(statsRes => {
        setReviewStats(statsRes.data)
      }).catch(err => console.error('Failed to fetch review stats:', err))
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
  
  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      toast.error('Please login to add to wishlist')
      return
    }
    
    if (isInWishlist(product.id)) {
      const itemId = getWishlistItemId(product.id)
      const success = await removeFromWishlist(itemId)
      if (success) {
        toast.success('Removed from wishlist')
      }
    } else {
      const success = await addToWishlist(product)
      if (success) {
        toast.success('Added to wishlist')
      }
    }
  }
  
  const maxStock = getSelectedSizeStock()
  const hasStock = product?.sizes && product.sizes.length > 0 
    ? (selectedSize && isSizeAvailable(selectedSize))
    : (product?.stock > 0)
  
  // Get all images (gallery images + main image as fallback)
  const allImages = product?.images && product.images.length > 0 
    ? product.images.map(img => img.image)
    : product?.image 
      ? [product.image]
      : []
  
  const currentImage = allImages[selectedImageIndex] || product?.image
  
  if (!product) {
    return <div className="container mx-auto px-4 py-16 text-center">Loading...</div>
  }
  
  const breadcrumbItems = [
    { label: 'Home', path: '/' },
    { label: 'Shop', path: '/products' },
    { label: product.name, path: null }
  ]
  
  return (
    <div>
      <Breadcrumbs customItems={breadcrumbItems} />
      <div className="container mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image Gallery */}
        <div>
          {/* Main Image */}
          <div className="aspect-square rounded-2xl overflow-hidden mb-4 bg-gray-100">
            <img 
              src={currentImage} 
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Thumbnail Gallery */}
          {allImages.length > 1 && (
            <div className="grid grid-cols-5 gap-2">
              {allImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                    selectedImageIndex === index 
                      ? 'border-primary-700 ring-2 ring-primary-300' 
                      : 'border-gray-200 hover:border-primary-400'
                  }`}
                >
                  <img 
                    src={image} 
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
          
          {/* Navigation Arrows for Mobile */}
          {allImages.length > 1 && (
            <div className="flex justify-center gap-4 mt-4 md:hidden">
              <button
                onClick={() => setSelectedImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))}
                className="p-2 rounded-full bg-primary-100 hover:bg-primary-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="flex items-center text-sm text-primary-600">
                {selectedImageIndex + 1} / {allImages.length}
              </span>
              <button
                onClick={() => setSelectedImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))}
                className="p-2 rounded-full bg-primary-100 hover:bg-primary-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}
        </div>
        
        {/* Product Info */}
        <div className="flex flex-col justify-center">
          <div className="flex items-start justify-between mb-4">
            <h1 className="font-display text-4xl font-bold">{product.name}</h1>
            {isAuthenticated && (
              <button
                onClick={handleWishlistToggle}
                className="p-3 rounded-full bg-primary-50 hover:bg-primary-100 transition-colors"
                title={isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <svg 
                  className={`w-7 h-7 transition-colors ${
                    isInWishlist(product.id) 
                      ? 'fill-red-500 text-red-500' 
                      : 'fill-none text-primary-600'
                  }`}
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </button>
            )}
          </div>
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
      
      {/* Reviews Section */}
      {reviewStats && (
        <div className="mt-16">
          <div className="border-t pt-12">
            <h2 className="font-display text-3xl font-bold mb-6">Customer Reviews</h2>
            
            {/* Review Stats */}
            <div className="bg-primary-50 rounded-lg p-6 mb-8">
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-5xl font-bold text-accent-500">{reviewStats.average_rating?.toFixed(1) || 'N/A'}</div>
                  <div className="flex items-center justify-center mt-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <svg
                        key={star}
                        className={`w-5 h-5 ${star <= Math.round(reviewStats.average_rating) ? 'text-accent-500' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <div className="text-sm text-primary-600 mt-1">{reviewStats.total_reviews} reviews</div>
                </div>
                
                <div className="flex-1">
                  {[5, 4, 3, 2, 1].map(rating => {
                    const count = reviewStats.rating_distribution?.[rating] || 0
                    const percentage = reviewStats.total_reviews > 0 ? (count / reviewStats.total_reviews) * 100 : 0
                    return (
                      <div key={rating} className="flex items-center gap-2 mb-2">
                        <span className="text-sm w-12">{rating} star</span>
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-accent-500 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm w-12 text-right">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            
            {/* Review List */}
            {reviews.length > 0 ? (
              <div className="space-y-6">
                {reviews.map(review => (
                  <div key={review.id} className="border-b pb-6">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold">{review.user_name || 'Anonymous'}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map(star => (
                              <svg
                                key={star}
                                className={`w-4 h-4 ${star <= review.rating ? 'text-accent-500' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          {review.is_verified_purchase && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              Verified Purchase
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-primary-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <p className="text-primary-700">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-primary-600">
                No reviews yet. Be the first to review this product!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  )
}
