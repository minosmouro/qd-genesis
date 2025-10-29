import type React from 'react';
import { cn } from '@/utils/cn';
import { Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface InfoCardProps {
  type?: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const InfoCard: React.FC<InfoCardProps> = ({
  type = 'info',
  title,
  children,
  className,
}) => {
  const variants = {
    info: {
      bg: 'bg-primary/5 border-primary/20',
      icon: Info,
      iconColor: 'text-primary',
      titleColor: 'text-primary',
    },
    warning: {
      bg: 'bg-warning/5 border-warning/20',
      icon: AlertTriangle,
      iconColor: 'text-warning',
      titleColor: 'text-warning',
    },
    success: {
      bg: 'bg-success/5 border-success/20',
      icon: CheckCircle,
      iconColor: 'text-success',
      titleColor: 'text-success',
    },
    error: {
      bg: 'bg-danger/5 border-danger/20',
      icon: XCircle,
      iconColor: 'text-danger',
      titleColor: 'text-danger',
    },
  };

  const variant = variants[type];
  const Icon = variant.icon;

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-all duration-200',
        variant.bg,
        className
      )}
    >
      <div className="flex gap-3">
        <div className={cn('flex-shrink-0 mt-0.5', variant.iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <h4 className={cn('font-semibold mb-1 text-sm', variant.titleColor)}>
              {title}
            </h4>
          )}
          <div className="text-sm text-text-secondary leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InfoCard;