import { Link } from 'react-router-dom'

export default function ProductCard({ product, index = 0, wishlistControl }) {
  return <article className="product-tile" data-reveal data-delay={Math.min(index % 4 * 60, 180)} style={{ '--product-color': product.color_hex || '#d9d6ca' }}>
    <Link to={`/products/${product.slug}`} className="product-tile-link">
      <div className="product-tile-art">
        <img src={product.image} alt={`${product.name} in ${product.color || 'its original color'}`} loading="lazy" width="700" height="700" />
        <span className="product-tile-action">Take a closer look <span aria-hidden="true">↗</span></span>
        {product.stock === 0 && <span className="product-sold-out">Sold out</span>}
      </div>
      <div className="product-tile-meta">
        <div><h3>{product.name}</h3><p><span className="tiny-swatch" style={{ background: product.color_hex || '#ded9cc' }} />{product.color || product.category?.name}</p></div>
        <p className="product-tile-price">{Number(product.price).toFixed(0)} <span>ETB</span></p>
      </div>
    </Link>
    {wishlistControl}
  </article>
}
