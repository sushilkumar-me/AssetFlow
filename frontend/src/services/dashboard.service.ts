import api from './api'
import type { DashboardData, KPIData, RecentActivityItem } from '@/types'

export const dashboardService = {
  async getDashboard(): Promise<DashboardData> {
    const { data } = await api.get<DashboardData>('/dashboard')
    return data
  },
  async getKPIs(): Promise<KPIData> {
    const { data } = await api.get<KPIData>('/dashboard/kpis')
    return data
  },
  async getRecentActivity(limit = 20): Promise<RecentActivityItem[]> {
    const { data } = await api.get<RecentActivityItem[]>('/dashboard/recent-activity', { params: { limit } })
    return data
  },
}
