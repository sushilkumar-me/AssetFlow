/**
 * Health check service — verifies the backend is reachable.
 */

import api from './api'
import type { ApiResponse } from '@/types'

export async function checkHealth(): Promise<ApiResponse> {
  const { data } = await api.get<ApiResponse>('/health')
  return data
}
