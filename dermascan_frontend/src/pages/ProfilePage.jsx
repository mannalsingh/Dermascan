import React, { useEffect, useState } from 'react'
import { userAPI } from '../api/axios'
import api from '../api/axios'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import OtpInput from '../components/OtpInput'
import { toast, Toaster } from 'sonner'
import {
  User, Mail, Phone, MapPin, Calendar, Save,
  Edit3, X, ShieldCheck, Lock, Eye, EyeOff, KeyRound
} from 'lucide-react'

// ── Loading skeleton ──────────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-6 max-w-2xl mx-auto">
      <div className="h-8 w-48 bg-gray-200 rounded-lg" />
      <div className="card">
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-full bg-gray-200 flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-5 w-36 bg-gray-200 rounded" />
            <div className="h-4 w-52 bg-gray-200 rounded" />
            <div className="h-5 w-16 bg-gray-200 rounded-full" />
          </div>
        </div>
      </div>
      <div className="card space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-10 bg-gray-100 rounded-lg" />
          </div>
        ))}
        <div className="h-11 bg-gray-200 rounded-xl" />
      </div>
    </div>
  )
}

function PasswordChangeForm() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.currentPassword) {
      toast.error('Please enter your current password.')
      return
    }
    if (form.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters long.')
      return
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error('New passwords do not match.')
      return
    }

    try {
      setLoading(true)
      const res = await userAPI.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      toast.success(res.data?.message || 'Password updated successfully!')
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update password. Please check your current password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="currentPassword">
          <Lock className="inline h-3.5 w-3.5 mr-1 text-teal-600" />Current Password
        </label>
        <div className="relative">
          <input
            id="currentPassword"
            type={showCurrent ? 'text' : 'password'}
            value={form.currentPassword}
            onChange={(e) => setForm(p => ({ ...p, currentPassword: e.target.value }))}
            className="input-field pr-10"
            placeholder="••••••••••••"
            maxLength={128}
            required
          />
          <button
            type="button"
            onClick={() => setShowCurrent(!showCurrent)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            tabIndex={-1}
          >
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="newPassword">
          <KeyRound className="inline h-3.5 w-3.5 mr-1 text-teal-600" />New Password
        </label>
        <div className="relative">
          <input
            id="newPassword"
            type={showNew ? 'text' : 'password'}
            value={form.newPassword}
            onChange={(e) => setForm(p => ({ ...p, newPassword: e.target.value }))}
            className="input-field pr-10"
            placeholder="Min. 8 characters"
            maxLength={128}
            required
          />
          <button
            type="button"
            onClick={() => setShowNew(!showNew)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            tabIndex={-1}
          >
            {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="confirmPassword">
          <KeyRound className="inline h-3.5 w-3.5 mr-1 text-teal-600" />Confirm New Password
        </label>
        <input
          id="confirmPassword"
          type={showNew ? 'text' : 'password'}
          value={form.confirmPassword}
          onChange={(e) => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
          className="input-field"
          placeholder="Repeat new password"
          maxLength={128}
          required
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-sm font-semibold rounded-xl"
      >
        {loading ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
        {loading ? 'Updating Password…' : 'Update Password'}
      </button>
    </form>
  )
}

// ── Email change panel states ─────────────────────────────────────────────────
// 'idle' | 'form' | 'otp'
export default function ProfilePage() {
  const { user, saveAuth, token } = useAuth()
  const [form, setForm] = useState({ name: '', phone: '', address: '', gender: '', date_of_birth: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Email change state
  const [emailPanel, setEmailPanel] = useState('idle') // 'idle' | 'form' | 'otp'
  const [newEmail, setNewEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

  useEffect(() => {
    userAPI.getProfile()
      .then((r) => {
        const p = r.data?.data?.profile || {}
        const u = r.data?.data?.user || {}
        setForm({
          name:          u.name || user?.name || '',
          phone:         p.phone || '',
          address:       p.address || '',
          gender:        p.gender || '',
          date_of_birth: p.date_of_birth ? p.date_of_birth.split('T')[0] : '',
        })
      })
      .catch(() => toast.error('Could not load profile.'))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      const res = await userAPI.updateProfile(form)
      const updatedUser = res.data?.data?.user
      if (updatedUser && token) {
        saveAuth(token, { ...user, ...updatedUser })
      }
      toast.success('Profile updated successfully!')
    } catch {
      toast.error('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Email change handlers ────────────────────────────────────────────────────
  const handleSendEmailOtp = async () => {
    if (!newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setEmailError('Enter a valid email address')
      return
    }
    try {
      setEmailLoading(true)
      setEmailError('')
      await api.post('/api/user/request-email-change', { newEmail: newEmail.trim() })
      setEmailPanel('otp')
    } catch (err) {
      setEmailError(err.response?.data?.message || 'Failed to send OTP. Please try again.')
    } finally {
      setEmailLoading(false)
    }
  }

  const handleEmailOtpVerified = async (otpToken) => {
    try {
      setEmailLoading(true)
      setEmailError('')
      const res = await api.post('/api/user/confirm-email-change', {
        otpToken,
        newEmail: newEmail.trim(),
      })
      // Backend should return new token/user
      const { token: newToken, user: updatedUser } = res.data
      if (newToken && updatedUser) {
        saveAuth(newToken, updatedUser)
      } else if (token) {
        // Merge locally if backend doesn't return new token
        saveAuth(token, { ...user, email: newEmail.trim() })
      }
      toast.success('Email address updated successfully!')
      setEmailPanel('idle')
      setNewEmail('')
    } catch (err) {
      setEmailError(err.response?.data?.message || 'Failed to update email. Please try again.')
    } finally {
      setEmailLoading(false)
    }
  }

  const displayName = form.name || user?.name || 'User'
  const displayEmail = user?.email || ''

  if (loading) {
    return (
      <Layout>
        <Toaster position="top-right" richColors />
        <ProfileSkeleton />
      </Layout>
    )
  }

  return (
    <Layout>
      <Toaster position="top-right" richColors />
      <div className="max-w-2xl mx-auto animate-fade-in-up">

        {/* Page header */}
        <div className="mb-7">
          <h1 className="section-title">My Profile</h1>
          <p className="text-gray-500 mt-1">Manage your account information and security</p>
        </div>

        {/* ── Avatar card ───────────────────────────────────────────────────── */}
        <div className="card rounded-2xl shadow-sm mb-6">
          <div className="flex items-center gap-5">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-400 to-teal-700 flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-400/30">
              <span className="text-4xl font-bold text-white">
                {displayName[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
              <div className="flex items-center gap-1.5 text-gray-500 mt-1">
                <Mail className="h-4 w-4 text-teal-500" />
                <span className="text-sm">{displayEmail}</span>
              </div>
              <span className="inline-flex mt-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 capitalize">
                {user?.role || 'user'}
              </span>
            </div>
          </div>
        </div>

        {/* ── Edit Profile card ─────────────────────────────────────────────── */}
        <div className="card rounded-2xl shadow-sm mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="border-l-4 border-teal-500 pl-3">
              <h2 className="font-bold text-gray-900 text-lg">Edit Profile</h2>
              <p className="text-xs text-gray-400">Update your personal details</p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="label" htmlFor="name">
                <User className="inline h-3.5 w-3.5 mr-1 text-teal-500" />Full Name
              </label>
              <input
                id="name" name="name" type="text"
                value={form.name} onChange={handleChange}
                className="input-field" placeholder="Your full name"
              />
            </div>

            <div>
              <label className="label" htmlFor="phone">
                <Phone className="inline h-3.5 w-3.5 mr-1 text-teal-500" />Phone number
              </label>
              <input
                id="phone" name="phone" type="tel"
                value={form.phone} onChange={handleChange}
                className="input-field" placeholder="+91 9876543210"
              />
            </div>

            <div>
              <label className="label" htmlFor="gender">
                <User className="inline h-3.5 w-3.5 mr-1 text-teal-500" />Gender
              </label>
              <select
                id="gender" name="gender"
                value={form.gender} onChange={handleChange}
                className="input-field"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>

            <div>
              <label className="label" htmlFor="date_of_birth">
                <Calendar className="inline h-3.5 w-3.5 mr-1 text-teal-500" />Date of birth
              </label>
              <input
                id="date_of_birth" name="date_of_birth" type="date"
                value={form.date_of_birth} onChange={handleChange}
                className="input-field"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label className="label" htmlFor="address">
                <MapPin className="inline h-3.5 w-3.5 mr-1 text-teal-500" />Address
              </label>
              <textarea
                id="address" name="address"
                value={form.address} onChange={handleChange}
                className="input-field resize-none" rows={3}
                placeholder="Your address"
              />
            </div>

            <button
              type="submit" disabled={saving}
              className="w-full bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md shadow-teal-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* ── Email Change card ─────────────────────────────────────────────── */}
        <div className="card rounded-2xl shadow-sm mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="border-l-4 border-indigo-500 pl-3">
                <h2 className="font-bold text-gray-900 text-lg">Change Email Address</h2>
                <p className="text-xs text-gray-400">Update the email linked to your account</p>
              </div>
            </div>
            {emailPanel === 'idle' && (
              <button
                onClick={() => { setEmailPanel('form'); setEmailError(''); setNewEmail('') }}
                className="inline-flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-700 font-medium transition-colors"
              >
                <Edit3 className="h-4 w-4" />
                Change
              </button>
            )}
            {emailPanel !== 'idle' && (
              <button
                onClick={() => { setEmailPanel('idle'); setEmailError(''); setNewEmail('') }}
                className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            )}
          </div>

          {/* Current email display */}
          <div className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-xl mb-4">
            <Mail className="h-4 w-4 text-teal-500 flex-shrink-0" />
            <div>
              <p className="text-xs text-gray-400 font-medium">Current email</p>
              <p className="text-sm text-gray-800 font-semibold">{displayEmail}</p>
            </div>
          </div>

          {/* Form panel */}
          {emailPanel === 'form' && (
            <div className="animate-fade-in-scale space-y-4">
              <div>
                <label className="label" htmlFor="newEmail">New email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="newEmail" type="email"
                    value={newEmail}
                    onChange={(e) => { setNewEmail(e.target.value); setEmailError('') }}
                    className="input-field pl-10"
                    placeholder="new@example.com"
                  />
                </div>
              </div>
              {emailError && (
                <p className="text-sm text-red-600">{emailError}</p>
              )}
              <button
                type="button"
                onClick={handleSendEmailOtp}
                disabled={emailLoading}
                className="btn-primary w-full flex items-center justify-center gap-2 rounded-xl py-2.5 disabled:opacity-50"
              >
                {emailLoading ? <LoadingSpinner size="sm" /> : <ShieldCheck className="h-4 w-4" />}
                {emailLoading ? 'Sending OTP…' : 'Send Verification Code'}
              </button>
            </div>
          )}

          {/* OTP panel */}
          {emailPanel === 'otp' && (
            <div className="animate-fade-in-scale rounded-2xl bg-slate-50 border border-slate-200 p-6">
              {emailError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-700 text-center font-medium">
                  {emailError}
                </div>
              )}
              <OtpInput
                email={newEmail}
                type="email_change"
                onVerified={handleEmailOtpVerified}
                onBack={() => { setEmailPanel('form'); setEmailError('') }}
              />
            </div>
          )}
        </div>

        {/* ── Security & Password card ──────────────────────────────────────── */}
        <div className="card rounded-2xl shadow-sm mb-6">
          <div className="border-l-4 border-teal-500 pl-3 mb-5">
            <h2 className="font-bold text-gray-900 text-lg">Security & Password</h2>
            <p className="text-xs text-gray-500">Update your account password</p>
          </div>

          <PasswordChangeForm />
        </div>

        {/* ── Account Information card ──────────────────────────────────────── */}
        <div className="card rounded-2xl bg-gray-50 border-gray-100">
          <div className="border-l-4 border-gray-300 pl-3 mb-4">
            <h3 className="font-semibold text-gray-700 text-sm">Account Information</h3>
          </div>
          <div className="space-y-2.5 text-sm text-gray-500">
            <div className="flex justify-between items-center">
              <span>Email</span>
              <span className="text-gray-700 font-medium">{displayEmail || '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Role</span>
              <span className="capitalize text-gray-700 font-medium">{user?.role || 'user'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Account ID</span>
              <span className="font-mono text-xs text-gray-500">{String(user?.id || '').slice(0, 16)}…</span>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  )
}
