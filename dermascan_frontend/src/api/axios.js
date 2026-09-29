import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, 
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dermascan_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
      localStorage.removeItem('dermascan_token')
      localStorage.removeItem('dermascan_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  googleLogin: (data) => api.post('/api/auth/google', data),
  verifyGoogleOtp: (data) => api.post('/api/auth/google/verify-otp', data),
  resendGoogleOtp: (data) => api.post('/api/auth/google/resend-otp', data),
  loginInitiate: (data) => api.post('/api/auth/login-initiate', data),
  loginComplete: (data) => api.post('/api/auth/login-complete', data),
  sendOtp: (data) => api.post('/api/auth/send-otp', data),
  verifyOtp: (data) => api.post('/api/auth/verify-otp', data),
  forgotPassword: (data) => api.post('/api/auth/forgot-password', data),
  resetPassword: (data) => api.post('/api/auth/reset-password', data),
}

export const userAPI = {
  getProfile: () => api.get('/api/user/profile'),
  updateProfile: (data) => api.put('/api/user/profile', data),
  changePassword: (data) => api.post('/api/user/change-password', data),
  requestEmailChange: (data) => api.post('/api/user/request-email-change', data),
  confirmEmailChange: (data) => api.post('/api/user/confirm-email-change', data),
}

export const screeningAPI = {
  upload: (formData) =>
    api.post('/api/screening/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),
  getHistory: () => api.get('/api/screening/history'),
  getById: (id) => api.get(`/api/screening/${id}`),
  downloadReport: (id) =>
    api.get(`/api/screening/${id}/report`, { responseType: 'blob', timeout: 30000 }),
}

export const analyticsAPI = {
  getSummary: () => api.get('/api/analytics/summary'),
}

export const resolveImageUrl = (url) => {
  if (!url) return null
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  const cleanPath = url.startsWith('/') ? url : `/${url}`
  if (BASE_URL && BASE_URL.trim() !== '') {
    return `${BASE_URL.replace(/\/+$/, '')}${cleanPath}`
  }
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    return `https://dermascan-backend-5x5b.onrender.com${cleanPath}`
  }
  return cleanPath
}

export const resolveHeatmapUrl = (url) => {
  if (!url) return null
  if (url.startsWith('data:') || url.startsWith('blob:')) return url

  const isLocalClient = typeof window !== 'undefined' && (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'))

  if (url.includes('/heatmaps/')) {
    const filename = url.split('/heatmaps/').pop()
    if (filename && filename !== url) {
      if (isLocalClient) {
        return `http://localhost:8000/heatmaps/${filename}`
      }
      return `https://dermascan-ai-service-9e8e.onrender.com/heatmaps/${filename}`
    }
  }

  if (url.startsWith('http://') && url.includes('.onrender.com')) {
    return url.replace('http://', 'https://')
  }

  if (isLocalClient) {
    return url
      .replace('http://127.0.0.1:8000', 'http://localhost:8000')
      .replace(/http:\/\/\d+\.\d+\.\d+\.\d+:8000/, 'http://localhost:8000')
  }

  return url
}

export default api

