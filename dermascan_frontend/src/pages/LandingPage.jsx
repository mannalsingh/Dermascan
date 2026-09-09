import React from 'react'
import { Link } from 'react-router-dom'
import { Scan, ShieldCheck, Brain, FileText, ArrowRight, CheckCircle } from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Analysis',
    desc: 'Advanced CNN model analyzes skin lesion images for Benign/Malignant classification with confidence scores.',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    icon: Scan,
    title: 'Heatmap Visualization',
    desc: 'Visual heatmap overlay highlights the located skin lesion area for quick visual reference.',
    color: 'bg-teal-100 text-teal-700',
  },
  {
    icon: ShieldCheck,
    title: 'Risk Assessment',
    desc: 'Instant risk level classification (Low / Medium / High) with personalized screening recommendations.',
    color: 'bg-green-100 text-green-700',
  },
  {
    icon: FileText,
    title: 'PDF Reports',
    desc: 'Download detailed screening reports for sharing with your dermatologist or for personal records.',
    color: 'bg-purple-100 text-purple-700',
  },
]

const highlights = [
  'Upload skin lesion photos securely',
  'Get instant AI predictions',
  'View heatmap of suspicious areas',
  'Track your screening history',
  'Download detailed PDF reports',
  'Monitor trends with analytics',
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
              <Scan className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">DermaScan AI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="btn-secondary text-sm py-2 px-4">
              Sign In
            </Link>
            <Link to="/register" className="btn-primary text-sm py-2 px-4">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 text-blue-700 text-sm font-medium mb-6">
          <Brain className="h-4 w-4" />
          AI-Based Skin Cancer Screening
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
          Early Detection{' '}
          <span className="bg-gradient-to-r from-blue-600 to-teal-500 bg-clip-text text-transparent">
            Saves Lives
          </span>
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Upload a photo of a skin lesion and get instant AI analysis — benign or malignant,
          with confidence scores, Grad-CAM heatmaps, and downloadable reports.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="btn-primary flex items-center gap-2 text-base px-8 py-3 w-full sm:w-auto justify-center"
          >
            Start Free Screening
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            to="/login"
            className="btn-secondary flex items-center gap-2 text-base px-8 py-3 w-full sm:w-auto justify-center"
          >
            Sign In
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-3">
          Everything You Need
        </h2>
        <p className="text-gray-500 text-center mb-12">
          A complete skin cancer screening assistant in your browser
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <div key={f.title} className="card text-center">
                <div className={`inline-flex p-3 rounded-xl ${f.color} mb-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="bg-blue-700 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-10">
            What DermaScan AI Can Do
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {highlights.map((h) => (
              <div key={h} className="flex items-center gap-3 text-blue-100">
                <CheckCircle className="h-5 w-5 text-blue-300 flex-shrink-0" />
                <span>{h}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-white text-blue-700 font-semibold py-3 px-8 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Create Free Account
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-gray-900 text-gray-400 text-center py-8 px-4">
        <p className="text-sm max-w-2xl mx-auto">
          <strong className="text-yellow-400">⚠ Medical Disclaimer:</strong> DermaScan AI is for
          educational and preliminary screening purposes only. It is NOT a substitute for professional
          medical diagnosis. Always consult a qualified dermatologist for any skin concerns.
        </p>
        <p className="mt-4 text-xs text-gray-600">
          © {new Date().getFullYear()} DermaScan AI – Major Project. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
