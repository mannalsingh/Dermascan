import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { screeningAPI, resolveHeatmapUrl } from '../api/axios'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import RiskBadge, { PredictionBadge } from '../components/RiskBadge'
import {
  ArrowLeft, Download, AlertTriangle, CheckCircle,
  Calendar, Scan, Info, Image as ImageIcon
} from 'lucide-react'

export default function ScreeningDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [heatmapError, setHeatmapError] = useState(false)

  useEffect(() => {
    screeningAPI.getById(id)
      .then((r) => {
        const s = r.data?.screening
        if (s?.result?.heatmapUrl) {
          s.result.heatmapUrl = resolveHeatmapUrl(s.result.heatmapUrl)
        }
        setData(s)
      })
      .catch(() => setError('Could not load screening details.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleDownload = async () => {
    try {
      setDownloading(true)
      const res = await screeningAPI.downloadReport(id)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `dermascan-report-${id}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      setError('Could not download report.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <LoadingSpinner size="lg" text="Loading screening details…" />
        </div>
      </Layout>
    )
  }

  if (error || !data) {
    return (
      <Layout>
        <div className="card text-center py-12">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h2 className="font-bold text-xl text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-500 mb-6">{error || 'Screening not found.'}</p>
          <button onClick={() => navigate(-1)} className="btn-primary inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Go Back
          </button>
        </div>
      </Layout>
    )
  }

  const result = data.result
  const isMalignant = result?.prediction?.toLowerCase() === 'malignant'

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to History
        </button>

        <div className={`card mb-6 border-l-4 ${isMalignant ? 'border-l-red-500' : 'border-l-green-500'}`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="section-title mb-2">Screening Detail</h1>
              <div className="flex items-center gap-2 flex-wrap">
                {result && <PredictionBadge prediction={result.prediction} />}
                {result && <RiskBadge level={result.riskLevel} />}
              </div>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="btn-secondary flex items-center gap-2"
            >
              {downloading ? <LoadingSpinner size="sm" /> : <Download className="h-4 w-4" />}
              {downloading ? 'Downloading…' : 'Download PDF'}
            </button>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500 mt-3">
            <Calendar className="h-4 w-4" />
            {new Date(data.uploadedAt || data.createdAt).toLocaleDateString('en-IN', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          
          <div className="card">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1">
              <ImageIcon className="h-3.5 w-3.5" /> Original Image
            </p>
            <div className="bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center min-h-48">
              {data.imageUrl ? (
                <img
                  src={data.imageUrl}
                  alt="Original lesion"
                  className="w-full object-contain max-h-64"
                />
              ) : (
                <div className="text-center py-8">
                  <Scan className="h-10 w-10 text-gray-300 mx-auto" />
                  <p className="text-xs text-gray-400 mt-2">Image not available</p>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1">
              <Scan className="h-3.5 w-3.5" /> Lesion Heatmap
            </p>
            <div className="bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center min-h-48">
              {result?.heatmapUrl && !heatmapError ? (
                <img
                  src={result.heatmapUrl}
                  alt="Lesion heatmap"
                  className="w-full object-contain max-h-64"
                  onError={() => setHeatmapError(true)}
                />
              ) : (
                <div className="text-center py-8">
                  <Info className="h-10 w-10 text-gray-300 mx-auto" />
                  <p className="text-xs text-gray-400 mt-2">
                    {heatmapError ? 'Heatmap unavailable' : 'No heatmap generated'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {result && (
          <div className="card mb-6">
            <h2 className="font-bold text-gray-900 mb-4">Analysis Results</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Prediction</p>
                <p className={`text-2xl font-bold capitalize ${isMalignant ? 'text-red-600' : 'text-green-600'}`}>
                  {result.prediction}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-1">Confidence</p>
                <p className="text-2xl font-bold text-blue-700">
                  {((result.confidenceScore || 0) * 100).toFixed(2)}%
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500 mb-2">Risk Level</p>
                <RiskBadge level={result.riskLevel} size="md" />
              </div>
            </div>

            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Confidence Score</span>
                <span>{((result.confidenceScore || 0) * 100).toFixed(2)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-700 ${isMalignant ? 'bg-red-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(100, (result.confidenceScore || 0) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <div className={`p-4 border rounded-xl flex gap-3 mb-6 ${isMalignant ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
          {isMalignant
            ? <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            : <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
          }
          <div>
            <p className={`font-semibold text-sm mb-1 ${isMalignant ? 'text-red-700' : 'text-green-700'}`}>
              Recommendation
            </p>
            <p className={`text-sm ${isMalignant ? 'text-red-600' : 'text-green-600'}`}>
              {isMalignant
                ? 'Please consult a dermatologist promptly. The AI detected characteristics associated with malignancy. Early professional evaluation is strongly recommended.'
                : 'The lesion appears benign. Continue regular self-examinations and schedule routine annual skin checks with a dermatologist.'}
            </p>
          </div>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            <strong>Disclaimer:</strong> This AI analysis is for preliminary screening only and is
            NOT a medical diagnosis. Always consult a qualified dermatologist for professional evaluation.
          </p>
        </div>

        <div className="flex gap-3 mt-6">
          <Link to="/history" className="btn-secondary flex-1 flex items-center justify-center gap-2">
            <ArrowLeft className="h-4 w-4" /> Back to History
          </Link>
          <Link to="/screening" className="btn-primary flex-1 flex items-center justify-center gap-2">
            New Scan
          </Link>
        </div>
      </div>
    </Layout>
  )
}
