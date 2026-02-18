import { useState } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { authAPI } from '../../lib/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setAuth } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    phone: '',
    password: ''
  })
  
  const from = location.state?.from?.pathname || '/'
  
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const response = await authAPI.login(formData.phone, formData.password)
      toast.success('Login successful!')
      setAuth(response.data.user, response.data.access)
      navigate(from, { replace: true })
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Invalid credentials'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark via-primary-800 to-dark flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="w-12 h-12 bg-accent-400 rounded-full flex items-center justify-center">
              <span className="text-dark font-display font-bold text-xl">A</span>
            </div>
            <span className="font-display text-3xl font-bold text-accent-400">AKEYA</span>
          </Link>
          <h1 className="font-display text-3xl font-bold text-cream mb-2">Welcome Back</h1>
          <p className="text-cream/70">Login to your account</p>
        </div>
        
        <div className="bg-cream rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-dark">Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="+251912345678 or 0912345678"
                className="input-field"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-dark">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Link
                to="/forgot-password"
                className="text-sm text-accent-500 hover:text-accent-600"
              >
                Forgot password?
              </Link>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-primary-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-accent-500 hover:text-accent-600 font-medium">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
