import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { authAPI } from '../../lib/api'
import useAuthStore from '../../store/authStore'
import toast from 'react-hot-toast'

export default function VerifyOTP() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setAuth } = useAuthStore()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutes
  
  const phone = location.state?.phone
  const purpose = location.state?.purpose || 'registration'
  
  useEffect(() => {
    if (!phone) {
      navigate('/register')
      return
    }
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    
    return () => clearInterval(timer)
  }, [phone, navigate])
  
  const handleChange = (index, value) => {
    if (value.length > 1) value = value[0]
    if (!/^\d*$/.test(value)) return
    
    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    
    // Auto-focus next input
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus()
    }
  }
  
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus()
    }
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    const otpCode = code.join('')
    
    if (otpCode.length !== 6) {
      toast.error('Please enter all 6 digits')
      return
    }
    
    setLoading(true)
    
    try {
      const response = await authAPI.verifyOTP(phone, otpCode)
      toast.success('Phone verified successfully!')
      setAuth(response.data.user, response.data.access)
      navigate('/')
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Invalid OTP. Please try again.'
      toast.error(errorMsg)
      setCode(['', '', '', '', '', ''])
      document.getElementById('otp-0')?.focus()
    } finally {
      setLoading(false)
    }
  }
  
  const handleResend = async () => {
    setResending(true)
    
    try {
      await authAPI.requestOTP(phone, purpose)
      toast.success('New OTP sent to your phone')
      setTimeLeft(300)
      setCode(['', '', '', '', '', ''])
      document.getElementById('otp-0')?.focus()
    } catch (error) {
      toast.error('Failed to resend OTP. Please try again.')
    } finally {
      setResending(false)
    }
  }
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
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
          <h1 className="font-display text-3xl font-bold text-cream mb-2">Verify Your Phone</h1>
          <p className="text-cream/70">
            Enter the 6-digit code sent to<br />
            <span className="text-accent-400 font-semibold">{phone}</span>
          </p>
        </div>
        
        <div className="bg-cream rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center space-x-3">
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-primary-300 rounded-lg focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all"
                  autoFocus={index === 0}
                />
              ))}
            </div>
            
            <div className="text-center">
              {timeLeft > 0 ? (
                <p className="text-sm text-primary-600">
                  Code expires in <span className="font-semibold text-accent-600">{formatTime(timeLeft)}</span>
                </p>
              ) : (
                <p className="text-sm text-red-600 font-semibold">Code expired</p>
              )}
            </div>
            
            <button
              type="submit"
              disabled={loading || code.join('').length !== 6}
              className="btn-primary w-full"
            >
              {loading ? 'Verifying...' : 'Verify Phone'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-primary-600 mb-2">Didn't receive the code?</p>
            <button
              onClick={handleResend}
              disabled={resending || timeLeft > 240}
              className="text-accent-500 hover:text-accent-600 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? 'Sending...' : 'Resend Code'}
            </button>
            {timeLeft > 240 && (
              <p className="text-xs text-primary-500 mt-1">
                Wait {formatTime(timeLeft - 240)} before resending
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
