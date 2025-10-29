import type React from 'react';
import { cn } from '@/utils/cn';
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';

interface StatusBadgeProps {
  status: 'success' | 'error' | 'warning' | 'pending' | 'info';
  text: string;
  className?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text, className }) => {
  const variants = {
    success: {
      bg: 'bg-success/10 border-success/30',
      text: 'text-success',
      icon: CheckCircle2,
    },
    error: {
      bg: 'bg-danger/10 border-danger/30',
      text: 'text-danger',
      icon: XCircle,
    },
    warning: {
      bg: 'bg-warning/10 border-warning/30',
      text: 'text-warning',
      icon: AlertCircle,
    },
    pending: {
      bg: 'bg-border/50 border-border',
      text: 'text-text-secondary',
      icon: Clock,
    },
    info: {
      bg: 'bg-primary/10 border-primary/30',
      text: 'text-primary',
      icon: AlertCircle,
    },
  };

  const variant = variants[status];
  const Icon = variant.icon;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200',
        variant.bg,
        variant.text,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5" />
      <span>{text}</span>
    </div>
  );
};

export default StatusBadge;