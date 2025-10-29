import { useState, useEffect } from 'react'
import { apiService } from '@/services/api'
import { DashboardStats } from '@/types'
import { useAuthStore } from '@/stores/auth'
import { devLog, errorLog } from '@/utils/logger'

export function useDashboardData() {
  const [stats, setStats] = useState<DashboardStats>({
    total_tenants: 0,
    total_users: 0,
    total_properties: 0,
    active_tenants: 0,
    growth_rate: 0,
    revenue_trend: 0
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { isAuthenticated, token } = useAuthStore()

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      devLog('📊 Fetching dashboard data with token:', { isAuthenticated, hasToken: !!token })
      
      const dashboardStats = await apiService.getDashboardStats()
      setStats(dashboardStats)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
      errorLog('Erro ao buscar dados do dashboard:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Só buscar dados se estiver autenticado e tiver token
    if (isAuthenticated && token) {
      devLog('✅ Auth confirmed, fetching dashboard data...')
      fetchDashboardData()
    } else {
      devLog('⏳ Waiting for authentication for dashboard...', { isAuthenticated, hasToken: !!token })
      setIsLoading(false)
    }
  }, [isAuthenticated, token])

  return {
    stats,
    isLoading,
    error,
    refetch: fetchDashboardData
  }
}