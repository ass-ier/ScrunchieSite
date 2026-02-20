import { create } from 'zustand'
import { wishlistAPI } from '../lib/api'

const useWishlistStore = create((set, get) => ({
  items: [],
  loading: false,
  
  fetchWishlist: async () => {
    try {
      set({ loading: true })
      const response = await wishlistAPI.getAll()
      set({ items: response.data, loading: false })
    } catch (error) {
      console.error('Failed to fetch wishlist:', error)
      set({ loading: false })
    }
  },
  
  addToWishlist: async (product) => {
    try {
      const response = await wishlistAPI.add(product.id)
      set(state => ({ items: [...state.items, response.data] }))
      return true
    } catch (error) {
      console.error('Failed to add to wishlist:', error)
      return false
    }
  },
  
  removeFromWishlist: async (wishlistItemId) => {
    try {
      await wishlistAPI.remove(wishlistItemId)
      set(state => ({
        items: state.items.filter(item => item.id !== wishlistItemId)
      }))
      return true
    } catch (error) {
      console.error('Failed to remove from wishlist:', error)
      return false
    }
  },
  
  isInWishlist: (productId) => {
    return get().items.some(item => item.product.id === productId)
  },
  
  getWishlistItemId: (productId) => {
    const item = get().items.find(item => item.product.id === productId)
    return item?.id
  },
  
  clearWishlist: () => set({ items: [] }),
}))

export default useWishlistStore
