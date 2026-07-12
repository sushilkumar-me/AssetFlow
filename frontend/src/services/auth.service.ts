/**
 * Auth service — wraps all /auth API calls.
 * Components and context use this instead of calling `api` directly.
 */

import api from './api'
import type {
  LoginRequest,
  MessageResponse,
  SignupRequest,
  TokenResponse,
  User,
} from '@/types'

const BASE = '/auth'

export const authService = {
  /**
   * POST /auth/signup
   * Register a new EMPLOYEE account and receive a JWT.
   */
  async signup(payload: SignupRequest): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>(`${BASE}/signup`, payload)
    return data
  },

  /**
   * POST /auth/login
   * Validate credentials and receive a JWT.
   */
  async login(payload: LoginRequest): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>(`${BASE}/login`, payload)
    return data
  },

  /**
   * GET /auth/me
   * Return the profile of the currently authenticated user.
   * Requires a valid JWT in the Authorization header (attached by Axios interceptor).
   */
  async me(): Promise<User> {
    const { data } = await api.get<User>(`${BASE}/me`)
    return data
  },

  /**
   * POST /auth/logout
   * Stateless server-side logout — removes local token regardless of response.
   */
  async logout(): Promise<MessageResponse> {
    const { data } = await api.post<MessageResponse>(`${BASE}/logout`)
    return data
  },
}
