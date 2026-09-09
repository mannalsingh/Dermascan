import React, { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { screeningAPI, resolveHeatmapUrl } from '../api/axios'
import Layout from '../components/Layout'
import LoadingSpinner from '../components/LoadingSpinner'
import RiskBadge, { PredictionBadge } from '../components/RiskBadge'
import {
  Upload, Image as ImageIcon, X, CheckCircle, AlertTriangle,
  Download, Eye, RotateCcw, Scan, Info
} from 'lucide-react'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE_MB = 10

function ProgressBar({ value, color = 'blue' }) {
  const colors = { blue: 'bg-blue-500', green: 'bg-green-500', red: 'bg-red-500' }
  return (
    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
      <div
        className={`h-3 rounded-full transition-all duration-700 ${colors[color] || colors.blue}`}
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  )
}

function RecommendationBox({ prediction, riskLevel, confidence }) {
  const isMalignant = prediction?.toLowerCase() === 'malignant'
  const isHigh = riskLevel?.toLowerCase() === 'high'
  const isMedium = riskLevel?.toLowerCase() === 'medium'

  const getRecommendation = () => {
    if (isMalignant && isHigh)
      return { icon: AlertTriangle, color: 'red', msg: 'URGENT: Please consult a dermatologist immediately. The AI has detected characteristics suggestive of a malignant lesion with high confidence. Do not delay medical attention.' }
    if (isMalignant && isMedium)
      return { icon: AlertTriangle, color: 'orange', msg: 'Schedule an appointment with a dermatologist as soon as possible. The AI has detected potentially concerning characteristics that require professional evaluation.' }
    if (!isMalignant && isHigh)
      return { icon: Info, color: 'yellow', msg: 'While classified as benign, the high-risk flag suggests monitoring. Schedule a routine dermatology checkup within the next few weeks.' }
    return { icon: CheckCircle, color: 'green', msg: 'The lesion appears benign with low risk. Continue regular self-examination and schedule routine annual skin checks with a dermatologist.' }
  }

  const rec = getRecommendation()
  const Icon = rec.icon
  const colorMap = {
    red:    'bg-red-50 border-red-200 text-red-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    green:  'bg-green-50 border-green-200 text-green-700',
  }
  const iconMap = {
    red: 'text-red-500', orange: 'text-orange-500', yellow: 'text-yellow-500', green: 'text-green-500',
  }

  return (
    <div className={`p-4 border rounded-xl flex gap-3 ${colorMap[rec.color]}`}>
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${iconMap[rec.color]}`} />
      <div>
        <p className="font-semibold text-sm mb-1">Recommendation</p>
        <p className="text-sm">{rec.msg}</p>
      </div>
    </div>
  )
}

export default function ScreeningPage() {
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const validateFile = (f) => {
    if (!ALLOWED_TYPES.includes(f.type)) return 'Please upload a JPEG, PNG, or WebP image.'
    if (f.size > MAX_SIZE_MB * 1024 * 1024) return `File size must be under ${MAX_SIZE_MB} MB.`
    return null
  }

  const setImage = useCallback((f) => {
    const err = validateFile(f)
    if (err) { setError(err); return }
    setError('')
    setFile(f)
    setResult(null)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }, [])

  const handleFileInput = (e) => {
    if (e.target.files?.[0]) setImage(e.target.files[0])
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files?.[0]) setImage(e.dataTransfer.files[0])
  }

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true) }
  const handleDragLeave = () => setDragging(false)

  const clearImage = () => {
    setFile(null)
    setPreview(null)
    setResult(null)
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleUpload = async () => {
    if (!file) return
    try {
      setUploading(true)
      setError('')
      setUploadProgress(0)

      const formData = new FormData()
      formData.append('image', file)

      const progressInterval = setInterval(() => {
        setUploadProgress((p) => Math.min(p + 0.08, 0.85))
      }, 300)

      const res = await screeningAPI.upload(formData)
      clearInterval(progressInterval)
      setUploadProgress(1)

      const r = res.data?.result
      setResult({
        ...r,
        heatmapUrl: resolveHeatmapUrl(r?.heatmapUrl),
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
      setTimeout(() => setUploadProgress(0), 600)
    }
  }

  const handleDownloadReport = async () => {
    if (!result?.screeningId) return
    try {
      const res = await screeningAPI.downloadReport(result.screeningId)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `dermascan-report-${result.screeningId}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      setError('Could not download report. Please try again.')
    }
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="section-title">New Skin Screening</h1>
          <p className="text-gray-500 mt-1">Upload a skin lesion image for AI analysis</p>
        </div>

        <div className="card bg-blue-50 border-blue-100 mb-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Tips for best results:</p>
              <ul className="space-y-0.5 list-disc list-inside text-blue-700">
                <li>Use good lighting – natural light is ideal</li>
                <li>Keep the image focused and clear</li>
                <li>Ensure the lesion fills most of the frame</li>
                <li>Accepted formats: JPEG, PNG, WebP (max {MAX_SIZE_MB}MB)</li>
              </ul>
            </div>
          </div>
        </div>

        {!result && (
          <div className="card mb-6">
            {!preview ? (
              
              <div
                className={`dropzone ${dragging ? 'active' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileRef.current?.click()}
              >
                <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
                  <ImageIcon className="h-10 w-10 text-gray-400" />
                </div>
                <p className="text-gray-700 font-medium mb-1">
                  {dragging ? 'Drop the image here' : 'Drag & drop an image, or tap to browse'}
                </p>
                <p className="text-sm text-gray-400">JPEG, PNG, WebP up to {MAX_SIZE_MB}MB</p>
                <input
                  ref={fileRef} type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileInput} className="hidden"
                  capture="environment" 
                />
              </div>
            ) : (
              
              <div>
                <div className="relative group">
                  <img
                    src={preview} alt="Selected skin lesion"
                    className="w-full max-h-80 object-contain rounded-xl bg-gray-100"
                  />
                  <button
                    onClick={clearImage}
                    className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2 text-center">
                  {file?.name} — {(file?.size / 1024 / 1024).toFixed(2)} MB
                </p>

                {uploading && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                      <span className="flex items-center gap-2">
                        <LoadingSpinner size="sm" />
                        Analyzing image with AI…
                      </span>
                      <span>{Math.round(uploadProgress * 100)}%</span>
                    </div>
                    <ProgressBar value={uploadProgress} color="blue" />
                    <p className="text-xs text-gray-400 mt-2 text-center">
                      This may take up to 30 seconds — the AI is generating predictions and heatmaps
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="mt-4 flex gap-3">
              {preview && !uploading && (
                <>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="btn-secondary flex items-center gap-2 flex-1 justify-center"
                  >
                    <RotateCcw className="h-4 w-4" /> Change Image
                  </button>
                  <button
                    onClick={handleUpload}
                    className="btn-primary flex items-center gap-2 flex-1 justify-center"
                  >
                    <Scan className="h-4 w-4" /> Analyze
                  </button>
                </>
              )}
              {!preview && (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="btn-primary w-full flex items-center gap-2 justify-center"
                >
                  <Upload className="h-4 w-4" /> Browse Files
                </button>
              )}
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="card border-l-4 border-l-blue-500">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-xl text-gray-900">Analysis Result</h2>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <PredictionBadge prediction={result.prediction} />
                  <RiskBadge level={result.riskLevel} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Original Image</p>
                  <img src={preview} alt="Original" className="w-full rounded-xl object-contain bg-gray-100 max-h-60" />
                </div>
                {result.heatmapUrl && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Lesion Heatmap</p>
                    <img
                      src={result.heatmapUrl} alt="Lesion heatmap"
                      className="w-full rounded-xl object-contain bg-gray-100 max-h-60"
                      onError={(e) => { e.target.parentElement.style.display = 'none' }}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Prediction</p>
                  <p className={`font-bold text-lg capitalize ${result.prediction === 'malignant' ? 'text-red-600' : 'text-green-600'}`}>
                    {result.prediction}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-xs text-gray-500 mb-1">Confidence</p>
                  <p className="font-bold text-lg text-blue-700">
                    {(result.confidenceScore * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center col-span-2 sm:col-span-1">
                  <p className="text-xs text-gray-500 mb-1">Risk Level</p>
                  <RiskBadge level={result.riskLevel} size="md" />
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Confidence Score</span>
                  <span>{(result.confidenceScore * 100).toFixed(2)}%</span>
                </div>
                <ProgressBar
                  value={result.confidenceScore}
                  color={result.prediction === 'malignant' ? 'red' : 'green'}
                />
              </div>

              <RecommendationBox
                prediction={result.prediction}
                riskLevel={result.riskLevel}
                confidence={result.confidenceScore}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDownloadReport}
                className="btn-secondary flex items-center gap-2 justify-center flex-1"
              >
                <Download className="h-4 w-4" /> Download PDF Report
              </button>
              <button
                onClick={() => navigate(`/history/${result.screeningId}`)}
                className="btn-secondary flex items-center gap-2 justify-center flex-1"
              >
                <Eye className="h-4 w-4" /> View Details
              </button>
              <button
                onClick={clearImage}
                className="btn-primary flex items-center gap-2 justify-center flex-1"
              >
                <RotateCcw className="h-4 w-4" /> New Scan
              </button>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-sm">
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-amber-700">
                <strong>Disclaimer:</strong> This AI analysis is for preliminary screening only and
                is NOT a medical diagnosis. Please consult a licensed dermatologist for proper evaluation.
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
