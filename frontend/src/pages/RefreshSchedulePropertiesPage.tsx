/**
 * Página para gerenciar propriedades de um cronograma de refresh
 */
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { errorLog } from '@/utils/logger';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  MapPin, 
  Trash2, 
  Users,
  CheckCircle
} from 'lucide-react';
import PageLayout from '@/components/Layout/PageLayout';
import Card from '@/components/Card/Card';
import Button from '@/components/Button/Button';
import Input from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import Modal from '@/components/ui/Modal';
import { 
  useRefreshSchedule,
  useRefreshScheduleProperties,
  useAddPropertyToSchedule,
  useRemovePropertyFromSchedule,
  useAvailableProperties
} from '@/hooks/useRefresh';
import { cn } from '@/utils/cn';
import type { Property } from '@/types/property';

const RefreshSchedulePropertiesPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const scheduleId = id ? parseInt(id) : undefined;

  // Estados locais
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProperties, setSelectedProperties] = useState<number[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addSearchTerm, setAddSearchTerm] = useState('');

  // Hooks de dados
  const { data: schedule, isLoading: loadingSchedule } = useRefreshSchedule(scheduleId);
  const { data: scheduleProperties, isLoading: loadingScheduleProperties, refetch: refetchScheduleProperties } = useRefreshScheduleProperties(scheduleId);
  const { data: availableProperties, isLoading: loadingAvailableProperties } = useAvailableProperties();

  // Hooks de mutations
  const addPropertyMutation = useAddPropertyToSchedule();
  const removePropertyMutation = useRemovePropertyFromSchedule();

  // Filtrar propriedades do cronograma
  const filteredScheduleProperties = scheduleProperties?.data?.filter((property: any) => {
    return !searchTerm || 
      property.property?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      property.property?.description?.toLowerCase().includes(searchTerm.toLowerCase());
  }) || [];

  // Filtrar propriedades disponíveis para adicionar
  const availableToAdd = (availableProperties || []).filter((property: any) => {
    const isNotInSchedule = !scheduleProperties?.data?.some((sp: any) => sp.property_id === property.id);
    const matchesSearch = !addSearchTerm || 
      property.title?.toLowerCase().includes(addSearchTerm.toLowerCase()) ||
      property.address?.toLowerCase().includes(addSearchTerm.toLowerCase()) ||
      property.neighborhood?.toLowerCase().includes(addSearchTerm.toLowerCase());
    
    return isNotInSchedule && matchesSearch;
  });

  // Handlers
  const handleBack = () => {
    navigate('/refresh');
  };

  const handleSelectProperty = (propertyId: number) => {
    setSelectedProperties(prev => 
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProperties.length === filteredScheduleProperties.length) {
      setSelectedProperties([]);
    } else {
      setSelectedProperties(filteredScheduleProperties.map((p) => p.property_id));
    }
  };

  const handleRemoveSelected = async () => {
    if (!scheduleId || selectedProperties.length === 0) return;

    try {
      for (const propertyId of selectedProperties) {
        await removePropertyMutation.mutateAsync({
          scheduleId,
          propertyId,
        });
      }
      
      setSelectedProperties([]);
      refetchScheduleProperties();
    } catch (error) {
      errorLog('Erro ao remover propriedades:', error);
    }
  };

  const handleAddProperties = async (propertiesToAdd: number[]) => {
    if (!scheduleId || propertiesToAdd.length === 0) return;

    try {
      for (const propertyId of propertiesToAdd) {
        await addPropertyMutation.mutateAsync({
          scheduleId,
          propertyId,
        });
      }
      
      setShowAddModal(false);
      setAddSearchTerm('');
      refetchScheduleProperties();
    } catch (error) {
      errorLog('Erro ao adicionar propriedades:', error);
    }
  };

  const formatPropertyInfo = (property?: any) => {
    if (!property) return 'Informações não disponíveis';
    
    const parts = [];
    
    if (property.neighborhood) {
      parts.push(property.neighborhood);
    }
    
    if (property.city) {
      parts.push(property.city);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Localização não informada';
  };

  if (!scheduleId) {
    return (
      <PageLayout>
        <div className="text-center py-12">
          <p className="text-danger">ID do cronograma inválido</p>
        </div>
      </PageLayout>
    );
  }

  if (loadingSchedule) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-text-primary">
              Propriedades do Cronograma
            </h1>
            <p className="text-text-secondary mt-1">
              {schedule?.name} - Gerencie quais propriedades fazem parte deste cronograma
            </p>
          </div>
          
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Propriedades
          </Button>
        </div>

        {/* Resumo */}
        <Card className="p-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
              <div className="font-semibold text-text-primary">
              {scheduleProperties?.data?.length || 0}
              </div>
              <div className="text-sm text-text-secondary">
              Propriedades no cronograma
              </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-secondary" />
              <div>
                <div className="font-semibold text-text-primary">
                  {availableProperties?.length || 0}
                </div>
                <div className="text-sm text-text-secondary">
                  Total de propriedades
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Controles */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          {/* Busca */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input
              type="text"
              placeholder="Buscar propriedades..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Actions para selecionados */}
          {selectedProperties.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">
                {selectedProperties.length} selecionadas
              </span>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveSelected}
                loading={removePropertyMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Remover
              </Button>
            </div>
          )}
        </div>

        {/* Lista de Propriedades */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedProperties.length === filteredScheduleProperties.length && filteredScheduleProperties.length > 0}
                onChange={handleSelectAll}
              />
              <h3 className="font-semibold text-text-primary">
                Propriedades ({filteredScheduleProperties.length})
              </h3>
            </div>
          </div>

          {loadingScheduleProperties ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-surface animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredScheduleProperties.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-text-secondary mx-auto mb-3" />
              <p className="text-text-secondary">
              {scheduleProperties?.data?.length === 0 
              ? 'Nenhuma propriedade adicionada ao cronograma'
              : 'Nenhuma propriedade encontrada com os filtros atuais'
              }
              </p>
              {scheduleProperties?.data?.length === 0 && (
                <Button
                  className="mt-3"
                  onClick={() => setShowAddModal(true)}
                >
                  Adicionar Primeira Propriedade
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredScheduleProperties.map((scheduleProperty) => (
                <div
                  key={scheduleProperty.property_id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors hover:bg-surface-hover',
                    selectedProperties.includes(scheduleProperty.property_id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border'
                  )}
                >
                  <Checkbox
                    checked={selectedProperties.includes(scheduleProperty.property_id)}
                    onChange={() => handleSelectProperty(scheduleProperty.property_id)}
                  />
                  
                  <div className="flex-1">
                    <div className="font-medium text-text-primary">
                      {scheduleProperty.property?.title || `Propriedade #${scheduleProperty.property_id}`}
                    </div>
                    <div className="text-sm text-text-secondary">
                      {formatPropertyInfo(scheduleProperty.property)}
                    </div>
                  </div>
                  
                  <div className="text-sm text-text-secondary">
                    {scheduleProperty.property?.status || 'N/A'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Modal para Adicionar Propriedades */}
        {showAddModal && (
          <Modal
            isOpen={true}
            onClose={() => setShowAddModal(false)}
            title="Adicionar Propriedades"
            size="lg"
          >
            <AddPropertiesModal
              availableProperties={availableToAdd}
              loading={loadingAvailableProperties}
              searchTerm={addSearchTerm}
              onSearchChange={setAddSearchTerm}
              onAdd={handleAddProperties}
              onCancel={() => setShowAddModal(false)}
            />
          </Modal>
        )}
      </div>
    </PageLayout>
  );
};

// Componente do Modal para Adicionar Propriedades
interface AddPropertiesModalProps {
  availableProperties: Property[];
  loading: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onAdd: (propertyIds: number[]) => void;
  onCancel: () => void;
}

const AddPropertiesModal: React.FC<AddPropertiesModalProps> = ({
  availableProperties,
  loading,
  searchTerm,
  onSearchChange,
  onAdd,
  onCancel,
}) => {
  const [selectedToAdd, setSelectedToAdd] = useState<number[]>([]);

  const handleSelectAvailableProperty = (propertyId: number) => {
    setSelectedToAdd(prev => 
      prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId]
    );
  };

  const handleSelectAll = () => {
    if (selectedToAdd.length === availableProperties.length) {
      setSelectedToAdd([]);
    } else {
      setSelectedToAdd(availableProperties.map(p => p.id));
    }
  };

  const handleConfirm = () => {
    onAdd(selectedToAdd);
    setSelectedToAdd([]);
  };

  const formatPropertyInfo = (property: Property) => {
    const parts = [];
    
    if (property.neighborhood) {
      parts.push(property.neighborhood);
    }
    
    if (property.city) {
      parts.push(property.city);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'Localização não informada';
  };

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
        <Input
          type="text"
          placeholder="Buscar propriedades disponíveis..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Controles */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox
            checked={selectedToAdd.length === availableProperties.length && availableProperties.length > 0}
            onChange={handleSelectAll}
          />
          <span className="text-sm text-text-secondary">
            Selecionar todas ({availableProperties.length})
          </span>
        </div>
        
        {selectedToAdd.length > 0 && (
          <span className="text-sm text-primary font-medium">
            {selectedToAdd.length} selecionadas
          </span>
        )}
      </div>

      {/* Lista de Propriedades */}
      <div className="max-h-96 overflow-y-auto border border-border rounded-lg">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-surface animate-pulse rounded" />
            ))}
          </div>
        ) : availableProperties.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-8 w-8 text-success mx-auto mb-2" />
            <p className="text-text-secondary">
              Todas as propriedades já estão no cronograma
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {availableProperties.map((property) => (
              <div
                key={property.id}
                className={cn(
                  'flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-surface-hover',
                  selectedToAdd.includes(property.id) && 'bg-primary/5'
                )}
                onClick={() => handleSelectAvailableProperty(property.id)}
              >
                <Checkbox
                  checked={selectedToAdd.includes(property.id)}
                  onChange={() => handleSelectAvailableProperty(property.id)}
                />
                
                <div className="flex-1">
                  <div className="font-medium text-text-primary text-sm">
                    {property.title || `Propriedade #${property.id}`}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {formatPropertyInfo(property)}
                  </div>
                </div>
                
                <div className="text-xs text-text-secondary">
                  {property.property_type}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={onCancel}
        >
          Cancelar
        </Button>
        
        <Button
          onClick={handleConfirm}
          disabled={selectedToAdd.length === 0}
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar {selectedToAdd.length > 0 && `(${selectedToAdd.length})`}
        </Button>
      </div>
    </div>
  );
};

export default RefreshSchedulePropertiesPage;
