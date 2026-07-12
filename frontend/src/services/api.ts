/**
 * Centralised Axios instance.
 *
 * - Base URL driven by VITE_API_BASE_URL.
 * - Request interceptor attaches the JWT Bearer token.
 * - Response interceptor: on 401 clears the stored token and redirects to /login.
 */

import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1'

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

// ── Request — attach token ────────────────────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem('access_token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error),
)

// ── Response — normalise errors + redirect on 401 ────────────────────────────
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response

      if (status === 401) {
        localStorage.removeItem('access_token')
        // Only redirect if we're not already on an auth page to prevent loops
        const currentPath = window.location.pathname
        if (currentPath !== '/login' && currentPath !== '/signup') {
          window.location.href = '/login'
        }
      }

      // Surface the backend detail message when available
      const detail = error.response.data?.detail ?? error.response.data?.message
      return Promise.reject(new Error(detail ?? 'An unexpected error occurred.'))
    }

    return Promise.reject(new Error('Network error — please check your connection.'))
  },
)

export default api
