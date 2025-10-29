import React from 'react';
import { useProperty } from '@/contexts/PropertyContext';
import {
  ArrowLeft,
  ArrowRight,
  Rocket,
  Save,
  Home,
  Building,
  MapPin,
  DollarSign,
  Camera,
  FileText,
  Send,
} from 'lucide-react';
import { propertiesService } from '@/services/properties.service';
import { useNavigate } from 'react-router-dom';
import Step1PropertyInfo from './steps/Step1PropertyInfo';
import Step2Condo from './steps/Step2Condo';
import Step3Location from './steps/Step3Location';
import Step4Values from './steps/Step4Values';
import Step5Photos from './steps/Step5Photos';
import Step6Title from './steps/Step6Title';
import Step7Publish from './steps/Step7Publish';
import ExportAfterPublishModal from '@/components/ExportAfterPublishModal';

const steps = [
  {
    id: 1,
    name: 'Sobre o Imóvel',
    subtitle: 'tipo, características básicas',
    icon: Home,
    title: 'Sobre o Imóvel',
    description: 'Informações básicas e características principais',
    required: true,
  },
  {
    id: 2,
    name: 'Condomínio',
    subtitle: 'comodidades, informações',
    icon: Building,
    title: 'Condomínio',
    description: 'Informações sobre o empreendimento e comodidades',
    required: false, // Conditional based on property type
  },
  {
    id: 3,
    name: 'Localização',
    subtitle: 'endereço, mapa',
    icon: MapPin,
    title: 'Endereço',
    description: 'Localização e dados de endereço do imóvel',
    required: true,
  },
  {
    id: 4,
    name: 'Valores',
    subtitle: 'preços, negociação',
    icon: DollarSign,
    title: 'Valores',
    description: 'Preços, taxas e informações financeiras',
    required: true,
  },
  {
    id: 5,
    name: 'Fotos e Vídeos',
    subtitle: 'mídia do imóvel',
    icon: Camera,
    title: 'Fotos e Vídeos',
    description: 'Imagens e vídeos para divulgação',
    required: false,
  },
  {
    id: 6,
    name: 'Título e Descrição',
    subtitle: 'conteúdo do anúncio',
    icon: FileText,
    title: 'Título e Descrição',
    description: 'Conteúdo atrativo para o anúncio',
    required: true,
  },
  {
    id: 7,
    name: 'Publicação',
    subtitle: 'onde publicar',
    icon: Send,
    title: 'Publicação',
    description: 'Finalizar e publicar o imóvel',
    required: true,
  },
];

