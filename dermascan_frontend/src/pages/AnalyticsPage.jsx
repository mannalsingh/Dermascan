import React, { useEffect, useState } from 'react'
import { analyticsAPI } from '../api/axios'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend
} from 'recharts'
import { Activity, ShieldCheck, AlertTriangle, TrendingUp } from 'lucide-react'

const COLORS = {
  benign:    '#16a34a',
  malignant: '#dc2626',
  low:       '#16a34a',
  medium:    '#ca8a04',
  high:      '#dc2626',
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 text-sm">
        {label && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || p.fill }}>
            {p.name}: <strong>{p.value}</strong>
          </p>
        ))}
      </div>
    )
  }
  return null
}

function SummaryCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue:  'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red:   'bg-red-50 text-red-700',
    teal:  'bg-teal-50 text-teal-700',
  }
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    analyticsAPI.getSummary()
      .then((r) => setSummary(r.data?.summary))
      .catch(() => setError('Failed to load analytics.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <LoadingSpinner size="lg" text="Loading analytics…" />
        </div>
      </Layout>
    )
  }

  if (error || !summary) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-500">{error || 'No data available.'}</p>
        </div>
      </Layout>
    )
  }

  const predPieData = [
    { name: 'Benign', value: summary.benignCount, color: COLORS.benign },
    { name: 'Malignant', value: summary.malignantCount, color: COLORS.malignant },
  ].filter((d) => d.value > 0)

  const riskBarData = [
    { name: 'Low', value: summary.riskDistribution?.low || 0, fill: COLORS.low },
    { name: 'Medium', value: summary.riskDistribution?.medium || 0, fill: COLORS.medium },
    { name: 'High', value: summary.riskDistribution?.high || 0, fill: COLORS.high },
  ]

  const trendData = (summary.trendData || []).map((d) => ({
    date: d.date,
    Screenings: d.count,
  }))

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="section-title">Analytics Dashboard</h1>
        <p className="text-gray-500 mt-1">Your screening statistics and trends</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <SummaryCard icon={Activity}     label="Total Screenings" value={summary.totalScreenings}              color="blue"  />
        <SummaryCard icon={ShieldCheck}  label="Benign"           value={summary.benignCount}                 color="green" />
        <SummaryCard icon={AlertTriangle} label="Malignant"       value={summary.malignantCount}              color="red"   />
        <SummaryCard icon={TrendingUp}   label="High Risk"        value={summary.riskDistribution?.high || 0} color="teal"  />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">Prediction Distribution</h2>
          {predPieData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-gray-400">
              No data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={predPieData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {predPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h2 className="font-bold text-gray-900 mb-4">Risk Level Distribution</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={riskBarData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} name="Screenings">
                {riskBarData.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card mb-6">
        <h2 className="font-bold text-gray-900 mb-4">Screening Trend (Last 30 Days)</h2>
        {trendData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-400">
            No trend data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.split('-').slice(1).join('/')}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone" dataKey="Screenings"
                stroke="#2563eb" strokeWidth={2.5}
                dot={{ r: 4, fill: '#2563eb' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Benign Rate',
            value: summary.totalScreenings > 0
              ? `${((summary.benignCount / summary.totalScreenings) * 100).toFixed(1)}%`
              : '0%',
            color: 'text-green-600',
          },
          {
            label: 'Malignant Rate',
            value: summary.totalScreenings > 0
              ? `${((summary.malignantCount / summary.totalScreenings) * 100).toFixed(1)}%`
              : '0%',
            color: 'text-red-600',
          },
          {
            label: 'High Risk Rate',
            value: summary.totalScreenings > 0
              ? `${(((summary.riskDistribution?.high || 0) / summary.totalScreenings) * 100).toFixed(1)}%`
              : '0%',
            color: 'text-orange-600',
          },
        ].map((stat) => (
          <div key={stat.label} className="card text-center">
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </Layout>
  )
}
