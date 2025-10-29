import React from 'react';
import { cn } from '@/utils/cn';
import { useImageLoader } from '@/hooks/useImageLoader';

interface OptimizedImageProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  loadingClassName?: string;
  aspectRatio?: 'video' | 'square' | 'portrait' | 'auto';
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Componente de imagem otimizado com:
 * - Carregamento lazy
 * - Retry automático em caso de falha
 * - Fallback para placeholder
 * - Prevenção de NS_BINDING_ABORTED
 * - Skeleton de loading
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  fallbackSrc = '/placeholder-property.jpg',
  className,
  loadingClassName,
  aspectRatio = 'auto',
  objectFit = 'cover',
  onLoad,
  onError,
}) => {
  const { imageSrc, isLoading, hasError } = useImageLoader({
    src,
    fallbackSrc,
  });

  React.useEffect(() => {
    if (!isLoading && !hasError && onLoad) {
      onLoad();
    }
    if (hasError && onError) {
      onError();
    }
  }, [isLoading, hasError, onLoad, onError]);

  const aspectRatioClasses = {
    video: 'aspect-video',
    square: 'aspect-square',
    portrait: 'aspect-[3/4]',
    auto: '',
  };

  const objectFitClasses = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    none: 'object-none',
  };

  return (
    <div className={cn('relative overflow-hidden', aspectRatioClasses[aspectRatio])}>
      {/* Loading skeleton */}
      {isLoading && (
        <div
          className={cn(
            'absolute inset-0 bg-border/30 animate-pulse',
            loadingClassName
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-border/20 to-transparent animate-shimmer" />
        </div>
      )}

      {/* Image */}
      <img
        src={imageSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn(
          'w-full h-full transition-opacity duration-500',
          objectFitClasses[objectFit],
          !isLoading ? 'opacity-100' : 'opacity-0',
          className
        )}
      />
    </div>
  );
};

export default OptimizedImage;
