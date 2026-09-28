import React, { useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export default function GoogleAuthButton({
  width = 340,
  shape = 'rectangular',
  text = 'continue_with',
  className = '',
  onError = null,
}) {
  const containerRef = useRef(null)
  const { googleLogin } = useAuth()
  const navigate = useNavigate()

  const handleCredentialResponse = useCallback(
    async (response) => {
      try {
        await googleLogin(response.credential)
        navigate('/dashboard', { replace: true })
      } catch (err) {
        console.error('Google sign-in error:', err)
        if (onError) onError(err)
      }
    },
    [googleLogin, navigate, onError]
  )

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return

    let isMounted = true

    const renderGsiButton = () => {
      if (!isMounted || !containerRef.current || !window.google?.accounts?.id) return

      try {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        containerRef.current.innerHTML = ''
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: text, // 'continue_with' renders "Continue with Google"
          shape: shape, // 'rectangular' gives clean borders
          logo_alignment: 'left',
          width: width,
        })
      } catch (err) {
        console.error('Failed to render Google button:', err)
      }
    }

    if (window.google?.accounts?.id) {
      renderGsiButton()
    } else {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = renderGsiButton
      document.body.appendChild(script)
    }

    return () => {
      isMounted = false
    }
  }, [handleCredentialResponse, width, shape, text])

  if (!GOOGLE_CLIENT_ID) {
    return null
  }

  return (
    <div className={`google-btn-container relative flex justify-center items-center ${className}`}>
      <div ref={containerRef} className="min-h-[44px] flex items-center justify-center">
        {/* Crisp fallback while GSI loads */}
        <button
          type="button"
          className="inline-flex items-center justify-center gap-3 bg-white border border-[#dadce0] hover:border-[#c6c9ce] hover:bg-[#f8fafd] text-[#3c4043] font-medium text-sm px-6 py-2.5 rounded-lg shadow-2xs transition-all"
          style={{ width: `${width}px` }}
        >
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
          <span className="font-sans font-medium text-sm text-[#3c4043]">Continue with Google</span>
        </button>
      </div>
    </div>
  )
}
