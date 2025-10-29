import React from 'react';
import { cn } from '@/utils/cn';

interface InfoCardProps {
  icon?: React.ReactNode;
  label: string;
  value: string | number | React.ReactNode;
  accent?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  size?: 'sm' | 'md';
  className?: string;
}

const accentClasses = {
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  neutral: 'text-text-secondary',
};

/**
 * InfoCard - Card compacto para exibir informação chave-valor
 * 
 * Usado em resumos, dashboards e widgets do sidebar para mostrar
 * informações de forma visual e organizada.
 * 
 * @example
 * <InfoCard icon={<Home />} label="Tipo" value="Apartamento" />
 * <InfoCard label="Área" value="149 m²" accent="success" />
 * <InfoCard label="Quartos" value={3} size="sm" />
 */
const InfoCard: React.FC<InfoCardProps> = ({
  icon,
  label,
  value,
  accent = 'neutral',
  size = 'sm',
  className,
}) => {
  return (
    <div
      className={cn(
        'flex items-center gap-3',
        size === 'sm' ? 'py-2' : 'py-3',
        className
      )}
    >
      {/* Icon */}
      {icon && (
        <div className={cn('flex-shrink-0', accentClasses[accent])}>
          {icon}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="text-xs text-text-secondary mb-0.5">
          {label}
        </div>
        <div className={cn(
          'font-medium text-text-primary truncate',
          size === 'sm' ? 'text-sm' : 'text-base'
        )}>
          {value}
        </div>
      </div>
    </div>
  );
};

export default InfoCard;
