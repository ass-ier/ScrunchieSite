import { useState, useEffect } from 'react'
import { productsAPI, apiError } from '../lib/api'
import useWishlistStore from '../store/wishlistStore'
import useAuthStore from '../store/authStore'
import toast from 'react-hot-toast'
import Breadcrumbs from '../components/Breadcrumbs'
import ProductCard from '../components/ProductCard'

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const { isAuthenticated } = useAuthStore()
  const { addToWishlist, removeFromWishlist, isInWishlist, getWishlistItemId, fetchWishlist } = useWishlistStore()
  useEffect(() => { if (isAuthenticated) fetchWishlist() }, [isAuthenticated, fetchWishlist])
  useEffect(() => {
    let active = true
    productsAPI.getCategories().then(({ data }) => { if (active) setCategories(data) })
      .catch(error => { if (active) setError(apiError(error, 'Categories could not be loaded. Please retry.')) })
    return () => { active = false }
  }, [retry])
  useEffect(() => {
    let active = true
    const timeout = setTimeout(() => {
      setLoading(true); setError('')
      productsAPI.getAll({ category: selectedCategory || undefined, size: selectedSize || undefined, search: searchQuery || undefined })
        .then(({ data }) => { if (active) setProducts(data.results || data) })
        .catch(error => { if (active) setError(apiError(error, 'The collection could not be loaded. Please retry.')) })
        .finally(() => { if (active) setLoading(false) })
    }, 200)
    return () => { active = false; clearTimeout(timeout) }
  }, [selectedCategory, selectedSize, searchQuery, retry])
  const toggleWishlist = async product => {
    const removing = isInWishlist(product.id)
    const success = removing ? await removeFromWishlist(getWishlistItemId(product.id)) : await addToWishlist(product)
    if (success) toast.success(removing ? 'Removed from wishlist' : 'Saved to your wishlist')
  }
  return <div>
    <Breadcrumbs />
    <div className="shop-collection">
      <div className="shop-collection-heading"><h1>Find your<br /><em>kind of lovely.</em></h1><p>A color for every mood.<br />A little loop for every day.</p></div>
      <div className="shop-filter-bar">
        <div className="filter-chips" role="group" aria-label="Filter by collection">
          <button aria-pressed={!selectedCategory} onClick={() => setSelectedCategory('')}>All scrunchies</button>
          {categories.map(category => <button key={category.id} aria-pressed={selectedCategory === category.slug} onClick={() => setSelectedCategory(category.slug)}>{category.name}</button>)}
        </div>
        <div className="shop-filter-inputs">
          <label><span className="sr-only">Search collection</span><input type="search" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Find a color or a favorite..." className="input-field" /></label>
          <label className="flex items-center gap-2 text-sm">Size<select value={selectedSize} onChange={event => setSelectedSize(event.target.value)} className="input-field"><option value="">All</option>{['S', 'M', 'L'].map(size => <option key={size}>{size}</option>)}</select></label>
        </div>
      </div>
      {error && <p className="error-message mb-6" role="alert">{error} <button className="underline" onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
      <p className="collection-count" role="status">{loading ? 'Finding your favorites...' : `${products.length} little things to love`}</p>
      <div className="editorial-product-grid" aria-busy={loading}>
        {products.map((product, index) => <ProductCard key={product.id} product={product} index={index} wishlistControl={isAuthenticated && <button type="button" className="tile-wishlist" aria-pressed={isInWishlist(product.id)} aria-label={`${isInWishlist(product.id) ? 'Remove' : 'Save'} ${product.name} ${product.color} ${isInWishlist(product.id) ? 'from' : 'to'} wishlist`} onClick={() => toggleWishlist(product)}><span aria-hidden="true">{isInWishlist(product.id) ? '♥' : '♡'}</span></button>} />)}
      </div>
      {!loading && !error && !products.length && <div className="py-16 text-center"><h2 className="text-3xl mb-3">No matches this time.</h2><p className="mb-5 text-primary-700">Try another color, size or collection.</p><button className="btn-primary" onClick={() => { setSelectedCategory(''); setSelectedSize(''); setSearchQuery('') }}>Show all scrunchies</button></div>}
    </div>
  </div>
}
