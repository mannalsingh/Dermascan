import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import OtpInput from '../components/OtpInput'
import { Scan, Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import api, { authAPI } from '../api/axios'

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

  if (pwd.length < 6) return { label: 'Too short', color: 'bg-rose-500', textColor: 'text-rose-600', w: 'w-1/4' }
  if (pwd.length < 8) return { label: 'Weak', color: 'bg-amber-400', textColor: 'text-amber-600', w: 'w-2/4' }
  if (score <= 2) return { label: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-600', w: 'w-3/4' }
  return { label: 'Strong', color: 'bg-emerald-500', textColor: 'text-emerald-600', w: 'w-full' }
}

export default function RegisterPage() {
  const { googleLogin, saveAuth } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(1) // 1 = Form, 2 = OTP Verification
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')

  const googleBtnRef = useRef(null)

  const handleChange = (e) => {
    setError('')
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  }

  const validate = () => {
    if (!form.name.trim() || form.name.trim().length < 2) return 'Please enter your full name (at least 2 characters)'
    if (!form.email.trim()) return 'Email address is required'
    if (!validateEmail(form.email)) return 'Please enter a valid email address'
    if (form.password.length < 8) return 'Password must be at least 8 characters long'
    if (form.password.length > 128) return 'Password cannot exceed 128 characters'
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
      // Step 1: Send 4-digit verification code to the user's email
      await authAPI.sendOtp({ email: form.email.trim(), type: 'register' })
      setStep(2)
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not send verification code. Please check your email.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Step 2: Called when OTP is verified
  const handleOtpVerified = async (otpToken) => {
    try {
      setLoading(true)
      setError('')
      const res = await authAPI.register({
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

  // Google OAuth handler
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

  // Initialize standard Google Identity Services button with 'continue_with'
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || step !== 1) return

    const initGoogle = () => {
      if (!window.google?.accounts?.id) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      })

      if (googleBtnRef.current) {
        googleBtnRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 384,
        })
      }
    }

    if (window.google?.accounts?.id) {
      initGoogle()
    } else {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initGoogle
      document.body.appendChild(script)
      return () => {
        if (document.body.contains(script)) document.body.removeChild(script)
      }
    }
  }, [handleGoogleResponse, step])

  const strength = getStrength(form.password)

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/60 via-slate-50 to-emerald-50/40 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-4 group">
            <div className="w-11 h-11 bg-teal-600 group-hover:bg-teal-700 text-white rounded-2xl flex items-center justify-center shadow-sm shadow-teal-600/20 transition-all duration-200">
              <Scan className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">DermaScan AI</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            {step === 1 ? 'Create your account' : 'Verify your email'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {step === 1
              ? 'Start your AI-powered skin screening today'
              : `Enter the 4-digit code sent to ${form.email}`}
          </p>
        </div>

        {/* Auth Card */}
        <div className="card shadow-lg shadow-slate-200/50 border border-slate-200/80 p-8">

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 font-medium animate-fade-in-scale">
              {error}
            </div>
          )}

          {/* STEP 1: Registration Form */}
          {step === 1 ? (
            <div className="animate-fade-in-up">
              {/* Google Sign Up */}
              {GOOGLE_CLIENT_ID ? (
                <div className="mb-5">
                  {googleLoading ? (
                    <div className="flex items-center justify-center gap-2.5 w-full border border-slate-300 rounded-xl py-3 text-sm text-slate-600 bg-slate-50">
                      <LoadingSpinner size="sm" />
                      <span>Connecting with Google…</span>
                    </div>
                  ) : (
                    <div className="w-full flex justify-center">
                      <div ref={googleBtnRef} id="google-signup-btn" className="w-full flex justify-center" />
                    </div>
                  )}

                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">or register with email</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>
                </div>
              ) : null}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div>
                  <label htmlFor="name" className="label">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={form.name}
                      onChange={handleChange}
                      className="input-field pl-10"
                      placeholder="Jane Doe"
                      maxLength={60}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="label">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
                  <label htmlFor="password" className="label">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="password"
                      name="password"
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={form.password}
                      onChange={handleChange}
                      className="input-field pl-10 pr-10"
                      placeholder="Min. 8 characters"
                      maxLength={128}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      tabIndex={-1}
                      aria-label={showPwd ? 'Hide password' : 'Show password'}
                    >
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {strength && (
                    <div className="mt-2">
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.w}`} />
                      </div>
                      <p className={`text-xs mt-1 font-semibold ${strength.textColor}`}>
                        {strength.label}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="confirm" className="label">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="confirm"
                      name="confirm"
                      type={showPwd ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={form.confirm}
                      onChange={handleChange}
                      className="input-field pl-10"
                      placeholder="Repeat password"
                      maxLength={128}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full py-3 mt-2 flex items-center justify-center gap-2 text-sm font-semibold"
                >
                  {loading ? <LoadingSpinner size="sm" /> : null}
                  {loading ? 'Processing…' : 'Create Account'}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                Already have an account?{' '}
                <Link to="/login" className="text-teal-600 hover:text-teal-700 font-semibold hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          ) : (
            /* STEP 2: Email Verification OTP */
            <OtpInput
              email={form.email}
              type="register"
              onVerified={handleOtpVerified}
              onBack={() => { setError(''); setStep(1); }}
            />
          )}

        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          For educational & screening purposes only — not a clinical medical diagnosis
        </p>
      </div>
    </div>
  )
}
