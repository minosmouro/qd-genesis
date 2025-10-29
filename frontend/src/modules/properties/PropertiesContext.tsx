import React, { createContext, useContext, useState, ReactNode } from 'react';

// Contexto para compartilhar estado entre páginas do módulo de Imóveis

interface PropertiesContextType {
  // Estados de filtros e visualização
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;

  // Estados de seleção
  selectedIds: (string | number)[];
  setSelectedIds: (ids: (string | number)[]) => void;

  // Estados do painel lateral
  asideOpen: boolean;
  setAsideOpen: (open: boolean) => void;

  // Estados do cockpit (para layout dinâmico)
  cockpitHeight: number;
  setCockpitHeight: (height: number) => void;

  // Utilitários
  clearFilters: () => void;
  clearSelection: () => void;
}

const PropertiesContext = createContext<PropertiesContextType | undefined>(
  undefined
);

interface PropertiesProviderProps {
  children: ReactNode;
}

export const PropertiesProvider: React.FC<PropertiesProviderProps> = ({
  children,
}) => {
  // Estados de filtros e visualização
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Estados de seleção
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);

  // Estados do painel lateral
  const [asideOpen, setAsideOpen] = useState(false);

  // Estados do cockpit (altura dinâmica)
  const [cockpitHeight, setCockpitHeight] = useState(80); // altura padrão

  // Utilitários
  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  const value: PropertiesContextType = {
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    selectedIds,
    setSelectedIds,
    asideOpen,
    setAsideOpen,
    cockpitHeight,
    setCockpitHeight,
    clearFilters,
    clearSelection,
  };

  return (
    <PropertiesContext.Provider value={value}>
      {children}
    </PropertiesContext.Provider>
  );
};

export const useProperties = (): PropertiesContextType => {
  const context = useContext(PropertiesContext);
  if (!context) {
    throw new Error(
      'useProperties deve ser usado dentro de PropertiesProvider'
    );
  }
  return context;
};
