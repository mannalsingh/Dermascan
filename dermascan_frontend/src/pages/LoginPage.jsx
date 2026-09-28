import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import OtpInput from '../components/OtpInput'
import { Scan, Eye, EyeOff, Mail, Lock, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react'
import api, { authAPI } from '../api/axios'
import GoogleAuthButton from '../components/GoogleAuthButton'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export default function LoginPage() {
  const { googleLogin, verifyGoogleOtp, resendGoogleOtp, saveAuth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  // View state: 'credentials' | 'otp' | 'google_otp' | 'forgot' | 'reset'
  const [googleOtpData, setGoogleOtpData] = useState(location.state?.googleOtp || null)
  const [view, setView] = useState(location.state?.googleOtp ? 'google_otp' : 'credentials')
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Forgot password state
  const [resetEmail, setResetEmail] = useState('')
  const [resetOtp, setResetOtp] = useState(['', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPwd, setShowNewPwd] = useState(false)

  const handleChange = (e) => {
    setError('')
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  }

  const validateCredentials = () => {
    if (!form.email.trim()) return 'Email address is required'
    if (!validateEmail(form.email)) return 'Please enter a valid email address'
    if (!form.password) return 'Password is required'
    return null
  }

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault()
    const err = validateCredentials()
    if (err) { setError(err); return }

    try {
      setLoading(true)
      setError('')
      // Step 1 of 2FA: Verify credentials and dispatch 4-digit OTP to user email
      await authAPI.loginInitiate({
        email: form.email.trim(),
        password: form.password,
      })
      setView('otp')
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid email or password. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Called when OTP is successfully verified by OtpInput
  const handleOtpVerified = async (otpToken) => {
    try {
      setLoading(true)
      setError('')
      const res = await authAPI.loginComplete({
        email: form.email.trim(),
        otpToken,
      })
      const { token, user } = res.data
      saveAuth(token, user)
      navigate(from, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification session expired. Please sign in again.'
      setError(msg)
      setView('credentials')
    } finally {
      setLoading(false)
    }
  }

  // Google OAuth Response Handler
  const handleGoogleResponse = useCallback(async (response) => {
    try {
      setGoogleLoading(true)
      setError('')
      const res = await googleLogin(response.credential)
      if (res?.requireOtp) {
        setGoogleOtpData(res)
        setView('google_otp')
        return
      }
      navigate(from, { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message || 'Google sign-in was unable to complete. Please try again.'
      setError(msg)
    } finally {
      setGoogleLoading(false)
    }
  }, [googleLogin, navigate, from])


  // Forgot password - Step 1: Send OTP
  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    if (!resetEmail.trim() || !validateEmail(resetEmail)) {
      setError('Please enter a valid registered email address.')
      return
    }
    try {
      setLoading(true)
      setError('')
      const res = await authAPI.forgotPassword({ email: resetEmail.trim() })
      setSuccessMsg(res.data?.message || 'A 4-digit code has been sent to your email.')
      setView('reset')
    } catch (err) {
      setError(err.response?.data?.message || 'Could not send reset code. Please check your email.')
    } finally {
      setLoading(false)
    }
  }

  // Forgot password - Step 2: Reset Password
  const handleResetSubmit = async (e) => {
    e.preventDefault()
    const otpCode = resetOtp.join('')
    if (otpCode.length !== 4) {
      setError('Please enter the full 4-digit verification code.')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    try {
      setLoading(true)
      setError('')
      await authAPI.resetPassword({
        email: resetEmail.trim(),
        otp: otpCode,
        newPassword,
      })
      setSuccessMsg('Password reset successful! You can now sign in.')
      setView('credentials')
      setForm((p) => ({ ...p, email: resetEmail.trim() }))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please check your code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F9F9] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4 group">
            <div className="w-11 h-11 bg-[#0F8F87] group-hover:bg-[#0B766F] text-white rounded-2xl flex items-center justify-center shadow-xs transition-all duration-200">
              <Scan className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold text-[#102A43] tracking-tight">DermaScan AI</span>
          </Link>
          <h1 className="text-2xl font-bold text-[#102A43]">
            {view === 'credentials' && 'Welcome back'}
            {view === 'otp' && 'Security Verification'}
            {view === 'google_otp' && 'Two-Factor Authentication'}
            {view === 'forgot' && 'Reset your password'}
            {view === 'reset' && 'Create new password'}
          </h1>
          <p className="text-[#486581] text-sm mt-1">
            {view === 'credentials' && 'Sign in to access your skin screening portal'}
            {view === 'otp' && 'Please confirm your identity with the security code'}
            {view === 'google_otp' && 'Confirm your Google sign-in with the verification code'}
            {view === 'forgot' && 'Enter your email to receive a recovery code'}
            {view === 'reset' && 'Enter the 4-digit code and set your new password'}
          </p>
        </div>

        {/* Auth Card */}
        <div className="card p-8">

          {/* Alert Messages */}
          {error && (
            <div className="mb-5 p-3.5 bg-[#FDF0F0] border border-[#F1C4C4] rounded-xl text-sm text-[#B42318] font-medium animate-fade-in-scale">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 bg-[#EAF7F0] border border-[#B8DFC8] rounded-xl text-sm text-[#176B45] font-medium flex items-center gap-2 animate-fade-in-scale">
              <CheckCircle2 className="h-4 w-4 text-[#176B45] flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* VIEW 1: Standard Credentials Login */}
          {view === 'credentials' && (
            <div className="animate-fade-in-up">
              {/* Google Sign In Button */}
              <div className="mb-2">
                <GoogleAuthButton
                  className="w-full"
                  onOtpRequired={(data) => {
                    setError('')
                    setGoogleOtpData(data)
                    setView('google_otp')
                  }}
                />

                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-[#D9E5E3]" />
                  <span className="text-xs font-semibold text-[#829AB1] uppercase tracking-wider">or sign in with email</span>
                  <div className="flex-1 h-px bg-[#D9E5E3]" />
                </div>
              </div>

              {/* Email + Password Form */}
              <form onSubmit={handleCredentialsSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="email" className="label">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B8791]" />
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={form.email}
                      onChange={handleChange}
                      className="input-field pl-10"
                      placeholder="you@example.com"
                      maxLength={128}
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="label !mb-0">Password</label>
                    <button
                      type="button"
                      onClick={() => { setError(''); setSuccessMsg(''); setResetEmail(form.email); setView('forgot'); }}
                      className="text-xs font-semibold text-[#0F8F87] hover:text-[#0B766F] transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B8791]" />
                    <input
                      id="password"
                      name="password"
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={form.password}
                      onChange={handleChange}
                      className="input-field pl-10 pr-10"
                      placeholder="••••••••••••"
                      maxLength={128}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B8791] hover:text-[#243B53] transition-colors"
                      tabIndex={-1}
                      aria-label={showPwd ? 'Hide password' : 'Show password'}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 mt-2 flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  {loading ? <LoadingSpinner size="sm" /> : null}
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              <p className="text-center text-sm text-[#486581] mt-6">
                Don't have an account?{' '}
                <Link to="/register" className="text-[#0F8F87] hover:text-[#0B766F] font-semibold hover:underline">
                  Create one
                </Link>
              </p>
            </div>
          )}

          {/* VIEW 2: 2-Factor Authentication OTP */}
          {view === 'otp' && (
            <OtpInput
              email={form.email}
              type="login"
              onVerified={handleOtpVerified}
              onBack={() => { setError(''); setView('credentials'); }}
            />
          )}

          {/* VIEW 2B: Google Sign-In 2-Factor Authentication OTP Verification */}
          {view === 'google_otp' && googleOtpData && (
            <OtpInput
              email={googleOtpData.email}
              maskedEmail={googleOtpData.maskedEmail}
              type="google_login"
              title="Verify your email"
              message="We've sent a 4-digit verification code to your email."
              initialExpiry={googleOtpData.expiresIn || 300}
              initialCooldown={30}
              onVerifyCustom={async (code) => {
                await verifyGoogleOtp(googleOtpData.tempToken, code)
                navigate(from, { replace: true })
              }}
              onResendCustom={async () => {
                await resendGoogleOtp(googleOtpData.tempToken)
              }}
              onBack={() => {
                setError('')
                setGoogleOtpData(null)
                setView('credentials')
              }}
            />
          )}

          {/* VIEW 3: Forgot Password - Request Code */}
          {view === 'forgot' && (
            <div className="animate-fade-in-scale">
              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label htmlFor="resetEmail" className="label">Registered Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B8791]" />
                    <input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => { setError(''); setResetEmail(e.target.value); }}
                      className="input-field pl-10"
                      placeholder="you@example.com"
                      maxLength={128}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  {loading ? <LoadingSpinner size="sm" /> : <KeyRound className="h-4 w-4" />}
                  {loading ? 'Sending code…' : 'Send Reset Code'}
                </button>

                <button
                  type="button"
                  onClick={() => { setError(''); setView('credentials'); }}
                  className="w-full flex items-center justify-center gap-1.5 text-[#486581] hover:text-[#102A43] text-xs font-medium pt-2 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Sign In
                </button>
              </form>
            </div>
          )}

          {/* VIEW 4: Forgot Password - Enter Code & New Password */}
          {view === 'reset' && (
            <div className="animate-fade-in-scale">
              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="label">4-Digit Verification Code</label>
                  <div className="flex justify-center gap-3 my-2">
                    {resetOtp.map((digit, i) => (
                      <input
                        key={i}
                        id={`reset-otp-${i}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(-1)
                          const next = [...resetOtp]
                          next[i] = val
                          setResetOtp(next)
                          if (val && i < 3) {
                            document.getElementById(`reset-otp-${i + 1}`)?.focus()
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !resetOtp[i] && i > 0) {
                            document.getElementById(`reset-otp-${i - 1}`)?.focus()
                          }
                        }}
                        className="otp-input !w-12 !h-12 !text-xl"
                        placeholder="•"
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="label">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B8791]" />
                    <input
                      id="newPassword"
                      type={showNewPwd ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input-field pl-10 pr-10"
                      placeholder="Min. 8 characters"
                      maxLength={128}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd(!showNewPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B8791] hover:text-[#243B53]"
                      tabIndex={-1}
                    >
                      {showNewPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="label">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#6B8791]" />
                    <input
                      id="confirmPassword"
                      type={showNewPwd ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-field pl-10"
                      placeholder="Repeat new password"
                      maxLength={128}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  {loading ? <LoadingSpinner size="sm" /> : null}
                  {loading ? 'Resetting…' : 'Reset Password'}
                </button>

                <button
                  type="button"
                  onClick={() => { setError(''); setView('credentials'); }}
                  className="w-full flex items-center justify-center gap-1.5 text-[#486581] hover:text-[#102A43] text-xs font-medium pt-2 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Sign In
                </button>
              </form>
            </div>
          )}

        </div>

        <p className="text-center text-xs text-[#829AB1] mt-6">
          For preliminary screening purposes only — not a clinical medical diagnosis
        </p>
      </div>
    </div>
  )
}
