import api from './api'
import type {
  Department,
  DepartmentCreate,
  DepartmentUpdate,
  PaginatedResponse,
} from '@/types'

const BASE = '/departments'

export interface DepartmentListParams {
  search?: string
  active_only?: boolean
  page?: number
  page_size?: number
}

export const departmentService = {
  async list(params: DepartmentListParams = {}): Promise<PaginatedResponse<Department>> {
    const { data } = await api.get<PaginatedResponse<Department>>(BASE, { params })
    return data
  },

  async listActive(): Promise<Department[]> {
    const { data } = await api.get<Department[]>(`${BASE}/active`)
    return data
  },

  async getById(id: number): Promise<Department> {
    const { data } = await api.get<Department>(`${BASE}/${id}`)
    return data
  },

  async create(payload: DepartmentCreate): Promise<Department> {
    const { data } = await api.post<Department>(BASE, payload)
    return data
  },

  async update(id: number, payload: DepartmentUpdate): Promise<Department> {
    const { data } = await api.put<Department>(`${BASE}/${id}`, payload)
    return data
  },

  async setStatus(id: number, is_active: boolean): Promise<Department> {
    const { data } = await api.patch<Department>(`${BASE}/${id}/status`, { is_active })
    return data
  },
}
