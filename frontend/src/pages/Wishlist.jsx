import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import useWishlistStore from '../store/wishlistStore'
import useCartStore from '../store/cartStore'
import toast from 'react-hot-toast'
import Breadcrumbs from '../components/Breadcrumbs'

export default function Wishlist() {
  const { items, loading, fetchWishlist, removeFromWishlist } = useWishlistStore()
  const addItem = useCartStore(state => state.addItem)
  
  useEffect(() => {
    fetchWishlist()
  }, [fetchWishlist])
  
  const handleRemove = async (itemId) => {
    const success = await removeFromWishlist(itemId)
    if (success) {
      toast.success('Removed from wishlist')
    } else {
      toast.error('Failed to remove from wishlist')
    }
  }
  
  const handleAddToCart = (product) => {
    addItem(product, 1)
    toast.success('Added to cart!')
  }
  
  if (loading) {
    return (
      <div>
        <Breadcrumbs />
        <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-pulse">Loading wishlist...</div>
      </div>
      </div>
    )
  }
  
  if (items.length === 0) {
    return (
      <div>
        <Breadcrumbs />
        <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-display text-4xl font-bold mb-4">My Wishlist</h1>
        <p className="text-primary-600 mb-8">Your wishlist is empty</p>
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
      <h1 className="font-display text-4xl font-bold mb-8">My Wishlist</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map(item => (
          <div key={item.id} className="card overflow-hidden group">
            <Link to={`/products/${item.product.slug}`} className="block">
              <div className="aspect-square overflow-hidden">
                <img 
                  src={item.product.image} 
                  alt={item.product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </Link>
            
            <div className="p-4">
              <Link to={`/products/${item.product.slug}`}>
                <h3 className="font-display text-lg font-semibold mb-2 hover:text-accent-500 transition-colors">
                  {item.product.name}
                </h3>
              </Link>
              
              <p className="text-accent-500 font-bold text-xl mb-4">
                {item.product.price} ETB
              </p>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleAddToCart(item.product)}
                  className="btn-primary flex-1 text-sm py-2"
                  disabled={!item.product.is_available}
                >
                  Add to Cart
                </button>
                
                <button
                  onClick={() => handleRemove(item.id)}
                  className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  title="Remove from wishlist"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    </div>
  )
}
