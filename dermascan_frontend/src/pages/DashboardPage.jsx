import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { analyticsAPI, screeningAPI, resolveImageUrl } from '../api/axios'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import RiskBadge, { PredictionBadge } from '../components/RiskBadge'
import {
  Upload, History, BarChart2, ShieldCheck, Activity,
  TrendingUp, AlertTriangle, CheckCircle, ArrowRight, Scan
} from 'lucide-react'
import { formatIST } from '../utils/dateUtils'

function StatCard({ icon: Icon, label, value, sub, color = 'teal' }) {
  const colors = {
    teal:  { bg: 'bg-[#E8F6F4] border border-[#BFE4DF]', icon: 'text-[#0F8F87]', val: 'text-[#102A43]' },
    green: { bg: 'bg-[#EAF7F0] border border-[#B8DFC8]', icon: 'text-[#176B45]', val: 'text-[#176B45]' },
    red:   { bg: 'bg-[#FDF0F0] border border-[#F1C4C4]', icon: 'text-[#B42318]', val: 'text-[#B42318]' },
    blue:  { bg: 'bg-[#EEF5FA] border border-[#C9DDEA]', icon: 'text-[#245B7A]', val: 'text-[#245B7A]' },
  }
  const c = colors[color] || colors.teal
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl ${c.bg}`}>
        <Icon className={`h-6 w-6 ${c.icon}`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-[#486581] truncate">{label}</p>
        <p className={`text-2xl font-bold ${c.val}`}>{value}</p>
        {sub && <p className="text-xs text-[#829AB1] mt-0.5">{sub}</p>}
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
    if (h >= 5 && h < 12) return 'Good morning'
    if (h >= 12 && h < 17) return 'Good afternoon'
    if (h >= 17 && h < 21) return 'Good evening'
    return 'Good night'
  }

  return (
    <Layout>
      
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#102A43]">
          {greeting()}, {user?.name || 'there'} 👋
        </h1>
        <p className="text-[#486581] mt-1">Here's your screening overview</p>
      </div>

      {loadingAnalytics ? (
        <div className="flex justify-center py-8"><LoadingSpinner size="lg" text="Loading stats…" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Activity} label="Total Screenings" color="teal"
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
        <Link to="/screening" className="card-hover group border-[#D9E5E3] hover:border-[#0F8F87]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0F8F87] rounded-xl group-hover:bg-[#0B766F] transition-colors">
              <Upload className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-[#102A43]">New Scan</p>
              <p className="text-xs text-[#0F8F87] font-medium">Upload & analyze image</p>
            </div>
            <ArrowRight className="h-4 w-4 text-[#829AB1] ml-auto group-hover:text-[#0F8F87] transition-colors" />
          </div>
        </Link>

        <Link to="/history" className="card-hover group border-[#D9E5E3] hover:border-[#0F8F87]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#243B53] rounded-xl group-hover:bg-[#102A43] transition-colors">
              <History className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-[#102A43]">History</p>
              <p className="text-xs text-[#486581]">View past screenings</p>
            </div>
            <ArrowRight className="h-4 w-4 text-[#829AB1] ml-auto group-hover:text-[#0F8F87] transition-colors" />
          </div>
        </Link>

        <Link to="/analytics" className="card-hover group border-[#D9E5E3] hover:border-[#0F8F87]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#0F8F87] rounded-xl group-hover:bg-[#0B766F] transition-colors">
              <BarChart2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-[#102A43]">Analytics</p>
              <p className="text-xs text-[#486581]">Charts & trends</p>
            </div>
            <ArrowRight className="h-4 w-4 text-[#829AB1] ml-auto group-hover:text-[#0F8F87] transition-colors" />
          </div>
        </Link>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-[#102A43] text-lg">Recent Screenings</h2>
          <Link to="/history" className="text-sm text-[#0F8F87] hover:text-[#0B766F] font-semibold flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loadingHistory ? (
          <div className="flex justify-center py-6"><LoadingSpinner size="md" /></div>
        ) : recent.length === 0 ? (
          <div className="text-center py-10">
            <div className="inline-flex p-4 bg-[#F5F9F9] border border-[#D9E5E3] rounded-full mb-3">
              <Scan className="h-8 w-8 text-[#829AB1]" />
            </div>
            <p className="text-[#486581] mb-3">No screenings yet</p>
            <Link to="/screening" className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2">
              <Upload className="h-4 w-4" /> Start your first scan
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-[#D9E5E3]">
            {recent.map((item) => (
              <Link
                key={item.screeningId}
                to={`/history/${item.screeningId}`}
                className="flex items-center gap-4 py-3 hover:bg-[#F5F9F9] rounded-xl px-2 -mx-2 transition-colors"
              >
                
                <div className="w-12 h-12 rounded-xl bg-[#F5F9F9] border border-[#D9E5E3] overflow-hidden flex-shrink-0">
                  {item.imageUrl ? (
                    <img
                      src={resolveImageUrl(item.imageUrl)}
                      alt="scan"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Scan className="h-5 w-5 text-[#829AB1]" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <PredictionBadge prediction={item.prediction} />
                    <RiskBadge level={item.riskLevel} />
                  </div>
                  <p className="text-xs text-[#829AB1] mt-1">
                    {formatIST(item.uploadedAt)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-[#102A43]">
                    {(item.confidenceScore * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-[#829AB1]">Confidence</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-[#FFF7E6] border border-[#F4D7A1] rounded-xl flex gap-3">
        <AlertTriangle className="h-5 w-5 text-[#8A5A00] flex-shrink-0 mt-0.5" />
        <p className="text-sm text-[#8A5A00]">
          <strong>Medical Disclaimer:</strong> DermaScan AI is a screening tool only and does not
          provide medical diagnosis. Always consult a qualified dermatologist for any skin concerns.
        </p>
      </div>
    </Layout>
  )
}
