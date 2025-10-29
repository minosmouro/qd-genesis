import { useEffect } from 'react';
import { useProperties } from '../PropertiesContext';

// Hook para sincronizar altura do cockpit com CSS variables
// Permite que o layout se adapte automaticamente a cockpits de alturas diferentes
// Usado internamente pelo StandardCockpit, mas pode ser usado manualmente se necessário

export const useCockpitHeight = () => {
  const { cockpitHeight } = useProperties();

  useEffect(() => {
    // Atualiza CSS custom property para altura do cockpit
    document.documentElement.style.setProperty(
      '--cockpit-height',
      `${cockpitHeight}px`
    );

    // Cleanup: remove a propriedade quando o componente desmonta
    return () => {
      document.documentElement.style.removeProperty('--cockpit-height');
    };
  }, [cockpitHeight]);

  return cockpitHeight;
};

export default useCockpitHeight;
