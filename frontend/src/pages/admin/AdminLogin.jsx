import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI, apiError } from '../../lib/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({ phone: '', password: '' })
  const [loading, setLoading] = useState(false)
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await authAPI.login(formData.phone, formData.password)
      if (!response.data.user.is_staff) {
        toast.error('This account does not have owner access.')
        return
      }
      useAuthStore.getState().setAuth(response.data.user, response.data.access)
      toast.success('Login successful!')
      navigate('/admin/dashboard')
    } catch (error) {
      toast.error(apiError(error, 'Unable to sign in. Check your phone number and password.'))
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 to-primary-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-bold text-white mb-2">Admin Login</h1>
          <p className="text-primary-200">AKEYA store management</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="admin-phone" className="block text-sm font-medium mb-2">Phone number</label>
              <input
                id="admin-phone"
                type="tel"
                autoComplete="username"
                placeholder="+251..."
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
                className="input-field"
              />
            </div>
            
            <div>
              <label htmlFor="admin-password" className="block text-sm font-medium mb-2">Password</label>
              <input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="input-field"
              />
            </div>
            
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
