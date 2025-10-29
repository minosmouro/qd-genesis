import React, { useState } from 'react';
import { usePropertyCreate } from '@/contexts/PropertyCreateContext';
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
  },
  {
    id: 2,
    name: 'Condomínio',
    subtitle: 'comodidades, informações',
    icon: Building,
    title: 'Condomínio',
    description: 'Informações sobre o empreendimento e comodidades',
  },
  {
    id: 3,
    name: 'Localização',
    subtitle: 'endereço, mapa',
    icon: MapPin,
    title: 'Endereço',
    description: 'Localização e dados de endereço do imóvel',
  },
  {
    id: 4,
    name: 'Valores',
    subtitle: 'preços, negociação',
    icon: DollarSign,
    title: 'Valores',
    description: 'Preços, taxas e informações financeiras',
  },
  {
    id: 5,
    name: 'Fotos e Vídeos',
    subtitle: 'mídia do imóvel',
    icon: Camera,
    title: 'Fotos e Vídeos',
    description: 'Imagens e vídeos para divulgação',
  },
  {
    id: 6,
    name: 'Título e Descrição',
    subtitle: 'conteúdo do anúncio',
    icon: FileText,
    title: 'Título e Descrição',
    description: 'Conteúdo atrativo para o anúncio',
  },
  {
    id: 7,
    name: 'Publicação',
    subtitle: 'onde publicar',
    icon: Send,
    title: 'Publicação',
    description: 'Finalizar e publicar o imóvel',
  },
];

const PropertyCreateStepper: React.FC = () => {
  const navigate = useNavigate();
  const { propertyData, isEditMode, propertyId } = usePropertyCreate();

  // Estado para controlar o modal pós-publicação
  const [showExportModal, setShowExportModal] = useState(false);
  const [publishedPropertyId, setPublishedPropertyId] = useState<number | null>(null);

  const {
    currentStep,
    goToStep,
    nextStep,
    isFirstStep,
    isLastStep,
    validation,
    canPublish,
    updateData,
  } = usePropertyCreate();

  const currentStepInfo = steps.find(step => step.id === currentStep);
  const totalSteps = steps.length;

  // Helper para garantir vídeo sempre presente
  const DEFAULT_VIDEO = 'https://www.youtube.com/watch?v=sQP798j3ONc';
  const ensureVideo = (videos?: string | null) => {
    if (typeof videos === 'string' && videos.trim()) {
      return videos.trim();
    }
    return DEFAULT_VIDEO;
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1);
    }
  };

  const handleNextStep = () => {
    nextStep();
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
        alert('Rascunho salvo com sucesso!');
        navigate('/properties');
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

      // Rascunho salvo - não executar export automático
    } catch (error) {
      console.error('Erro ao salvar rascunho:', error);
      alert('Erro ao salvar rascunho');
    }
  };

  const handlePublish = async () => {
    try {
      const propertyDataWithVideo = {
        ...propertyData,
        videos: ensureVideo(propertyData.videos),
      };

      let publishedProperty;

      // ✅ CORREÇÃO: Verificar se está editando um imóvel existente no banco
      const isEditingExistingProperty = isEditMode && propertyId && propertyData.id;

      console.log('🔍 DEBUG Publish:', {
        isEditMode,
        propertyId,
        propertyDataId: propertyData.id,
        isEditingExistingProperty,
        status: propertyData.status
      });

      if (isEditingExistingProperty) {
        // Editando imóvel existente - usar PATCH
        console.log('📝 Atualizando imóvel existente:', propertyId);
        publishedProperty = await propertiesService.patch(propertyId, {
          ...propertyDataWithVideo,
          status: 'active',
        });
        // Atualizar o estado local com os dados mais recentes do backend
        updateData(publishedProperty as any);
        alert('Imóvel publicado com sucesso!');
      } else {
        // Criando novo imóvel - usar POST
        console.log('✨ Criando novo imóvel');
        const { external_id, ...propertyDataClean } = propertyDataWithVideo;
        const propertyToPublish = {
          ...propertyDataClean,
          title: propertyDataClean.title || 'Imóvel sem título',
          status: 'active' as const,
        };
        publishedProperty = await propertiesService.create(propertyToPublish);
        alert('Imóvel publicado com sucesso!');
      }

      // Abrir modal de exportação pós-publicação
      if (publishedProperty?.id) {
        setPublishedPropertyId(publishedProperty.id);
        setShowExportModal(true);
      }
    } catch (error: any) {
      console.error('Erro ao publicar imóvel:', error);
      const errorMessage = error?.message || 'Erro desconhecido ao publicar imóvel';
      alert(`Erro ao publicar imóvel: ${errorMessage}`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* COCKPIT PADRONIZADO - 80px */}
      <header className="fixed top-16 left-0 right-0 md:left-64 z-30 bg-surface border-b border-border h-20 flex items-center shadow-sm">
        <div className="w-full px-4 md:px-6">
          <div className="flex items-center justify-between">
            {/* Lado esquerdo */}
            <div className="flex items-center space-x-4 min-w-0">
              <button
                onClick={() => navigate('/properties')}
                className="flex items-center text-text-secondary hover:text-text-primary transition-colors"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="min-w-0 flex-1">
                {/* Ícone + Título alinhados */}
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
                {/* Descrição */}
                <p className="text-xs text-text-secondary truncate">
                  {currentStepInfo?.description ||
                    'Preencha as informações do imóvel'}
                </p>
              </div>
            </div>

            {/* Lado direito */}
            <div className="flex items-center space-x-3 flex-shrink-0">
              <div className="text-right hidden sm:block">
                <div className="text-xs text-text-secondary">Progresso</div>
                <div className="text-sm font-medium text-text-primary">
                  {currentStep} de {totalSteps}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 min-h-0 px-6 py-4 overflow-auto">
        {currentStep === 1 && <Step1PropertyInfo />}
        {currentStep === 2 && <Step2Condo />}
        {currentStep === 3 && <Step3Location />}
        {currentStep === 4 && <Step4Values />}
        {currentStep === 5 && <Step5Photos />}
        {currentStep === 6 && <Step6Title />}
        {currentStep === 7 && <Step7Publish />}
      </main>

      {/* Footer navigation - Altura e padding ajustados */}
      <footer className="fixed bottom-0 left-0 md:left-64 h-16 bg-surface border-t border-border px-6 py-4 shadow-lg z-10 flex items-center" style={{ right: 'var(--aside-width)' }}>
        <div className="flex items-center justify-between w-full">
          {/* Navegação esquerda */}
          <div className="flex items-center space-x-2">
            {!isFirstStep && (
              <button
                onClick={handlePrevStep}
                className="flex items-center space-x-2 px-4 py-2 bg-surface hover:bg-background border border-border text-text-primary rounded-lg transition-colors"
              >
                <ArrowLeft size={16} />
                <span>Anterior</span>
              </button>
            )}
          </div>

          {/* Indicador central */}
          <div className="text-xs text-text-secondary">
            Passo {currentStep} de {totalSteps}
          </div>

          {/* Navegação direita */}
          <div className="flex space-x-2">
            {!isLastStep ? (
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
                  title={!canPublish ? `Campos obrigatórios faltando: ${validation.required.join(', ')}` : 'Publicar imóvel'}
                >
                  <Rocket size={16} />
                  <span>Publicar {!canPublish && '🚫'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </footer>

      {/* Modal de exportação pós-publicação */}
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
