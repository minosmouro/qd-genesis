import React, { useEffect } from 'react';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { useProperties } from '../PropertiesContext';

// Cockpit padronizado para TODAS as páginas do módulo de Imóveis
// Altura fixa: 80px para garantir consistência no layout
// Posição: fixed abaixo do header principal
// Z-index: alto para ficar acima do conteúdo mas abaixo de modais

interface StandardCockpitProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  variant?: 'default' | 'compact' | 'expanded';
  className?: string;
}

const StandardCockpit: React.FC<StandardCockpitProps> = ({
  title,
  subtitle,
  onBack,
  actions,
  variant = 'default',
  className,
}) => {
  const { setCockpitHeight } = useProperties();

  // Define altura baseada na variante
  const heightMap = {
    compact: 60,
    default: 80,
    expanded: 100,
  };

  const cockpitHeight = heightMap[variant];

  // Atualiza a altura no contexto quando o componente monta
  useEffect(() => {
    setCockpitHeight(cockpitHeight);

    // Cleanup: reseta altura quando componente desmonta
    return () => setCockpitHeight(80); // altura padrão
  }, [cockpitHeight, setCockpitHeight]);

  return (
    <>
      {/* Spacer para empurrar conteúdo para baixo */}
      <div style={{ height: `${cockpitHeight}px` }} />

      {/* Cockpit fixo */}
      <div
        className={cn(
          'fixed left-0 right-0 bg-background border-b border-border z-20',
          'flex items-center justify-between px-4',
          // Posicionamento: abaixo do header (64px)
          'top-16',
          className
        )}
        style={{ height: `${cockpitHeight}px` }}
      >
        {/* Lado esquerdo: Botão voltar + Títulos */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}

          <div className="min-w-0 flex-1">
            <h1
              className={cn(
                'font-semibold text-text-primary truncate',
                variant === 'compact' ? 'text-lg' : 'text-xl'
              )}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-text-secondary truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Lado direito: Ações */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {actions}

          {/* Menu de opções sempre presente */}
          <Button variant="ghost" size="sm">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );
};

export default StandardCockpit;
