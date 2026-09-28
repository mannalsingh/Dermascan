import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function GoogleAuthButton({
  className = '',
  buttonText = 'Continue with Google',
  disabled = false,
}) {
  const [loading, setLoading] = useState(false)
  const tokenClientRef = useRef(null)
  const { googleLogin } = useAuth()
  const navigate = useNavigate()

  const handleCredentialResponse = useCallback(
    async (response) => {
      if (response?.credential) {
        try {
          setLoading(true)
          await googleLogin({ credential: response.credential })
          toast.success('Signed in successfully with Google')
          navigate('/dashboard', { replace: true })
        } catch (err) {
          console.error('Google credential login error:', err)
          toast.error(err.response?.data?.message || 'Google sign-in failed. Please try again.')
        } finally {
          setLoading(false)
        }
      }
    },
    [googleLogin, navigate]
  )

  const handleTokenResponse = useCallback(
    async (tokenResponse) => {
      if (tokenResponse?.error) {
        console.error('Google token error:', tokenResponse.error)
        toast.error('Google sign-in was cancelled or encountered an error.')
        setLoading(false)
        return
      }

      if (tokenResponse?.access_token) {
        try {
          setLoading(true)
          await googleLogin({ accessToken: tokenResponse.access_token })
          toast.success('Signed in successfully with Google')
          navigate('/dashboard', { replace: true })
        } catch (err) {
          console.error('Google sign-in error:', err)
          const errorMsg = err.response?.data?.message || 'Google sign-in failed. Please try again.'
          toast.error(errorMsg)

          // If backend still expects credential token (older Render build), prompt One-Tap
          if (err.response?.status === 400 && window.google?.accounts?.id) {
            window.google.accounts.id.prompt()
          }
        } finally {
          setLoading(false)
        }
      } else {
        setLoading(false)
      }
    },
    [googleLogin, navigate]
  )

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return

    const setupGoogle = () => {
      if (window.google?.accounts?.oauth2) {
        try {
          tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile openid',
            callback: handleTokenResponse,
          })
        } catch (err) {
          console.error('Error initializing Google token client:', err)
        }
      }

      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleCredentialResponse,
            auto_select: false,
          })
        } catch (err) {
          console.error('Error initializing Google ID client:', err)
        }
      }
    }

    if (window.google?.accounts?.oauth2) {
      setupGoogle()
    } else {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = setupGoogle
      document.body.appendChild(script)
    }
  }, [handleTokenResponse, handleCredentialResponse])

  const handleClick = () => {
    if (loading || disabled) return

    if (!GOOGLE_CLIENT_ID) {
      console.warn('VITE_GOOGLE_CLIENT_ID is not configured in environment.')
      navigate('/login')
      return
    }

    setLoading(true)

    const triggerClient = () => {
      try {
        if (!tokenClientRef.current && window.google?.accounts?.oauth2) {
          tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'email profile openid',
            callback: handleTokenResponse,
          })
        }
        if (tokenClientRef.current) {
          tokenClientRef.current.requestAccessToken({ prompt: 'select_account' })
        } else {
          setLoading(false)
          navigate('/login')
        }
      } catch (e) {
        console.error('Failed to trigger Google access token:', e)
        setLoading(false)
      }
    }

    if (window.google?.accounts?.oauth2) {
      triggerClient()
    } else {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = () => {
        triggerClient()
      }
      script.onerror = () => {
        setLoading(false)
        navigate('/login')
      }
      document.body.appendChild(script)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading || disabled}
      className={`inline-flex items-center justify-center gap-2.5 bg-white hover:bg-slate-50 active:bg-slate-100 border border-[#dadce0] hover:border-[#c6c9ce] text-[#3c4043] font-medium text-sm py-2 px-4 rounded-xl shadow-xs transition-all duration-150 cursor-pointer disabled:opacity-50 select-none ${className}`}
    >
      {loading ? (
        <div className="w-4 h-4 border-2 border-slate-300 border-t-teal-600 rounded-full animate-spin flex-shrink-0" />
      ) : (
        <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
      )}
      <span className="font-sans font-medium text-sm text-[#3c4043] tracking-normal whitespace-nowrap">
        {loading ? 'Connecting…' : buttonText}
      </span>
    </button>
  )
}
