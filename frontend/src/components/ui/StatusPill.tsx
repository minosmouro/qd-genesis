import React from 'react';
import { cn } from '@/utils/cn';
import { CheckCircle2, Clock, AlertCircle, Download, Zap } from 'lucide-react';

export interface StatusPillProps {
  status: string;
  className?: string;
  showIcon?: boolean;
}

const StatusPill: React.FC<StatusPillProps> = ({ status, className, showIcon = true }) => {
  const statusConfig: Record<string, { label: string; classes: string; icon: React.ReactNode }> = {
    imported: {
      label: 'Importado',
      classes: 'bg-primary/10 text-primary border-primary/30 shadow-sm',
      icon: <Download className="w-3 h-3" />,
    },
    pending: {
      label: 'Pendente',
      classes: 'bg-warning/10 text-warning border-warning/30 shadow-sm',
      icon: <Clock className="w-3 h-3" />,
    },
    synced: {
      label: 'Sincronizado',
      classes: 'bg-success/10 text-success border-success/30 shadow-sm',
      icon: <CheckCircle2 className="w-3 h-3" />,
    },
    error: {
      label: 'Erro',
      classes: 'bg-danger/10 text-danger border-danger/30 shadow-sm',
      icon: <AlertCircle className="w-3 h-3" />,
    },
    active: {
      label: 'Ativo',
      classes: 'bg-success/10 text-success border-success/30 shadow-sm',
      icon: <Zap className="w-3 h-3" />,
    },
  };

  const config = statusConfig[status];

  // Se o status não for encontrado no mapeamento, usar um valor padrão
  if (!config) {
    console.warn('Status não encontrado no StatusPill:', status);
    return (
      <div
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border backdrop-blur-sm',
          'bg-secondary/10 text-secondary border-secondary/30 shadow-sm',
          className
        )}
      >
        {showIcon && <span className="w-2 h-2 rounded-full bg-current"></span>}
        {status || 'Desconhecido'}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border backdrop-blur-sm transition-all duration-200 hover:scale-105',
        config.classes,
        className
      )}
    >
      {showIcon && config.icon}
      {config.label}
    </div>
  );
};

export default StatusPill;
