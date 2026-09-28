import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import OtpInput from '../components/OtpInput'
import { Scan, Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import api from '../api/axios'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getStrength(pwd) {
  if (!pwd) return null
  const hasUpper = /[A-Z]/.test(pwd)
  const hasLower = /[a-z]/.test(pwd)
  const hasNum = /\d/.test(pwd)
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd)
  const score = [hasUpper, hasLower, hasNum, hasSpecial].filter(Boolean).length

  if (pwd.length < 6) return { label: 'Very Weak', color: 'bg-red-500', textColor: 'text-red-600', w: 'w-1/5' }
  if (pwd.length < 8) return { label: 'Weak', color: 'bg-orange-400', textColor: 'text-orange-600', w: 'w-2/5' }
  if (score <= 2) return { label: 'Fair', color: 'bg-yellow-400', textColor: 'text-yellow-600', w: 'w-3/5' }
  if (score === 3) return { label: 'Good', color: 'bg-teal-400', textColor: 'text-teal-600', w: 'w-4/5' }
  return { label: 'Strong', color: 'bg-green-500', textColor: 'text-green-600', w: 'w-full' }
}

export default function RegisterPage() {
  const { googleLogin, saveAuth } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setError('')
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  }

  const validate = () => {
    if (!form.name.trim() || form.name.trim().length < 2) return 'Full name must be at least 2 characters'
    if (!form.email.trim()) return 'Email address is required'
    if (!validateEmail(form.email)) return 'Enter a valid email address'
    if (form.password.length < 8) return 'Password must be at least 8 characters'
    if (form.password !== form.confirm) return 'Passwords do not match'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }
    try {
      setLoading(true)
      setError('')
      await api.post('/api/auth/send-otp', { email: form.email.trim(), type: 'register' })
      setStep(2)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to send verification code. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleOtpVerified = async (otpToken) => {
    try {
      setLoading(true)
      setError('')
      const res = await api.post('/api/auth/register', {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        otpToken,
      })
      const { token, user } = res.data
      saveAuth(token, user)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.'
      setError(msg)
      setStep(2)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleResponse = useCallback(async (response) => {
    try {
      setGoogleLoading(true)
      setError('')
      await googleLogin(response.credential)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message || 'Google sign-up failed. Please try again.'
      setError(msg)
    } finally {
      setGoogleLoading(false)
    }
  }, [googleLogin, navigate])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || step !== 1) return
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      })
      window.google?.accounts.id.renderButton(
        document.getElementById('google-signup-btn'),
        { theme: 'outline', size: 'large', width: '100%', text: 'signup_with', logo_alignment: 'center' }
      )
    }
    document.body.appendChild(script)
    return () => {
      if (document.body.contains(script)) document.body.removeChild(script)
    }
  }, [handleGoogleResponse, step])

  const strength = getStrength(form.password)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in-up">
          <Link to="/" className="inline-flex items-center gap-3 mb-5">
            <div className="w-12 h-12 bg-teal-500 rounded-2xl flex items-center justify-center shadow-lg shadow-teal-500/30">
              <Scan className="h-7 w-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">DermaScan <span className="text-teal-400">AI</span></span>
          </Link>
          {step === 1 && (
            <>
              <h1 className="text-3xl font-bold text-white mb-1">Create your account</h1>
              <p className="text-teal-300">Start your free skin screening today</p>
            </>
          )}
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl shadow-black/30 p-8 animate-fade-in-scale">

          {step === 1 ? (
            <>
              {error && (
                <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
                  <span className="mt-0.5">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Google Sign-Up */}
              {GOOGLE_CLIENT_ID && (
                <>
                  <div className="mb-4">
                    {googleLoading ? (
                      <div className="flex items-center justify-center gap-2 w-full border border-gray-300 rounded-xl py-2.5 text-sm text-gray-600">
                        <LoadingSpinner size="sm" />
                        <span>Signing up with Google…</span>
                      </div>
                    ) : (
                      <div id="google-signup-btn" className="w-full flex justify-center" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 whitespace-nowrap">or register with email</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                </>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Full Name */}
                <div>
                  <label htmlFor="name" className="label">Full name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="name" name="name" type="text" autoComplete="name"
                      value={form.name} onChange={handleChange}
                      className="input-field pl-10" placeholder="Your full name" required
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="label">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="email" name="email" type="email" autoComplete="email"
                      value={form.email} onChange={handleChange}
                      className="input-field pl-10" placeholder="you@example.com" required
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="label">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="password" name="password"
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={form.password} onChange={handleChange}
                      className="input-field pl-10 pr-10" placeholder="Min. 8 characters" required
                    />
                    <button
                      type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      tabIndex={-1}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  {strength && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ${strength.color} ${strength.w}`} />
                      </div>
                      <p className={`text-xs mt-1 font-medium ${strength.textColor}`}>{strength.label}</p>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirm" className="label">Confirm password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      id="confirm" name="confirm"
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={form.confirm} onChange={handleChange}
                      className="input-field pl-10" placeholder="Repeat password" required
                    />
                  </div>
                  {form.confirm && form.password !== form.confirm && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>

                <button
                  type="submit" disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-2 rounded-xl py-3 text-base"
                >
                  {loading ? <LoadingSpinner size="sm" /> : null}
                  {loading ? 'Sending verification code…' : 'Send Verification Code'}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-teal-600 hover:text-teal-700 font-semibold">
                  Sign in
                </Link>
              </p>
            </>
          ) : (
            /* Step 2 — OTP */
            <div className="rounded-xl bg-gradient-to-br from-slate-800 to-teal-900 p-6 -m-2">
              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-400/40 rounded-lg text-sm text-red-200 text-center">
                  {error}
                </div>
              )}
              <OtpInput
                email={form.email}
                type="register"
                onVerified={handleOtpVerified}
                onBack={() => { setStep(1); setError('') }}
              />
            </div>
          )}
        </div>

        <p className="text-center text-xs text-teal-400/70 mt-6">
          For educational screening purposes only – not a medical diagnosis tool
        </p>
      </div>
    </div>
  )
}
