import { useState, useEffect } from 'react'
import { apiService } from '@/services/api'
import { TenantQuota } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { devLog, errorLog } from '@/utils/logger'

export function useTenantsQuotas() {
  const [quotas, setQuotas] = useState<TenantQuota[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated, token } = useAuthStore()

  const fetchQuotas = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      devLog('🔍 Fetching tenants quotas with token:', { isAuthenticated, hasToken: !!token })
      
      const quotasData = await apiService.getTenantsQuotas()
      setQuotas(quotasData)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar quotas')
      errorLog('Erro ao buscar quotas:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && token) {
      devLog('✅ Auth confirmed, fetching quotas...')
      fetchQuotas()
    } else {
      devLog('⏳ Waiting for authentication...', { isAuthenticated, hasToken: !!token })
      setIsLoading(false)
    }
  }, [isAuthenticated, token])

  // Estatísticas agregadas
  const stats = {
    total: quotas.length,
    with_contract: quotas.filter(q => q.contract.has_contract).length,
    without_contract: quotas.filter(q => !q.contract.has_contract).length,
    critical_alerts: quotas.filter(q => q.alert.level === 'critical').length,
    warning_alerts: quotas.filter(q => q.alert.level === 'warning').length,
    over_limit: quotas.filter(q => q.usage.total?.over_limit).length
  }

  return {
    quotas,
    stats,
    isLoading,
    error,
    refetch: fetchQuotas
  }
}
