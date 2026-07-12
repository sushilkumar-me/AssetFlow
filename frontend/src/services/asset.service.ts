import api from './api'
import type {
  Asset,
  AssetCondition,
  AssetCreate,
  AssetStatus,
  AssetUpdate,
  PaginatedResponse,
} from '@/types'

const BASE = '/assets'

export interface AssetListParams {
  search?: string
  category?: number
  department?: number
  status?: AssetStatus
  condition?: AssetCondition
  location?: string
  is_shared?: boolean
  active_only?: boolean
  sort_by?: 'newest' | 'oldest' | 'name' | 'category'
  page?: number
  page_size?: number
}

export const assetService = {
  async list(params: AssetListParams = {}): Promise<PaginatedResponse<Asset>> {
    const { data } = await api.get<PaginatedResponse<Asset>>(BASE, { params })
    return data
  },

  async getById(id: number): Promise<Asset> {
    const { data } = await api.get<Asset>(`${BASE}/${id}`)
    return data
  },

  async create(payload: AssetCreate): Promise<Asset> {
    const { data } = await api.post<Asset>(BASE, payload)
    return data
  },

  async update(id: number, payload: AssetUpdate): Promise<Asset> {
    const { data } = await api.put<Asset>(`${BASE}/${id}`, payload)
    return data
  },

  async updateStatus(id: number, status: AssetStatus): Promise<Asset> {
    const { data } = await api.patch<Asset>(`${BASE}/${id}/status`, { status })
    return data
  },

  async softDelete(id: number): Promise<Asset> {
    const { data } = await api.delete<Asset>(`${BASE}/${id}`)
    return data
  },
}
