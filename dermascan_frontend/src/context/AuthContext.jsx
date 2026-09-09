import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { authAPI, userAPI } from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('dermascan_token')
      const savedUser = localStorage.getItem('dermascan_user')
      if (savedToken && savedUser) {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
      }
    } catch (e) {
      localStorage.removeItem('dermascan_token')
      localStorage.removeItem('dermascan_user')
    } finally {
      setLoading(false)
    }
  }, [])

  const saveAuth = useCallback((tokenVal, userVal) => {
    localStorage.setItem('dermascan_token', tokenVal)
    localStorage.setItem('dermascan_user', JSON.stringify(userVal))
    setToken(tokenVal)
    setUser(userVal)
  }, [])

  const clearAuth = useCallback(() => {
    localStorage.removeItem('dermascan_token')
    localStorage.removeItem('dermascan_user')
    setToken(null)
    setUser(null)
  }, [])

  const register = useCallback(async (name, email, password) => {
    const res = await authAPI.register({ name, email, password })
    const { token: t, user: u } = res.data
    saveAuth(t, u)
    return res.data
  }, [saveAuth])

  const login = useCallback(async (email, password) => {
    const res = await authAPI.login({ email, password })
    const { token: t, user: u } = res.data
    saveAuth(t, u)
    return res.data
  }, [saveAuth])

  const googleLogin = useCallback(async (name, email) => {
    const res = await authAPI.googleLogin({ name, email })
    const { token: t, user: u } = res.data
    saveAuth(t, u)
    return res.data
  }, [saveAuth])

  const logout = useCallback(() => {
    clearAuth()
  }, [clearAuth])

  const refreshProfile = useCallback(async () => {
    try {
      const res = await userAPI.getProfile()
      const profileUser = res.data?.data?.user
      if (profileUser) {
        const updated = { ...user, ...profileUser }
        localStorage.setItem('dermascan_user', JSON.stringify(updated))
        setUser(updated)
      }
    } catch (e) {
      
    }
  }, [user])

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token,
    register,
    login,
    googleLogin,
    logout,
    saveAuth,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
