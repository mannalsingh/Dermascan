import React, { useEffect, useState } from 'react'
import { userAPI } from '../api/axios'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import { User, Mail, Phone, MapPin, Calendar, Save, CheckCircle, AlertTriangle } from 'lucide-react'

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState({ phone: '', address: '', gender: '', date_of_birth: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null) 

  useEffect(() => {
    userAPI.getProfile()
      .then((r) => {
        const p = r.data?.data?.profile || {}
        setProfile(p)
        setForm({
          phone:         p.phone || '',
          address:       p.address || '',
          gender:        p.gender || '',
          date_of_birth: p.date_of_birth ? p.date_of_birth.split('T')[0] : '',
        })
      })
      .catch(() => setMessage({ type: 'error', text: 'Could not load profile.' }))
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e) => {
    setMessage(null)
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      setSaving(true)
      setMessage(null)
      await userAPI.updateProfile(form)
      await refreshProfile()
      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    } catch {
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <LoadingSpinner size="lg" text="Loading profile…" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="section-title">My Profile</h1>
          <p className="text-gray-500 mt-1">Manage your account information</p>
        </div>

        <div className="card mb-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-3xl font-bold text-blue-700">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user?.name || 'User'}</h2>
              <div className="flex items-center gap-1.5 text-gray-500 mt-1">
                <Mail className="h-4 w-4" />
                <span className="text-sm">{user?.email || ''}</span>
              </div>
              <span className="inline-flex mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                {user?.role || 'user'}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="font-bold text-gray-900 mb-5">Edit Profile</h2>

          {message && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message.type === 'success'
                ? <CheckCircle className="h-4 w-4 flex-shrink-0" />
                : <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              }
              {message.text}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            
            <div>
              <label className="label" htmlFor="phone">
                <Phone className="inline h-3.5 w-3.5 mr-1" />Phone number
              </label>
              <input
                id="phone" name="phone" type="tel"
                value={form.phone} onChange={handleChange}
                className="input-field" placeholder="+91 9876543210"
              />
            </div>

            <div>
              <label className="label" htmlFor="gender">
                <User className="inline h-3.5 w-3.5 mr-1" />Gender
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
                <Calendar className="inline h-3.5 w-3.5 mr-1" />Date of birth
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
                <MapPin className="inline h-3.5 w-3.5 mr-1" />Address
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
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {saving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>

        <div className="card mt-4 bg-gray-50">
          <h3 className="font-semibold text-gray-700 mb-3 text-sm">Account Information</h3>
          <div className="space-y-2 text-sm text-gray-500">
            <div className="flex justify-between">
              <span>Account ID</span>
              <span className="font-mono text-xs">{String(user?.id || '').slice(0, 16)}…</span>
            </div>
            <div className="flex justify-between">
              <span>Role</span>
              <span className="capitalize">{user?.role || 'user'}</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
