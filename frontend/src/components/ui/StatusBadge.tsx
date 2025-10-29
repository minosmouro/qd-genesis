import React from 'react';
import { CheckCircle2, Clock, AlertCircle, XCircle, Info } from 'lucide-react';
import { cn } from '@/utils/cn';

type StatusType = 'success' | 'pending' | 'warning' | 'error' | 'info';

interface StatusBadgeProps {
  status: StatusType;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const statusConfig = {
  success: {
    icon: CheckCircle2,
    bgColor: 'bg-success/10',
    textColor: 'text-success',
    borderColor: 'border-success/20',
  },
  pending: {
    icon: Clock,
    bgColor: 'bg-warning/10',
    textColor: 'text-warning',
    borderColor: 'border-warning/20',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'bg-warning/10',
    textColor: 'text-warning',
    borderColor: 'border-warning/20',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-error/10',
    textColor: 'text-error',
    borderColor: 'border-error/20',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-500/20',
  },
};

const sizeClasses = {
  sm: {
    container: 'px-2 py-0.5 text-xs',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'px-2.5 py-1 text-sm',
    icon: 'w-4 h-4',
  },
  lg: {
    container: 'px-3 py-1.5 text-base',
    icon: 'w-5 h-5',
  },
};

/**
 * StatusBadge - Badge de status reutilizável
 * 
 * Exibe status com ícone e cor apropriados (sucesso, pendente, erro, etc.)
 * 
 * @example
 * <StatusBadge status="success" label="Completo" />
 * <StatusBadge status="error" label="Incompleto" showIcon={false} />
 * <StatusBadge status="pending" label="Aguardando..." size="lg" />
 */
const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'sm',
  showIcon = true,
  className,
}) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  const sizes = sizeClasses[size];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 font-medium rounded-md border',
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizes.container,
        className
      )}
    >
      {showIcon && <Icon className={sizes.icon} />}
      {label}
    </span>
  );
};

export default StatusBadge;
