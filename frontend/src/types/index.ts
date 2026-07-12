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

// ── Asset ─────────────────────────────────────────────────────────────────────

export type AssetStatus =
  | 'AVAILABLE'
  | 'ALLOCATED'
  | 'RESERVED'
  | 'UNDER_MAINTENANCE'
  | 'LOST'
  | 'RETIRED'
  | 'DISPOSED'

export type AssetCondition =
  | 'NEW'
  | 'GOOD'
  | 'FAIR'
  | 'POOR'
  | 'NEEDS_REPAIR'

export const ASSET_STATUSES: AssetStatus[] = [
  'AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE',
  'LOST', 'RETIRED', 'DISPOSED',
]

export const ASSET_CONDITIONS: AssetCondition[] = [
  'NEW', 'GOOD', 'FAIR', 'POOR', 'NEEDS_REPAIR',
]

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  AVAILABLE:         'Available',
  ALLOCATED:         'Allocated',
  RESERVED:          'Reserved',
  UNDER_MAINTENANCE: 'Under Maintenance',
  LOST:              'Lost',
  RETIRED:           'Retired',
  DISPOSED:          'Disposed',
}

export const ASSET_CONDITION_LABELS: Record<AssetCondition, string> = {
  NEW:         'New',
  GOOD:        'Good',
  FAIR:        'Fair',
  POOR:        'Poor',
  NEEDS_REPAIR:'Needs Repair',
}

export interface Asset extends BaseEntity {
  asset_tag: string
  name: string
  serial_number: string | null
  category_id: number
  department_id: number | null
  status: AssetStatus
  condition: AssetCondition
  is_active: boolean
  is_shared: boolean
  location: string | null
  acquisition_date: string | null
  acquisition_cost: string | null
  description: string | null
  photo_url: string | null
  created_by: number | null
}

export interface AssetCreate {
  name: string
  category_id: number
  serial_number?: string | null
  department_id?: number | null
  condition?: AssetCondition
  location?: string | null
  acquisition_date?: string | null
  acquisition_cost?: string | null
  description?: string | null
  is_shared?: boolean
  photo_url?: string | null
}

export interface AssetUpdate {
  name?: string
  category_id?: number
  serial_number?: string | null
  department_id?: number | null
  condition?: AssetCondition
  location?: string | null
  acquisition_date?: string | null
  acquisition_cost?: string | null
  description?: string | null
  is_shared?: boolean
  photo_url?: string | null
}

// ── Allocation ────────────────────────────────────────────────────────────────

export type AllocationStatus = 'ACTIVE' | 'RETURNED' | 'OVERDUE'

export const ALLOCATION_STATUSES: AllocationStatus[] = ['ACTIVE', 'RETURNED', 'OVERDUE']

export const ALLOCATION_STATUS_LABELS: Record<AllocationStatus, string> = {
  ACTIVE:   'Active',
  RETURNED: 'Returned',
  OVERDUE:  'Overdue',
}

export interface AssetAllocation extends BaseEntity {
  asset_id: number
  employee_id: number
  allocated_by: number
  allocated_at: string
  expected_return_date: string | null
  returned_at: string | null
  status: AllocationStatus
  condition_notes: string | null
}

export interface AllocateRequest {
  asset_id: number
  employee_id: number
  expected_return_date?: string | null
  condition_notes?: string | null
}

export interface ReturnRequest {
  condition_notes?: string | null
}

// ── Transfer ──────────────────────────────────────────────────────────────────

export type TransferStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export const TRANSFER_STATUSES: TransferStatus[] = ['PENDING', 'APPROVED', 'REJECTED']

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  PENDING:  'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

export interface TransferRequest extends BaseEntity {
  asset_id: number
  from_employee_id: number
  to_employee_id: number
  requested_by: number
  approved_by: number | null
  status: TransferStatus
  remarks: string | null
  requested_at: string
  approved_at: string | null
}

export interface TransferCreateRequest {
  asset_id: number
  to_employee_id: number
  remarks?: string | null
}

export interface TransferActionRequest {
  remarks?: string | null
}

// ── Resource Booking ──────────────────────────────────────────────────────────

export type BookingStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'

export const BOOKING_STATUSES: BookingStatus[] = [
  'UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED',
]

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  UPCOMING:  'Upcoming',
  ONGOING:   'Ongoing',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export interface ResourceBooking extends BaseEntity {
  asset_id: number
  employee_id: number
  department_id: number | null
  title: string
  purpose: string | null
  start_datetime: string
  end_datetime: string
  status: BookingStatus
  remarks: string | null
}

export interface BookingCreate {
  asset_id: number
  title: string
  purpose?: string | null
  start_datetime: string
  end_datetime: string
  remarks?: string | null
}

export interface BookingReschedule {
  start_datetime: string
  end_datetime: string
  remarks?: string | null
}

