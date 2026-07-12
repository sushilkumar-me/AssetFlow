import api from './api'
import type { Employee, EmployeeUpdate, PaginatedResponse, UserRole } from '@/types'

const BASE = '/employees'

export interface EmployeeListParams {
  search?: string
  role?: UserRole
  department_id?: number
  page?: number
  page_size?: number
}

export const employeeService = {
  async list(params: EmployeeListParams = {}): Promise<PaginatedResponse<Employee>> {
    const { data } = await api.get<PaginatedResponse<Employee>>(BASE, { params })
    return data
  },

  async getById(id: number): Promise<Employee> {
    const { data } = await api.get<Employee>(`${BASE}/${id}`)
    return data
  },

  async update(id: number, payload: EmployeeUpdate): Promise<Employee> {
    const { data } = await api.put<Employee>(`${BASE}/${id}`, payload)
    return data
  },

  async changeRole(id: number, role: UserRole): Promise<Employee> {
    const { data } = await api.patch<Employee>(`${BASE}/${id}/role`, { role })
    return data
  },

  async setStatus(id: number, is_active: boolean): Promise<Employee> {
    const { data } = await api.patch<Employee>(`${BASE}/${id}/status`, { is_active })
    return data
  },
}
