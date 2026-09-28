import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Timer, RefreshCw, ArrowLeft, ShieldCheck } from 'lucide-react'
import api from '../api/axios'

export default function OtpInput({ email, type, onVerified, onBack }) {
  const [otp, setOtp] = useState(['', '', '', ''])
  const [timeLeft, setTimeLeft] = useState(120)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resending, setResending] = useState(false)

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]

  // Focus first input on mount
  useEffect(() => {
    inputRefs[0].current?.focus()
  }, [])

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(interval); return 0 }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [timeLeft])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const submitOtp = useCallback(async (otpArr) => {
    const code = otpArr.join('')
    if (code.length < 4) return
    try {
      setLoading(true)
      setError('')
      const res = await api.post('/api/auth/verify-otp', { email, otp: code, type })
      const { otpToken } = res.data
      onVerified(otpToken)
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid OTP. Please try again.'
      setError(msg)
      setOtp(['', '', '', ''])
      setTimeout(() => inputRefs[0].current?.focus(), 50)
    } finally {
      setLoading(false)
    }
  }, [email, type, onVerified])

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)
    setError('')

    if (digit && index < 3) {
      inputRefs[index + 1].current?.focus()
    }

    if (digit && index === 3) {
      const filled = [...newOtp]
      if (filled.every((d) => d !== '')) {
        submitOtp(filled)
      }
    }

    // Also check if all filled after any change
    if (digit && newOtp.every((d) => d !== '')) {
      submitOtp(newOtp)
    }
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (otp[index] === '' && index > 0) {
        inputRefs[index - 1].current?.focus()
      } else {
        const newOtp = [...otp]
        newOtp[index] = ''
        setOtp(newOtp)
      }
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs[index - 1].current?.focus()
    }
    if (e.key === 'ArrowRight' && index < 3) {
      inputRefs[index + 1].current?.focus()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
    if (!pasted) return
    const newOtp = ['', '', '', '']
    for (let i = 0; i < pasted.length; i++) {
      newOtp[i] = pasted[i]
    }
    setOtp(newOtp)
    setError('')
    const lastIndex = Math.min(pasted.length - 1, 3)
    inputRefs[lastIndex].current?.focus()
    if (pasted.length === 4) {
      submitOtp(newOtp)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await submitOtp(otp)
  }

  const handleResend = async () => {
    try {
      setResending(true)
      setError('')
      await api.post('/api/auth/send-otp', { email, type })
      setOtp(['', '', '', ''])
      setTimeLeft(120)
      setTimeout(() => inputRefs[0].current?.focus(), 50)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend OTP. Please try again.'
      setError(msg)
    } finally {
      setResending(false)
    }
  }

  const allFilled = otp.every((d) => d !== '')
  const timerColor = timeLeft < 30 ? 'text-red-500' : 'text-teal-600'

  return (
    <div className="animate-fade-in-scale">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-100 rounded-full mb-4">
          <ShieldCheck className="h-8 w-8 text-teal-600" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Enter verification code</h2>
        <p className="text-teal-200 text-sm">
          We sent a 4-digit code to{' '}
          <span className="font-semibold text-white">{email}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* OTP Boxes */}
        <div className="flex justify-center gap-3 mb-6">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={inputRefs[i]}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className="otp-input"
              placeholder="·"
              disabled={loading}
              aria-label={`OTP digit ${i + 1}`}
            />
          ))}
        </div>

        {/* Timer */}
        <div className={`flex items-center justify-center gap-1.5 text-sm font-medium mb-4 ${timerColor}`}>
          <Timer className="h-4 w-4" />
          <span>
            {timeLeft > 0
              ? `Code expires in ${formatTime(timeLeft)}`
              : 'OTP expired'}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-400/40 rounded-lg text-sm text-red-200 text-center">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!allFilled || loading || timeLeft === 0}
          className="w-full bg-teal-500 hover:bg-teal-400 disabled:bg-teal-800 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 mb-4"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Verifying…
            </>
          ) : (
            'Verify Code'
          )}
        </button>

        {/* Resend */}
        <div className="text-center">
          {timeLeft === 0 ? (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-1.5 text-teal-300 hover:text-white text-sm font-medium transition-colors duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />
              {resending ? 'Sending…' : 'Resend code'}
            </button>
          ) : (
            <p className="text-teal-300 text-sm">
              Didn't receive it?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-white hover:underline font-medium disabled:opacity-50"
              >
                {resending ? 'Sending…' : 'Resend code'}
              </button>
            </p>
          )}
        </div>

        {/* Back */}
        <button
          type="button"
          onClick={onBack}
          className="mt-5 w-full flex items-center justify-center gap-2 text-teal-300 hover:text-white text-sm transition-colors duration-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </form>
    </div>
  )
}
