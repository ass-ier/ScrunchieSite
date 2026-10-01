import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product, quantity = 1, size = null) => {
        const items = get().items
        const itemKey = size ? `${product.id}-${size}` : product.id
        const existingItem = items.find(item => item.cartItemKey === itemKey)
        const sizeStock = size ? product.sizes?.find(option => option.size === size)?.stock || 0 : product.stock
        const otherQuantity = items.filter(item => item.id === product.id && item.cartItemKey !== itemKey).reduce((total, item) => total + item.quantity, 0)
        const available = Math.min(sizeStock, product.stock - otherQuantity)
        if (!Number.isInteger(quantity) || quantity < 1 || (existingItem?.quantity || 0) + quantity > available) return false
        
        if (existingItem) {
          set({
            items: items.map(item =>
              item.cartItemKey === itemKey
                ? { ...item, quantity: item.quantity + quantity }
                : item
            )
          })
        } else {
          const newItem = { ...product, quantity, selectedSize: size, cartItemKey: itemKey }
          set({ items: [...items, newItem] })
        }
        return true
      },
      
      removeItem: (cartItemKey) => {
        set({ items: get().items.filter(item => item.cartItemKey !== cartItemKey) })
      },
      
      updateQuantity: (cartItemKey, quantity, maxStock) => {
        if (quantity <= 0) {
          get().removeItem(cartItemKey)
        } else {
          const finalQuantity = Number.isFinite(maxStock) ? Math.min(quantity, maxStock) : quantity
          if (finalQuantity <= 0) return
          set({
            items: get().items.map(item =>
              item.cartItemKey === cartItemKey ? { ...item, quantity: finalQuantity } : item
            )
          })
        }
      },
      
      clearCart: () => set({ items: [] }),
      
      getTotal: () => {
        return get().items.reduce((total, item) => {
          return total + (parseFloat(item.price) * item.quantity)
        }, 0)
      },
      
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0)
      },
    }),
    {
      name: 'cart-storage',
    }
  )
)

export default useCartStore
