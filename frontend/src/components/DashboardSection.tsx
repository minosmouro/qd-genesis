/**
 * Componente DashboardSection - Seção organizacional para grupos de KPIs
 * Suporta diferentes layouts e funcionalidades de colapso
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import { cn } from '@/utils/cn';
import KPICard from './KPICard';
import type { DashboardSection as DashboardSectionType, ConsolidatedKPI } from '@/types/consolidatedDashboard';

interface DashboardSectionProps {
  section: DashboardSectionType;
  compactMode?: boolean;
  showDescriptions?: boolean;
  onKPIClick?: (kpi: ConsolidatedKPI) => void;
  onToggle?: (sectionId: string, collapsed: boolean) => void;
  className?: string;
}

const DashboardSection: React.FC<DashboardSectionProps> = ({
  section,
  compactMode = false,
  showDescriptions = false,
  onKPIClick,
  onToggle,
  className
}) => {
  const [isCollapsed, setIsCollapsed] = useState(section.defaultCollapsed || false);

  // Handler para toggle de colapso
  const handleToggle = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    
    if (onToggle) {
      onToggle(section.id, newCollapsed);
    }
  };

  // Classes CSS baseadas no layout
  const getLayoutClasses = () => {
    if (compactMode) {
      return 'grid grid-cols-2 lg:grid-cols-3 gap-3';
    }

    switch (section.layout) {
      case 'grid':
        const columns = section.columns || 3;
        return `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.min(columns, 4)} gap-4`;
      
      case 'horizontal':
        return 'flex flex-wrap gap-4';
      
      case 'vertical':
        return 'space-y-4';
      
      default:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';
    }
  };

  // Classes CSS baseadas na prioridade
  const getPriorityClasses = () => {
    switch (section.priority) {
      case 'high':
        return 'border-l-4 border-l-primary';
      case 'medium':
        return 'border-l-4 border-l-secondary';
      case 'low':
        return 'border-l-4 border-l-border';
      default:
        return '';
    }
  };

  // Determinar variante do KPICard baseado no contexto
  const getKPIVariant = () => {
    if (compactMode) return 'compact';
    if (section.layout === 'horizontal') return 'compact';
    return 'default';
  };

  // Determinar tamanho do KPICard
  const getKPISize = () => {
    if (compactMode) return 'sm';
    if (section.priority === 'high') return 'md';
    return 'sm';
  };

  return (
    <div
      className={cn(
        'bg-background border border-border rounded-lg overflow-hidden',
        getPriorityClasses(),
        className
      )}
    >
      {/* Header da Seção */}
      <div className="p-4 bg-surface border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-text-primary">
                {section.title}
              </h3>
              
              {section.description && (
                <div className="group relative">
                  <Info className="h-4 w-4 text-text-secondary cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-surface border border-border rounded-lg shadow-lg text-sm text-text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 whitespace-nowrap">
                    {section.description}
                  </div>
                </div>
              )}
              
              {/* Badge de contagem */}
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                {section.kpis.length} KPI{section.kpis.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {section.description && !compactMode && (
              <p className="text-sm text-text-secondary mt-1">
                {section.description}
              </p>
            )}
          </div>

          {/* Botão de colapso */}
          {section.collapsible && (
            <button
              onClick={handleToggle}
              className="ml-4 p-2 hover:bg-surface-hover rounded-lg transition-colors duration-200"
              aria-label={isCollapsed ? 'Expandir seção' : 'Colapsar seção'}
            >
              {isCollapsed ? (
                <ChevronDown className="h-4 w-4 text-text-secondary" />
              ) : (
                <ChevronUp className="h-4 w-4 text-text-secondary" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo da Seção */}
      {!isCollapsed && (
        <div className="p-4">
          {section.kpis.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-text-secondary text-sm">
                Nenhum KPI disponível nesta seção
              </div>
            </div>
          ) : (
            <div className={getLayoutClasses()}>
              {section.kpis.map((kpi) => (
                <KPICard
                  key={kpi.id}
                  kpi={kpi}
                  size={getKPISize()}
                  variant={getKPIVariant()}
                  showTrend={!compactMode}
                  showDescription={showDescriptions && !compactMode}
                  clickable={!!onKPIClick || kpi.clickable}
                  onClick={onKPIClick}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer com informações adicionais (apenas para seções de alta prioridade) */}
      {!isCollapsed && section.priority === 'high' && !compactMode && (
        <div className="px-4 py-3 bg-surface border-t border-border">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>
              Última atualização: {new Date().toLocaleTimeString('pt-BR')}
            </span>
            
            {/* Indicador de status da seção */}
            <div className="flex items-center gap-2">
              {section.kpis.some(kpi => kpi.color === 'danger') && (
                <span className="flex items-center gap-1 text-danger">
                  <div className="w-2 h-2 bg-danger rounded-full" />
                  Atenção necessária
                </span>
              )}
              
              {section.kpis.some(kpi => kpi.color === 'warning') && 
               !section.kpis.some(kpi => kpi.color === 'danger') && (
                <span className="flex items-center gap-1 text-warning">
                  <div className="w-2 h-2 bg-warning rounded-full" />
                  Monitoramento
                </span>
              )}
              
              {section.kpis.every(kpi => kpi.color === 'success' || kpi.color === 'primary' || kpi.color === 'secondary') && (
                <span className="flex items-center gap-1 text-success">
                  <div className="w-2 h-2 bg-success rounded-full" />
                  Operacional
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardSection;
