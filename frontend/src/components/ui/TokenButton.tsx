import React from 'react';
import { cn } from '@/utils/cn';

interface TokenButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Componente Button usando Design Tokens
 * Demonstra o uso prático dos tokens gerados
 */
const TokenButton = React.forwardRef<HTMLButtonElement, TokenButtonProps>(
  (
    { className, variant = 'primary', size = 'md', children, ...props },
    ref
  ) => {
    const baseClasses = cn(
      // Usando spacing tokens
      'inline-flex items-center justify-center',
      // Usando border-radius tokens
      'rounded-md',
      // Usando typography tokens
      'font-medium',
      // Usando animation tokens
      'transition-colors duration-normal ease-ease',
      // Usando shadow tokens (focus)
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50'
    );

    const variantClasses = {
      primary: cn(
        'bg-primary-600 text-white',
        'hover:bg-primary-700 active:bg-primary-800',
        'shadow-md hover:shadow-lg'
      ),
      secondary: cn(
        'bg-secondary-100 text-secondary-900',
        'hover:bg-secondary-200 active:bg-secondary-300',
        'border border-secondary-300'
      ),
      success: cn(
        'bg-success-500 text-white',
        'hover:bg-success-600 active:bg-success-700',
        'shadow-md hover:shadow-lg'
      ),
      warning: cn(
        'bg-warning-500 text-white',
        'hover:bg-warning-600 active:bg-warning-700',
        'shadow-md hover:shadow-lg'
      ),
      danger: cn(
        'bg-danger-500 text-white',
        'hover:bg-danger-600 active:bg-danger-700',
        'shadow-md hover:shadow-lg'
      ),
    };

    const sizeClasses = {
      // Usando spacing e typography tokens
      sm: 'h-8 px-sm text-sm',
      md: 'h-10 px-md text-base',
      lg: 'h-12 px-lg text-lg',
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

TokenButton.displayName = 'TokenButton';

export default TokenButton;
