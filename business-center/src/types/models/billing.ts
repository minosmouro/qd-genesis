// ============================================================================
// SUBSCRIPTION & BILLING TYPES
// ============================================================================

export type BillingInterval = 'monthly' | 'quarterly' | 'yearly'
export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired'

export interface SubscriptionPlan {
  id: number
  name: string
  description?: string
  price_monthly: number
  price_quarterly?: number
  price_yearly?: number
  limits: {
    max_properties: number
    max_users: number
    max_highlights: number
    max_super_highlights: number
  }
  features: {
    api_access: boolean
    custom_domain: boolean
    priority_support: boolean
    analytics: boolean
    white_label: boolean
  }
  is_active: boolean
  is_public: boolean
  sort_order: number
  active_subscriptions?: number
  created_at?: string
  updated_at?: string
}

export interface BillingDashboard {
  metrics: {
    mrr: number
    arr: number
    active_subscriptions: number
    total_tenants: number
    tenants_with_subscription: number
    tenants_without_subscription: number
    conversion_rate: number
  }
  subscriptions_by_plan: Record<string, number>
  revenue_by_plan: Record<string, number>
}
