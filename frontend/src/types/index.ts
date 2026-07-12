/**
 * Shared TypeScript types and interfaces.
 * Kept in sync with the backend Pydantic schemas.
 */

// ── API response envelope ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
}

export interface PaginatedResponse<T = unknown> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ── Common entity shape ───────────────────────────────────────────────────────

export interface BaseEntity {
  id: number
  createdAt: string
  updatedAt: string
}

// ── Navigation ────────────────────────────────────────────────────────────────

export interface NavItem {
  label: string
  path: string
  icon?: string
  children?: NavItem[]
}

// ── Role — must match backend UserRole enum exactly ───────────────────────────

export type UserRole =
  | 'ADMIN'
  | 'ASSET_MANAGER'
  | 'DEPARTMENT_HEAD'
  | 'EMPLOYEE'

// ── User ──────────────────────────────────────────────────────────────────────

export interface User {
  id: number
  full_name: string
  email: string
  role: UserRole
  department_id: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// ── Auth request / response shapes ───────────────────────────────────────────

export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  full_name: string
  email: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
  user: User
}

export interface MessageResponse {
  message: string
}

// ── Auth state ────────────────────────────────────────────────────────────────

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}
