import api from './api'
import type { AppNotification, NotificationListResponse } from '@/types'

export const notificationService = {
  async list(): Promise<NotificationListResponse> {
    const { data } = await api.get<NotificationListResponse>('/notifications')
    return data
  },
  async markRead(id: number): Promise<AppNotification> {
    const { data } = await api.patch<AppNotification>(`/notifications/${id}/read`)
    return data
  },
  async markAllRead(): Promise<{ updated: number }> {
    const { data } = await api.patch<{ updated: number }>('/notifications/read-all')
    return data
  },
  async delete(id: number): Promise<void> {
    await api.delete(`/notifications/${id}`)
  },
}
