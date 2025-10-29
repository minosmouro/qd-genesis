// ============================================================================
// DASHBOARD & ANALYTICS TYPES
// ============================================================================

export interface DashboardStats {
  total_tenants: number
  total_users: number
  total_properties: number
  active_tenants: number
  growth_rate: number
  revenue_trend: number
}

export interface ChartDataPoint {
  name: string
  value: number
  color?: string
}

export interface GrowthData {
  month: string
  tenants: number
  users: number
  properties: number
}
