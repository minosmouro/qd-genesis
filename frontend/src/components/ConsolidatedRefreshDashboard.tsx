/**
 * Dashboard Consolidado de Refresh - Componente Principal
 * Substitui múltiplos componentes duplicados por uma interface unificada e otimizada
 */
import React, { useState, useMemo } from 'react';
import { 
  RefreshCw, 
  Activity,
  BarChart3,
  TrendingUp,
  CheckCircle,
  AlertTriangle,
  XCircle
} from 'lucide-react';
import { cn } from '@/utils/cn';
import Button from '@/components/Button/Button';
import Card from '@/components/Card/Card';
import DashboardSection from './DashboardSection';
import { consolidateKPIs, createCompactDashboard } from '@/utils/kpiConsolidator';
import type { 
  ConsolidatedDashboardProps, 
  ConsolidatedKPI, 
  KPISourceData 
} from '@/types/consolidatedDashboard';

interface ConsolidatedRefreshDashboardProps extends Omit<ConsolidatedDashboardProps, 'sections'> {
  sourceData: KPISourceData;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
  onExport?: () => void;
  onSettings?: () => void;
  onKPIClick?: (kpi: ConsolidatedKPI) => void;
}

const ConsolidatedRefreshDashboard: React.FC<ConsolidatedRefreshDashboardProps> = ({
  sourceData,
  loading = false,
  error = null,
  compactMode = false,
  showActions: _showActions = true,
  className,
  onRefresh,
  onExport: _onExport,
  onSettings: _onSettings,
  onKPIClick,
  onSectionToggle
}) => {
  const [viewMode] = useState<'normal' | 'compact'>('normal');
  const [showDetails] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Processar dados consolidados
  const dashboardData = useMemo(() => {
    if (!sourceData || Object.keys(sourceData).length === 0) {
      return null;
    }

    try {
      return viewMode === 'compact' || compactMode 
        ? createCompactDashboard(sourceData)
        : consolidateKPIs(sourceData);
    } catch (err) {
      console.error('Erro ao consolidar KPIs:', err);
      return null;
    }
  }, [sourceData, viewMode, compactMode]);

  // Handler para toggle de seções
  const handleSectionToggle = (sectionId: string, collapsed: boolean) => {
    const newCollapsed = new Set(collapsedSections);
    if (collapsed) {
      newCollapsed.add(sectionId);
    } else {
      newCollapsed.delete(sectionId);
    }
    setCollapsedSections(newCollapsed);
    
    if (onSectionToggle) {
      onSectionToggle(sectionId, collapsed);
    }
  };

  // Obter ícone de status do sistema
  const getSystemStatusIcon = () => {
    if (!dashboardData?.systemStatus) return Activity;
    
    switch (dashboardData.systemStatus.overall) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return XCircle;
      default: return Activity;
    }
  };

  // Obter cor do status do sistema
  const getSystemStatusColor = () => {
    if (!dashboardData?.systemStatus) return 'text-text-secondary';
    
    switch (dashboardData.systemStatus.overall) {
      case 'healthy': return 'text-success';
      case 'warning': return 'text-warning';
      case 'critical': return 'text-danger';
      default: return 'text-text-secondary';
    }
  };

  // Obter texto do status do sistema
  const getSystemStatusText = () => {
    if (!dashboardData?.systemStatus) return 'Status Desconhecido';
    
    switch (dashboardData.systemStatus.overall) {
      case 'healthy': return 'Sistema Operacional';
      case 'warning': return 'Atenção Necessária';
      case 'critical': return 'Sistema Crítico';
      default: return 'Status Desconhecido';
    }
  };

  // Renderização de loading
  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        {/* Header skeleton */}
        <Card className="p-6">
          <div className="animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-surface rounded-full" />
                <div>
                  <div className="h-6 bg-surface rounded w-48 mb-2" />
                  <div className="h-4 bg-surface rounded w-32" />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="h-8 w-20 bg-surface rounded" />
                <div className="h-8 w-24 bg-surface rounded" />
              </div>
            </div>
          </div>
        </Card>

        {/* Sections skeleton */}
        <div className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-surface rounded w-40 mb-4" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-24 bg-surface rounded" />
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Renderização de erro
  if (error || !dashboardData) {
    return (
      <Card className="p-6 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <XCircle className="h-6 w-6 text-danger" />
          <h3 className="text-lg font-semibold text-danger">
            Erro ao Carregar Dashboard
          </h3>
        </div>
        <p className="text-text-secondary mb-4">
          {error || 'Não foi possível processar os dados do sistema de refresh.'}
        </p>
        {onRefresh && (
          <Button onClick={onRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        )}
      </Card>
    );
  }

  const StatusIcon = getSystemStatusIcon();

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header do Dashboard */}
      <Card className="p-6 bg-primary/5 border-primary/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              'p-3 rounded-full',
              dashboardData.systemStatus.overall === 'healthy' ? 'bg-success/10' :
              dashboardData.systemStatus.overall === 'warning' ? 'bg-warning/10' : 'bg-danger/10'
            )}>
              <StatusIcon className={cn('h-6 w-6', getSystemStatusColor())} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                Dashboard de Refresh Consolidado
              </h2>
              <p className={cn('text-sm font-medium', getSystemStatusColor())}>
                {getSystemStatusText()}
              </p>
            </div>
          </div>
        </div>

        {/* Resumo do Dashboard */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-text-primary">
              {dashboardData.summary.totalKPIs}
            </div>
            <div className="text-sm text-text-secondary">Total de KPIs</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-success">
              {dashboardData.summary.healthyKPIs}
            </div>
            <div className="text-sm text-text-secondary">Saudáveis</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">
              {dashboardData.summary.warningKPIs}
            </div>
            <div className="text-sm text-text-secondary">Atenção</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-danger">
              {dashboardData.summary.criticalKPIs}
            </div>
            <div className="text-sm text-text-secondary">Críticos</div>
          </div>
        </div>

        {/* Alertas e Recomendações */}
        {showDetails && (dashboardData.systemStatus.issues.length > 0 || dashboardData.systemStatus.recommendations.length > 0) && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Issues */}
            {dashboardData.systemStatus.issues.length > 0 && (
              <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span className="text-sm font-medium text-warning">
                    Problemas Detectados ({dashboardData.systemStatus.issues.length})
                  </span>
                </div>
                <ul className="text-xs text-warning/80 space-y-1 ml-6">
                  {dashboardData.systemStatus.issues.map((issue, index) => (
                    <li key={index}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recomendações */}
            {dashboardData.systemStatus.recommendations.length > 0 && (
              <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Recomendações ({dashboardData.systemStatus.recommendations.length})
                  </span>
                </div>
                <ul className="text-xs text-primary/80 space-y-1 ml-6">
                  {dashboardData.systemStatus.recommendations.map((rec, index) => (
                    <li key={index}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Seções do Dashboard */}
      <div className="space-y-4">
        {dashboardData.sections.map((section) => (
          <DashboardSection
            key={section.id}
            section={section}
            compactMode={false}
            showDescriptions={false}
            onKPIClick={onKPIClick}
            onToggle={handleSectionToggle}
          />
        ))}
      </div>

      {/* Footer com informações */}
      <Card className="p-4 bg-surface">
        <div className="flex items-center justify-between text-xs text-text-secondary">
          <span>
            Última atualização: {new Date(dashboardData.summary.lastUpdated).toLocaleString('pt-BR')}
          </span>
          
          <div className="flex items-center gap-4">
            <span>
              {dashboardData.sections.length} seção{dashboardData.sections.length !== 1 ? 'ões' : ''} ativa{dashboardData.sections.length !== 1 ? 's' : ''}
            </span>
            
            <span className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Dashboard Consolidado v2.0
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ConsolidatedRefreshDashboard;
