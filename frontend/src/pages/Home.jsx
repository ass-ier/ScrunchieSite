import { Link } from 'react-router-dom'
import { lazy, Suspense, useEffect, useState } from 'react'
import { productsAPI } from '../lib/api'
import ProductCard from '../components/ProductCard'
import WearRitual from '../components/WearRitual'

const ScrunchieStudio = lazy(() => import('../components/ScrunchieStudio'))
const moods = [{ color: 'Lilac', color_hex: '#b29aca' }, { color: 'Moss', color_hex: '#6a8360' }, { color: 'Butter', color_hex: '#dfc36f' }, { color: 'Rose', color_hex: '#d69caa' }]

export default function Home() {
  const [products, setProducts] = useState([])
  const [error, setError] = useState(false)
  const [selected, setSelected] = useState(0)
  useEffect(() => {
    let active = true
    productsAPI.getFeatured().then(({ data }) => { if (active) setProducts(data) })
      .catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [])
  const choices = products.filter(product => product.color_hex).slice(0, 4)
  const palette = choices.length ? choices : moods
  const mood = palette[selected % palette.length]
  return <div className="home-editorial">
    <section className="scrunchie-hero" data-no-reveal style={{ '--mood-color': mood.color_hex }}>
      <div className="hero-copy">
        <h1>A little twist.<br />A whole new<br /><em>mood.</em><svg className="hero-flourish" viewBox="0 0 120 70" aria-hidden="true"><path d="M5 53 Q47 9 102 29 Q122 40 100 50 Q72 61 57 43 Q44 17 77 5" /></svg></h1>
        <p>Your hair’s favorite finishing touch.<br />Meet scrunchies made to be worn, loved,<br className="hidden sm:block" /> and borrowed by your best friend.</p>
        <Link to="/products" className="shop-button">Find your favorite <span aria-hidden="true">↗</span></Link>
        <a href="#the-edit" className="hero-scroll">There’s more to fall for <span aria-hidden="true">↓</span></a>
      </div>
      <div className="hero-object">
        <span className="hero-object-word" aria-hidden="true">twist.</span>
        <Suspense fallback={<div className="studio"><img className="studio-poster" src="/catalog/demo-satin-lilac.webp" alt="Lilac scrunchie illustration" /></div>}>
          <ScrunchieStudio color={mood.color_hex} poster="/catalog/demo-satin-lilac.webp" />
        </Suspense>
        <div className="hero-color-picker">
          <div><span className="color-picker-label">Today feels like</span><p key={mood.color} className="mood-name">{mood.color}<span aria-hidden="true">.</span></p></div>
          <div className="swatch-group" role="group" aria-label="Preview a scrunchie color">
            {palette.map((color, index) => <button key={color.color} style={{ '--swatch': color.color_hex }} aria-label={`Preview ${color.color}`} aria-pressed={selected % palette.length === index} onClick={() => setSelected(index)} className="color-swatch" />)}
          </div>
        </div>
      </div>
    </section>
    <div className="brand-ribbon" aria-label="AKEYA scrunchies: a little everyday joy"><span>GOOD HAIR DAYS</span><span className="ribbon-flower" aria-hidden="true">✳</span><span>BETTER LITTLE DETAILS</span><span className="ribbon-flower" aria-hidden="true">✳</span><span>ALL YOURS, AKEYA</span></div>
    <section id="the-edit" className="collection-edit">
      <div className="collection-heading" data-reveal><h2>Meet your next<br /><em>can’t-leave-without.</em></h2><Link to="/products" className="text-link">Explore the whole collection <span aria-hidden="true">↗</span></Link></div>
      {error && <p role="alert" className="error-message">The collection could not be loaded. <Link to="/products" className="underline">Try the shop</Link>.</p>}
      <div className="editorial-product-grid">{products.slice(0, 4).map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div>
      {!error && !products.length && <p className="py-8 text-primary-700">A new edit is on its way. <Link className="underline" to="/products">Browse the shop</Link>.</p>}
    </section>
    <WearRitual />
    <section className="finishing-note" data-reveal>
      <div className="loop-line" aria-hidden="true"><svg viewBox="0 0 500 170"><path d="M0 125 C110 125 101 11 176 28 C237 42 182 173 122 136 C69 103 197 79 280 109 S398 75 500 89" /></svg></div>
      <h2>Small thing.<br /><em>Big main-character energy.</em></h2>
      <p>Pick a color. Make it yours. Repeat tomorrow.</p>
      <Link to="/products" className="shop-button">A little treat for you <span aria-hidden="true">↗</span></Link>
      <div className="order-promise"><span>No account needed</span><span>Transfer &amp; upload your receipt</span><span>We’ll email you after review</span></div>
    </section>
  </div>
}
