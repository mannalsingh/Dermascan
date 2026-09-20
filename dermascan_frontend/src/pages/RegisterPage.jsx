import React, { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import LoadingSpinner from '../components/LoadingSpinner'
import { Scan, Eye, EyeOff, Mail, Lock, User } from 'lucide-react'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function RegisterPage() {
  const { register, googleLogin } = useAuth()
  const navigate = useNavigate()

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
    if (!form.name.trim()) return 'Name is required'
    if (!form.email.trim()) return 'Email is required'
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Enter a valid email'
    if (form.password.length < 6) return 'Password must be at least 6 characters'
    if (form.password !== form.confirm) return 'Passwords do not match'
    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const validErr = validate()
    if (validErr) { setError(validErr); return }
    try {
      setLoading(true)
      setError('')
      await register(form.name.trim(), form.email.trim(), form.password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Called by Google Identity Services with a verified credential token (not name/email)
  const handleGoogleResponse = useCallback(async (response) => {
    try {
      setGoogleLoading(true)
      setError('')
      await googleLogin(response.credential)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message || 'Google sign-in failed. Please try again.'
      setError(msg)
    } finally {
      setGoogleLoading(false)
    }
  }, [googleLogin, navigate])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return
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
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [handleGoogleResponse])

  const strength = () => {
    const p = form.password
    if (!p) return null
    if (p.length < 6) return { label: 'Weak', color: 'bg-red-400', w: 'w-1/4' }
    if (p.length < 10) return { label: 'Fair', color: 'bg-yellow-400', w: 'w-2/4' }
    return { label: 'Strong', color: 'bg-green-500', w: 'w-full' }
  }
  const s = strength()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-blue-700 rounded-xl flex items-center justify-center">
              <Scan className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">DermaScan AI</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 mt-1">Start your free skin screening today</p>
        </div>

        <div className="card shadow-md">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {GOOGLE_CLIENT_ID ? (
            <div className="mb-4">
              {googleLoading ? (
                <div className="flex items-center justify-center gap-2 w-full border border-gray-300 rounded-lg py-2.5 text-sm text-gray-600">
                  <LoadingSpinner size="sm" />
                  <span>Signing up with Google…</span>
                </div>
              ) : (
                <div id="google-signup-btn" className="w-full flex justify-center" />
              )}
            </div>
          ) : null}

          {GOOGLE_CLIENT_ID && (
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 whitespace-nowrap">or register with email</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

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

            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="password" name="password"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={form.password} onChange={handleChange}
                  className="input-field pl-10 pr-10" placeholder="Min. 6 characters" required
                />
                <button
                  type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {s && (
                <div className="mt-1.5">
                  <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${s.color} ${s.w}`} />
                  </div>
                  <p className={`text-xs mt-1 ${s.color.replace('bg-', 'text-').replace('-400', '-600').replace('-500', '-600')}`}>
                    {s.label}
                  </p>
                </div>
              )}
            </div>

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
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading ? <LoadingSpinner size="sm" /> : null}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          For educational screening purposes only – not a medical diagnosis tool
        </p>
      </div>
    </div>
  )
}
