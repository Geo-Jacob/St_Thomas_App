import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
})

let isRefreshing = false
let pendingRequests: Array<(token: string | null) => void> = []

function resolvePendingRequests(token: string | null) {
  pendingRequests.forEach((callback) => callback(token))
  pendingRequests = []
}

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('ecclesia_access')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const status = error?.response?.status

    if (!originalRequest || status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    const requestUrl = String(originalRequest.url || '')
    if (requestUrl.includes('/auth/login/') || requestUrl.includes('/auth/refresh/')) {
      return Promise.reject(error)
    }

    const refreshToken = sessionStorage.getItem('ecclesia_refresh')
    if (!refreshToken) {
      sessionStorage.removeItem('ecclesia_access')
      sessionStorage.removeItem('ecclesia_refresh')
      sessionStorage.removeItem('ecclesia_first_login')
      sessionStorage.removeItem('ecclesia_user')
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push((newToken) => {
          if (!newToken) {
            reject(error)
            return
          }
          originalRequest.headers = originalRequest.headers ?? {}
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          resolve(api(originalRequest))
        })
      })
    }

    originalRequest._retry = true
    isRefreshing = true

    try {
      const refreshResponse = await axios.post('/api/auth/refresh/', { refresh: refreshToken })
      const newAccessToken = refreshResponse.data?.access

      if (!newAccessToken) {
        throw new Error('Missing access token in refresh response')
      }

      sessionStorage.setItem('ecclesia_access', newAccessToken)
      resolvePendingRequests(newAccessToken)

      originalRequest.headers = originalRequest.headers ?? {}
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
      return api(originalRequest)
    } catch (refreshError) {
      resolvePendingRequests(null)
      sessionStorage.removeItem('ecclesia_access')
      sessionStorage.removeItem('ecclesia_refresh')
      sessionStorage.removeItem('ecclesia_first_login')
      sessionStorage.removeItem('ecclesia_user')
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)
