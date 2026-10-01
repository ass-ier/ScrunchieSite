import { beforeEach, test } from 'node:test'
import assert from 'node:assert/strict'

const storage = new Map()
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: key => storage.delete(key),
}
const { default: useCartStore } = await import('./cartStore.js')
const product = { id: 1, name: 'Scrunchie', stock: 5, price: '125.50', sizes: [{ size: 'S', stock: 3 }, { size: 'M', stock: 2 }] }

beforeEach(() => useCartStore.getState().clearCart())

test('preserves separate size selections and correct totals', () => {
  const cart = useCartStore.getState()
  assert.equal(cart.addItem(product, 2, 'S'), true)
  assert.equal(cart.addItem(product, 1, 'M'), true)
  assert.equal(cart.getItemCount(), 3)
  assert.equal(cart.getTotal(), 376.5)
  assert.deepEqual(useCartStore.getState().items.map(item => item.selectedSize), ['S', 'M'])
})

test('repeated additions cannot exceed size stock', () => {
  const cart = useCartStore.getState()
  assert.equal(cart.addItem(product, 3, 'S'), true)
  assert.equal(cart.addItem(product, 1, 'S'), false)
  assert.equal(cart.getItemCount(), 3)
})

test('rejects invalid quantities and unknown sizes', () => {
  const cart = useCartStore.getState()
  for (const quantity of [0, -1, 1.5, NaN]) assert.equal(cart.addItem(product, quantity, 'S'), false)
  assert.equal(cart.addItem(product, 1, 'L'), false)
  assert.equal(cart.getItemCount(), 0)
})

test('quantity changes obey stock and zero removes the line', () => {
  const cart = useCartStore.getState()
  cart.addItem(product, 1, 'S')
  cart.updateQuantity('1-S', 10, 3)
  assert.equal(cart.getItemCount(), 3)
  cart.updateQuantity('1-S', 4, 0)
  assert.equal(cart.getItemCount(), 3)
  cart.updateQuantity('1-S', 0, 3)
  assert.equal(cart.getItemCount(), 0)
})
