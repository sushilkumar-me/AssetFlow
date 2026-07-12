import api from './api'
import type {
  AuditCycle,
  AuditCycleCreate,
  AuditCycleStatus,
  AuditRecord,
  DiscrepancyReport,
  PaginatedResponse,
  VerifyAssetPayload,
} from '@/types'

const BASE = '/audits'

export interface AuditListParams {
  search?: string
  status?: AuditCycleStatus
  page?: number
  page_size?: number
}

export const auditService = {
  async list(params: AuditListParams = {}): Promise<PaginatedResponse<AuditCycle>> {
    const { data } = await api.get<PaginatedResponse<AuditCycle>>(BASE, { params })
    return data
  },

  async getById(id: number): Promise<AuditCycle> {
    const { data } = await api.get<AuditCycle>(`${BASE}/${id}`)
    return data
  },

  async create(payload: AuditCycleCreate): Promise<AuditCycle> {
    const { data } = await api.post<AuditCycle>(BASE, payload)
    return data
  },

  async assignAuditors(id: number, auditor_ids: number[]): Promise<AuditCycle> {
    const { data } = await api.patch<AuditCycle>(`${BASE}/${id}/assign-auditors`, { auditor_ids })
    return data
  },

  async verifyAsset(id: number, payload: VerifyAssetPayload): Promise<AuditRecord> {
    const { data } = await api.post<AuditRecord>(`${BASE}/${id}/verify`, payload)
    return data
  },

  async getRecords(id: number): Promise<AuditRecord[]> {
    const { data } = await api.get<AuditRecord[]>(`${BASE}/${id}/records`)
    return data
  },

  async getDiscrepancies(id: number): Promise<DiscrepancyReport> {
    const { data } = await api.get<DiscrepancyReport>(`${BASE}/${id}/discrepancies`)
    return data
  },

  async closeCycle(id: number): Promise<AuditCycle> {
    const { data } = await api.patch<AuditCycle>(`${BASE}/${id}/close`, {})
    return data
  },
}
