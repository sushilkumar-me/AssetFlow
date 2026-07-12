import api from './api'
import type {
  PaginatedResponse,
  TransferActionRequest,
  TransferCreateRequest,
  TransferRequest,
  TransferStatus,
} from '@/types'

const BASE = '/transfers'

export interface TransferListParams {
  asset_id?: number
  status?: TransferStatus
  requested_by?: number
  to_employee_id?: number
  page?: number
  page_size?: number
}

export const transferService = {
  async list(params: TransferListParams = {}): Promise<PaginatedResponse<TransferRequest>> {
    const { data } = await api.get<PaginatedResponse<TransferRequest>>(BASE, { params })
    return data
  },

  async getById(id: number): Promise<TransferRequest> {
    const { data } = await api.get<TransferRequest>(`${BASE}/${id}`)
    return data
  },

  async create(payload: TransferCreateRequest): Promise<TransferRequest> {
    const { data } = await api.post<TransferRequest>(BASE, payload)
    return data
  },

  async approve(id: number, payload: TransferActionRequest = {}): Promise<TransferRequest> {
    const { data } = await api.patch<TransferRequest>(`${BASE}/${id}/approve`, payload)
    return data
  },

  async reject(id: number, payload: TransferActionRequest = {}): Promise<TransferRequest> {
    const { data } = await api.patch<TransferRequest>(`${BASE}/${id}/reject`, payload)
    return data
  },
}
