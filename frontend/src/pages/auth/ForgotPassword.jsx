import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authAPI } from '../../lib/api'
import toast from 'react-hot-toast'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1: phone, 2: otp + password
  const [loading, setLoading] = useState(false)
  const [phone, setPhone] = useState('')
  const [formData, setFormData] = useState({
    code: '',
    new_password: '',
    new_password_confirm: ''
  })
  
  const handleRequestOTP = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      await authAPI.requestOTP(phone, 'password_reset')
      toast.success('OTP sent to your phone')
      setStep(2)
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }
  
  const handleResetPassword = async (e) => {
    e.preventDefault()
    
    if (formData.new_password !== formData.new_password_confirm) {
      toast.error('Passwords do not match')
      return
    }
    
    setLoading(true)
    
    try {
      await authAPI.resetPassword({
        phone,
        code: formData.code,
        new_password: formData.new_password,
        new_password_confirm: formData.new_password_confirm
      })
      toast.success('Password reset successfully!')
      navigate('/login')
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to reset password')
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
          <h1 className="font-display text-3xl font-bold text-cream mb-2">Reset Password</h1>
          <p className="text-cream/70">
            {step === 1 ? 'Enter your phone number' : 'Enter OTP and new password'}
          </p>
        </div>
        
        <div className="bg-cream rounded-2xl shadow-2xl p-8">
          {step === 1 ? (
            <form onSubmit={handleRequestOTP} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-dark">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  placeholder="+251912345678 or 0912345678"
                  className="input-field"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-dark">OTP Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  required
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-dark">New Password</label>
                <input
                  type="password"
                  value={formData.new_password}
                  onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                  required
                  minLength={8}
                  className="input-field"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-dark">Confirm New Password</label>
                <input
                  type="password"
                  value={formData.new_password_confirm}
                  onChange={(e) => setFormData({ ...formData, new_password_confirm: e.target.value })}
                  required
                  className="input-field"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          )}
          
          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-accent-500 hover:text-accent-600">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
