import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
  subtitle?: string;
  loading?: boolean;
  className?: string;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  icon,
  trend,
  color = 'blue',
  subtitle,
  loading = false,
  className = '',
}) => {
  const colorClasses = {
    blue: {
      bg: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-900 dark:text-blue-100',
      label: 'text-blue-600 dark:text-blue-400',
      icon: 'text-blue-600 dark:text-blue-400',
      subtitle: 'text-blue-700 dark:text-blue-300',
    },
    green: {
      bg: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-900 dark:text-green-100',
      label: 'text-green-600 dark:text-green-400',
      icon: 'text-green-600 dark:text-green-400',
      subtitle: 'text-green-700 dark:text-green-300',
    },
    yellow: {
      bg: 'from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-900 dark:text-yellow-100',
      label: 'text-yellow-600 dark:text-yellow-400',
      icon: 'text-yellow-600 dark:text-yellow-400',
      subtitle: 'text-yellow-700 dark:text-yellow-300',
    },
    red: {
      bg: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-900 dark:text-red-100',
      label: 'text-red-600 dark:text-red-400',
      icon: 'text-red-600 dark:text-red-400',
      subtitle: 'text-red-700 dark:text-red-300',
    },
    purple: {
      bg: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
      border: 'border-purple-200 dark:border-purple-800',
      text: 'text-purple-900 dark:text-purple-100',
      label: 'text-purple-600 dark:text-purple-400',
      icon: 'text-purple-600 dark:text-purple-400',
      subtitle: 'text-purple-700 dark:text-purple-300',
    },
    indigo: {
      bg: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20',
      border: 'border-indigo-200 dark:border-indigo-800',
      text: 'text-indigo-900 dark:text-indigo-100',
      label: 'text-indigo-600 dark:text-indigo-400',
      icon: 'text-indigo-600 dark:text-indigo-400',
      subtitle: 'text-indigo-700 dark:text-indigo-300',
    },
  };

  const c = colorClasses[color];

  if (loading) {
    return (
      <div className={`relative p-4 rounded-lg bg-gradient-to-br ${c.bg} border ${c.border} shadow-sm ${className}`}>
        <div className="animate-pulse space-y-2">
          <div className="h-2 w-16 bg-gray-300 dark:bg-gray-700 rounded" />
          <div className="h-6 w-12 bg-gray-300 dark:bg-gray-700 rounded" />
          <div className="h-2 w-20 bg-gray-300 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
      className={`relative p-4 rounded-lg bg-gradient-to-br ${c.bg} border ${c.border} shadow-sm hover:shadow-md transition-all duration-300 group ${className}`}
    >
      {/* Ícone de fundo */}
      <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity duration-300">
        <div className={`${c.icon} w-8 h-8`}>{icon}</div>
      </div>

      {/* Conteúdo */}
      <div className="relative z-10">
        <p className={`text-xs font-medium ${c.label} uppercase tracking-wider mb-1`}>
          {title}
        </p>

        <p className={`text-2xl font-bold ${c.text} mb-0.5`}>
          {value}
        </p>

        {subtitle && (
          <p className={`text-xs ${c.subtitle} mt-0.5`}>
            {subtitle}
          </p>
        )}

        {trend && (
          <div className="mt-1 text-xs">
            <span
              className={`inline-flex items-center gap-1 ${
                trend.direction === 'up'
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {trend.direction === 'up' ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(trend.value)}% vs. anterior
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default KPICard;
