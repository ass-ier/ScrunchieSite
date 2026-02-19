import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { productsAPI } from '../lib/api'

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  
  const sizes = ['S', 'M', 'L']
  
  useEffect(() => {
    Promise.all([
      productsAPI.getCategories()
    ]).then(([categoriesRes]) => {
      setCategories(categoriesRes.data)
    })
  }, [])
  
  useEffect(() => {
    setLoading(true)
    const params = {}
    if (selectedCategory) params.category = selectedCategory
    if (selectedSize) params.size = selectedSize
    if (searchQuery) params.search = searchQuery
    
    productsAPI.getAll(params).then(res => {
      setProducts(res.data.results || res.data)
      setLoading(false)
    })
  }, [selectedCategory, selectedSize, searchQuery])
  
  const handleSearch = (e) => {
    e.preventDefault()
  }
  
  if (loading) {
    return <div className="container mx-auto px-4 py-16 text-center">Loading...</div>
  }
  
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="font-display text-5xl font-bold text-center mb-12">Our Products</h1>
      
      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products by name, color..."
              className="w-full px-4 py-3 pr-12 rounded-lg border border-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary-600 hover:text-primary-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </form>
        
        {/* Filters */}
        <div className="flex flex-wrap justify-center gap-4">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-full transition-all ${
                selectedCategory === '' 
                  ? 'bg-primary-700 text-white' 
                  : 'bg-white text-primary-700 hover:bg-primary-50 border border-primary-200'
              }`}
            >
              All Categories
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.slug)}
                className={`px-4 py-2 rounded-full transition-all ${
                  selectedCategory === category.slug 
                    ? 'bg-primary-700 text-white' 
                    : 'bg-white text-primary-700 hover:bg-primary-50 border border-primary-200'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>
          
          {/* Size Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-primary-700">Size:</span>
            <button
              onClick={() => setSelectedSize('')}
              className={`px-3 py-1 rounded-full text-sm transition-all ${
                selectedSize === '' 
                  ? 'bg-primary-700 text-white' 
                  : 'bg-white text-primary-700 hover:bg-primary-50 border border-primary-200'
              }`}
            >
              All
            </button>
            {sizes.map(size => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`px-3 py-1 rounded-full text-sm transition-all ${
                  selectedSize === size 
                    ? 'bg-primary-700 text-white' 
                    : 'bg-white text-primary-700 hover:bg-primary-50 border border-primary-200'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Products Grid */}
      {products.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-xl text-primary-600">No products found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {products.map(product => (
            <Link key={product.id} to={`/products/${product.slug}`} className="card group">
              <div className="aspect-square overflow-hidden">
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
                  {product.stock > 0 ? (
                    <span className="text-sm text-green-600">In Stock</span>
                  ) : (
                    <span className="text-sm text-red-600">Out of Stock</span>
                  )}
                </div>
                {product.sizes && product.sizes.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {product.sizes.map(size => (
                      <span 
                        key={size.size}
                        className={`text-xs px-2 py-1 rounded ${
                          size.stock > 0 
                            ? 'bg-primary-100 text-primary-700' 
                            : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {size.size}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
