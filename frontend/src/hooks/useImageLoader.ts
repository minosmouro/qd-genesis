import { useState, useEffect } from 'react';

interface UseImageLoaderOptions {
  src: string;
  fallbackSrc?: string;
}

interface UseImageLoaderResult {
  imageSrc: string;
  isLoading: boolean;
  hasError: boolean;
}

/**
 * Hook simples para carregar imagens com fallback
 * Previne NS_BINDING_ABORTED
 */
export function useImageLoader({
  src,
  fallbackSrc = '/placeholder-property.jpg',
}: UseImageLoaderOptions): UseImageLoaderResult {
  const [imageSrc, setImageSrc] = useState<string>(fallbackSrc);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Se não tem src ou já é o fallback, não carrega
    if (!src || src === fallbackSrc) {
      setImageSrc(fallbackSrc);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    const img = new Image();
    
    const handleLoad = () => {
      setImageSrc(src);
      setIsLoading(false);
      setHasError(false);
    };

    const handleError = () => {
      // Silenciosamente usa fallback quando imagem falha
      setImageSrc(fallbackSrc);
      setIsLoading(false);
      setHasError(true);
    };

    // IMPORTANTE: Atribuir handlers ANTES de definir src!
    img.onload = handleLoad;
    img.onerror = handleError;
    
    // Iniciar carregamento DEPOIS dos handlers
    img.src = src;

    // Cleanup
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, fallbackSrc]);

  return {
    imageSrc,
    isLoading,
    hasError,
  };
}
