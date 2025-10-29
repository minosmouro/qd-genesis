// ============================================================================
// MODULAR TYPE EXPORTS
// ============================================================================

// Re-export all types from organized modules
export * from './models/tenant'
export * from './models/quota'
export * from './models/billing'
export * from './models/auth'
export * from './models/common'
export * from './models/analytics'

// ============================================================================
// LEGACY TYPES (manter por compatibilidade - remover gradualmente)
// ============================================================================

// Feature flags
export interface FeatureFlags {
  advancedAnalytics: boolean
  billing: boolean
  notifications: boolean
  multiTenant: boolean
}

// Theme types
export type Theme = 'light' | 'dark' | 'system'

export interface AppConfig {
  apiBaseUrl: string
  appName: string
  version: string
  theme: Theme
  featureFlags: FeatureFlags
}

