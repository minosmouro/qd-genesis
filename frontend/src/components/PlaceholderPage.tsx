import React from 'react';

interface PlaceholderPageProps {
  title: string;
  icon?: React.ReactElement;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title, icon }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary">
      {icon && (
        <div className="mb-4 w-16 h-16 text-primary opacity-30">{icon}</div>
      )}
      <h1 className="text-4xl font-bold text-text-primary mb-2">{title}</h1>
      <p className="text-lg">Página em construção.</p>
    </div>
  );
};

export default PlaceholderPage;
