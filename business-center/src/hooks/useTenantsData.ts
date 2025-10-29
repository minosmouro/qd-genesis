import { useState, useEffect } from 'react'
import { apiService } from '@/services/api'
import { Tenant } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { devLog, errorLog } from '@/utils/logger'

export function useTenantsData() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated, token } = useAuthStore()

  const fetchTenants = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      devLog('🔍 Fetching tenants with token:', { isAuthenticated, hasToken: !!token })
      
      const tenantsData = await apiService.getTenants()
      setTenants(tenantsData)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar tenants')
      errorLog('Erro ao buscar tenants:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Só buscar tenants se estiver autenticado e tiver token
    if (isAuthenticated && token) {
      devLog('✅ Auth confirmed, fetching tenants...')
      fetchTenants()
    } else {
      devLog('⏳ Waiting for authentication...', { isAuthenticated, hasToken: !!token })
      setIsLoading(false)
    }
  }, [isAuthenticated, token])

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.status === 'ativo').length,
    inactive: tenants.filter(t => t.status === 'inativo').length,
    suspended: tenants.filter(t => t.status === 'suspenso').length
  }

  return {
    tenants,
    stats,
    isLoading,
    error,
    refetch: fetchTenants
  }
}