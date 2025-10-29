// ============================================================================
// USER & AUTH TYPES
// ============================================================================

export interface User {
  id: number
  username: string
  email: string
  tenant_id: number
  is_admin?: boolean
  is_active?: boolean
  created_at?: string
  last_login?: string | null
}

export interface TenantUser extends User {
  // Herda todas as propriedades de User
}

export interface AuthResponse {
  access_token: string
  user: User
}

export interface LoginCredentials {
  username: string
  password: string
}
