/**
 * Hooks para o dashboard de refresh - Integração 100% com banco de dados
 * Utiliza os novos endpoints /refresh para dados em tempo real
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { refreshDashboardService } from '@/services/refresh-dashboard.service';
import type { 
  RefreshDashboardData, 
  RefreshKPIsResponse, 
  RefreshHealthResponse 
} from '@/services/refresh-dashboard.service';

/**
 * Hook para dados completos do dashboard de refresh
 */
export const useRefreshDashboard = (options = {}) => {
  return useQuery<RefreshDashboardData>({
    queryKey: ['refresh-dashboard'],
    queryFn: () => refreshDashboardService.getDashboardData(),
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchInterval: 5 * 60 * 1000, // Auto-refresh a cada 5 minutos
    retry: 2,
    ...options
  });
};

/**
 * Hook para KPIs do sistema de refresh
 */
export const useRefreshKPIs = (options = {}) => {
  return useQuery<RefreshKPIsResponse>({
    queryKey: ['refresh-kpis'],
    queryFn: () => refreshDashboardService.getKPIs(),
    staleTime: 1 * 60 * 1000, // 1 minuto
    refetchInterval: 3 * 60 * 1000, // Auto-refresh a cada 3 minutos
    retry: 2,
    ...options
  });
};

/**
 * Hook para status de saúde do sistema
 */
export const useRefreshHealth = (options = {}) => {
  return useQuery<RefreshHealthResponse>({
    queryKey: ['refresh-health'],
    queryFn: () => refreshDashboardService.getHealthStatus(),
    staleTime: 30 * 1000, // 30 segundos
    refetchInterval: 60 * 1000, // Auto-refresh a cada 1 minuto
    retry: 1,
    ...options
  });
};

/**
 * Hook para métricas derivadas do dashboard
 */
export const useRefreshMetrics = () => {
  const { data: dashboardData, ...queryResult } = useRefreshDashboard();
  
  const metrics = dashboardData 
    ? refreshDashboardService.calculateDerivedMetrics(dashboardData)
    : null;
  
  return {
    data: metrics,
    ...queryResult
  };
};

/**
 * Hook para dados formatados para gráficos
 */
export const useRefreshChartData = () => {
  const { data: dashboardData, ...queryResult } = useRefreshDashboard();
  
  const chartData = dashboardData 
    ? refreshDashboardService.formatDataForCharts(dashboardData)
    : null;
  
  return {
    data: chartData,
    ...queryResult
  };
};

/**
 * Hook para KPIs formatados para exibição
 */
export const useFormattedKPIs = () => {
  const { data: kpisData, ...queryResult } = useRefreshKPIs();
  
  const formattedKPIs = kpisData?.kpis 
    ? refreshDashboardService.formatKPIsForDisplay(kpisData.kpis)
    : [];
  
  return {
    data: formattedKPIs,
    summary: kpisData?.summary,
    ...queryResult
  };
};

/**
 * Hook para atualização manual dos dados
 */
export const useRefreshDashboardActions = () => {
  const queryClient = useQueryClient();
  
  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['refresh-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['refresh-kpis'] });
    queryClient.invalidateQueries({ queryKey: ['refresh-health'] });
  };
  
  const refreshKPIs = () => {
    queryClient.invalidateQueries({ queryKey: ['refresh-kpis'] });
  };
  
  const refreshHealth = () => {
    queryClient.invalidateQueries({ queryKey: ['refresh-health'] });
  };
  
  const refreshDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ['refresh-dashboard'] });
  };
  
  return {
    refreshAll,
    refreshKPIs,
    refreshHealth,
    refreshDashboard
  };
};

/**
 * Hook combinado para todos os dados do dashboard
 */
export const useRefreshDashboardComplete = () => {
  const dashboard = useRefreshDashboard();
  const kpis = useRefreshKPIs();
  const health = useRefreshHealth();
  const metrics = useRefreshMetrics();
  const chartData = useRefreshChartData();
  const formattedKPIs = useFormattedKPIs();
  const actions = useRefreshDashboardActions();
  
  const isLoading = dashboard.isLoading || kpis.isLoading || health.isLoading;
  const isError = dashboard.isError || kpis.isError || health.isError;
  const error = dashboard.error || kpis.error || health.error;
  
  return {
    dashboard: dashboard.data,
    kpis: kpis.data,
    health: health.data,
    metrics: metrics.data,
    chartData: chartData.data,
    formattedKPIs: formattedKPIs.data,
    kpisSummary: formattedKPIs.summary,
    isLoading,
    isError,
    error,
    actions
  };
};

/**
 * Hook para dados consolidados do dashboard
 * Prepara dados no formato necessário para o ConsolidatedRefreshDashboard
 */
export const useConsolidatedDashboard = (_options = {}) => {
  const {
    dashboard,
    kpis,
    health,
    metrics,
    isLoading,
    isError,
    error,
    actions
  } = useRefreshDashboardComplete();

  // Preparar dados no formato KPISourceData
  const sourceData = useMemo(() => {
    if (!dashboard && !kpis && !health) return {};

    return {
      stats: dashboard?.kpis || dashboard?.statistics,
      health: health,
      metrics: metrics,
      dashboard: dashboard,
      kpis: kpis
    };
  }, [dashboard, kpis, health, metrics]);

  return {
    sourceData,
    isLoading,
    isError,
    error,
    actions
  };
};
