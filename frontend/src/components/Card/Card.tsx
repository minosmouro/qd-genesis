import React from 'react';
import { cn } from '@/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        'bg-surface text-text-primary border border-border rounded-lg shadow-sm dark:bg-[var(--color-semantic-surface-dark)] dark:text-[var(--color-semantic-text-primary-dark)] dark:border-[var(--color-semantic-border-dark)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;