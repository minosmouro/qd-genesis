import React from 'react';
import { Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

interface StepIndicatorProps {
  number: number;
  label: string;
  active?: boolean;
  completed?: boolean;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  number,
  label,
  active = false,
  completed = false,
}) => {
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        initial={false}
        animate={{
          scale: active ? 1.1 : 1,
          backgroundColor: completed
            ? 'rgb(16, 185, 129)' // success
            : active
              ? 'rgb(59, 130, 246)' // primary
              : 'rgb(229, 231, 235)', // gray-200
        }}
        transition={{ duration: 0.3 }}
        className={cn(
          'relative w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg',
          completed
            ? 'text-white'
            : active
              ? 'text-white'
              : 'text-gray-400 dark:text-gray-500'
        )}
      >
        {completed ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Check className="h-6 w-6" />
          </motion.div>
        ) : (
          number
        )}
        
        {/* Glow effect quando ativo */}
        {active && (
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/20"
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: 1.5, opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </motion.div>
      
      <span
        className={cn(
          'text-xs font-medium text-center',
          active
            ? 'text-primary dark:text-primary-light'
            : completed
              ? 'text-success dark:text-success-light'
              : 'text-gray-500 dark:text-gray-400'
        )}
      >
        {label}
      </span>
    </div>
  );
};

export default StepIndicator;
