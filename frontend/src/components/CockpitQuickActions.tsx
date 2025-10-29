/**
 * Cockpit Quick Actions - Painel de Ações Rápidas para Corretores
 * Interface otimizada para ações principais em 2 cliques máximo
 */
import React from 'react';
import { 
  Plus, 
  Play, 
  BarChart3,
  Clock,
  RefreshCw,
  Zap
} from 'lucide-react';
import Button from '@/components/Button/Button';
import Card from '@/components/Card/Card';
import { cn } from '@/utils/cn';

interface CockpitQuickActionsProps {
  onCreateSchedule: () => void;
  onExecuteNow: () => void;
  onViewReports: () => void;
  onRefreshAll: () => void;
  onManualRefresh: () => void;
  hasActiveSchedules?: boolean;
  isLoading?: boolean;
  className?: string;
}

const CockpitQuickActions: React.FC<CockpitQuickActionsProps> = ({
  onCreateSchedule,
  onExecuteNow,
  onViewReports,
  onRefreshAll,
  onManualRefresh,
  hasActiveSchedules = false,
  isLoading = false,
  className
}) => {
  return (
    <Card className={cn('p-6', className)}>
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
          <Clock className="h-6 w-6 text-primary dark:text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary dark:text-text-primary">
            Ações Rápidas
          </h2>
          <p className="text-text-secondary dark:text-text-secondary text-sm">
            Gerencie seus agendamentos em poucos cliques
          </p>
        </div>
      </div>

      {/* Ações Principais - Layout em Grid Responsivo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Criar Novo Agendamento - Ação Principal */}
        <Button
          onClick={onCreateSchedule}
          size="lg"
          className="h-20 flex-col gap-2 text-center relative overflow-hidden group"
          disabled={isLoading}
        >
          <div className="absolute inset-0 bg-primary/90 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus className="h-6 w-6 relative z-10" />
          <span className="text-sm font-medium relative z-10">
            Novo Agendamento
          </span>
        </Button>

        {/* Executar Agora - Disponível apenas se há cronogramas ativos */}
        <Button
          onClick={onExecuteNow}
          variant={hasActiveSchedules ? "secondary" : "outline"}
          size="lg"
          className="h-20 flex-col gap-2 text-center"
          disabled={!hasActiveSchedules || isLoading}
        >
          <Play className={cn(
            'h-6 w-6',
            hasActiveSchedules ? 'text-secondary dark:text-secondary' : 'text-text-disabled dark:text-text-disabled'
          )} />
          <span className="text-sm font-medium">
            Executar Agora
          </span>
          {!hasActiveSchedules && (
            <span className="text-xs text-text-disabled dark:text-text-disabled">
              Sem cronogramas ativos
            </span>
          )}
        </Button>

        {/* Ver Relatórios */}
        <Button
          onClick={onViewReports}
          variant="outline"
          size="lg"
          className="h-20 flex-col gap-2 text-center"
          disabled={isLoading}
        >
          <BarChart3 className="h-6 w-6" />
          <span className="text-sm font-medium">
            Relatórios
          </span>
        </Button>

        {/* Refresh Manual - Nova funcionalidade */}
        <Button
          onClick={onManualRefresh}
          variant="secondary"
          size="lg"
          className="h-20 flex-col gap-2 text-center relative overflow-hidden group"
          disabled={isLoading}
        >
          <div className="absolute inset-0 bg-secondary/90 opacity-0 group-hover:opacity-100 transition-opacity" />
          <Zap className="h-6 w-6 relative z-10" />
          <span className="text-sm font-medium relative z-10">
            Refresh Manual
          </span>
        </Button>

        {/* Atualizar Tudo */}
        <Button
          onClick={onRefreshAll}
          variant="outline"
          size="lg"
          className="h-20 flex-col gap-2 text-center"
          disabled={isLoading}
        >
          <RefreshCw className={cn(
            'h-6 w-6',
            isLoading && 'animate-spin'
          )} />
          <span className="text-sm font-medium">
            Atualizar
          </span>
        </Button>
      </div>

      {/* Dicas Rápidas para Novos Usuários */}
      {!hasActiveSchedules && !isLoading && (
        <div className="mt-4 p-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-primary/10 dark:bg-primary/20 rounded">
              <Plus className="h-4 w-4 text-primary dark:text-primary" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-text-primary dark:text-text-primary mb-1">
                Comece agora!
              </h4>
              <p className="text-xs text-text-secondary dark:text-text-secondary">
                Crie seu primeiro agendamento automático para manter suas propriedades sempre atualizadas no CanalPro.
              </p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CockpitQuickActions;
