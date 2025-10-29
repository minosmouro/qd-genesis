/**
 * Utilitário para Consolidação de KPIs do Dashboard de Refresh
 * Processa e organiza KPIs de múltiplas fontes em um formato unificado
 */

import type { 
  ConsolidatedKPI, 
  DashboardSection, 
  ConsolidatedDashboardData,
  KPIConsolidationConfig,
  KPISourceData
} from '@/types/consolidatedDashboard';

// Configuração padrão para consolidação
const DEFAULT_CONFIG: KPIConsolidationConfig = {
  priorityWeights: {
    performance: 1.0,
    system: 0.9,
    activity: 0.7,
    health: 0.8
  },
  thresholds: {
    success_rate: { warning: 80, critical: 60 },
    efficiency: { warning: 70, critical: 50 },
    pending_jobs: { warning: 10, critical: 25 }
  },
  displayLimits: {
    maxKPIsPerSection: 6,
    maxSections: 4,
    compactModeKPIs: 8
  }
};

/**
 * Classe principal para consolidação de KPIs
 */
export class DashboardConsolidator {
  private config: KPIConsolidationConfig;

  constructor(config: Partial<KPIConsolidationConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Consolida todos os KPIs de diferentes fontes
   */
  consolidate(sourceData: KPISourceData): ConsolidatedDashboardData {
    const allKPIs = this.extractAllKPIs(sourceData);
    const prioritizedKPIs = this.prioritizeKPIs(allKPIs, sourceData);
    const sections = this.organizeSections(prioritizedKPIs);
    const summary = this.calculateSummary(prioritizedKPIs);
    const systemStatus = this.assessSystemStatus(sourceData, prioritizedKPIs);

    return {
      sections,
      summary,
      systemStatus
    };
  }

  /**
   * Extrai KPIs de todas as fontes de dados
   */
  private extractAllKPIs(sourceData: KPISourceData): ConsolidatedKPI[] {
    const kpis: ConsolidatedKPI[] = [];

    // KPIs de Performance
    if (sourceData.stats) {
      kpis.push(...this.extractPerformanceKPIs(sourceData.stats));
    }

    // KPIs de Sistema
    if (sourceData.health) {
      kpis.push(...this.extractSystemKPIs(sourceData.health));
    }

    // KPIs de Atividade
    if (sourceData.stats?.jobs_last_24h) {
      kpis.push(...this.extractActivityKPIs(sourceData.stats));
    }

    // KPIs de Saúde
    if (sourceData.health) {
      kpis.push(...this.extractHealthKPIs(sourceData.health));
    }

    return kpis;
  }

  /**
   * Extrai KPIs de performance
   */
  private extractPerformanceKPIs(stats: any): ConsolidatedKPI[] {
    const successRate = stats.jobs_last_24h?.total > 0 
      ? Math.round((stats.jobs_last_24h.completed / stats.jobs_last_24h.total) * 100)
      : 0;

    const efficiency = stats.total_schedules > 0 
      ? Math.round((stats.active_schedules / stats.total_schedules) * 100)
      : 0;

    return [
      {
        id: 'success_rate',
        value: successRate,
        label: 'Taxa de Sucesso',
        description: 'Percentual de jobs concluídos com sucesso nas últimas 24h',
        trend: this.calculateTrend(successRate, this.config.thresholds.success_rate),
        trendValue: `${successRate}%`,
        trendLabel: successRate >= 90 ? 'Excelente' : successRate >= 70 ? 'Bom' : 'Crítico',
        color: successRate >= 90 ? 'success' : successRate >= 70 ? 'warning' : 'danger',
        icon: 'Target',
        priority: 'high',
        category: 'performance',
        suffix: '%'
      },
      {
        id: 'efficiency',
        value: efficiency,
        label: 'Eficiência do Sistema',
        description: 'Percentual de cronogramas ativos em relação ao total',
        trend: this.calculateTrend(efficiency, this.config.thresholds.efficiency),
        trendValue: `${efficiency}%`,
        trendLabel: efficiency >= 80 ? 'Ótima' : efficiency >= 60 ? 'Boa' : 'Baixa',
        color: efficiency >= 80 ? 'success' : efficiency >= 60 ? 'warning' : 'danger',
        icon: 'Zap',
        priority: 'high',
        category: 'performance',
        suffix: '%'
      }
    ];
  }

  /**
   * Extrai KPIs de sistema
   */
  private extractSystemKPIs(health: any): ConsolidatedKPI[] {
    return [
      {
        id: 'system_status',
        value: health.status === 'healthy' ? 'Operacional' : 
               health.status === 'warning' ? 'Atenção' : 'Crítico',
        label: 'Status do Sistema',
        description: 'Estado geral do sistema de refresh',
        trend: 'stable',
        color: health.status === 'healthy' ? 'success' : 
               health.status === 'warning' ? 'warning' : 'danger',
        icon: health.status === 'healthy' ? 'CheckCircle' : 
              health.status === 'warning' ? 'AlertTriangle' : 'XCircle',
        priority: 'high',
        category: 'system'
      },
      {
        id: 'celery_status',
        value: health.celery_status === 'connected' ? 'Online' : 'Offline',
        label: 'Worker Celery',
        description: 'Status da conexão com o sistema de processamento',
        trend: 'stable',
        color: health.celery_status === 'connected' ? 'success' : 'danger',
        icon: health.celery_status === 'connected' ? 'Activity' : 'AlertCircle',
        priority: 'high',
        category: 'system'
      }
    ];
  }

  /**
   * Extrai KPIs de atividade
   */
  private extractActivityKPIs(stats: any): ConsolidatedKPI[] {
    const jobs24h = stats.jobs_last_24h;
    
    return [
      {
        id: 'total_jobs',
        value: jobs24h.total,
        label: 'Jobs Executados',
        description: 'Total de jobs processados nas últimas 24 horas',
        trend: jobs24h.total > 0 ? 'up' : 'stable',
        trendLabel: jobs24h.total > 50 ? 'Alto volume' : jobs24h.total > 10 ? 'Moderado' : 'Baixo',
        color: 'primary',
        icon: 'BarChart3',
        priority: 'medium',
        category: 'activity',
        suffix: ' jobs'
      },
      {
        id: 'active_schedules',
        value: stats.active_schedules,
        label: 'Cronogramas Ativos',
        description: 'Número de cronogramas atualmente em execução',
        trend: stats.active_schedules > 0 ? 'up' : 'stable',
        trendValue: `${stats.active_schedules}/${stats.total_schedules}`,
        color: 'secondary',
        icon: 'Calendar',
        priority: 'medium',
        category: 'activity'
      },
      {
        id: 'total_properties',
        value: stats.total_properties || 0,
        label: 'Propriedades Ativas',
        description: 'Total de propriedades em cronogramas ativos',
        trend: 'stable',
        color: 'secondary',
        icon: 'Home',
        priority: 'low',
        category: 'activity'
      }
    ];
  }

  /**
   * Extrai KPIs de saúde
   */
  private extractHealthKPIs(health: any): ConsolidatedKPI[] {
    const pendingJobs = health.pending_jobs || 0;
    
    return [
      {
        id: 'pending_jobs',
        value: pendingJobs,
        label: 'Jobs Pendentes',
        description: 'Número de jobs aguardando processamento',
        trend: this.calculateTrendForPending(pendingJobs),
        trendLabel: pendingJobs > 20 ? 'Fila congestionada' : 
                   pendingJobs > 5 ? 'Fila normal' : 'Fila vazia',
        color: pendingJobs > 20 ? 'danger' : pendingJobs > 5 ? 'warning' : 'success',
        icon: 'Clock',
        priority: pendingJobs > 10 ? 'high' : 'medium',
        category: 'health'
      }
    ];
  }

  /**
   * Calcula tendência baseada em thresholds
   */
  private calculateTrend(value: number, thresholds: { warning: number; critical: number }): 'up' | 'down' | 'stable' {
    if (value >= thresholds.warning) return 'up';
    if (value <= thresholds.critical) return 'down';
    return 'stable';
  }

  /**
   * Calcula tendência para jobs pendentes (invertida)
   */
  private calculateTrendForPending(pendingJobs: number): 'up' | 'down' | 'stable' {
    if (pendingJobs > this.config.thresholds.pending_jobs.critical) return 'down';
    if (pendingJobs > this.config.thresholds.pending_jobs.warning) return 'stable';
    return 'up';
  }

  /**
   * Prioriza KPIs baseado em importância e contexto
   */
  private prioritizeKPIs(kpis: ConsolidatedKPI[], _sourceData: KPISourceData): ConsolidatedKPI[] {
    return kpis.sort((a, b) => {
      // Primeiro por prioridade
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Depois por categoria (usando pesos)
      const categoryWeight = this.config.priorityWeights;
      const weightDiff = categoryWeight[b.category] - categoryWeight[a.category];
      if (weightDiff !== 0) return weightDiff;

      // Por último, por cor (problemas primeiro)
      const colorOrder = { danger: 4, warning: 3, success: 2, primary: 1, secondary: 0 };
      return colorOrder[b.color] - colorOrder[a.color];
    });
  }

  /**
   * Organiza KPIs em seções lógicas
   */
  private organizeSections(kpis: ConsolidatedKPI[]): DashboardSection[] {
    const sections: DashboardSection[] = [];

    // Seção Principal - KPIs mais importantes
    const mainKPIs = kpis
      .filter(kpi => kpi.priority === 'high')
      .slice(0, 4);

    if (mainKPIs.length > 0) {
      sections.push({
        id: 'main_metrics',
        title: 'Métricas Principais',
        description: 'Indicadores críticos do sistema',
        kpis: mainKPIs,
        layout: 'grid',
        columns: 4,
        priority: 'high'
      });
    }

    // Seção de Atividade
    const activityKPIs = kpis
      .filter(kpi => kpi.category === 'activity')
      .slice(0, this.config.displayLimits.maxKPIsPerSection);

    if (activityKPIs.length > 0) {
      sections.push({
        id: 'activity_metrics',
        title: 'Atividade do Sistema',
        description: 'Volume e distribuição de operações',
        kpis: activityKPIs,
        layout: 'grid',
        columns: 3,
        priority: 'medium',
        collapsible: true
      });
    }

    // Seção de Sistema
    const systemKPIs = kpis
      .filter(kpi => kpi.category === 'system' || kpi.category === 'health')
      .slice(0, this.config.displayLimits.maxKPIsPerSection);

    if (systemKPIs.length > 0) {
      sections.push({
        id: 'system_health',
        title: 'Saúde do Sistema',
        description: 'Status e integridade dos componentes',
        kpis: systemKPIs,
        layout: 'horizontal',
        priority: 'medium',
        collapsible: true
      });
    }

    return sections.slice(0, this.config.displayLimits.maxSections);
  }

  /**
   * Calcula resumo dos KPIs
   */
  private calculateSummary(kpis: ConsolidatedKPI[]) {
    const healthyKPIs = kpis.filter(kpi => kpi.color === 'success').length;
    const warningKPIs = kpis.filter(kpi => kpi.color === 'warning').length;
    const criticalKPIs = kpis.filter(kpi => kpi.color === 'danger').length;

    return {
      totalKPIs: kpis.length,
      healthyKPIs,
      warningKPIs,
      criticalKPIs,
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Avalia status geral do sistema
   */
  private assessSystemStatus(sourceData: KPISourceData, kpis: ConsolidatedKPI[]) {
    const criticalKPIs = kpis.filter(kpi => kpi.color === 'danger');
    const warningKPIs = kpis.filter(kpi => kpi.color === 'warning');
    
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    const issues: string[] = [];
    const recommendations: string[] = [];

    if (criticalKPIs.length > 0) {
      overall = 'critical';
      issues.push(...criticalKPIs.map(kpi => `${kpi.label}: ${kpi.trendLabel || 'Crítico'}`));
      recommendations.push('Verificar imediatamente os componentes críticos');
    } else if (warningKPIs.length > 0) {
      overall = 'warning';
      issues.push(...warningKPIs.map(kpi => `${kpi.label}: ${kpi.trendLabel || 'Atenção necessária'}`));
      recommendations.push('Monitorar componentes em estado de atenção');
    }

    // Adicionar issues específicas do health
    if (sourceData.health?.issues) {
      issues.push(...sourceData.health.issues);
    }

    // Recomendações baseadas em contexto
    if (sourceData.stats?.active_schedules === 0) {
      recommendations.push('Ativar cronogramas para iniciar o processamento automático');
    }

    return {
      overall,
      issues: [...new Set(issues)], // Remove duplicatas
      recommendations: [...new Set(recommendations)]
    };
  }
}

/**
 * Funções utilitárias exportadas
 */
export const consolidateKPIs = (sourceData: KPISourceData, config?: Partial<KPIConsolidationConfig>): ConsolidatedDashboardData => {
  const consolidator = new DashboardConsolidator(config);
  return consolidator.consolidate(sourceData);
};

export const createCompactDashboard = (sourceData: KPISourceData): ConsolidatedDashboardData => {
  const compactConfig: Partial<KPIConsolidationConfig> = {
    displayLimits: {
      maxKPIsPerSection: 3,
      maxSections: 2,
      compactModeKPIs: 6
    }
  };
  
  return consolidateKPIs(sourceData, compactConfig);
};

export default DashboardConsolidator;
