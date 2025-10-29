import React from 'react';
import { cn } from '@/utils/cn';

interface SidebarWidgetProps {
  title: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeColor?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  children: React.ReactNode;
  className?: string;
}

const badgeColorClasses = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  success: 'bg-success/10 text-success border-success/20',
  warning: 'bg-warning/10 text-warning border-warning/20',
  error: 'bg-error/10 text-error border-error/20',
  info: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
};

/**
 * SidebarWidget - Container padronizado para widgets do sidebar direito
 * 
 * Usado em todas as etapas do cadastro de imóvel para exibir informações
 * contextuais, resumos, checklists, dicas, etc.
 * 
 * @example
 * <SidebarWidget 
 *   title="Resumo do Imóvel" 
 *   icon={<Home />} 
 *   badge="85%"
 *   badgeColor="success"
 * >
 *   <div>Conteúdo do widget</div>
 * </SidebarWidget>
 */
const SidebarWidget: React.FC<SidebarWidgetProps> = ({
  title,
  icon,
  badge,
  badgeColor = 'primary',
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-surface border border-border rounded-lg p-4 space-y-3',
        'transition-all duration-200 hover:border-border/80',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="text-primary flex-shrink-0">
              {icon}
            </div>
          )}
          <h3 className="text-sm font-semibold text-text-primary">
            {title}
          </h3>
        </div>

        {badge && (
          <span
            className={cn(
              'px-2 py-0.5 text-xs font-medium rounded-md border',
              badgeColorClasses[badgeColor]
            )}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="text-sm text-text-secondary">
        {children}
      </div>
    </div>
  );
};

export default SidebarWidget;
