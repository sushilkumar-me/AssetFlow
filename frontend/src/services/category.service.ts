import api from './api'
import type { AssetCategory, CategoryCreate, CategoryUpdate, PaginatedResponse } from '@/types'

const BASE = '/categories'

export interface CategoryListParams {
  search?: string
  active_only?: boolean
  page?: number
  page_size?: number
}

export const categoryService = {
  async list(params: CategoryListParams = {}): Promise<PaginatedResponse<AssetCategory>> {
    const { data } = await api.get<PaginatedResponse<AssetCategory>>(BASE, { params })
    return data
  },

  async getById(id: number): Promise<AssetCategory> {
    const { data } = await api.get<AssetCategory>(`${BASE}/${id}`)
    return data
  },

  async create(payload: CategoryCreate): Promise<AssetCategory> {
    const { data } = await api.post<AssetCategory>(BASE, payload)
    return data
  },

  async update(id: number, payload: CategoryUpdate): Promise<AssetCategory> {
    const { data } = await api.put<AssetCategory>(`${BASE}/${id}`, payload)
    return data
  },

  async setStatus(id: number, is_active: boolean): Promise<AssetCategory> {
    const { data } = await api.patch<AssetCategory>(`${BASE}/${id}/status`, { is_active })
    return data
  },
}
