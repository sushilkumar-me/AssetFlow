import api from './api'
import type {
  MaintenanceApprove,
  MaintenanceAssign,
  MaintenanceCreate,
  MaintenancePriority,
  MaintenanceReject,
  MaintenanceRequest,
  MaintenanceResolve,
  MaintenanceStatus,
  PaginatedResponse,
} from '@/types'

const BASE = '/maintenance'

export interface MaintenanceListParams {
  search?: string
  asset_id?: number
  priority?: MaintenancePriority
  status?: MaintenanceStatus
  page?: number
  page_size?: number
}

export const maintenanceService = {
  async list(params: MaintenanceListParams = {}): Promise<PaginatedResponse<MaintenanceRequest>> {
    const { data } = await api.get<PaginatedResponse<MaintenanceRequest>>(BASE, { params })
    return data
  },

  async getById(id: number): Promise<MaintenanceRequest> {
    const { data } = await api.get<MaintenanceRequest>(`${BASE}/${id}`)
    return data
  },

  async getAssetHistory(assetId: number): Promise<MaintenanceRequest[]> {
    const { data } = await api.get<MaintenanceRequest[]>(
      `/assets/${assetId}/maintenance-history`
    )
    return data
  },

  async create(payload: MaintenanceCreate): Promise<MaintenanceRequest> {
    const { data } = await api.post<MaintenanceRequest>(BASE, payload)
    return data
  },

  async approve(id: number, payload: MaintenanceApprove = {}): Promise<MaintenanceRequest> {
    const { data } = await api.patch<MaintenanceRequest>(`${BASE}/${id}/approve`, payload)
    return data
  },

  async reject(id: number, payload: MaintenanceReject): Promise<MaintenanceRequest> {
    const { data } = await api.patch<MaintenanceRequest>(`${BASE}/${id}/reject`, payload)
    return data
  },

  async assignTechnician(id: number, payload: MaintenanceAssign): Promise<MaintenanceRequest> {
    const { data } = await api.patch<MaintenanceRequest>(`${BASE}/${id}/assign-technician`, payload)
    return data
  },

  async startWork(id: number): Promise<MaintenanceRequest> {
    const { data } = await api.patch<MaintenanceRequest>(`${BASE}/${id}/start`, {})
    return data
  },

  async resolve(id: number, payload: MaintenanceResolve): Promise<MaintenanceRequest> {
    const { data } = await api.patch<MaintenanceRequest>(`${BASE}/${id}/resolve`, payload)
    return data
  },
}
