import axios from 'axios'

// Use environment variable for API URL
const baseURL = import.meta.env.VITE_API_URL

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  register: (data) => api.post('/users/register/', data),
  verifyOTP: (phone, code) => api.post('/users/verify-otp/', { phone, code }),
  requestOTP: (phone, purpose) => api.post('/users/request-otp/', { phone, purpose }),
  login: (phone, password) => api.post('/users/login/', { phone, password }),
  resetPassword: (data) => api.post('/users/reset-password/', data),
  getCurrentUser: () => api.get('/users/me/'),
}

export const productsAPI = {
  getAll: (params) => api.get('/products/', { params }),
  getBySlug: (slug) => api.get(`/products/${slug}/`),
  getCategories: () => api.get('/products/categories/'),
  getFeatured: () => api.get('/products/featured/'),
  create: (data) => api.post('/products/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (slug, data) => api.put(`/products/${slug}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (slug) => api.delete(`/products/${slug}/`),
}

export const ordersAPI = {
  create: (data) => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      if (key === 'items') {
        formData.append(key, JSON.stringify(data[key]))
      } else if (key === 'receipt_url' && data[key] instanceof File) {
        formData.append(key, data[key])
      } else {
        formData.append(key, data[key])
      }
    })
    return api.post('/orders/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  getMyOrders: () => api.get('/orders/my_orders/'),
  getAll: (params) => api.get('/orders/', { params }),
  verify: (id, note) => api.post(`/orders/${id}/verify/`, { note }),
  reject: (id, note) => api.post(`/orders/${id}/reject/`, { note }),
  delete: (id) => api.delete(`/orders/${id}/`),
  getStats: () => api.get('/orders/stats/'),
  getAuditLogs: (id) => api.get(`/orders/${id}/audit_logs/`),
}

export const wishlistAPI = {
  getAll: () => api.get('/wishlist/'),
  add: (product_id) => api.post('/wishlist/', { product_id }),
  remove: (id) => api.delete(`/wishlist/${id}/`),
}

export const reviewsAPI = {
  getByProduct: (product_id) => api.get('/reviews/', { params: { product_id } }),
  create: (data) => api.post('/reviews/', data),
  getStats: (product_id) => api.get('/reviews/product_stats/', { params: { product_id } }),
}

export const couponsAPI = {
  validate: (code, amount) => api.post('/coupons/validate/', { code, amount }),
}

export default api
