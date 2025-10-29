import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarContentContextType {
  sidebarContent: ReactNode | null;
  setSidebarContent: (content: ReactNode | null) => void;
}

const SidebarContentContext = createContext<SidebarContentContextType | undefined>(undefined);

export const SidebarContentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [sidebarContent, setSidebarContent] = useState<ReactNode | null>(null);

  return (
    <SidebarContentContext.Provider value={{ sidebarContent, setSidebarContent }}>
      {children}
    </SidebarContentContext.Provider>
  );
};

export const useSidebarContent = () => {
  const context = useContext(SidebarContentContext);
  if (!context) {
    throw new Error('useSidebarContent must be used within SidebarContentProvider');
  }
  return context;
};
