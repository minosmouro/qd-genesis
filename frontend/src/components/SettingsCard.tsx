import type React from 'react';
import { cn } from '@/utils/cn';

interface SettingsCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  gradient?: string;
}

const SettingsCard: React.FC<SettingsCardProps> = ({
  title,
  description,
  icon,
  children,
  className,
  gradient = 'from-primary/10 to-accent/10',
}) => {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-surface border border-border/50 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-1',
        className
      )}
    >
      {/* Gradient Background */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500',
          gradient
        )}
      />

      {/* Content */}
      <div className="relative p-6 flex flex-col h-full">
        {/* Icon & Title */}
        <div className="flex items-start gap-4 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-text-primary mb-2 group-hover:text-primary transition-colors">
              {title}
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto pt-4">{children}</div>
      </div>

      {/* Decorative Corner */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full transform translate-x-16 -translate-y-16 group-hover:translate-x-12 group-hover:-translate-y-12 transition-transform duration-500" />
    </div>
  );
};

export default SettingsCard;