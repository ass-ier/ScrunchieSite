import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      
      addItem: (product, quantity = 1, size = null) => {
        const items = get().items
        const itemKey = size ? `${product.id}-${size}` : product.id
        const existingItem = items.find(item => 
          size ? (item.id === product.id && item.selectedSize === size) : item.id === product.id
        )
        
        if (existingItem) {
          set({
            items: items.map(item =>
              (size ? (item.id === product.id && item.selectedSize === size) : item.id === product.id)
                ? { ...item, quantity: item.quantity + quantity }
                : item
            )
          })
        } else {
          const newItem = { ...product, quantity, selectedSize: size, cartItemKey: itemKey }
          set({ items: [...items, newItem] })
        }
      },
      
      removeItem: (cartItemKey) => {
        set({ items: get().items.filter(item => item.cartItemKey !== cartItemKey) })
      },
      
      updateQuantity: (cartItemKey, quantity, maxStock) => {
        if (quantity <= 0) {
          get().removeItem(cartItemKey)
        } else {
          const finalQuantity = maxStock ? Math.min(quantity, maxStock) : quantity
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
