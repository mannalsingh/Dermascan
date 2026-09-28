import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Timer, RefreshCw, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react'
import api from '../api/axios'

/**
 * Mask email helper for client-side fallback
 */
export function maskEmail(email) {
  if (!email || !email.includes('@')) return email || ''
  const [local, domain] = email.split('@')
  if (local.length <= 2) return `${local[0]}*@${domain}`
  if (local.length <= 4) return `${local[0]}**${local.slice(-1)}@${domain}`
  const visibleStart = local.slice(0, 2)
  const visibleEnd = local.slice(-2)
  const maskedMiddle = '*'.repeat(Math.min(4, Math.max(local.length - 4, 2)))
  return `${visibleStart}${maskedMiddle}${visibleEnd}@${domain}`
}

export default function OtpInput({
  email,
  maskedEmail,
  type = 'login',
  title = 'Verify your email',
  message = "We've sent a 4-digit verification code to your email.",
  onVerified,
  onVerifyCustom,
  onResendCustom,
  onBack,
  initialCooldown = 30,
  initialExpiry = 300, // 5 minutes
}) {
  const [otp, setOtp] = useState(['', '', '', ''])
  const [expiryLeft, setExpiryLeft] = useState(initialExpiry)
  const [cooldownLeft, setCooldownLeft] = useState(initialCooldown)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState('')

  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)]
  const displayEmail = maskedEmail || maskEmail(email)

  // Auto-focus first input on render
  useEffect(() => {
    inputRefs[0].current?.focus()
  }, [])

  // 5-minute validity countdown
  useEffect(() => {
    if (expiryLeft <= 0) return
    const timer = setInterval(() => {
      setExpiryLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [expiryLeft])

  // 30-second resend cooldown timer
  useEffect(() => {
    if (cooldownLeft <= 0) return
    const timer = setInterval(() => {
      setCooldownLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldownLeft])

  const formatExpiryTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const submitOtp = useCallback(
    async (otpArr) => {
      const code = otpArr.join('')
      if (code.length !== 4) {
        setError('Please enter all 4 digits of the code.')
        return
      }

      if (expiryLeft <= 0) {
        setError('Verification code has expired. Please click Resend Code below.')
        return
      }

      try {
        setLoading(true)
        setError('')
        setResendSuccess('')

        if (onVerifyCustom) {
          await onVerifyCustom(code)
        } else {
          const res = await api.post('/api/auth/verify-otp', { email, otp: code, type })
          const { otpToken } = res.data
          if (onVerified) onVerified(otpToken)
        }
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Invalid verification code. Please try again.'
        setError(msg)
        setOtp(['', '', '', ''])
        setTimeout(() => inputRefs[0].current?.focus(), 50)
      } finally {
        setLoading(false)
      }
    },
    [email, type, expiryLeft, onVerifyCustom, onVerified]
  )

  const handleChange = (index, value) => {
    const digit = value.replace(/\D/g, '').slice(-1)
    const newOtp = [...otp]
    newOtp[index] = digit
    setOtp(newOtp)
    setError('')
    setResendSuccess('')

    if (digit && index < 3) {
      inputRefs[index + 1].current?.focus()
    }

    if (digit && index === 3) {
      const filled = [...newOtp]
      if (filled.every((d) => d !== '')) {
        submitOtp(filled)
      }
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
    setResendSuccess('')

    const nextIndex = Math.min(pasted.length, 3)
    inputRefs[nextIndex].current?.focus()

    if (pasted.length === 4) {
      submitOtp(newOtp)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await submitOtp(otp)
  }

  const handleResend = async () => {
    if (cooldownLeft > 0 || resending) return

    try {
      setResending(true)
      setError('')
      setResendSuccess('')

      if (onResendCustom) {
        await onResendCustom()
      } else {
        await api.post('/api/auth/send-otp', { email, type })
      }

      setOtp(['', '', '', ''])
      setCooldownLeft(30)
      setExpiryLeft(300)
      setResendSuccess('A new 4-digit verification code has been dispatched to your email.')
      setTimeout(() => inputRefs[0].current?.focus(), 50)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend code. Please wait a moment and try again.'
      setError(msg)
    } finally {
      setResending(false)
    }
  }

  const allFilled = otp.every((d) => d !== '')
  const timerWarning = expiryLeft < 60 ? 'text-[#B42318] font-bold' : 'text-[#0F8F87] font-semibold'

  return (
    <div className="animate-fade-in-scale">
      {/* Icon & Title */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-[#E8F6F4] border border-[#BFE4DF] rounded-2xl mb-3 shadow-xs">
          <ShieldCheck className="h-7 w-7 text-[#0F8F87]" />
        </div>
        <h2 className="text-2xl font-bold text-[#102A43] tracking-tight mb-1.5">{title}</h2>
        <p className="text-[#486581] text-sm mb-1">{message}</p>
        <p className="text-xs text-[#486581] font-mono tracking-wide bg-[#F5F9F9] inline-block px-3 py-1 rounded-lg border border-[#D9E5E3]">
          {displayEmail}
        </p>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* 4 Digit Boxes */}
        <div className="flex justify-center gap-3.5 mb-5">
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
              className="otp-input w-14 h-14 text-center text-2xl font-bold rounded-xl border-2 border-[#C7D8D6] focus:border-[#0F8F87] focus:ring-4 focus:ring-[#0F8F87]/15 outline-none transition-all"
              placeholder="•"
              disabled={loading}
              aria-label={`Digit ${i + 1}`}
            />
          ))}
        </div>

        {/* Expiration Timer Indicator */}
        <div className={`flex items-center justify-center gap-1.5 text-xs mb-4 ${timerWarning}`}>
          <Timer className="h-4 w-4" />
          <span>
            {expiryLeft > 0
              ? `Code expires in ${formatExpiryTime(expiryLeft)}`
              : 'Code has expired. Please click resend below.'}
          </span>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mb-4 p-3 bg-[#FDF0F0] border border-[#F1C4C4] rounded-xl text-xs text-[#B42318] flex items-start gap-2 animate-fade-in-scale">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-[#B42318]" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Resend Success Message */}
        {resendSuccess && (
          <div className="mb-4 p-3 bg-[#EAF7F0] border border-[#B8DFC8] rounded-xl text-xs text-[#176B45] font-medium text-center animate-fade-in-scale">
            {resendSuccess}
          </div>
        )}

        {/* Verify Button */}
        <button
          type="submit"
          disabled={!allFilled || loading || expiryLeft === 0}
          className="btn-primary w-full py-3 flex items-center justify-center gap-2 mb-4 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span>Verifying code…</span>
            </>
          ) : (
            'Verify & Sign In'
          )}
        </button>

        {/* Resend Action with 30s Cooldown */}
        <div className="text-center text-sm text-[#486581] mb-2">
          {cooldownLeft > 0 ? (
            <p className="text-xs text-[#829AB1]">
              Resend code available in{' '}
              <span className="font-semibold text-[#243B53]">{cooldownLeft}s</span>
            </p>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0F8F87] hover:text-[#0B766F] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${resending ? 'animate-spin' : ''}`} />
              {resending ? 'Sending code…' : 'Resend code'}
            </button>
          )}
        </div>

        {/* Back Link */}
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="mt-3 w-full flex items-center justify-center gap-1.5 text-[#486581] hover:text-[#102A43] text-xs font-medium transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Sign In
          </button>
        )}
      </form>
    </div>
  )
}
