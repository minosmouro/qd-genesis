import React from 'react';
import { cn } from '@/utils/cn';
import { useTheme } from '@/contexts/ThemeContext';
import logoLight from '@/assets/logo_ligth.png';
import logoDark from '@/assets/logo_dak.svg';

type LogoProps = {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  alt?: string;
};

const sizeMap: Record<NonNullable<LogoProps['size']>, string> = {
  sm: 'h-6',
  md: 'h-8',
  lg: 'h-12',
};

const Logo: React.FC<LogoProps> = ({
  size = 'md',
  className,
  alt = 'QuadraDois',
}) => {
  const { theme } = useTheme();
  const src = theme === 'dark' ? logoLight : logoDark;
  return (
    <img
      src={src}
      alt={alt}
      className={cn(sizeMap[size], 'w-auto object-contain', className)}
    />
  );
};

export default Logo;
