/**
 * Centralised Axios instance.
 *
 * - Base URL is driven by VITE_API_BASE_URL environment variable.
 * - Request interceptor attaches the JWT Bearer token when present.
 * - Response interceptor normalises errors for consistent handling.
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

// ── Request interceptor — attach auth token ───────────────────────────────────
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

// ── Response interceptor — normalise errors ───────────────────────────────────
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response) {
      const { status } = error.response

      if (status === 401) {
        // Token expired or invalid — clear local storage
        // Auth redirect will be handled once the auth module is implemented
        localStorage.removeItem('access_token')
      }

      return Promise.reject(error.response.data ?? error)
    }

    // Network error or timeout
    return Promise.reject(new Error('Network error — please check your connection.'))
  },
)

export default api
