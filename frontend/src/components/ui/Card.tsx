import React from 'react';
import { cn } from '@/utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'accent' | 'elevated';
  hover?: boolean;
  onClick?: () => void;
}

const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  hover = false,
  onClick,
}) => {
  const variantClasses = {
    default: 'bg-surface border border-border',
    glass: 'bg-white/5 backdrop-blur-md border border-white/10',
    accent: 'bg-brand-yellow/5 dark:bg-brand-yellow-light/5 border border-brand-yellow/20 dark:border-brand-yellow-light/20',
    elevated: 'bg-surface border border-border shadow-soft-lg',
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-xl transition-all duration-300',
        variantClasses[variant],
        hover && 'hover:shadow-soft-lg hover:-translate-y-1 cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn('p-6 border-b border-border/50', className)}>
    {children}
  </div>
);

export const CardBody: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn('p-6', className)}>{children}</div>
);

export const CardFooter: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <div className={cn('p-6 border-t border-border/50', className)}>
    {children}
  </div>
);

export default Card;