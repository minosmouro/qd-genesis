import React from 'react';
import { cn } from '@/utils/cn';
import { Loader2 } from 'lucide-react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'glass' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center rounded-lg font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden group';

    const variantClasses = {
      primary:
        'bg-primary text-white hover:bg-primary/90 active:scale-95 shadow-md hover:shadow-lg hover:shadow-primary/25',
      secondary:
        'bg-surface text-text-primary border border-border hover:bg-border hover:border-border/80 active:scale-95',
      ghost: 'text-text-secondary hover:bg-surface hover:text-text-primary active:scale-95',
      danger: 'bg-danger text-white hover:bg-danger/90 active:scale-95 shadow-md hover:shadow-lg hover:shadow-danger/25',
      accent:
        'bg-brand-yellow dark:bg-brand-yellow-light text-brand-navy dark:text-brand-navy-darker hover:bg-brand-yellow-dark dark:hover:bg-brand-yellow active:scale-95 shadow-lg hover:shadow-xl hover:shadow-brand-yellow/30 dark:hover:shadow-brand-yellow-light/30 font-bold',
      glass:
        'bg-white/10 backdrop-blur-md border border-white/20 text-text-primary hover:bg-white/20 active:scale-95',
      outline:
        'border-2 border-primary text-primary hover:bg-primary hover:text-white active:scale-95',
    };

    const sizeClasses = {
      sm: 'h-8 px-3 text-xs gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2',
    };

    const classes = cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className
    );

    return (
      <button
        className={classes}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {/* Ripple effect overlay */}
        <span className="absolute inset-0 overflow-hidden rounded-lg">
          <span className="absolute inset-0 bg-white/20 transform scale-0 group-active:scale-100 transition-transform duration-300 rounded-full" />
        </span>
        
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {!loading && icon && iconPosition === 'left' && icon}
        {!loading && children}
        {!loading && icon && iconPosition === 'right' && icon}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
