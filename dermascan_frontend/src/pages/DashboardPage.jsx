import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { analyticsAPI, screeningAPI } from '../api/axios'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import RiskBadge, { PredictionBadge } from '../components/RiskBadge'
import {
  Upload, History, BarChart2, ShieldCheck, Activity,
  TrendingUp, AlertTriangle, CheckCircle, ArrowRight, Scan
} from 'lucide-react'

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:  { bg: 'bg-blue-50',   icon: 'text-blue-600',  val: 'text-blue-700' },
    green: { bg: 'bg-green-50',  icon: 'text-green-600', val: 'text-green-700' },
    red:   { bg: 'bg-red-50',    icon: 'text-red-600',   val: 'text-red-700' },
    teal:  { bg: 'bg-teal-50',   icon: 'text-teal-600',  val: 'text-teal-700' },
  }
  const c = colors[color] || colors.blue
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl ${c.bg}`}>
        <Icon className={`h-6 w-6 ${c.icon}`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 truncate">{label}</p>
        <p className={`text-2xl font-bold ${c.val}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [recent, setRecent] = useState([])
  const [loadingAnalytics, setLoadingAnalytics] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)

  useEffect(() => {
    analyticsAPI.getSummary()
      .then((r) => setSummary(r.data?.summary))
      .catch(() => setSummary(null))
      .finally(() => setLoadingAnalytics(false))

    screeningAPI.getHistory()
      .then((r) => setRecent((r.data?.history || []).slice(0, 5)))
      .catch(() => setRecent([]))
      .finally(() => setLoadingHistory(false))
  }, [])

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <Layout>
      
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          {greeting()}, {user?.name || 'there'} 👋
        </h1>
        <p className="text-gray-500 mt-1">Here's your screening overview</p>
      </div>

      {loadingAnalytics ? (
        <div className="flex justify-center py-8"><LoadingSpinner size="lg" text="Loading stats…" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Activity} label="Total Screenings" color="blue"
            value={summary?.totalScreenings ?? 0}
            sub="All time"
          />
          <StatCard
            icon={CheckCircle} label="Benign Results" color="green"
            value={summary?.benignCount ?? 0}
            sub={`${summary?.totalScreenings ? Math.round((summary.benignCount / summary.totalScreenings) * 100) : 0}% of total`}
          />
          <StatCard
            icon={AlertTriangle} label="Malignant Results" color="red"
            value={summary?.malignantCount ?? 0}
            sub="Requires attention"
          />
          <StatCard
            icon={ShieldCheck} label="High Risk" color="teal"
            value={summary?.riskDistribution?.high ?? 0}
            sub="Needs urgent review"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Link to="/screening" className="card-hover border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 group">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-700 rounded-lg group-hover:bg-blue-800 transition-colors">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-blue-900">New Scan</p>
              <p className="text-xs text-blue-600">Upload & analyze image</p>
            </div>
            <ArrowRight className="h-4 w-4 text-blue-400 ml-auto" />
          </div>
        </Link>

        <Link to="/history" className="card-hover group">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gray-700 rounded-lg group-hover:bg-gray-800 transition-colors">
              <History className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">History</p>
              <p className="text-xs text-gray-500">View past screenings</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
          </div>
        </Link>

        <Link to="/analytics" className="card-hover group">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-600 rounded-lg group-hover:bg-teal-700 transition-colors">
              <BarChart2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Analytics</p>
              <p className="text-xs text-gray-500">Charts & trends</p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 ml-auto" />
          </div>
        </Link>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900 text-lg">Recent Screenings</h2>
          <Link to="/history" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loadingHistory ? (
          <div className="flex justify-center py-6"><LoadingSpinner size="md" /></div>
        ) : recent.length === 0 ? (
          <div className="text-center py-10">
            <div className="inline-flex p-4 bg-gray-100 rounded-full mb-3">
              <Scan className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-gray-500 mb-3">No screenings yet</p>
            <Link to="/screening" className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2">
              <Upload className="h-4 w-4" /> Start your first scan
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recent.map((item) => (
              <Link
                key={item.screeningId}
                to={`/history/${item.screeningId}`}
                className="flex items-center gap-4 py-3 hover:bg-gray-50 rounded-lg px-2 -mx-2 transition-colors"
              >
                
                <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl.startsWith('/') ? item.imageUrl : `/${item.imageUrl}`}
                      alt="scan"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Scan className="h-5 w-5 text-gray-300" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PredictionBadge prediction={item.prediction} />
                    <RiskBadge level={item.riskLevel} />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(item.uploadedAt).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-gray-700">
                    {(item.confidenceScore * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-gray-400">Confidence</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">
          <strong>Medical Disclaimer:</strong> DermaScan AI is a screening tool only and does not
          provide medical diagnosis. Always consult a qualified dermatologist for any skin concerns.
        </p>
      </div>
    </Layout>
  )
}
