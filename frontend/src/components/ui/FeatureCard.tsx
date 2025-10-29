import React, { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'indigo' | 'emerald';
  onClick?: () => void;
  actions?: ReactNode;
  badge?: string;
  disabled?: boolean;
  className?: string;
}

const colorClasses = {
  blue: {
    glow: 'bg-blue-500/5 group-hover:bg-blue-500/10',
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    arrow: 'text-blue-500',
  },
  green: {
    glow: 'bg-green-500/5 group-hover:bg-green-500/10',
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-500',
    arrow: 'text-green-500',
  },
  purple: {
    glow: 'bg-purple-500/5 group-hover:bg-purple-500/10',
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
    arrow: 'text-purple-500',
  },
  orange: {
    glow: 'bg-orange-500/5 group-hover:bg-orange-500/10',
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-500',
    arrow: 'text-orange-500',
  },
  red: {
    glow: 'bg-red-500/5 group-hover:bg-red-500/10',
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-500',
    arrow: 'text-red-500',
  },
  indigo: {
    glow: 'bg-indigo-500/5 group-hover:bg-indigo-500/10',
    iconBg: 'bg-indigo-500/10',
    iconColor: 'text-indigo-500',
    arrow: 'text-indigo-500',
  },
  emerald: {
    glow: 'bg-emerald-500/5 group-hover:bg-emerald-500/10',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    arrow: 'text-emerald-500',
  },
};

const FeatureCard: React.FC<FeatureCardProps> = ({
  title,
  description,
  icon: Icon,
  iconColor = 'blue',
  onClick,
  actions,
  badge,
  disabled = false,
  className,
}) => {
  const colors = colorClasses[iconColor];

  const content = (
    <>
      {/* Glow effect no canto */}
      <div
        className={cn(
          'absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl transition-all duration-500',
          colors.glow
        )}
      />

      {/* Badge opcional */}
      {badge && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 right-4 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold"
        >
          {badge}
        </motion.div>
      )}

      <div className="relative z-10 flex flex-col h-full">
        {/* Ícone */}
        <motion.div
          className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center mb-4 transition-all',
            colors.iconBg
          )}
          whileHover={{ scale: 1.1, rotate: 5 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Icon className={cn('h-7 w-7', colors.iconColor)} />
        </motion.div>

        {/* Título */}
        <h3 className="text-lg font-bold text-text-primary mb-2 line-clamp-1">
          {title}
        </h3>

        {/* Descrição */}
        <p className="text-sm text-text-secondary mb-4 line-clamp-2 flex-1">
          {description}
        </p>

        {/* Ações ou Link */}
        {actions ? (
          <div className="mt-auto">{actions}</div>
        ) : onClick ? (
          <motion.div
            className={cn(
              'flex items-center text-sm font-medium mt-auto',
              colors.arrow
            )}
            whileHover={{ x: 4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            Configurar agora
            <ArrowRight className="ml-2 h-4 w-4" />
          </motion.div>
        ) : null}
      </div>
    </>
  );

  if (onClick && !disabled) {
    return (
      <motion.button
        onClick={onClick}
        disabled={disabled}
        whileHover={{ scale: 1.02, y: -4 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'group relative overflow-hidden rounded-xl border border-border/50',
          'bg-gradient-to-br from-surface/80 to-surface/40 backdrop-blur-sm',
          'p-6 cursor-pointer transition-all duration-300 text-left',
          'hover:shadow-xl hover:border-border',
          'focus:outline-none focus:ring-2 focus:ring-primary/20',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <motion.div
      whileHover={!disabled ? { scale: 1.02, y: -4 } : {}}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/50',
        'bg-gradient-to-br from-surface/80 to-surface/40 backdrop-blur-sm',
        'p-6 transition-all duration-300',
        !disabled && 'hover:shadow-xl hover:border-border',
        disabled && 'opacity-50',
        className
      )}
    >
      {content}
    </motion.div>
  );
};

export default FeatureCard;