export interface BookingCancel {
  remarks?: string | null
}

export interface CalendarEntry {
  asset_id: number
  asset_name: string
  asset_tag: string
  location: string | null
  bookings: ResourceBooking[]
}

export interface CalendarResponse {
  entries: CalendarEntry[]
  date_from: string
  date_to: string
}

// ── Maintenance ───────────────────────────────────────────────────────────────

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type MaintenanceStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'TECHNICIAN_ASSIGNED'
  | 'IN_PROGRESS'
  | 'RESOLVED'

export const MAINTENANCE_PRIORITIES: MaintenancePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

export const MAINTENANCE_STATUSES: MaintenanceStatus[] = [
  'PENDING', 'APPROVED', 'REJECTED', 'TECHNICIAN_ASSIGNED', 'IN_PROGRESS', 'RESOLVED',
]

export const MAINTENANCE_PRIORITY_LABELS: Record<MaintenancePriority, string> = {
  LOW:      'Low',
  MEDIUM:   'Medium',
  HIGH:     'High',
  CRITICAL: 'Critical',
}

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  PENDING:             'Pending',
  APPROVED:            'Approved',
  REJECTED:            'Rejected',
  TECHNICIAN_ASSIGNED: 'Technician Assigned',
  IN_PROGRESS:         'In Progress',
  RESOLVED:            'Resolved',
}

export interface MaintenanceRequest extends BaseEntity {
  asset_id: number
  raised_by: number
  approved_by: number | null
  issue_title: string
  issue_description: string
  priority: MaintenancePriority
  attachment_url: string | null
  status: MaintenanceStatus
  technician_name: string | null
  approval_remarks: string | null
  resolution_notes: string | null
  approved_at: string | null
  resolved_at: string | null
}

export interface MaintenanceCreate {
  asset_id: number
  issue_title: string
  issue_description: string
  priority?: MaintenancePriority
  attachment_url?: string | null
}

export interface MaintenanceApprove {
  approval_remarks?: string | null
}

export interface MaintenanceReject {
  approval_remarks: string
}

export interface MaintenanceAssign {
  technician_name: string
}

export interface MaintenanceResolve {
  resolution_notes: string
}

// ── Audit ─────────────────────────────────────────────────────────────────────

export type AuditCycleStatus = 'OPEN' | 'IN_PROGRESS' | 'CLOSED'
export type AuditScopeType   = 'ALL' | 'DEPARTMENT' | 'LOCATION'
export type VerificationStatus = 'VERIFIED' | 'MISSING' | 'DAMAGED'

export const AUDIT_CYCLE_STATUSES: AuditCycleStatus[] = ['OPEN', 'IN_PROGRESS', 'CLOSED']
export const AUDIT_SCOPE_TYPES: AuditScopeType[] = ['ALL', 'DEPARTMENT', 'LOCATION']
export const VERIFICATION_STATUSES: VerificationStatus[] = ['VERIFIED', 'MISSING', 'DAMAGED']

export const AUDIT_CYCLE_STATUS_LABELS: Record<AuditCycleStatus, string> = {
  OPEN:        'Open',
  IN_PROGRESS: 'In Progress',
  CLOSED:      'Closed',
}

export const AUDIT_SCOPE_LABELS: Record<AuditScopeType, string> = {
  ALL:        'All Assets',
  DEPARTMENT: 'By Department',
  LOCATION:   'By Location',
}

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  VERIFIED: 'Verified',
  MISSING:  'Missing',
  DAMAGED:  'Damaged',
}

export interface AuditCycle extends BaseEntity {
  name: string
  scope_type: AuditScopeType
  department_id: number | null
  location: string | null
  start_date: string
  end_date: string
  status: AuditCycleStatus
  created_by: number
  closed_by: number | null
  closed_at: string | null
  auditor_ids: number[]
}

export interface AuditCycleCreate {
  name: string
  scope_type?: AuditScopeType
  department_id?: number | null
  location?: string | null
  start_date: string
  end_date: string
}

export interface AuditRecord {
  id: number
  audit_cycle_id: number
  asset_id: number
  auditor_id: number
  verification_status: VerificationStatus
  remarks: string | null
  verified_at: string
  created_at: string
}

export interface DiscrepancyItem {
  asset_id: number
  asset_tag: string
  asset_name: string
  verification_status: VerificationStatus
  remarks: string | null
  auditor_id: number
  verified_at: string
}

export interface DiscrepancyReport {
  audit_cycle_id: number
  audit_name: string
  total_assets: number
  verified_count: number
  missing_count: number
  damaged_count: number
  discrepancies: DiscrepancyItem[]
}

export interface VerifyAssetPayload {
  asset_id: number
  verification_status: VerificationStatus
  remarks?: string | null
}
