import React from 'react';
import { motion } from 'framer-motion';

interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  label?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  showPercentage = true,
  variant = 'default',
  size = 'md',
  animated = true,
  className = '',
}) => {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  // Determina a variante baseada na porcentagem se for 'default'
  const getVariant = () => {
    if (variant !== 'default') return variant;
    if (percentage >= 100) return 'danger';
    if (percentage >= 80) return 'warning';
    return 'success';
  };

  const activeVariant = getVariant();

  const variantClasses = {
    success: {
      bg: 'bg-gradient-to-r from-green-400 to-green-500 dark:from-green-500 dark:to-green-600',
      glow: 'shadow-green-500/50',
    },
    warning: {
      bg: 'bg-gradient-to-r from-yellow-400 to-orange-500 dark:from-yellow-500 dark:to-orange-600',
      glow: 'shadow-yellow-500/50',
    },
    danger: {
      bg: 'bg-gradient-to-r from-red-500 to-red-600 dark:from-red-600 dark:to-red-700',
      glow: 'shadow-red-500/50',
    },
  };

  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const vc = variantClasses[activeVariant];

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-text-secondary">{label}</span>
          {showPercentage && (
            <span className="text-xs font-semibold text-text-primary">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      <div
        className={`relative w-full rounded-full bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 overflow-hidden shadow-inner ${sizeClasses[size]}`}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: animated ? 0.7 : 0,
            ease: 'easeOut',
          }}
          className={`absolute inset-y-0 left-0 rounded-full ${vc.bg} ${
            percentage >= 100 && animated ? 'animate-pulse' : ''
          }`}
          style={{ maxWidth: '100%' }}
        >
          {/* Shimmer effect */}
          {animated && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          )}
        </motion.div>

        {/* Texto centralizado (apenas para tamanhos maiores) */}
        {size !== 'sm' && showPercentage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-200 drop-shadow-sm mix-blend-difference">
              {Math.round(percentage)}%
            </span>
          </div>
        )}
      </div>

      {/* Informação adicional */}
      {max !== 100 && (
        <div className="mt-1 text-xs text-text-secondary">
          {value} de {max} usados
          {value < max && ` (restantes: ${max - value})`}
          {value > max && (
            <span className="ml-2 text-danger font-medium">⚠️ Acima do limite!</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgressBar;
