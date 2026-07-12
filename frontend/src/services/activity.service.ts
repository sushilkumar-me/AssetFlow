import api from './api'
import type { ActivityLog, PaginatedResponse } from '@/types'

export interface ActivityListParams {
  entity_type?: string
  action?: string
  page?: number
  page_size?: number
}

export const activityService = {
  async list(params: ActivityListParams = {}): Promise<PaginatedResponse<ActivityLog>> {
    const { data } = await api.get<PaginatedResponse<ActivityLog>>('/activity-logs', { params })
    return data
  },
}
