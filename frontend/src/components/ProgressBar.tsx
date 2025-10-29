import type React from 'react';
import { cn } from '@/utils/cn';

interface ProgressBarProps {
  progress: number;
  status?: 'default' | 'success' | 'error';
  showPercentage?: boolean;
  label?: string;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  status = 'default',
  showPercentage = true,
  label,
  className,
}) => {
  const statusColors = {
    default: 'bg-primary',
    success: 'bg-success',
    error: 'bg-danger',
  };

  const statusGlows = {
    default: 'shadow-primary/50',
    success: 'shadow-success/50',
    error: 'shadow-danger/50',
  };

  return (
    <div className={cn('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-2 text-sm">
          {label && <span className="font-medium text-text-primary">{label}</span>}
          {showPercentage && (
            <span className="text-text-secondary font-mono">{progress}%</span>
          )}
        </div>
      )}
      <div className="relative h-3 rounded-full bg-border/40 overflow-hidden">
        {/* Background shimmer effect */}
        <div className="absolute inset-0 shimmer opacity-30" />
        
        {/* Progress bar */}
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out relative overflow-hidden',
            statusColors[status],
            progress >= 100 && `shadow-lg ${statusGlows[status]}`
          )}
          style={{ width: `${Math.min(progress, 100)}%` }}
        >
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        </div>
      </div>
    </div>
  );
};

export default ProgressBar;