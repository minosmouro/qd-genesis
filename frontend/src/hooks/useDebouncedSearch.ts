import { useState, useEffect, useCallback } from 'react';

export interface UseDebouncedSearchOptions {
  delay?: number;
  initialValue?: string;
  controlledValue?: string; // Novo: valor controlado externamente
}

export interface UseDebouncedSearchReturn {
  searchTerm: string;
  debouncedSearchTerm: string;
  setSearchTerm: (term: string) => void;
  clearSearch: () => void;
  isLoading: boolean;
}

export function useDebouncedSearch(
  options: UseDebouncedSearchOptions = {}
): UseDebouncedSearchReturn {
  const { delay = 300, initialValue = '', controlledValue } = options;

  // Se temos um valor controlado, usamos ele; caso contrário, usamos estado interno
  const searchTerm =
    controlledValue !== undefined
      ? controlledValue
      : useState(initialValue)[0];
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(
    controlledValue !== undefined ? controlledValue : initialValue
  );
  const [isLoading, setIsLoading] = useState(false);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm, delay]);

  // Limpa a busca
  const clearSearch = useCallback(() => {
    if (controlledValue === undefined) {
      // Só podemos limpar se não for controlado externamente
      // Para valores controlados, isso deve ser feito externamente
    }
    setDebouncedSearchTerm('');
  }, [controlledValue]);

  // Atualiza o termo de busca (só funciona se não for controlado)
  const handleSetSearchTerm = useCallback(
    (_term: string) => {
      if (controlledValue === undefined) {
        // Só podemos definir se não for controlado externamente
        setIsLoading(true);
      }
    },
    [controlledValue]
  );

  // Remove loading quando o debounced term muda
  useEffect(() => {
    setIsLoading(false);
  }, [debouncedSearchTerm]);

  return {
    searchTerm,
    debouncedSearchTerm,
    setSearchTerm: handleSetSearchTerm,
    clearSearch,
    isLoading,
  };
}
