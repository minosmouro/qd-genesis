/**
 * Tipos para o Dashboard Consolidado de Refresh
 * Define interfaces para KPIs consolidados e seções do dashboard
 */

export interface ConsolidatedKPI {
  id: string;
  value: number | string;
  label: string;
  description?: string;
  trend: 'up' | 'down' | 'stable';
  trendValue?: string;
  trendLabel?: string;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'secondary';
  icon: string;
  priority: 'high' | 'medium' | 'low';
  category: 'performance' | 'system' | 'activity' | 'health';
  suffix?: string;
  prefix?: string;
  clickable?: boolean;
  onClick?: () => void;
}

export interface DashboardSection {
  id: string;
  title: string;
  description?: string;
  kpis: ConsolidatedKPI[];
  layout: 'grid' | 'horizontal' | 'vertical';
  columns?: number;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  priority: 'high' | 'medium' | 'low';
}

export interface ConsolidatedDashboardProps {
  sections: DashboardSection[];
  compactMode?: boolean;
  showActions?: boolean;
  className?: string;
  onKPIClick?: (kpi: ConsolidatedKPI) => void;
  onSectionToggle?: (sectionId: string, collapsed: boolean) => void;
}

export interface ConsolidatedDashboardData {
  sections: DashboardSection[];
  summary: {
    totalKPIs: number;
    healthyKPIs: number;
    warningKPIs: number;
    criticalKPIs: number;
    lastUpdated: string;
  };
  systemStatus: {
    overall: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  };
}

export interface KPIConsolidationConfig {
  priorityWeights: {
    performance: number;
    system: number;
    activity: number;
    health: number;
  };
  thresholds: {
    success_rate: { warning: number; critical: number };
    efficiency: { warning: number; critical: number };
    pending_jobs: { warning: number; critical: number };
  };
  displayLimits: {
    maxKPIsPerSection: number;
    maxSections: number;
    compactModeKPIs: number;
  };
}

export interface KPISourceData {
  stats?: any;
  health?: any;
  metrics?: any;
  dashboard?: any;
  kpis?: any;
}
