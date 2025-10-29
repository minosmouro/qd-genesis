import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { X, Menu } from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { PropertiesProvider, useProperties } from './PropertiesContext';
import { PropertyCreateProvider } from '@/contexts/PropertyCreateContext';
import { ExportAndActivateProvider } from '@/contexts/ExportAndActivateContext';
import { SidebarContentProvider, useSidebarContent } from '@/contexts/SidebarContentContext';
import type { PropertyFormData } from '@/types';
import { propertiesService } from '@/services/properties.service';

// Layout padrão global para o módulo de Imóveis
// Estrutura fixa: Sidebar esquerdo (do Layout pai) + Área central + Painel direito + Footer
// Este layout é aplicado a TODAS as páginas do módulo para padronização
// Características: ocupação total da tela, painéis fixos, footer sempre visível

// Wrapper que carrega os dados do imóvel antes de inicializar o PropertyCreateProvider
interface PropertyCreateProviderWithDataProps {
  totalSteps: number;
  isEditMode: boolean;
  propertyId: number;
  children: React.ReactNode;
}

const PropertyCreateProviderWithData: React.FC<PropertyCreateProviderWithDataProps> = ({
  totalSteps,
  isEditMode,
  propertyId,
  children,
}) => {
  const [initialData, setInitialData] = useState<Partial<PropertyFormData> | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPropertyData = async () => {
      if (!propertyId) {
        setLoading(false);
        return;
      }

      try {
        console.log('🔄 Carregando dados do imóvel ID:', propertyId);
        const property = await propertiesService.getById(propertyId);
        console.log('✅ Dados carregados:', property);
        setInitialData(property as Partial<PropertyFormData>);
      } catch (err) {
        console.error('❌ Erro ao carregar imóvel:', err);
        setError('Erro ao carregar dados do imóvel');
      } finally {
        setLoading(false);
      }
    };

    loadPropertyData();
  }, [propertyId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados do imóvel...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center text-destructive">
          <p className="font-semibold mb-2">Erro ao carregar imóvel</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <PropertyCreateProvider
      totalSteps={totalSteps}
      isEditMode={isEditMode}
      propertyId={propertyId}
      initialData={initialData}
    >
      {children}
    </PropertyCreateProvider>
  );
};

interface RightAsideProps {
  isOpen: boolean;
  onClose: () => void;
  children?: React.ReactNode;
}

const RightAside: React.FC<RightAsideProps> = ({ isOpen, onClose, children }) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Aside Panel */}
      <aside
        className={cn(
          'module-aside',
          // Mobile: painel deslizante com altura calculada
          'fixed right-0 z-50 transition-transform duration-300 ease-in-out lg:static lg:transform-none',
          isOpen ? 'translate-x-0' : 'translate-x-full',
          'hidden lg:flex' // Sempre visível em lg+
        )}
        style={{
          // Mobile: posicionamento grudado no cockpit (sem gap)
          top: window.innerWidth < 1024 ? '144px' : undefined,
          height:
            window.innerWidth < 1024 ? 'calc(100vh - 144px - 48px)' : undefined,
        }}
      >
        {/* Header do painel mobile */}
        <div className="flex items-center justify-between p-4 border-b border-border lg:hidden">
          <h3 className="font-medium text-text-primary">Painel</h3>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Conteúdo do painel */}
        <div className="p-4 flex-1 overflow-auto space-y-4">
          {children || (
            <p className="text-sm text-text-secondary text-center">
              Nenhum conteúdo disponível
            </p>
          )}
        </div>
      </aside>
    </>
  );
};

const PropertiesLayoutContent: React.FC = () => {
  const { asideOpen, setAsideOpen } = useProperties();
  const { sidebarContent } = useSidebarContent();
  const location = useLocation();

  // Verificar se está em rotas de criação/edição
  const isNewRoute = location.pathname.includes('/properties/new');
  const editMatch = location.pathname.match(/\/properties\/(\d+)\/edit/i);
  const isEditRoute = Boolean(editMatch);
  const propertyId = editMatch ? Number(editMatch[1]) : undefined;
  const isCreateOrEdit = isNewRoute || isEditRoute;

  // Renderizar o conteúdo base
  const content = (
    <div className="module-layout">
      <div className="module-layout-content">
        <main className="module-main">
          <div className="module-main-content">
            <Outlet />
          </div>

          {/* Footer removido: os Steppers têm seus próprios footers com navegação */}
        </main>

        {/* SIDEBAR DIREITO REATIVADO - Para Score + Preview */}
        <RightAside isOpen={asideOpen} onClose={() => setAsideOpen(false)}>
          {sidebarContent || (
            <p className="text-sm text-text-secondary text-center">
              Nenhum conteúdo disponível
            </p>
          )}
        </RightAside>
      </div>

      {/* Botão flutuante para mobile */}
      <button
        className="fixed bottom-6 right-6 z-30 lg:hidden bg-primary text-background p-3 rounded-full shadow-lg"
        onClick={() => setAsideOpen(true)}
        aria-label="Abrir painel de ações"
      >
        <Menu className="w-5 h-5" />
      </button>
    </div>
  );

  // Envolver com providers conforme necessário
  if (isCreateOrEdit) {
    // Para criação/edição: PropertyCreateProvider + ExportAndActivateProvider
    // Se for edição, carregar os dados do imóvel
    if (isEditRoute && propertyId) {
      return (
        <ExportAndActivateProvider>
          <PropertyCreateProviderWithData
            totalSteps={7}
            isEditMode={true}
            propertyId={propertyId}
          >
            {content}
          </PropertyCreateProviderWithData>
        </ExportAndActivateProvider>
      );
    }
    
    // Criação sem dados iniciais
    return (
      <ExportAndActivateProvider>
        <PropertyCreateProvider
          totalSteps={7}
          isEditMode={false}
        >
          {content}
        </PropertyCreateProvider>
      </ExportAndActivateProvider>
    );
  }

  // Para outras rotas: apenas ExportAndActivateProvider
  return <ExportAndActivateProvider>{content}</ExportAndActivateProvider>;
};

const PropertiesLayout: React.FC = () => {
  return (
    <PropertiesProvider>
      <SidebarContentProvider>
        <PropertiesLayoutContent />
      </SidebarContentProvider>
    </PropertiesProvider>
  );
};

export default PropertiesLayout;
