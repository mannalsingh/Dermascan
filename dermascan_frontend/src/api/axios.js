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
    if (error.response?.status === 401) {
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
}

export const userAPI = {
  getProfile: () => api.get('/api/user/profile'),
  updateProfile: (data) => api.put('/api/user/profile', data),
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

export const resolveHeatmapUrl = (url) => {
  if (!url) return null
  
  return url
    .replace('http://127.0.0.1:8000', 'http://localhost:8000')
    .replace(/http:\/\/\d+\.\d+\.\d+\.\d+:8000/, 'http://localhost:8000')
}

export default api
