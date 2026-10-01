import { useEffect, useState } from 'react'
import { productsAPI, apiError } from '../../lib/api'
import AdminLayout from '../../components/AdminLayout'
import toast from 'react-hot-toast'

const emptyProduct = () => ({
  name: '', description: '', price: '', category_id: '', stock: '0', color: '', color_hex: '#b4a0d2', style: '',
  is_available: true, is_featured: false, image: null, gallery: [], removed: [],
  sizes: ['S', 'M', 'L'].map(size => ({ size, enabled: false, stock: 0 })),
})

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editor, setEditor] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyProduct)
  const [saving, setSaving] = useState(false)
  const [categoryName, setCategoryName] = useState('')
  const [search, setSearch] = useState('')
  const [preview, setPreview] = useState('')
  const hasSizes = form.sizes.some(size => size.enabled)
  const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 45)

  const load = async () => {
    setError('')
    try {
      const [productRes, categoryRes] = await Promise.all([productsAPI.getAll(), productsAPI.getCategories()])
      setProducts(productRes.data)
      setCategories(categoryRes.data)
    } catch (error) { setError(apiError(error, 'Unable to load products. Please retry.')) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])
  useEffect(() => {
    if (!form.image) { setPreview(editing?.image || ''); return }
    const url = URL.createObjectURL(form.image)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [form.image, editing])

  const edit = (product) => {
    setEditing(product)
    setForm(product ? {
      ...emptyProduct(), ...product, category_id: product.category.id, image: null, gallery: [], removed: [],
      sizes: ['S', 'M', 'L'].map(size => ({ size, enabled: product.sizes.some(s => s.size === size), stock: product.sizes.find(s => s.size === size)?.stock || 0 })),
    } : emptyProduct())
    setError('')
    setEditor(true)
  }
  const change = (event) => setForm(prev => ({ ...prev, [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value }))

  const save = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    const data = new FormData()
    for (const key of ['name', 'description', 'price', 'category_id', 'color', 'color_hex', 'style', 'is_available', 'is_featured']) data.append(key, form[key])
    data.append('stock', hasSizes ? form.sizes.filter(s => s.enabled).reduce((total, size) => total + Number(size.stock), 0) : form.stock)
    data.append('sizes_data', JSON.stringify(form.sizes.filter(size => size.enabled).map(({ size, stock }) => ({ size, stock: Number(stock) }))))
    data.append('remove_image_ids', JSON.stringify(form.removed))
    data.append('slug', editing?.slug || `${slugify(form.name) || 'product'}-${crypto.randomUUID().slice(0, 4)}`)
    if (form.image) data.append('image', form.image)
    form.gallery.forEach(file => data.append('gallery_images', file))
    try {
      if (editing) await productsAPI.update(editing.slug, data)
      else await productsAPI.create(data)
      toast.success(editing ? 'Product updated' : 'Product added')
      setEditor(false)
      await load()
    } catch (error) { setError(apiError(error, 'Unable to save product. Check the fields and retry.')) }
    finally { setSaving(false) }
  }
  const addCategory = async () => {
    if (!categoryName.trim()) return
    setSaving(true)
    try {
      const { data } = await productsAPI.createCategory({ name: categoryName, slug: slugify(categoryName) || `category-${crypto.randomUUID().slice(0, 6)}` })
      setCategories(prev => [...prev, data])
      setForm(prev => ({ ...prev, category_id: data.id }))
      setCategoryName('')
      toast.success('Category added')
    } catch (error) { setError(apiError(error, 'Unable to add category.')) }
    finally { setSaving(false) }
  }
  const remove = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? Products used in orders must be hidden instead.`)) return
    try { await productsAPI.delete(product.slug); await load(); toast.success('Product deleted') }
    catch (error) { setError(apiError(error, 'Unable to delete this product.')) }
  }

  return (
    <AdminLayout title={editor ? (editing ? 'Edit product' : 'Add a product') : 'Products'}>
      {error && <div role="alert" className="error-message mb-5">{error}{!editor && <button className="underline ml-3" onClick={load}>Retry</button>}</div>}
      {editor ? <form onSubmit={save} className="max-w-4xl space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <section className="panel space-y-4">
            <h2 className="text-2xl">Product details</h2>
            <label className="field-label">Product name<input name="name" required maxLength={200} value={form.name} onChange={change} className="input-field" /></label>
            <label className="field-label">Description<textarea name="description" required value={form.description} onChange={change} rows={4} className="input-field" /></label>
            <label className="field-label">Price (ETB)<input name="price" type="number" min="0.01" max="99999999.99" step="0.01" required value={form.price} onChange={change} className="input-field" /></label>
            <label className="field-label">Color<input name="color" maxLength={50} value={form.color} onChange={change} placeholder="e.g. Sage green" className="input-field" /></label>
            <label className="field-label">Color swatch<input name="color_hex" type="color" value={form.color_hex || '#b4a0d2'} onChange={change} className="input-field h-14" /></label>
            <label className="field-label">Style group (optional)<input name="style" maxLength={50} value={form.style} onChange={change} placeholder="e.g. satin-cloud" className="input-field" /></label>
            <p className="text-sm text-primary-700">Give the same style group to different colors of one design. Shoppers can then switch between their actual photos, sizes and stock.</p>
            <p className="text-sm text-primary-700">Add each color as its own product so photos and stock stay accurate.</p>
            <label className="field-label">Category<select name="category_id" required value={form.category_id} onChange={change} className="input-field"><option value="">Choose a category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <div className="border-t pt-4">
              <label className="field-label">New category (optional)<input maxLength={100} value={categoryName} onChange={event => setCategoryName(event.target.value)} className="input-field" /></label>
              <button type="button" disabled={saving || !categoryName.trim()} onClick={addCategory} className="underline text-sm mt-3">Add category</button>
            </div>
          </section>
          <section className="panel space-y-4">
            <h2 className="text-2xl">Stock &amp; visibility</h2>
            <p className="text-sm text-primary-700">Stock is the quantity available for new orders. Pending orders already reserve their items.</p>
            <fieldset><legend className="text-sm font-semibold mb-3">Available sizes</legend>
              {form.sizes.map((size, index) => <div key={size.size} className="flex gap-4 items-center mb-3">
                <label className="flex gap-2 items-center w-24"><input type="checkbox" checked={size.enabled} onChange={event => setForm(prev => ({ ...prev, sizes: prev.sizes.map((s, i) => i === index ? { ...s, enabled: event.target.checked } : s) }))} />{size.size === 'S' ? 'Small' : size.size === 'M' ? 'Medium' : 'Large'}</label>
                <label className="flex-1"><span className="sr-only">Stock for size {size.size}</span><input type="number" min="0" max="1000000" required={size.enabled} disabled={!size.enabled} value={size.stock} onChange={event => setForm(prev => ({ ...prev, sizes: prev.sizes.map((s, i) => i === index ? { ...s, stock: event.target.value } : s) }))} className="input-field" /></label>
              </div>)}
            </fieldset>
            {hasSizes ? <p className="text-sm font-semibold">Total available: {form.sizes.filter(s => s.enabled).reduce((total, size) => total + Number(size.stock), 0)}</p>
              : <label className="field-label">Stock (one size)<input name="stock" type="number" min="0" max="1000000" required value={form.stock} onChange={change} className="input-field" /></label>}
            <label className="flex gap-3 items-start py-2"><input name="is_available" type="checkbox" checked={form.is_available} onChange={change} className="mt-1" /><span>Visible in the shop<span className="block text-sm text-primary-700">Uncheck to hide without deleting order history.</span></span></label>
            <label className="flex gap-3 items-start py-2"><input name="is_featured" type="checkbox" checked={form.is_featured} onChange={change} className="mt-1" /><span>Featured on the home page</span></label>
          </section>
        </div>
        <section className="panel space-y-4">
          <h2 className="text-2xl">Photography</h2>
          <label className="field-label">Main product image{editing && ' (leave empty to keep current image)'}<input type="file" accept="image/jpeg,image/png,image/webp" required={!editing} onChange={event => setForm(prev => ({ ...prev, image: event.target.files?.[0] || null }))} className="input-field" /></label>
          {preview && <img src={preview} alt="Product preview" className="h-40 w-40 object-cover rounded-lg" />}
          <label className="field-label">Additional gallery images (up to 8 per upload)<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={event => setForm(prev => ({ ...prev, gallery: Array.from(event.target.files || []) }))} className="input-field" /></label>
          <p className="text-sm text-primary-700">JPEG, PNG or WebP. Maximum 5 MB per image.</p>
          {editing?.images?.length > 0 && <div className="flex flex-wrap gap-4">{editing.images.map(image => <label key={image.id} className="text-sm"><img src={image.image} alt={image.alt_text || editing.name} className="h-24 w-24 object-cover mb-2 rounded" /><input type="checkbox" checked={form.removed.includes(image.id)} onChange={event => setForm(prev => ({ ...prev, removed: event.target.checked ? [...prev.removed, image.id] : prev.removed.filter(id => id !== image.id) }))} /> Remove image</label>)}</div>}
        </section>
        <div className="flex gap-3"><button disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save product'}</button><button type="button" disabled={saving} onClick={() => setEditor(false)} className="btn-secondary">Cancel</button></div>
      </form> : <>
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6"><label className="sm:w-80"><span className="sr-only">Search products</span><input className="input-field" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search products..." /></label><button onClick={() => edit(null)} className="btn-primary">Add product</button></div>
        {loading ? <p role="status">Loading products...</p> : <div className="bg-white border border-primary-200 rounded-xl divide-y">
          {products.filter(product => product.name.toLowerCase().includes(search.toLowerCase())).map(product => <article key={product.id} className="p-4 sm:p-5 flex flex-wrap items-center gap-4">
            <img src={product.image} alt={product.name} className="w-20 h-20 object-cover rounded-lg" />
            <div className="flex-1 min-w-40"><h2 className="text-xl">{product.name}</h2><p className="text-sm text-primary-700">{product.category.name} · {product.color || 'No color specified'}</p><p className="text-sm">{product.price} ETB · {product.stock} available{product.is_featured ? ' · Featured' : ''}{!product.is_available ? ' · Hidden' : ''}</p></div>
            <button className="btn-secondary" onClick={() => edit(product)}>Edit</button><button className="text-sm underline text-red-800 p-2" onClick={() => remove(product)}>Delete</button>
          </article>)}
          {!products.length && <p className="p-8 text-primary-700">Your shop is empty. Add a category and your first product to get started.</p>}
          {products.length > 0 && !products.some(product => product.name.toLowerCase().includes(search.toLowerCase())) && <p className="p-8">No products match your search.</p>}
        </div>}
      </>}
    </AdminLayout>
  )
}
