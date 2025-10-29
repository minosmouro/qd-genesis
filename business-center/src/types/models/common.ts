// ============================================================================
// API & COMMON TYPES
// ============================================================================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface LoadingState {
  isLoading: boolean
  error?: string | null
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

export interface ActivityLog {
  id: number
  tenant_id: number
  tenant_name: string
  action: string
  description: string
  timestamp: string
  severity: 'info' | 'warning' | 'error' | 'success'
}
