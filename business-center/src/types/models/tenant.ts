// ============================================================================
// IMOBILIÁRIA TYPES
// ============================================================================

export interface Imobiliaria {
  id: number
  tenant_id: string // mantém por compatibilidade backend
  tenant_type: 'PF' | 'PJ'
  name: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zip_code?: string
  status: 'ativo' | 'inativo' | 'suspenso'
  db_name?: string
  created_at: string
  updated_at?: string | null
  is_active?: boolean
  subscription_plan?: string
  health_score?: number
  users_count?: number
  properties_count?: number
  is_master?: boolean
}

// Alias para compatibilidade
export type Tenant = Imobiliaria

export interface ImobiliariaDetail extends Imobiliaria {
  contract?: {
    max_properties: number | null
    max_highlights: number | null
    max_super_highlights: number | null
    max_listings?: number | null
    highlight_limits?: Record<string, number | null>
    expires_at?: string | null
  }
}

// Alias para compatibilidade
export type TenantDetail = ImobiliariaDetail

export interface PropertyStatusSummarySource {
  status: string | null
  count: number
}

export interface PropertyStatusSummaryItem {
  key: string
  label: string
  description: string
  category: string
  category_label: string
  category_order: number
  is_active: boolean
  order: number
  count: number
  sources?: PropertyStatusSummarySource[]
}

export interface PropertyStatusCategorySummary {
  key: string
  label: string
  order: number
  count: number
}

export interface PropertyStatusSummary {
  total: number
  active_total: number
  inactive_total: number
  by_status: PropertyStatusSummaryItem[]
  by_category: PropertyStatusCategorySummary[]
  counts_by_key: Record<string, number>
  raw_statuses?: Record<string, PropertyStatusSummarySource[]>
}

export interface TenantTokenStatusItem {
  id: number
  tenant_id: number
  provider: string
  status: 'active' | 'expired' | 'expiring_soon' | 'unknown'
  expires_at?: string | null
  created_at?: string | null
  last_validated_at?: string | null
  last_validated_ok?: boolean | null
  device_id?: string | null
  email?: string | null
  automation_enabled?: boolean
}

export interface TenantTokenStatusSummary {
  total: number
  active: number
  expired: number
  expiring_soon: number
  last_check?: string
}

export interface TenantTokenStatus {
  tokens: TenantTokenStatusItem[]
  summary: TenantTokenStatusSummary
}

export interface CreateImobiliariaPayload {
  name: string
  tenant_type: 'PF' | 'PJ'
  admin_username: string
  admin_email: string
  admin_password: string
  cpf?: string
  full_name?: string
  birth_date?: string
  cnpj?: string
  company_name?: string
  trade_name?: string
  email?: string
  phone?: string
  creci?: string
  zip_code?: string
  street?: string
  number?: string
  complement?: string
  neighborhood?: string
  city?: string
  state?: string
  country?: string
}

// Alias para compatibilidade
export type CreateTenantPayload = CreateImobiliariaPayload

export interface ImobiliariaStats {
  imobiliaria: {
    id: number
    name: string
  }
  stats: {
    users: {
      total: number
      admins: number
      regular: number
    }
    properties: {
      total: number
      by_status: Record<string, number>
      status_summary?: PropertyStatusSummary
    }
  }
}

// Alias para compatibilidade
export type TenantStats = ImobiliariaStats

export interface ImobiliariaHealthScore {
  tenant_id: number // mantém por compatibilidade backend
  tenant_name: string
  health_score: number
  last_activity: string
  issues: string[]
  recommendations: string[]
}

// Alias para compatibilidade
export type TenantHealthScore = ImobiliariaHealthScore
