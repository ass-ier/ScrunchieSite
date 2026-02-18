import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { productsAPI } from '../lib/api'

export default function Products() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    Promise.all([
      productsAPI.getAll({ category: selectedCategory }),
      productsAPI.getCategories()
    ]).then(([productsRes, categoriesRes]) => {
      setProducts(productsRes.data.results || productsRes.data)
      setCategories(categoriesRes.data)
      setLoading(false)
    })
  }, [selectedCategory])
  
  if (loading) {
    return <div className="container mx-auto px-4 py-16 text-center">Loading...</div>
  }
  
  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="font-display text-5xl font-bold text-center mb-12">Our Products</h1>
      
      {/* Category Filter */}
      <div className="flex flex-wrap justify-center gap-4 mb-12">
        <button
          onClick={() => setSelectedCategory('')}
          className={`px-6 py-2 rounded-full transition-all ${
            selectedCategory === '' 
              ? 'bg-primary-700 text-white' 
              : 'bg-white text-primary-700 hover:bg-primary-50'
          }`}
        >
          All
        </button>
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.slug)}
            className={`px-6 py-2 rounded-full transition-all ${
              selectedCategory === category.slug 
                ? 'bg-primary-700 text-white' 
                : 'bg-white text-primary-700 hover:bg-primary-50'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
      
      {/* Products Grid */}
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
              <p className="text-primary-600 mb-4 line-clamp-2">{product.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-accent-500">{product.price} ETB</span>
                {product.stock > 0 ? (
                  <span className="text-sm text-green-600">In Stock</span>
                ) : (
                  <span className="text-sm text-red-600">Out of Stock</span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
