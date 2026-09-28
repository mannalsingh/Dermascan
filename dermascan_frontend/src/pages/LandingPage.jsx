import React, { useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Scan, ShieldCheck, Brain, FileText, ArrowRight, CheckCircle2, Sparkles, Activity } from 'lucide-react'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    desc: 'Deep learning neural network analyzes skin lesion images for Benign vs Malignant classification with high precision.',
    badge: 'bg-teal-50 text-teal-700 border-teal-200',
  },
  {
    icon: Scan,
    title: 'Grad-CAM Heatmaps',
    desc: 'Visual heatmaps highlight the focal suspicious areas the AI model focused on during diagnosis.',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    icon: ShieldCheck,
    title: 'Risk Stratification',
    desc: 'Instant risk level classification (Low / Medium / High) with actionable medical recommendations.',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    icon: FileText,
    title: 'Clinical PDF Reports',
    desc: 'Generate comprehensive, printable PDF reports to share with your dermatologist or doctor.',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
]

const highlights = [
  'Encrypted and secure skin photo uploads',
  'Instant AI diagnosis with confidence scores',
  'Grad-CAM visual lesion heatmaps',
  'Permanent historical scan tracking & audit',
  'Downloadable doctor-ready PDF reports',
  'Longitudinal risk trends & analytics',
]

export default function LandingPage() {
  const { googleLogin, isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const googleBtnRef = useRef(null)

  const handleGoogleResponse = useCallback(async (response) => {
    try {
      await googleLogin(response.credential)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      console.error('Google sign-in error:', err)
      navigate('/login')
    }
  }, [googleLogin, navigate])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return

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
          width: 280,
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
  }, [handleGoogleResponse])

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50/50 via-slate-50 to-emerald-50/30 text-slate-900">

      {/* Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center text-white shadow-xs">
              <Scan className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-slate-900 text-lg leading-none tracking-tight">DermaScan AI</span>
              <span className="text-[10px] text-teal-600 font-semibold tracking-wider uppercase mt-0.5">Clinical AI Screening</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
                <span>Go to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-secondary text-sm py-2 px-4">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-4">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold uppercase tracking-wider mb-6 shadow-xs animate-fade-in-up">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Advanced Deep Learning Skin Health Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight mb-6 animate-fade-in-up">
          Early Detection <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">
            Saves Lives
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          Upload a high-resolution photo of any suspicious skin spot. Receive immediate AI-powered classification,
          Grad-CAM visual heatmaps, and doctor-ready clinical reports.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-xl mx-auto mb-8">
          <Link
            to="/register"
            className="btn-primary flex items-center justify-center gap-2 text-base px-8 py-3.5 w-full sm:w-auto font-semibold shadow-md shadow-teal-600/20"
          >
            <span>Start Free Screening</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          {/* Root Continue with Google Button */}
          {GOOGLE_CLIENT_ID ? (
            <div className="w-full sm:w-auto flex justify-center">
              <div ref={googleBtnRef} id="root-google-btn" className="flex justify-center" />
            </div>
          ) : (
            <Link
              to="/login"
              className="btn-secondary flex items-center justify-center gap-2 text-base px-7 py-3 w-full sm:w-auto font-medium"
            >
              Sign In
            </Link>
          )}
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-slate-500 font-medium pt-2">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-teal-600" /> No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-teal-600" /> Results in &lt; 5 seconds
          </span>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-2">
            Clinical-Grade Technology, In Your Hands
          </h2>
          <p className="text-slate-500 text-sm">
            Built using modern convolutional neural networks trained on verified dermatological datasets.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="card hover:shadow-md transition-all duration-200 text-left p-6">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${f.badge} mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-base mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Value Proposition Highlights Banner */}
      <section className="bg-gradient-to-br from-teal-700 via-teal-800 to-slate-900 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">
              Why Dermatologists and Patients Trust DermaScan
            </h2>
            <p className="text-teal-100 text-sm max-w-lg mx-auto">
              Empowering proactive skin surveillance with transparency, speed, and privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {highlights.map((h) => (
              <div key={h} className="flex items-center gap-3 text-teal-50 text-sm font-medium">
                <CheckCircle2 className="h-5 w-5 text-teal-300 flex-shrink-0" />
                <span>{h}</span>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-white text-teal-800 font-bold py-3.5 px-8 rounded-xl hover:bg-teal-50 transition-all duration-200 shadow-lg shadow-black/20"
            >
              <span>Get Started Now</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-4 text-center">
        <p className="text-xs max-w-2xl mx-auto leading-relaxed text-slate-400">
          <strong className="text-amber-400 font-semibold">⚠ Medical Disclaimer:</strong> DermaScan AI is designed for
          preliminary screening and educational purposes. It does not constitute a formal diagnosis or therapeutic recommendation.
          Always consult a board-certified dermatologist for any persistent, changing, or irregular skin lesions.
        </p>
        <p className="mt-4 text-xs text-slate-500">
          © {new Date().getFullYear()} DermaScan AI. All rights reserved.
        </p>
      </footer>

    </div>
  )
}
