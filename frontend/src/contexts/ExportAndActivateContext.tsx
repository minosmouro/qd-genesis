import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ExportAndActivateResult } from '@/types/canalpro';

interface ExportAndActivateContextType {
  result: ExportAndActivateResult | null;
  setResult: (result: ExportAndActivateResult | null) => void;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
}

const ExportAndActivateContext = createContext<ExportAndActivateContextType | undefined>(undefined);

export const useExportAndActivateContext = () => {
  const context = useContext(ExportAndActivateContext);
  if (!context) {
    throw new Error('useExportAndActivateContext must be used within ExportAndActivateProvider');
  }
  return context;
};

interface ExportAndActivateProviderProps {
  children: ReactNode;
}

export const ExportAndActivateProvider: React.FC<ExportAndActivateProviderProps> = ({ children }) => {
  const [result, setResult] = useState<ExportAndActivateResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <ExportAndActivateContext.Provider
      value={{
        result,
        setResult,
        isModalOpen,
        setIsModalOpen,
      }}
    >
      {children}
    </ExportAndActivateContext.Provider>
  );
};