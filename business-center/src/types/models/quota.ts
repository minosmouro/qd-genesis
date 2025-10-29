// ============================================================================
// QUOTA & USAGE TYPES
// ============================================================================

export type PublicationType = 'STANDARD' | 'PREMIUM' | 'SUPER_PREMIUM' | 'PREMIERE_1' | 'PREMIERE_2' | 'TRIPLE'

export interface HighlightUsage {
  used: number
  limit: number | null
  remaining: number | null
  percentage: number | null
  over_limit: boolean
}

export interface TotalUsage {
  used: number
  limit: number
  remaining: number
  percentage: number
  over_limit: boolean
}

export interface TenantQuota {
  tenant_id: number
  tenant_name: string
  tenant_type: string
  is_active: boolean
  contract: {
    has_contract: boolean
    contract_number: string | null
    max_listings: number | null
  }
  usage: {
    users: number
    properties: number
    total: TotalUsage | null
    highlights: Record<PublicationType, HighlightUsage>
  }
  alert: {
    level: 'ok' | 'info' | 'warning' | 'critical'
    message: string | null
  }
}
