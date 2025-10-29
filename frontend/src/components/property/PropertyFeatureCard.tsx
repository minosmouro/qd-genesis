import React from 'react';
import { cn } from '@/utils/cn';

interface PropertyFeatureCardProps {
  id: string;
  name: string;
  icon: string;
  selected: boolean;
  onToggle: (id: string) => void;
  disabled?: boolean;
}

const PropertyFeatureCard: React.FC<PropertyFeatureCardProps> = ({
  id,
  name,
  icon,
  selected,
  onToggle,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={() => !disabled && onToggle(id)}
      disabled={disabled}
      className={cn(
        'relative flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200',
        'hover:scale-105 active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
        selected
          ? 'border-primary bg-primary/10 shadow-md'
          : 'border-border bg-surface hover:border-primary/50 hover:bg-surface-hover',
        disabled && 'opacity-50 cursor-not-allowed hover:scale-100'
      )}
    >
      {/* Ícone */}
      <div className={cn(
        'text-3xl mb-2 transition-transform',
        selected && 'scale-110'
      )}>
        {icon}
      </div>
      
      {/* Nome */}
      <span className={cn(
        'text-xs font-medium text-center transition-colors',
        selected ? 'text-primary' : 'text-text-secondary'
      )}>
        {name}
      </span>

      {/* Indicador de seleção */}
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}
    </button>
  );
};

export default PropertyFeatureCard;