const PropertyCreateStepper: React.FC = () => {
  const navigate = useNavigate();
  const {
    propertyData,
    currentStep,
    goToStep,
    validateStep,
    canPublish,
    validation,
    updateData,
  } = useProperty();

  const [showExportModal, setShowExportModal] = React.useState(false);
  const [publishedPropertyId, setPublishedPropertyId] = React.useState<number | null>(null);
  const [isEditMode] = React.useState(false); // TODO: Get from props/context
  const [propertyId] = React.useState<number | undefined>(); // TODO: Get from props/context

  // Calculate visible steps based on property type
  const getVisibleSteps = () => {
    const needsCondo = ['APARTMENT', 'FLAT', 'COBERTURA', 'LOFT', 'STUDIO', 'CASA_CONDOMINIO'].includes(
      propertyData.property_type || ''
    );

    if (!needsCondo) {
      return steps.filter(step => step.id !== 2);
    }
    return steps;
  };

  const visibleSteps = getVisibleSteps();
  const currentStepInfo = visibleSteps.find(step => step.id === currentStep);

  // Helper para garantir vídeo sempre presente
  const DEFAULT_VIDEO = 'https://www.youtube.com/watch?v=sQP798j3ONc';
  const ensureVideo = (videos?: string | null) => {
    if (typeof videos === 'string' && videos.trim()) {
      return videos.trim();
    }
    return DEFAULT_VIDEO;
  };

  // Map current step to visible step index
  const currentVisibleStepIndex = visibleSteps.findIndex(step => step.id === currentStep);
  const isVisibleFirstStep = currentVisibleStepIndex === 0;
  const isVisibleLastStep = currentVisibleStepIndex === visibleSteps.length - 1;

  const handleNextStep = () => {
    // Validate current step before advancing
    if (!validateStep(currentStep)) {
      alert('Por favor, preencha todos os campos obrigatórios antes de continuar.');
      return;
    }

    // Find next visible step
    const currentIndex = visibleSteps.findIndex(step => step.id === currentStep);
    const nextVisibleStep = visibleSteps[currentIndex + 1];
    
    if (nextVisibleStep) {
      goToStep(nextVisibleStep.id);
    }
  };

  const handlePrevStep = () => {
    // Find previous visible step
    const currentIndex = visibleSteps.findIndex(step => step.id === currentStep);
    const prevVisibleStep = visibleSteps[currentIndex - 1];
    
    if (prevVisibleStep) {
      goToStep(prevVisibleStep.id);
    }
  };

  const handleSaveDraft = async () => {
    try {
      const propertyDataWithVideo = {
        ...propertyData,
        videos: ensureVideo(propertyData.videos),
      };

      if (isEditMode && propertyId) {
        const updatedProperty = await propertiesService.patch(propertyId, {
          ...propertyDataWithVideo,
          status: 'pending',
        });
        // Atualizar o estado local com os dados mais recentes do backend
        updateData(updatedProperty as any);
        
        // 🔄 FORÇAR RELOAD: Recarregar dados atualizados do servidor
        const freshData = await propertiesService.getById(propertyId);
        updateData(freshData as any);
        
        alert('Rascunho salvo com sucesso!');
      } else {
        const { external_id, ...propertyDataClean } = propertyDataWithVideo;
        const propertyToSave = {
          ...propertyDataClean,
          title: propertyDataClean.title || 'Imóvel sem título',
          status: 'pending' as const,
        };
        await propertiesService.create(propertyToSave);
        alert('Rascunho salvo com sucesso!');
        navigate('/properties');
      }
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      alert('Erro ao salvar rascunho');
    }
  };

  const handlePublish = async () => {
    if (!canPublish) {
      alert(`Campos obrigatórios faltando: ${validation.errors.join(', ')}`);
      return;
    }

    try {
      const propertyDataWithVideo = {
        ...propertyData,
        videos: ensureVideo(propertyData.videos),
      };

      let publishedProperty;

      if (isEditMode && propertyId) {
        publishedProperty = await propertiesService.patch(propertyId, {
          ...propertyDataWithVideo,
          status: 'active',
        });
        // Atualizar o estado local com os dados mais recentes do backend
        updateData(publishedProperty as any);
        
        // 🔄 FORÇAR RELOAD: Recarregar dados atualizados do servidor
        const freshData = await propertiesService.getById(propertyId);
        updateData(freshData as any);
        
        alert('Imóvel publicado com sucesso!');
      } else {
        const { external_id, ...propertyDataClean } = propertyDataWithVideo;
        const propertyToPublish = {
          ...propertyDataClean,
          title: propertyDataClean.title || 'Imóvel sem título',
          status: 'active' as const,
        };
        publishedProperty = await propertiesService.create(propertyToPublish);
        alert('Imóvel publicado com sucesso!');
      }

      // Show export modal
      if (publishedProperty?.id) {
        setPublishedPropertyId(publishedProperty.id);
        setShowExportModal(true);
      }
    } catch (error) {
      console.error('Erro ao publicar imóvel:', error);
      alert('Erro ao publicar imóvel');
    }
  };

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1PropertyInfo />;
      case 2:
        return <Step2Condo />;
      case 3:
        return <Step3Location />;
      case 4:
        return <Step4Values />;
      case 5:
        return <Step5Photos />;
      case 6:
        return <Step6Title />;
      case 7:
        return <Step7Publish />;
      default:
        return <Step1PropertyInfo />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <header className="fixed top-16 left-0 right-0 md:left-64 z-30 bg-surface border-b border-border h-20 flex items-center shadow-sm">
        <div className="w-full px-4 md:px-6">
          <div className="flex items-center justify-between">
            {/* Left side */}
            <div className="flex items-center space-x-4 min-w-0">
              <button
                onClick={() => navigate('/properties')}
                className="flex items-center text-text-secondary hover:text-text-primary transition-colors"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <div className="w-5 h-5 bg-primary/10 rounded flex items-center justify-center flex-shrink-0">
                    {React.createElement(currentStepInfo?.icon || Home, {
                      className: 'w-3 h-3 text-primary',
                    })}
                  </div>
                  <h1 className="text-lg font-semibold text-text-primary truncate">
                    {currentStepInfo?.title || 'Cadastrar Imóvel'}
                  </h1>
                </div>
                <p className="text-xs text-text-secondary truncate">
                  {currentStepInfo?.description || 'Preencha as informações do imóvel'}
                </p>
              </div>
            </div>

            {/* Right side */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-text-secondary">Progresso</div>
                <div className="text-sm font-medium text-text-primary">
                  {currentVisibleStepIndex + 1} de {visibleSteps.length}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 min-h-0 px-6 py-4 overflow-auto mt-20">
        {renderCurrentStep()}
      </main>

      {/* Footer navigation - Altura e padding ajustados */}
      <footer className="fixed bottom-0 left-0 md:left-64 h-16 bg-surface border-t border-border px-6 py-4 shadow-lg z-10 flex items-center" style={{ right: 'var(--aside-width)' }}>
        <div className="flex items-center justify-between w-full">
          {/* Left navigation */}
          <div className="flex items-center space-x-2">
            {!isVisibleFirstStep && (
              <button
                onClick={handlePrevStep}
                className="flex items-center space-x-2 px-4 py-2 bg-surface hover:bg-background border border-border text-text-primary rounded-lg transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Anterior</span>
              </button>
            )}
          </div>

          {/* Center indicator */}
          <div className="text-xs text-text-secondary">
            Passo {currentVisibleStepIndex + 1} de {visibleSteps.length}
          </div>

          {/* Right navigation */}
          <div className="flex space-x-2">
            {!isVisibleLastStep ? (
              <button
                onClick={handleNextStep}
                className="flex items-center space-x-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
              >
                <span>Próximo</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleSaveDraft}
                  className="flex items-center space-x-2 px-4 py-2 bg-surface hover:bg-background text-text-primary border border-border rounded-lg transition-colors"
                >
                  <Save size={16} />
                  <span>Salvar</span>
                </button>
                <button
                  onClick={handlePublish}
                  disabled={!canPublish}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    canPublish
                      ? 'bg-secondary hover:bg-secondary/90 text-white'
                      : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  }`}
                  title={!canPublish ? `Campos obrigatórios faltando: ${validation.errors.join(', ')}` : 'Publicar imóvel'}
                >
                  <Rocket size={16} />
                  <span>Publicar {!canPublish && '🚫'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </footer>

      {/* Export modal */}
      {publishedPropertyId && (
        <ExportAfterPublishModal
          propertyId={publishedPropertyId}
          isOpen={showExportModal}
          onClose={() => {
            setShowExportModal(false);
            setPublishedPropertyId(null);
          }}
          onNavigate={navigate}
          isEditMode={isEditMode}
          editPropertyId={propertyId}
        />
      )}
    </div>
  );
};

export default PropertyCreateStepper;
