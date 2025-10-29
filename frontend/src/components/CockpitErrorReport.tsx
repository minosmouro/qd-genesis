/**
 * Cockpit Error Report - Relatório Simplificado de Erros
 * Mostra apenas erros críticos que precisam de ação imediata do corretor
 */
import React, { useState } from 'react';
import { 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Eye, 
  EyeOff,
  Clock,
  CheckCircle,
  Info,
  Trash2
} from 'lucide-react';
import Button from '@/components/Button/Button';
import Card from '@/components/Card/Card';
import { cn } from '@/utils/cn';
import type { RefreshJob } from '@/types/refresh';

interface ErrorSummary {
  type: 'connection' | 'auth' | 'property' | 'system' | 'timeout';
  count: number;
  message: string;
  severity: 'high' | 'medium' | 'low';
  lastOccurrence: string;
  affectedSchedules: string[];
}

interface CockpitErrorReportProps {
  failedJobs: RefreshJob[];
  onRetryAll: () => void;
  onClearOldLogs?: (beforeDate: Date) => void;
  isLoading?: boolean;
  className?: string;
  timeFilter?: 'recent' | 'today' | 'week' | 'all';
}

const CockpitErrorReport: React.FC<CockpitErrorReportProps> = ({
  failedJobs,
  onRetryAll,
  onClearOldLogs,
  isLoading = false,
  className,
  timeFilter = 'recent'
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [expandedError, setExpandedError] = useState<number | null>(null);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState(timeFilter);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Função para limpar logs antigos
  const handleClearOldLogs = () => {
    if (onClearOldLogs) {
      // Limpar logs com mais de 7 dias
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      onClearOldLogs(sevenDaysAgo);
      setShowClearConfirm(false);
    }
  };

  // Contar logs antigos que seriam removidos
  const getOldLogsCount = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return failedJobs.filter(job => new Date(job.created_at) < sevenDaysAgo).length;
  };

  // Filtrar jobs por tempo
  const filteredJobs = React.useMemo(() => {
    if (!failedJobs || failedJobs.length === 0) return [];

    const now = new Date();
    const nowMs = now.getTime();
    
    return failedJobs.filter(job => {
      const jobDate = new Date(job.created_at);
      const diffHours = (nowMs - jobDate.getTime()) / (1000 * 60 * 60);
      
      switch (selectedTimeFilter) {
        case 'recent':
          return diffHours <= 48; // Últimas 48h apenas
        case 'today':
          return diffHours <= 24; // Último dia
        case 'week':
          return diffHours <= 168; // Última semana (7 dias)
        case 'all':
        default:
          return true;
      }
    });
  }, [failedJobs, selectedTimeFilter]);

  // Classificar jobs por "idade" para destacar recentes
  const classifyJobAge = (createdAt: string): 'fresh' | 'recent' | 'old' => {
    const jobDate = new Date(createdAt);
    const diffHours = (new Date().getTime() - jobDate.getTime()) / (1000 * 60 * 60);
    
    if (diffHours <= 4) return 'fresh'; // Últimas 4h
    if (diffHours <= 24) return 'recent'; // Até 24h
    return 'old'; // Mais de 24h
  };

  // Agrupar erros por tipo e severidade (usando jobs filtrados)
  const errorSummary = React.useMemo(() => {
    if (!filteredJobs || filteredJobs.length === 0) return [];

    const errorGroups: { [key: string]: ErrorSummary & { age: 'fresh' | 'recent' | 'old' } } = {};

    filteredJobs.forEach(job => {
      const errorMsg = job.error_message || job.error || 'Erro desconhecido';
      const jobAge = classifyJobAge(job.created_at);
      let type: ErrorSummary['type'] = 'system';
      let severity: ErrorSummary['severity'] = 'medium';

      // Classificar tipo de erro
      if (errorMsg.toLowerCase().includes('connection') || errorMsg.toLowerCase().includes('network')) {
        type = 'connection';
        severity = 'high';
      } else if (errorMsg.toLowerCase().includes('auth') || errorMsg.toLowerCase().includes('token')) {
        type = 'auth';
        severity = 'high';
      } else if (errorMsg.toLowerCase().includes('property') || errorMsg.toLowerCase().includes('propriedade')) {
        type = 'property';
        severity = 'medium';
      } else if (errorMsg.toLowerCase().includes('timeout')) {
        type = 'timeout';
        severity = 'medium';
      }

      // Erros mais recentes têm prioridade
      if (jobAge === 'fresh') severity = 'high';
      else if (jobAge === 'old' && severity === 'high') severity = 'medium';

      const key = `${type}-${errorMsg.substring(0, 50)}`;
      
      if (!errorGroups[key]) {
        errorGroups[key] = {
          type,
          count: 0,
          message: errorMsg,
          severity,
          lastOccurrence: job.created_at,
          affectedSchedules: [],
          age: jobAge
        };
      }

      errorGroups[key].count++;
      if (job.schedule?.name && !errorGroups[key].affectedSchedules.includes(job.schedule.name)) {
        errorGroups[key].affectedSchedules.push(job.schedule.name);
      }
      
      // Manter a ocorrência mais recente
      if (new Date(job.created_at) > new Date(errorGroups[key].lastOccurrence)) {
        errorGroups[key].lastOccurrence = job.created_at;
        errorGroups[key].age = jobAge; // Atualizar idade com a ocorrência mais recente
      }
    });

    return Object.values(errorGroups)
      .sort((a, b) => {
        // Priorizar por idade primeiro (fresh > recent > old)
        const ageOrder = { fresh: 3, recent: 2, old: 1 };
        if (ageOrder[a.age] !== ageOrder[b.age]) {
          return ageOrder[b.age] - ageOrder[a.age];
        }
        // Depois por severidade
        const severityOrder = { high: 3, medium: 2, low: 1 };
        if (severityOrder[a.severity] !== severityOrder[b.severity]) {
          return severityOrder[b.severity] - severityOrder[a.severity];
        }
        // Por último por contagem
        return b.count - a.count;
      });
  }, [filteredJobs, classifyJobAge]);

  // Obter ícone do tipo de erro
  const getErrorIcon = (type: ErrorSummary['type']) => {
    switch (type) {
      case 'connection': return RefreshCw;
      case 'auth': return XCircle;
      case 'property': return Info;
      case 'timeout': return Clock;
      default: return AlertTriangle;
    }
  };

  // Obter cor da severidade
  const getSeverityColor = (severity: ErrorSummary['severity']) => {
    switch (severity) {
      case 'high': return 'text-danger dark:text-danger';
      case 'medium': return 'text-warning dark:text-warning';
      case 'low': return 'text-info dark:text-info';
      default: return 'text-text-secondary dark:text-text-secondary';
    }
  };

  // Obter cor de fundo da severidade
  const getSeverityBgColor = (severity: ErrorSummary['severity']) => {
    switch (severity) {
      case 'high': return 'bg-danger/10 dark:bg-danger/20 border-danger/20 dark:border-danger/30';
      case 'medium': return 'bg-warning/10 dark:bg-warning/20 border-warning/20 dark:border-warning/30';
      case 'low': return 'bg-info/10 dark:bg-info/20 border-info/20 dark:border-info/30';
      default: return 'bg-surface dark:bg-surface border-border dark:border-border';
    }
  };

  // Formatar tempo desde a última ocorrência
  const formatLastOccurrence = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffMinutes < 60) return `${diffMinutes}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  if (isLoading) {
    return (
      <Card className={cn('p-6', className)}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-surface dark:bg-surface rounded w-48" />
            <div className="h-8 bg-surface dark:bg-surface rounded w-24" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="p-4 bg-surface dark:bg-surface rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-surface-hover dark:bg-surface-hover rounded" />
                  <div className="h-4 bg-surface-hover dark:bg-surface-hover rounded w-48" />
                </div>
                <div className="h-3 bg-surface-hover dark:bg-surface-hover rounded w-32" />
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  // Se não há erros (após filtro), mostrar estado baseado no filtro
  if (errorSummary.length === 0) {
    const totalFailedJobs = failedJobs?.length || 0;
    const hasOldErrors = totalFailedJobs > 0 && selectedTimeFilter !== 'all';
    
    return (
      <Card className={cn('p-6', hasOldErrors ? 'bg-info/5 dark:bg-info/10 border-info/20 dark:border-info/30' : 'bg-success/5 dark:bg-success/10 border-success/20 dark:border-success/30', className)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', hasOldErrors ? 'bg-info/10 dark:bg-info/20' : 'bg-success/10 dark:bg-success/20')}>
              <CheckCircle className={cn('h-6 w-6', hasOldErrors ? 'text-info dark:text-info' : 'text-success dark:text-success')} />
            </div>
            <div>
              <h3 className={cn('text-lg font-semibold', hasOldErrors ? 'text-info dark:text-info' : 'text-success dark:text-success')}>
                {hasOldErrors ? 'Sem Erros Recentes' : 'Sistema Operacional'}
              </h3>
              <p className={cn('text-sm', hasOldErrors ? 'text-info/80 dark:text-info/80' : 'text-success/80 dark:text-success/80')}>
                {hasOldErrors ? `Nenhum erro no período selecionado (${totalFailedJobs} erro${totalFailedJobs > 1 ? 's' : ''} mais antigo${totalFailedJobs > 1 ? 's' : ''})` : 'Nenhum erro crítico detectado'}
              </p>
            </div>
          </div>
          
          {/* Filtros temporais */}
          <div className="flex items-center gap-1">
            {(['recent', 'today', 'week', 'all'] as const).map((filter) => (
              <Button
                key={filter}
                onClick={() => setSelectedTimeFilter(filter)}
                variant={selectedTimeFilter === filter ? 'primary' : 'ghost'}
                size="sm"
                className="px-2 py-1 text-xs"
              >
                {{
                  recent: '48h',
                  today: 'Hoje',
                  week: '7 dias',
                  all: 'Todos'
                }[filter]}
              </Button>
            ))}
          </div>
        </div>
        
        <div className={cn('text-sm', hasOldErrors ? 'text-info/70 dark:text-info/70' : 'text-success/70 dark:text-success/70')}>
          {hasOldErrors ? 'Todos os erros neste período foram resolvidos. Altere o filtro temporal para ver histórico.' : 'Todos os agendamentos estão funcionando corretamente. Continue monitorando para manter a performance.'}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-danger/10 dark:bg-danger/20 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-danger dark:text-danger" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-text-primary dark:text-text-primary">
              Erros Críticos
            </h3>
            <p className="text-sm text-text-secondary dark:text-text-secondary">
              {filteredJobs.length} job{filteredJobs.length > 1 ? 's' : ''} com falha ({errorSummary.length} tipo{errorSummary.length > 1 ? 's' : ''})
              {failedJobs.length !== filteredJobs.length && (
                <span className="ml-2 text-xs text-warning dark:text-warning">
                  • {failedJobs.length - filteredJobs.length} erro{(failedJobs.length - filteredJobs.length) > 1 ? 's' : ''} mais antigo{(failedJobs.length - filteredJobs.length) > 1 ? 's' : ''} oculto{(failedJobs.length - filteredJobs.length) > 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filtros temporais */}
          <div className="flex items-center gap-1 mr-2">
            {(['recent', 'today', 'week', 'all'] as const).map((filter) => (
              <Button
                key={filter}
                onClick={() => setSelectedTimeFilter(filter)}
                variant={selectedTimeFilter === filter ? 'primary' : 'ghost'}
                size="sm"
                className="px-2 py-1 text-xs"
              >
                {{
                  recent: '48h',
                  today: 'Hoje', 
                  week: '7d',
                  all: 'Todos'
                }[filter]}
              </Button>
            ))}
          </div>
          
          {/* Botão de Limpeza de Logs Antigos */}
          {onClearOldLogs && getOldLogsCount() > 0 && (
            <div className="relative">
              {!showClearConfirm ? (
                <Button
                  onClick={() => setShowClearConfirm(true)}
                  variant="outline"
                  size="sm"
                  className="text-warning hover:text-warning"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Antigos ({getOldLogsCount()})
                </Button>
              ) : (
                <div className="flex items-center gap-1 p-2 bg-warning/10 dark:bg-warning/20 rounded-lg border border-warning/20">
                  <span className="text-xs text-warning mr-2">
                    Remover {getOldLogsCount()} log{getOldLogsCount() > 1 ? 's' : ''} com +7 dias?
                  </span>
                  <Button
                    onClick={handleClearOldLogs}
                    variant="outline"
                    size="sm"
                    className="text-xs px-2 py-1 text-danger hover:text-danger"
                  >
                    Confirmar
                  </Button>
                  <Button
                    onClick={() => setShowClearConfirm(false)}
                    variant="ghost"
                    size="sm"
                    className="text-xs px-2 py-1"
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          )}
          
          <Button
            onClick={() => setShowDetails(!showDetails)}
            variant="outline"
            size="sm"
          >
            {showDetails ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showDetails ? 'Ocultar' : 'Detalhes'}
          </Button>
          
          <Button
            onClick={onRetryAll}
            variant="secondary"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Tentar Todos
          </Button>
        </div>
      </div>

      {/* Resumo de Erros */}
      <div className="space-y-3">
        {errorSummary.slice(0, showDetails ? undefined : 3).map((error, index) => {
          const ErrorIcon = getErrorIcon(error.type);
          const isExpanded = expandedError === index;
          
          return (
            <div
              key={index}
              className={cn(
                'border rounded-lg transition-all duration-200',
                getSeverityBgColor(error.severity)
              )}
            >
              <div className="p-4">
                <div className="flex items-center gap-4">
                  {/* Ícone e Tipo */}
                  <div className={cn(
                    'p-2 rounded-lg',
                    error.severity === 'high' ? 'bg-danger/20 dark:bg-danger/30' :
                    error.severity === 'medium' ? 'bg-warning/20 dark:bg-warning/30' : 'bg-info/20 dark:bg-info/30'
                  )}>
                    <ErrorIcon className={cn('h-5 w-5', getSeverityColor(error.severity))} />
                  </div>

                  {/* Informações do Erro */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={cn('font-medium', getSeverityColor(error.severity))}>
                        {error.type === 'connection' ? 'Erro de Conexão' :
                         error.type === 'auth' ? 'Erro de Autenticação' :
                         error.type === 'property' ? 'Erro de Propriedade' :
                         error.type === 'timeout' ? 'Timeout' : 'Erro do Sistema'}
                      </h4>
                      
                      {/* Badge de idade do erro */}
                      {(error as any).age && (
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium',
                          (error as any).age === 'fresh' ? 'bg-danger/20 dark:bg-danger/30 text-danger dark:text-danger' :
                          (error as any).age === 'recent' ? 'bg-warning/20 dark:bg-warning/30 text-warning dark:text-warning' :
                          'bg-text-secondary/20 dark:bg-text-secondary/30 text-text-secondary dark:text-text-secondary'
                        )}>
                          {(error as any).age === 'fresh' ? '🔥 Recente' :
                           (error as any).age === 'recent' ? '⏰ Hoje' : '📅 Antigo'}
                        </span>
                      )}
                      
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium',
                        error.severity === 'high' ? 'bg-danger/20 dark:bg-danger/30 text-danger dark:text-danger' :
                        error.severity === 'medium' ? 'bg-warning/20 dark:bg-warning/30 text-warning dark:text-warning' :
                        'bg-info/20 dark:bg-info/30 text-info dark:text-info'
                      )}>
                        {error.count} ocorrência{error.count > 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <p className="text-sm text-text-secondary dark:text-text-secondary mb-2 line-clamp-2">
                      {error.message}
                    </p>
                    
                    <div className="flex items-center gap-4 text-xs text-text-secondary dark:text-text-secondary">
                      <span>
                        Última: {formatLastOccurrence(error.lastOccurrence)}
                      </span>
                      <span>
                        {error.affectedSchedules.length} cronograma{error.affectedSchedules.length > 1 ? 's' : ''} afetado{error.affectedSchedules.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => setExpandedError(isExpanded ? null : index)}
                      variant="ghost"
                      size="sm"
                      className="p-2"
                    >
                      {isExpanded ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {/* Detalhes Expandidos */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <div className="space-y-3">
                      <div>
                        <h5 className="text-sm font-medium text-text-primary dark:text-text-primary mb-2">
                          Cronogramas Afetados:
                        </h5>
                        <div className="flex flex-wrap gap-2">
                          {error.affectedSchedules.map((scheduleName, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-surface dark:bg-surface text-xs rounded"
                            >
                              {scheduleName}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="text-sm font-medium text-text-primary dark:text-text-primary mb-2">
                          Ações Recomendadas:
                        </h5>
                        <ul className="text-xs text-text-secondary dark:text-text-secondary space-y-1">
                          {error.type === 'connection' && (
                            <>
                              <li>• Verificar conexão com a internet</li>
                              <li>• Tentar executar novamente em alguns minutos</li>
                            </>
                          )}
                          {error.type === 'auth' && (
                            <>
                              <li>• Verificar credenciais do CanalPro</li>
                              <li>• Renovar token de acesso se necessário</li>
                            </>
                          )}
                          {error.type === 'property' && (
                            <>
                              <li>• Verificar se a propriedade ainda existe</li>
                              <li>• Atualizar dados da propriedade</li>
                            </>
                          )}
                          {error.type === 'timeout' && (
                            <>
                              <li>• Reduzir número de propriedades por execução</li>
                              <li>• Aumentar intervalo entre execuções</li>
                            </>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer com ações gerais */}
      {errorSummary.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="text-sm text-text-secondary dark:text-text-secondary">
              {errorSummary.filter(e => e.severity === 'high').length} críticos, {' '}
              {errorSummary.filter(e => e.severity === 'medium').length} médios
            </div>
            
            <div className="flex items-center gap-2">
              {!showDetails && errorSummary.length > 3 && (
                <span className="text-sm text-text-secondary dark:text-text-secondary">
                  +{errorSummary.length - 3} mais
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CockpitErrorReport;
