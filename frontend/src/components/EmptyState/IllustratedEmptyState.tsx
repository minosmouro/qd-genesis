import React from 'react';
import { cn } from '@/utils/cn';
import Button from '@/components/ui/Button';
import { LucideIcon } from 'lucide-react';

interface IllustratedEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  variant?: 'default' | 'accent';
}

const IllustratedEmptyState: React.FC<IllustratedEmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  variant = 'default',
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4 text-center',
        className
      )}
    >
      {/* Animated icon container */}
      {Icon && (
        <div className="relative mb-6 animate-fade-in-up">
          {/* Glow effect */}
          <div
            className={cn(
              'absolute inset-0 rounded-full blur-2xl opacity-30 animate-pulse',
              variant === 'accent'
                ? 'bg-brand-yellow dark:bg-brand-yellow-light'
                : 'bg-primary'
            )}
          />
          
          {/* Icon background */}
          <div
            className={cn(
              'relative w-24 h-24 rounded-full flex items-center justify-center',
              variant === 'accent'
                ? 'bg-brand-yellow/10 dark:bg-brand-yellow-light/10 border-2 border-brand-yellow/20 dark:border-brand-yellow-light/20'
                : 'bg-primary/10 border-2 border-primary/20'
            )}
          >
            <Icon
              className={cn(
                'w-12 h-12',
                variant === 'accent'
                  ? 'text-brand-navy dark:text-brand-navy-lighter'
                  : 'text-primary'
              )}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-md space-y-3 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <h3
          className={cn(
            'text-2xl font-display font-bold',
            variant === 'accent'
              ? 'text-brand-navy dark:text-brand-navy-lighter'
              : 'text-text-primary'
          )}
        >
          {title}
        </h3>
        <p className="text-text-secondary leading-relaxed">{description}</p>
      </div>

      {/* Action button */}
      {actionLabel && onAction && (
        <div className="mt-8 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <Button
            onClick={onAction}
            variant={variant === 'default' ? 'primary' : 'accent'}
            size="lg"
            className="font-display"
          >
            {actionLabel}
          </Button>
        </div>
      )}

      {/* Decorative elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
        <div
          className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-accent/5 rounded-full blur-3xl animate-float"
          style={{ animationDelay: '1s' }}
        />
      </div>
    </div>
  );
};

export default IllustratedEmptyState;