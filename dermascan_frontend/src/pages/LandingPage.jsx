import React, { useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Scan, ShieldCheck, Brain, FileText, ArrowRight, CheckCircle2, Sparkles, Activity } from 'lucide-react'
import GoogleAuthButton from '../components/GoogleAuthButton'

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    desc: 'Deep learning neural network analyzes skin lesion images for Benign vs Malignant classification with high precision.',
  },
  {
    icon: Scan,
    title: 'Grad-CAM Heatmaps',
    desc: 'Visual heatmaps highlight the focal suspicious areas the AI model focused on during diagnosis.',
  },
  {
    icon: ShieldCheck,
    title: 'Risk Stratification',
    desc: 'Instant risk level classification (Low / Medium / High) with actionable medical recommendations.',
  },
  {
    icon: FileText,
    title: 'Clinical PDF Reports',
    desc: 'Generate comprehensive, printable PDF reports to share with your dermatologist or doctor.',
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
  const { isAuthenticated } = useAuth()

  return (
    <div className="min-h-screen bg-[#F4FAF9] text-[#334E68]">

      {/* Navigation Header */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#E2ECEB]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-[#0F9D92] rounded-xl flex items-center justify-center text-white shadow-xs">
              <Scan className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[#102A43] text-lg leading-none tracking-tight">DermaScan AI</span>
              <span className="text-[10px] text-[#0F9D92] font-semibold tracking-wider uppercase mt-0.5">Clinical AI Screening</span>
            </div>
          </Link>

          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn-primary text-sm py-2 px-4 flex items-center gap-1.5">
                <span>Go to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <GoogleAuthButton className="inline-flex text-xs py-2 px-2.5 sm:px-3.5" />
                <Link to="/login" className="btn-secondary text-sm py-2 px-3.5">
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
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#D8E2EC] text-[#0F9D92] text-xs font-semibold uppercase tracking-wider mb-6 shadow-xs animate-fade-in-up">
          <Sparkles className="h-3.5 w-3.5 text-[#0F9D92]" />
          <span>Advanced Deep Learning Skin Health Platform</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#102A43] leading-tight tracking-tight mb-6 animate-fade-in-up">
          Early Detection <br className="hidden sm:inline" />
          <span className="text-[#0F9D92]">
            Saves Lives
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-[#334E68] max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          Upload a high-resolution photo of any suspicious skin spot. Receive immediate AI-powered classification,
          Grad-CAM visual heatmaps, and doctor-ready clinical reports.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-center max-w-xs mx-auto mb-8">
          <Link
            to="/register"
            className="btn-primary flex items-center justify-center gap-2 text-base px-8 py-3.5 w-full font-semibold shadow-md shadow-[#0F9D92]/20 rounded-xl"
          >
            <span>Start Free Screening</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex items-center justify-center gap-6 text-xs text-[#627D98] font-medium pt-2">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-[#0F9D92]" /> No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-[#0F9D92]" /> Results in &lt; 5 seconds
          </span>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <div className="text-center max-w-xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#102A43] tracking-tight mb-2">
            Clinical-Grade Technology, In Your Hands
          </h2>
          <p className="text-[#627D98] text-sm">
            Built using modern convolutional neural networks trained on verified dermatological datasets.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="card hover:shadow-lg transition-all duration-200 text-left p-6">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-[#E2ECEB] bg-[#F4FAF9] text-[#0F9D92] mb-4">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-[#102A43] text-base mb-2">{f.title}</h3>
                <p className="text-sm text-[#627D98] leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Value Proposition Highlights Banner */}
      <section className="bg-[#102A43] text-white py-16 border-y border-[#E2ECEB]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3 text-white">
              Why Dermatologists and Patients Trust DermaScan
            </h2>
            <p className="text-[#829AB1] text-sm max-w-lg mx-auto">
              Empowering proactive skin surveillance with transparency, speed, and privacy.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {highlights.map((h) => (
              <div key={h} className="flex items-center gap-3 text-[#F4FAF9] text-sm font-medium">
                <CheckCircle2 className="h-5 w-5 text-[#0F9D92] flex-shrink-0" />
                <span>{h}</span>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-[#0F9D92] hover:bg-[#0C857B] text-white font-bold py-3.5 px-8 rounded-xl transition-all duration-200 shadow-lg shadow-black/20"
            >
              <span>Get Started Now</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0B1E30] text-[#829AB1] py-10 px-4 text-center">
        <p className="text-xs max-w-2xl mx-auto leading-relaxed text-[#829AB1]">
          <strong className="text-amber-400 font-semibold">⚠ Medical Disclaimer:</strong> DermaScan AI is designed for
          preliminary screening and educational purposes. It does not constitute a formal diagnosis or therapeutic recommendation.
          Always consult a board-certified dermatologist for any persistent, changing, or irregular skin lesions.
        </p>
        <p className="mt-4 text-xs text-[#627D98]">
          © {new Date().getFullYear()} DermaScan AI. All rights reserved.
        </p>
      </footer>

    </div>
  )
}
