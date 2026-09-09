import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { screeningAPI } from '../api/axios'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import RiskBadge, { PredictionBadge } from '../components/RiskBadge'
import {
  History, Scan, Upload, Search, Filter, ChevronRight, Calendar
} from 'lucide-react'

const ITEMS_PER_PAGE = 10

export default function HistoryPage() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') 
  const [page, setPage] = useState(1)

  useEffect(() => {
    screeningAPI.getHistory()
      .then((r) => setHistory(r.data?.history || []))
      .catch(() => setError('Failed to load history. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = history.filter((item) => {
    const matchFilter =
      filter === 'all' ||
      item.prediction?.toLowerCase() === filter
    return matchFilter
  })

  const paginated = filtered.slice(0, page * ITEMS_PER_PAGE)
  const hasMore = paginated.length < filtered.length

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <LoadingSpinner size="lg" text="Loading history…" />
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="section-title">Screening History</h1>
        <p className="text-gray-500 mt-1">All your past skin screenings</p>
      </div>

      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'All' },
              { key: 'benign', label: 'Benign' },
              { key: 'malignant', label: 'Malignant' },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setPage(1) }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filter === f.key
                    ? 'bg-blue-700 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="text-sm text-gray-500 flex items-center sm:ml-auto">
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 mb-6">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="card text-center py-16">
          <div className="inline-flex p-5 bg-gray-100 rounded-full mb-4">
            <History className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">No screenings found</h3>
          <p className="text-gray-500 mb-6">
            {filter !== 'all'
              ? `No ${filter} results found.`
              : "You haven't done any screenings yet."}
          </p>
          <Link to="/screening" className="btn-primary inline-flex items-center gap-2">
            <Upload className="h-4 w-4" /> Start First Scan
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {paginated.map((item, idx) => (
            <Link
              key={item.screeningId || idx}
              to={`/history/${item.screeningId}`}
              className="card-hover flex items-center gap-4"
            >
              
              <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl.startsWith('http') ? item.imageUrl : item.imageUrl}
                    alt="scan thumbnail"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div>'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Scan className="h-6 w-6 text-gray-300" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <PredictionBadge prediction={item.prediction} />
                  <RiskBadge level={item.riskLevel} />
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="h-3 w-3" />
                  {new Date(item.uploadedAt).toLocaleDateString('en-IN', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="font-bold text-gray-900 text-lg">
                  {(item.confidenceScore * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-gray-400">Confidence</p>
              </div>

              <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0" />
            </Link>
          ))}

          {hasMore && (
            <div className="text-center pt-2">
              <button
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary"
              >
                Load More ({filtered.length - paginated.length} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </Layout>
  )
}
