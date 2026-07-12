/**
 * Shared TypeScript types and interfaces.
 * Domain-specific types will be added here as modules are implemented.
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

// ── User / Auth (prepared) ────────────────────────────────────────────────────

export interface User {
  id: number
  email: string
  fullName: string
  role: UserRole
}

export type UserRole = 'admin' | 'manager' | 'employee' | 'viewer'

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}
