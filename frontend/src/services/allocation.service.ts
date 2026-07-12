import api from './api'
import type {
  AllocateRequest,
  AllocationStatus,
  AssetAllocation,
  PaginatedResponse,
  ReturnRequest,
} from '@/types'

const BASE = '/allocations'

export interface AllocationListParams {
  employee_id?: number
  asset_id?: number
  department_id?: number
  status?: AllocationStatus
  page?: number
  page_size?: number
}

export const allocationService = {
  async list(params: AllocationListParams = {}): Promise<PaginatedResponse<AssetAllocation>> {
    const { data } = await api.get<PaginatedResponse<AssetAllocation>>(BASE, { params })
    return data
  },

  async getById(id: number): Promise<AssetAllocation> {
    const { data } = await api.get<AssetAllocation>(`${BASE}/${id}`)
    return data
  },

  async getAssetHistory(assetId: number): Promise<AssetAllocation[]> {
    const { data } = await api.get<AssetAllocation[]>(`${BASE}/asset/${assetId}/history`)
    return data
  },

  async allocate(payload: AllocateRequest): Promise<AssetAllocation> {
    const { data } = await api.post<AssetAllocation>(BASE, payload)
    return data
  },

  async returnAsset(id: number, payload: ReturnRequest): Promise<AssetAllocation> {
    const { data } = await api.patch<AssetAllocation>(`${BASE}/${id}/return`, payload)
    return data
  },
}
