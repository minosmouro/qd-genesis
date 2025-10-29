/**
 * Layout básico para páginas
 */
import React from 'react';

interface PageLayoutProps {
  children: React.ReactNode;
  className?: string;
}

const PageLayout: React.FC<PageLayoutProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`w-full bg-background p-0 overflow-auto ${className}`}
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <main className="w-full flex-1 flex flex-col justify-stretch items-stretch py-6 pb-20 space-y-6">
        {children}
      </main>
    </div>
  );
};

export default PageLayout;