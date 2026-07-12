import api from './api'
import type {
  BookingCancel,
  BookingCreate,
  BookingReschedule,
  BookingStatus,
  CalendarResponse,
  PaginatedResponse,
  ResourceBooking,
} from '@/types'

const BASE = '/bookings'

export interface BookingListParams {
  employee_id?: number
  department_id?: number
  asset_id?: number
  status?: BookingStatus
  date_from?: string
  date_to?: string
  page?: number
  page_size?: number
}

export const bookingService = {
  async list(params: BookingListParams = {}): Promise<PaginatedResponse<ResourceBooking>> {
    const { data } = await api.get<PaginatedResponse<ResourceBooking>>(BASE, { params })
    return data
  },

  async getById(id: number): Promise<ResourceBooking> {
    const { data } = await api.get<ResourceBooking>(`${BASE}/${id}`)
    return data
  },

  async getCalendar(date_from: string, date_to: string): Promise<CalendarResponse> {
    const { data } = await api.get<CalendarResponse>(`${BASE}/calendar`, {
      params: { date_from, date_to },
    })
    return data
  },

  async create(payload: BookingCreate): Promise<ResourceBooking> {
    const { data } = await api.post<ResourceBooking>(BASE, payload)
    return data
  },

  async cancel(id: number, payload: BookingCancel = {}): Promise<ResourceBooking> {
    const { data } = await api.patch<ResourceBooking>(`${BASE}/${id}/cancel`, payload)
    return data
  },

  async reschedule(id: number, payload: BookingReschedule): Promise<ResourceBooking> {
    const { data } = await api.patch<ResourceBooking>(`${BASE}/${id}/reschedule`, payload)
    return data
  },
}
