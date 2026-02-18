import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../../lib/api'
import toast from 'react-hot-toast'

export default function Register() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    password: '',
    password_confirm: ''
  })
  
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.password !== formData.password_confirm) {
      toast.error('Passwords do not match')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await authAPI.register(formData)
      toast.success('Registration successful! Check your phone for OTP.')
      navigate('/verify-otp', { state: { phone: formData.phone, purpose: 'registration' } })
    } catch (error) {
      const errorMsg = error.response?.data?.phone?.[0] || 
                      error.response?.data?.message || 
                      'Registration failed. Please try again.'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark via-primary-800 to-dark flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <div className="w-12 h-12 bg-accent-400 rounded-full flex items-center justify-center">
              <span className="text-dark font-display font-bold text-xl">A</span>
            </div>
            <span className="font-display text-3xl font-bold text-accent-400">AKEYA</span>
          </Link>
          <h1 className="font-display text-3xl font-bold text-cream mb-2">Create Account</h1>
          <p className="text-cream/70">Join AKEYA and start shopping</p>
        </div>
        
        <div className="bg-cream rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-dark">First Name</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  required
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-dark">Last Name</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  required
                  className="input-field"
                />
              </div>
            </div>
            
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
              <p className="text-xs text-primary-600 mt-1">Ethiopian format (+251 or 09...)</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-dark">Email (Optional)</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
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
                minLength={8}
                className="input-field"
              />
              <p className="text-xs text-primary-600 mt-1">Minimum 8 characters</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-dark">Confirm Password</label>
              <input
                type="password"
                name="password_confirm"
                value={formData.password_confirm}
                onChange={handleChange}
                required
                className="input-field"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-primary-600">
              Already have an account?{' '}
              <Link to="/login" className="text-accent-500 hover:text-accent-600 font-medium">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
