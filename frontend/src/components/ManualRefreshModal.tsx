/**
 * Modal para seleção de imóvel para refresh manual
 * Permite ao usuário escolher um imóvel específico para atualizar no Canal Pro
 */
import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Home, 
  MapPin, 
  AlertCircle,
  Zap,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useAvailableProperties } from '@/hooks/useRefresh';
import refreshService from '@/services/refresh.service';
import { cn } from '@/utils/cn';
import Button from '@/components/Button/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import Card from '@/components/Card/Card';
import type { Property } from '@/types/property';

interface ManualRefreshModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (propertyId: number) => void;
}

const ManualRefreshModal: React.FC<ManualRefreshModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');


  const { data: availablePropertiesData, isLoading } = useAvailableProperties();

  // Log defensivo para debug
  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('ManualRefreshModal: availablePropertiesData', availablePropertiesData);
  }, [availablePropertiesData]);

  // Garantir que availableProperties seja sempre um array
  const availableProperties = useMemo(() => {
    if (!availablePropertiesData) return [];
    // Se for um objeto com propriedade 'data', extrair o array
    if (typeof availablePropertiesData === 'object' && 'data' in availablePropertiesData) {
      return Array.isArray(availablePropertiesData.data) ? availablePropertiesData.data : [];
    }
    // Se já for um array, retornar diretamente
    if (Array.isArray(availablePropertiesData)) return availablePropertiesData;
    // Se não for array, retorna array vazio
    return [];
  }, [availablePropertiesData]);

  // Filtrar apenas propriedades que foram exportadas (têm remote_id/canalpro_id)
  const exportedProperties = useMemo(() => {
    return availableProperties.filter((property: Property) => 
      property.canalpro_id || property.remote_id
    );
  }, [availableProperties]);

  // Filtrar propriedades baseado na busca
  const filteredProperties = useMemo(() => {
    if (!searchTerm) return exportedProperties;
    
    const searchLower = searchTerm.toLowerCase();
    return exportedProperties.filter((property: Property) => {
      return (
        property.title?.toLowerCase().includes(searchLower) ||
        property.address_street?.toLowerCase().includes(searchLower) ||
        property.address_neighborhood?.toLowerCase().includes(searchLower) ||
        property.address_city?.toLowerCase().includes(searchLower) ||
        property.property_code?.toLowerCase().includes(searchLower) ||
        property.canalpro_id?.toLowerCase().includes(searchLower) ||
        property.remote_id?.toLowerCase().includes(searchLower)
      );
    });
  }, [exportedProperties, searchTerm]);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedProperty(null);
      setIsRefreshing(false);
      setRefreshStatus('idle');
      setErrorMessage('');
    }
  }, [isOpen]);

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
    setRefreshStatus('idle');
    setErrorMessage('');
  };

  const handleRefresh = async () => {
    if (!selectedProperty) return;

    setIsRefreshing(true);
    setRefreshStatus('idle');
    setErrorMessage('');

    try {
      const result = await refreshService.manualRefresh(selectedProperty.id);
      // Considerar sucesso se a requisição retornou com operation_id/new_remote_id
      if (result && (result.operation_id || result.new_remote_id)) {
        setRefreshStatus('success');
        onSuccess?.(selectedProperty.id);
        // Auto-close after success
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setRefreshStatus('error');
        setErrorMessage(result.message || 'Erro desconhecido durante o refresh');
      }
    } catch (error) {
      setRefreshStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erro de conexão');
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderPropertyCard = (property: Property) => (
    <Card 
      key={property.id}
      className={cn(
        'p-4 cursor-pointer transition-all border-2',
        selectedProperty?.id === property.id 
          ? 'border-primary bg-primary/5' 
          : 'border-transparent hover:border-border-hover'
      )}
      onClick={() => handlePropertySelect(property)}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
          <Home className="h-4 w-4 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-text-primary truncate">
            {property.title}
          </h4>
          
          {property.property_code && (
            <p className="text-sm text-text-secondary">
              Código: {property.property_code}
            </p>
          )}
          
          {(property.address_street || property.address_neighborhood) && (
            <div className="flex items-center gap-1 mt-1">
              <MapPin className="h-3 w-3 text-text-disabled" />
              <p className="text-xs text-text-secondary truncate">
                {[property.address_street, property.address_neighborhood, property.address_city]
                  .filter(Boolean)
                  .join(', ')}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-success/10 text-success text-xs rounded-full">
              <ExternalLink className="h-3 w-3" />
              Exportado
            </span>
            {(property.canalpro_id || property.remote_id) && (
              <span className="text-xs text-text-disabled">
                ID: {property.canalpro_id || property.remote_id}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">
                Refresh Manual
              </h2>
              <p className="text-sm text-text-secondary">
                Selecione um imóvel para atualizar no Canal Pro
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isRefreshing}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Status Messages */}
        {refreshStatus === 'success' && (
          <div className="mb-4 p-4 bg-success/10 text-success border border-success/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              <span className="font-medium">Refresh realizado com sucesso!</span>
            </div>
            <p className="text-sm mt-1">
              O imóvel foi excluído e recadastrado no Canal Pro.
            </p>
          </div>
        )}

        {refreshStatus === 'error' && (
          <div className="mb-4 p-4 bg-danger/10 text-danger border border-danger/20 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Erro no refresh</span>
            </div>
            <p className="text-sm mt-1">{errorMessage}</p>
          </div>
        )}

        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-disabled" />
            <Input
              type="text"
              placeholder="Buscar por título, endereço, código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={isRefreshing}
            />
          </div>
        </div>

        {/* Properties List */}
        <div className="mb-6">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-text-secondary">Carregando imóveis...</p>
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-8">
              <Home className="h-8 w-8 text-text-disabled mx-auto mb-4" />
              <p className="text-text-secondary">
                {exportedProperties.length === 0 
                  ? 'Nenhum imóvel exportado encontrado'
                  : 'Nenhum imóvel encontrado para a busca'
                }
              </p>
              {exportedProperties.length === 0 && (
                <p className="text-xs text-text-disabled mt-2">
                  Apenas imóveis já exportados para o Canal Pro podem ser atualizados.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredProperties.map(renderPropertyCard)}
            </div>
          )}
        </div>

        {/* Selected Property Preview */}
        {selectedProperty && refreshStatus === 'idle' && (
          <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <h4 className="font-medium text-text-primary mb-2">
              Imóvel selecionado para refresh:
            </h4>
            <p className="text-sm text-text-secondary">
              <strong>{selectedProperty.title}</strong>
            </p>
            <p className="text-xs text-text-disabled mt-1">
              Este imóvel será excluído e recadastrado automaticamente no Canal Pro.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isRefreshing}
          >
            Cancelar
          </Button>
          
          <Button
            onClick={handleRefresh}
            disabled={!selectedProperty || isRefreshing || refreshStatus === 'success'}
            className="min-w-[120px]"
          >
            {isRefreshing ? (
              <>
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Executar Refresh
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ManualRefreshModal;