import { useState, useCallback, useMemo } from 'react';

export interface UsePaginationOptions {
  initialPage?: number;
  initialPageSize?: number;
  totalItems?: number;
}

export interface UsePaginationReturn {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  setTotalItems: (total: number) => void;
  setPageSize: (size: number) => void;
  getPageInfo: () => {
    startItem: number;
    endItem: number;
    totalItems: number;
  };
}

export function usePagination(
  options: UsePaginationOptions = {}
): UsePaginationReturn {
  const { initialPage = 1, initialPageSize = 50, totalItems = 0 } = options;

  const [totalItemsState, setTotalItemsState] = useState<number>(totalItems);

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Calcula o número total de páginas
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalItemsState / pageSize));
  }, [totalItemsState, pageSize]);

  // Verifica se há próxima página
  const hasNextPage = useMemo(() => {
    return currentPage < totalPages;
  }, [currentPage, totalPages]);

  // Verifica se há página anterior
  const hasPrevPage = useMemo(() => {
    return currentPage > 1;
  }, [currentPage]);

  // Vai para uma página específica
  const goToPage = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        setCurrentPage(page);
      }
    },
    [totalPages]
  );

  // Vai para a próxima página
  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  // Vai para a página anterior
  const prevPage = useCallback(() => {
    if (hasPrevPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPrevPage]);

  // Altera o tamanho da página
  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1); // Volta para a primeira página
  }, []);

  // Obtém informações da página atual
  const getPageInfo = useCallback(() => {
    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    return {
      startItem: totalItems > 0 ? startItem : 0,
      endItem,
      totalItems,
    };
  }, [currentPage, pageSize, totalItems]);

  return {
    currentPage,
    totalPages,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    hasNextPage,
    hasPrevPage,
    setPageSize: handleSetPageSize,
    setTotalItems: setTotalItemsState,
    getPageInfo,
  };
}
