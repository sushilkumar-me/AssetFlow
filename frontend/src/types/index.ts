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
  page_size: number
  total_pages: number
}

// ── Common entity shape ───────────────────────────────────────────────────────

export interface BaseEntity {
  id: number
  created_at: string
  updated_at: string
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

export const USER_ROLES: UserRole[] = [
  'ADMIN',
  'ASSET_MANAGER',
  'DEPARTMENT_HEAD',
  'EMPLOYEE',
]

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN:           'Administrator',
  ASSET_MANAGER:   'Asset Manager',
  DEPARTMENT_HEAD: 'Department Head',
  EMPLOYEE:        'Employee',
}

// ── User ──────────────────────────────────────────────────────────────────────

export interface User extends BaseEntity {
  full_name: string
  email: string
  role: UserRole
  department_id: number | null
  is_active: boolean
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

// ── Department ────────────────────────────────────────────────────────────────

export interface Department extends BaseEntity {
  name: string
  description: string | null
  parent_department_id: number | null
  department_head_id: number | null
  is_active: boolean
}

export interface DepartmentCreate {
  name: string
  description?: string | null
  parent_department_id?: number | null
  department_head_id?: number | null
}

export interface DepartmentUpdate {
  name?: string
  description?: string | null
  parent_department_id?: number | null
  department_head_id?: number | null
}

// ── Asset Category ────────────────────────────────────────────────────────────

export interface AssetCategory extends BaseEntity {
  name: string
  description: string | null
  custom_fields: Record<string, unknown> | null
  is_active: boolean
}

export interface CategoryCreate {
  name: string
  description?: string | null
  custom_fields?: Record<string, unknown> | null
}

export interface CategoryUpdate {
  name?: string
  description?: string | null
  custom_fields?: Record<string, unknown> | null
}

// ── Employee (admin view) ─────────────────────────────────────────────────────

export interface Employee extends BaseEntity {
  full_name: string
  email: string
  role: UserRole
  department_id: number | null
  is_active: boolean
}

export interface EmployeeUpdate {
  full_name?: string
  department_id?: number | null
}
