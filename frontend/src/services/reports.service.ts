import api from './api'
import type {
  AssetReport,
  AuditReport,
  BookingReport,
  DashboardSummary,
  DepartmentReport,
  MaintenanceReport,
} from '@/types'

export const reportsService = {
  async getDashboardSummary(): Promise<DashboardSummary> {
    const { data } = await api.get<DashboardSummary>('/reports/dashboard-summary')
    return data
  },

  async getAssetReport(params?: { department_id?: number; category_id?: number; status?: string }): Promise<AssetReport> {
    const { data } = await api.get<AssetReport>('/reports/assets', { params })
    return data
  },

  async getDepartmentReport(department_id?: number): Promise<DepartmentReport> {
    const { data } = await api.get<DepartmentReport>('/reports/departments', { params: { department_id } })
    return data
  },

  async getMaintenanceReport(params?: { priority?: string; status?: string }): Promise<MaintenanceReport> {
    const { data } = await api.get<MaintenanceReport>('/reports/maintenance', { params })
    return data
  },

  async getBookingReport(params?: { asset_id?: number; status?: string }): Promise<BookingReport> {
    const { data } = await api.get<BookingReport>('/reports/bookings', { params })
    return data
  },

  async getAuditReport(department_id?: number): Promise<AuditReport> {
    const { data } = await api.get<AuditReport>('/reports/audits', { params: { department_id } })
    return data
  },

  async exportReport(reportType: string, format: 'csv' | 'pdf' | 'excel') {
    const { data } = await api.get(`/reports/export/${reportType}`, { params: { format } })
    return data
  },
}