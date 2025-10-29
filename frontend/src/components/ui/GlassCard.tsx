import React from 'react';
import { cn } from '@/utils/cn';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  accent?: boolean;
  onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  hover = false,
  accent = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={cn(
        'relative rounded-xl border border-white/10 backdrop-blur-md',
        accent
          ? 'bg-white/10'
          : 'bg-white/5',
        hover && 'transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-glass-lg cursor-pointer',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Overlay for extra depth */}
      {accent && (
        <div className="absolute inset-0 rounded-xl bg-primary/5 pointer-events-none" />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default GlassCard;