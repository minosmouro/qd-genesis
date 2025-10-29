/**
 * Página de formulário para criar/editar cronogramas de refresh
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, Calendar, Save, ArrowLeft, Lightbulb, Home, MapPin, DollarSign } from 'lucide-react';
import PageLayout from '@/components/Layout/PageLayout';
import Card from '@/components/Card/Card';
import Button from '@/components/Button/Button';
import Input from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import PropertySelector from '@/components/PropertySelector';
import { 
  useRefreshSchedule, 
  useCreateRefreshSchedule, 
  useUpdateRefreshSchedule,
  useAvailableProperties 
} from '@/hooks/useRefresh';
import { cn } from '@/utils/cn';

const RefreshScheduleFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  // Estados do formulário
  const [formData, setFormData] = useState({
    name: '',
    execution_time: '10:00',
    days_of_week: [1, 2, 3, 4, 5], // Segunda a sexta por padrão
    is_active: true,
  });

  // Estado para propriedades selecionadas (OBRIGATÓRIO)
  const [selectedPropertyIds, setSelectedPropertyIds] = useState<number[]>([]);

  // Estado para controlar o passo atual do wizard
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Hooks de dados
  const { data: existingSchedule, isLoading: loadingSchedule } = useRefreshSchedule(
    id ? parseInt(id) : undefined,
    { enabled: isEditMode }
  );

  // Buscar dados das propriedades para exibir informações completas
  const { data: availableProperties = [], isLoading: loadingProperties, error: propertiesError } = useAvailableProperties();

  // Hooks de mutations
  const createMutation = useCreateRefreshSchedule();
  const updateMutation = useUpdateRefreshSchedule();

  // Carregar dados existentes em modo de edição
  useEffect(() => {
    if (existingSchedule) {
      setFormData({
        name: existingSchedule.name,
        execution_time: existingSchedule.execution_time,
        days_of_week: existingSchedule.days_of_week,
        is_active: existingSchedule.is_active,
      });
    }
  }, [existingSchedule]);

  // Dias da semana em português
  const daysOfWeekOptions = [
    { value: 0, label: 'Domingo', short: 'Dom' },
    { value: 1, label: 'Segunda-feira', short: 'Seg' },
    { value: 2, label: 'Terça-feira', short: 'Ter' },
    { value: 3, label: 'Quarta-feira', short: 'Qua' },
    { value: 4, label: 'Quinta-feira', short: 'Qui' },
    { value: 5, label: 'Sexta-feira', short: 'Sex' },
    { value: 6, label: 'Sábado', short: 'Sáb' },
  ];

  // Horários sugeridos
  const suggestedTimes = [
    { time: '10:00', label: '10:00 - Manhã', description: 'Horário de pico de buscas' },
    { time: '12:00', label: '12:00 - Meio-dia', description: 'Boa visibilidade' },
    { time: '20:00', label: '20:00 - Noite', description: 'Horário de maior engajamento' },
    { time: '21:00', label: '21:00 - Prime time', description: 'Melhor horário para imóveis' },
  ];

  // Função para formatar valor em reais
  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return 'Consulte';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Função para obter dados completos de uma propriedade
  const getPropertyData = (propertyId: number) => {
    return availableProperties.find((property: any) => property.id === propertyId) as any;
  };

  // Validação do formulário
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.execution_time) {
      newErrors.execution_time = 'Horário de execução é obrigatório';
    } else if (!/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(formData.execution_time)) {
      newErrors.execution_time = 'Formato de horário inválido (HH:MM)';
    }

    if (formData.days_of_week.length === 0) {
      newErrors.days_of_week = 'Selecione pelo menos um dia da semana';
    }

    // VALIDAÇÃO OBRIGATÓRIA: Propriedades selecionadas
    if (!isEditMode && selectedPropertyIds.length === 0) {
      newErrors.property_ids = 'É necessário selecionar ao menos um imóvel para o agendamento';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handlers
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDayToggle = (day: number) => {
    const newDays = formData.days_of_week.includes(day)
      ? formData.days_of_week.filter(d => d !== day)
      : [...formData.days_of_week, day].sort();
    
    handleInputChange('days_of_week', newDays);
  };

  const handleSuggestedTimeClick = (time: string) => {
    handleInputChange('execution_time', time);
  };

  // Handler para mudança de seleção de propriedades
  const handlePropertySelectionChange = (propertyIds: number[]) => {
    setSelectedPropertyIds(propertyIds);
    
    // Limpar erro de propriedades quando o usuário selecionar alguma
    if (propertyIds.length > 0 && errors.property_ids) {
      setErrors(prev => ({ ...prev, property_ids: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validateForm()) {
      return;
    }
    try {
      // O execution_time já está no formato correto "HH:MM"
      
      if (isEditMode && id) {
        // Formatar dados conforme esperado pelo backend para atualização
        const updateData = {
          name: formData.name,
          time_slot: formData.execution_time, // formato "HH:MM" esperado pelo backend
          frequency_days: 1, // valor padrão, pode ser ajustado depois
          is_active: formData.is_active,
          days_of_week: formData.days_of_week,
        };
        await updateMutation.mutateAsync({
          id: parseInt(id),
          ...updateData,
        });
      } else {
        // Formatar dados conforme esperado pelo backend
        const createData = {
          name: formData.name,
          time_slot: formData.execution_time, // formato "HH:MM" esperado pelo backend
          frequency_days: 1, // valor padrão, pode ser ajustado depois
          property_ids: selectedPropertyIds, // OBRIGATÓRIO: usar propriedades selecionadas
          is_active: formData.is_active,
          days_of_week: formData.days_of_week,
        };
        await createMutation.mutateAsync(createData);
      }
      
      navigate('/refresh');
    } catch (error: any) {
      let errorMsg = 'Erro ao salvar cronograma.';
      if (error?.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMsg = error.response.data;
        } else if (error.response.data.message) {
          errorMsg = error.response.data.message;
          if (error.response.data.error) {
            errorMsg += ` — ${JSON.stringify(error.response.data.error)}`;
          }
        } else {
          errorMsg = JSON.stringify(error.response.data);
        }
      } else if (error?.message) {
        errorMsg = error.message;
      }
      setSubmitError(errorMsg);
    }
  };

  const handleCancel = () => {
    navigate('/refresh');
  };

  const handleNextStep = () => {
    // Validar campos obrigatórios do primeiro passo
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (!formData.execution_time) {
      newErrors.execution_time = 'Horário é obrigatório';
    }
    
    if (formData.days_of_week.length === 0) {
      newErrors.days_of_week = 'Selecione ao menos um dia da semana';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setCurrentStep(2);
  };

  const handlePreviousStep = () => {
    setCurrentStep(1);
  };

  if (isEditMode && loadingSchedule) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageLayout>
    );
  }

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <PageLayout className="h-screen overflow-hidden">
      <div className="h-full flex flex-col p-4 overflow-hidden max-h-screen">
        {/* Header com indicador de passos */}
        <div className="flex items-center justify-between flex-shrink-0 mb-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={handleCancel}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div>
              <h1 className="text-xl font-bold text-text-primary leading-tight">
                {isEditMode ? 'Editar Cronograma' : 'Novo Cronograma'}
              </h1>
              <p className="text-sm text-text-secondary leading-tight">
                {currentStep === 1 
                  ? 'Passo 1/2: Configure o cronograma de refresh'
                  : 'Passo 2/2: Selecione os imóveis'
                }
              </p>
            </div>
          </div>

          {/* Indicador visual dos passos */}
          {!isEditMode && (
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 1 ? 'bg-primary text-white' : 'bg-border text-text-secondary'
              }`}>
                1
              </div>
              <div className={`w-6 h-0.5 ${currentStep >= 2 ? 'bg-primary' : 'bg-border'}`} />
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= 2 ? 'bg-primary text-white' : 'bg-border text-text-secondary'
              }`}>
                2
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Exibe erro de submissão se houver */}
          {submitError && (
            <div className="mb-2 p-2 bg-danger/10 border border-danger/30 rounded text-danger text-sm flex-shrink-0">
              {submitError}
            </div>
          )}
          
          {/* Renderização condicional baseada no passo atual */}
          {currentStep === 1 ? (
            /* PASSO 1 - Configuração do Cronograma */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto space-y-4">
                {/* Informações Básicas */}
                <Card className="p-4">
                  <h2 className="text-lg font-semibold text-text-primary mb-3">
                    Informações Básicas
                  </h2>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Nome do Cronograma *
                      </label>
                      <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Ex: Refresh Diário Apartamentos"
                        error={errors.name}
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={formData.is_active}
                        onChange={(checked) => handleInputChange('is_active', checked)}
                      />
                      <label className="text-sm font-medium text-text-primary">
                        Ativar cronograma imediatamente
                      </label>
                    </div>
                  </div>
                </Card>

                {/* Configuração de Horário */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-5 w-5 text-text-secondary" />
                    <h2 className="text-lg font-semibold text-text-primary">
                      Horário de Execução
                    </h2>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-text-primary mb-2">
                        Horário *
                      </label>
                      <Input
                        type="time"
                        value={formData.execution_time}
                        onChange={(e) => handleInputChange('execution_time', e.target.value)}
                        error={errors.execution_time}
                      />
                    </div>

                    {/* Horários Sugeridos */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Lightbulb className="h-4 w-4 text-warning" />
                        <span className="text-sm font-medium text-text-primary">
                          Horários Recomendados
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        {suggestedTimes.map((suggestion) => (
                          <button
                            key={suggestion.time}
                            type="button"
                            onClick={() => handleSuggestedTimeClick(suggestion.time)}
                            className={cn(
                              'p-2 rounded-lg border text-left transition-colors hover:bg-surface',
                              formData.execution_time === suggestion.time
                                ? 'border-primary bg-primary/5 text-text-primary'
                                : 'border-border text-text-primary hover:text-text-primary'
                            )}
                          >
                            <div className="font-medium text-sm text-text-primary">
                              {suggestion.label}
                            </div>
                            <div className="text-xs text-text-secondary">
                              {suggestion.description}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Dias da Semana */}
                <Card className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-5 w-5 text-text-secondary" />
                    <h2 className="text-lg font-semibold text-text-primary">
                      Dias da Semana
                    </h2>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2">
                      {daysOfWeekOptions.map((day) => (
                        <button
                          key={day.value}
                          type="button"
                          onClick={() => handleDayToggle(day.value)}
                          className={cn(
                            'p-2 rounded-lg border text-center transition-colors',
                            formData.days_of_week.includes(day.value)
                              ? 'border-primary bg-primary text-white'
                              : 'border-border hover:bg-surface text-text-primary hover:text-text-primary'
                          )}
                        >
                          <div className="font-medium text-sm">
                            {day.short}
                          </div>
                        </button>
                      ))}
                    </div>
                    
                    {errors.days_of_week && (
                      <p className="text-danger text-sm">
                        {errors.days_of_week}
                      </p>
                    )}
                    
                    <div className="text-sm text-text-secondary">
                      Dias selecionados: {formData.days_of_week.length > 0 
                        ? formData.days_of_week
                            .map(day => daysOfWeekOptions[day].short)
                            .join(', ')
                        : 'Nenhum'
                      }
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          ) : (
            /* PASSO 2 - Seleção de Imóveis */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                <Home className="h-5 w-5 text-text-secondary" />
                <h2 className="text-lg font-semibold text-text-primary">
                  Seleção de Imóveis
                </h2>
                <div className="text-sm text-text-secondary ml-auto">
                  {selectedPropertyIds.length} imóvel(eis) selecionado(s)
                </div>
                
                {/* Debug info */}
                {loadingProperties && (
                  <span className="text-xs text-warning bg-warning/10 px-2 py-1 rounded">
                    Carregando...
                  </span>
                )}
                {propertiesError && (
                  <span className="text-xs text-danger bg-danger/10 px-2 py-1 rounded">
                    Erro: {propertiesError.message}
                  </span>
                )}
                {availableProperties.length > 0 && (
                  <span className="text-xs text-success bg-success/10 px-2 py-1 rounded">
                    {availableProperties.length} disponíveis
                  </span>
                )}
              </div>

              {/* Layout em duas colunas para seleção */}
              <div className="grid grid-cols-2 gap-4 flex-1 overflow-hidden min-h-0">
                {/* Coluna Esquerda - Imóveis Disponíveis */}
                <Card className="p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <h3 className="font-medium text-text-primary">Imóveis Disponíveis</h3>
                    <div className="text-sm text-text-secondary">
                      Clique para adicionar
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto min-h-0">
                    {/* Status de carregamento e erro */}
                    {loadingProperties && (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mr-2"></div>
                        <span className="text-text-secondary">Carregando imóveis...</span>
                      </div>
                    )}
                    
                    {propertiesError && (
                      <div className="p-4 bg-danger/10 border border-danger/30 rounded text-danger text-sm">
                        <strong>Erro ao carregar propriedades:</strong><br />
                        {propertiesError.message || 'Erro desconhecido'}
                        <div className="mt-2 text-xs">
                          Verifique se você está logado e se o servidor está funcionando.
                        </div>
                      </div>
                    )}
                    
                    {!loadingProperties && !propertiesError && availableProperties.length === 0 && (
                      <div className="p-4 bg-warning/10 border border-warning/30 rounded text-warning text-sm">
                        <strong>Nenhuma propriedade disponível</strong><br />
                        Não há propriedades disponíveis para seleção no momento.
                      </div>
                    )}
                    
                    {!loadingProperties && !propertiesError && availableProperties.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-sm text-text-secondary mb-2">
                          Selecione os imóveis que serão incluídos no cronograma:
                        </div>
                        <PropertySelector
                          selectedPropertyIds={selectedPropertyIds}
                          onSelectionChange={handlePropertySelectionChange}
                          error={errors.property_ids}
                          required={true}
                          hideSelected={true}
                        />
                      </div>
                    )}
                  </div>
                </Card>

                {/* Coluna Direita - Imóveis Selecionados */}
                <Card className="p-4 flex flex-col">
                  <div className="flex items-center justify-between mb-3 flex-shrink-0">
                    <h3 className="font-medium text-text-primary">Imóveis Selecionados</h3>
                    <div className="text-sm text-text-secondary">
                      Clique para remover
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto min-h-0">
                    {selectedPropertyIds.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-border/50 flex items-center justify-center mb-3">
                          <Home className="h-8 w-8 text-text-secondary/50" />
                        </div>
                        <p className="text-text-secondary text-sm">
                          Nenhum imóvel selecionado
                        </p>
                        <p className="text-text-secondary text-xs mt-1">
                          Selecione imóveis da lista ao lado
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Cards melhorados dos imóveis selecionados */}
                        {selectedPropertyIds.map((propertyId, index) => {
                          const property = getPropertyData(propertyId);
                          
                          return (
                            <div 
                              key={propertyId}
                              className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg hover:shadow-sm transition-shadow"
                            >
                              {/* Thumbnail */}
                              <div className="w-16 h-16 rounded-lg bg-surface flex-shrink-0 overflow-hidden">
                                {property?.images?.[0] ? (
                                  <img
                                    src={property.images[0]}
                                    alt={property.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // Fallback para imagem quebrada
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      target.parentElement!.innerHTML = `
                                        <div class="w-full h-full bg-border flex items-center justify-center">
                                          <svg class="w-6 h-6 text-text-secondary" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                                            <path fill-rule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd"/>
                                          </svg>
                                        </div>
                                      `;
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full bg-border flex items-center justify-center">
                                    <Home className="w-6 h-6 text-text-secondary" />
                                  </div>
                                )}
                              </div>

                              {/* Informações do Imóvel */}
                              <div className="flex-1 min-w-0">
                                {/* Linha 1: Título */}
                                <div className="flex items-start justify-between mb-1">
                                  <h4 className="font-medium text-text-primary text-sm leading-tight line-clamp-2">
                                    {property?.title || `Imóvel #${propertyId}`}
                                  </h4>
                                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                    <div className="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center">
                                      <span className="text-xs font-medium text-primary">
                                        {index + 1}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Linha 2: Localização */}
                                {(property?.address_neighborhood || property?.address_city) && (
                                  <div className="flex items-center gap-1 mb-1">
                                    <MapPin className="w-3 h-3 text-text-secondary flex-shrink-0" />
                                    <span className="text-xs text-text-secondary truncate">
                                      {property?.address_neighborhood && property?.address_city 
                                        ? `${property.address_neighborhood}, ${property.address_city}`
                                        : property?.address_neighborhood || property?.address_city
                                      }
                                    </span>
                                  </div>
                                )}

                                {/* Linha 3: Valor e Tipo */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="w-3 h-3 text-success flex-shrink-0" />
                                    <span className="text-xs font-medium text-success">
                                      {formatCurrency(property?.price)}
                                    </span>
                                  </div>
                                  
                                  {property?.property_type && (
                                    <span className="text-xs text-text-secondary bg-surface px-2 py-0.5 rounded-full">
                                      {property.property_type}
                                    </span>
                                  )}
                                </div>

                                {/* Linha 4: ID e Status (se houver) */}
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs text-text-secondary">
                                    ID: {propertyId}
                                  </span>
                                  
                                  {property?.status && (
                                    <span className={cn(
                                      'text-xs px-2 py-0.5 rounded-full font-medium',
                                      property.status === 'active' || property.status === 'ACTIVE'
                                        ? 'bg-success/10 text-success'
                                        : property.status === 'synced'
                                        ? 'bg-info/10 text-info'
                                        : 'bg-warning/10 text-warning'
                                    )}>
                                      {property.status}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Botão Remover */}
                              <button
                                type="button"
                                onClick={() => {
                                  const newIds = selectedPropertyIds.filter(id => id !== propertyId);
                                  handlePropertySelectionChange(newIds);
                                }}
                                className="text-danger hover:text-danger/80 text-xs px-2 py-1 rounded hover:bg-danger/10 flex-shrink-0 self-start"
                              >
                                Remover
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {/* Resumo na parte inferior */}
                  {selectedPropertyIds.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border flex-shrink-0">
                      <div className="text-sm text-text-secondary">
                        <strong>{selectedPropertyIds.length}</strong> imóvel(eis) será(ão) incluído(s) no cronograma
                      </div>
                    </div>
                  )}
                </Card>
              </div>
              
              {/* Erro de validação */}
              {errors.property_ids && (
                <div className="mt-3 p-2 bg-danger/10 border border-danger/30 rounded text-danger text-sm flex-shrink-0">
                  {errors.property_ids}
                </div>
              )}
            </div>
          )}

          {/* Navegação entre passos / Actions */}
          <div className="flex justify-between pt-4 border-t border-border flex-shrink-0 bg-background">
            {currentStep === 1 ? (
              /* Botões do Passo 1 */
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                
                {!isEditMode ? (
                  <Button
                    type="button"
                    onClick={handleNextStep}
                    disabled={isLoading}
                  >
                    Próximo: Selecionar Imóveis
                    <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    loading={isLoading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Atualizar Cronograma
                  </Button>
                )}
              </>
            ) : (
              /* Botões do Passo 2 */
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePreviousStep}
                  disabled={isLoading}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar: Configurações
                </Button>
                
                <Button
                  type="submit"
                  loading={isLoading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Criar Cronograma
                </Button>
              </>
            )}
          </div>
        </form>
      </div>
    </PageLayout>
  );
};

export default RefreshScheduleFormPage;