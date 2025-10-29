/**
 * Componente para seleção obrigatória de propriedades em agendamentos de refresh
 */
import React, { useState, useEffect } from 'react';
import { Search, Home, MapPin, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useAvailableProperties } from '@/hooks/useRefresh';
import { cn } from '@/utils/cn';
import Button from '@/components/Button/Button';
import Input from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import type { Property } from '@/types/property';

interface PropertySelectorProps {
  selectedPropertyIds: number[];
  onSelectionChange: (propertyIds: number[]) => void;
  error?: string;
  required?: boolean;
  className?: string;
  hideSelected?: boolean; // Nova prop para ocultar itens selecionados
}

const PropertySelector: React.FC<PropertySelectorProps> = ({
  selectedPropertyIds,
  onSelectionChange,
  error,
  required = true,
  className,
  hideSelected = false // Nova prop com valor padrão
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  
  const { data: availableProperties = [], isLoading, error: fetchError } = useAvailableProperties();

  // Filtrar propriedades baseado na busca
  const filteredProperties = availableProperties.filter((property: Property) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      property.title?.toLowerCase().includes(searchLower) ||
      property.address_street?.toLowerCase().includes(searchLower) ||
      property.address_neighborhood?.toLowerCase().includes(searchLower) ||
      property.address_city?.toLowerCase().includes(searchLower) ||
      property.property_code?.toLowerCase().includes(searchLower)
    );
    
    // Se hideSelected for true, remover propriedades já selecionadas
    const isNotSelected = hideSelected ? !selectedPropertyIds.includes(property.id) : true;
    
    return matchesSearch && isNotSelected;
  });

  // Propriedades selecionadas (para exibir resumo)
  const selectedProperties = availableProperties.filter((property: Property) => 
    selectedPropertyIds.includes(property.id)
  );

  // Handlers
  const handlePropertyToggle = (propertyId: number) => {
    const newSelection = selectedPropertyIds.includes(propertyId)
      ? selectedPropertyIds.filter(id => id !== propertyId)
      : [...selectedPropertyIds, propertyId];
    
    onSelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedPropertyIds.length === filteredProperties.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredProperties.map(p => p.id));
    }
  };

  const handleRemoveProperty = (propertyId: number) => {
    onSelectionChange(selectedPropertyIds.filter(id => id !== propertyId));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  // Auto-expandir se houver erro
  useEffect(() => {
    if (error) {
      setIsExpanded(true);
    }
  }, [error]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header com resumo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Home className="h-5 w-5 text-text-secondary" />
          <label className="text-sm font-medium text-text-primary">
            {hideSelected ? 'Imóveis Disponíveis' : 'Seleção de Imóveis'} {required && <span className="text-danger">*</span>}
          </label>
        </div>
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs"
        >
          {isExpanded ? 'Recolher' : 'Expandir'}
        </Button>
      </div>

      {/* Resumo das propriedades selecionadas - ocultar se hideSelected for true */}
      {!hideSelected && (
        <div className={cn(
          'p-4 rounded-lg border',
          error ? 'border-danger bg-danger/5' : 'border-border bg-surface'
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {selectedPropertyIds.length > 0 ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <AlertCircle className={cn(
                  'h-4 w-4',
                  error ? 'text-danger' : 'text-warning'
                )} />
              )}
              <span className="text-sm font-medium">
                {selectedPropertyIds.length > 0 
                  ? `${selectedPropertyIds.length} imóvel(is) selecionado(s)`
                  : 'Nenhum imóvel selecionado'
                }
              </span>
            </div>
            
            {selectedPropertyIds.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="text-xs text-danger hover:text-danger"
              >
                Limpar tudo
              </Button>
            )}
          </div>

          {/* Lista de propriedades selecionadas */}
          {selectedProperties.length > 0 && (
            <div className="space-y-2">
              {selectedProperties.slice(0, 3).map((property) => (
                <div
                  key={property.id}
                  className="flex items-center justify-between p-2 bg-white rounded border"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {property.title || `Propriedade #${property.id}`}
                    </div>
                    <div className="text-xs text-text-secondary truncate">
                      {property.address_street && property.address_neighborhood
                        ? `${property.address_street}, ${property.address_neighborhood}`
                        : property.property_code || `ID: ${property.id}`
                      }
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveProperty(property.id)}
                    className="p-1 text-text-secondary hover:text-danger"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              
              {selectedProperties.length > 3 && (
                <div className="text-xs text-text-secondary text-center py-1">
                  +{selectedProperties.length - 3} imóveis adicionais
                </div>
              )}
            </div>
          )}

          {/* Mensagem de erro */}
          {error && (
            <div className="mt-2 text-sm text-danger">
              {error}
            </div>
          )}

          {/* Mensagem obrigatória */}
          {required && selectedPropertyIds.length === 0 && !error && (
            <div className="mt-2 text-sm text-text-secondary">
              É necessário selecionar pelo menos um imóvel para criar o agendamento.
            </div>
          )}
        </div>
      )}

      {/* Lista expandida para seleção */}
      {isExpanded && (
        <div className="border rounded-lg bg-white">
          {/* Header da lista */}
          <div className="p-4 border-b bg-surface">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-text-primary">
                Selecionar Imóveis
              </h3>
              
              {filteredProperties.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  {selectedPropertyIds.length === filteredProperties.length 
                    ? 'Desmarcar todos' 
                    : 'Selecionar todos'
                  }
                </Button>
              )}
            </div>

            {/* Campo de busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input
                type="text"
                placeholder="Buscar por título, endereço ou código..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Lista de propriedades */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                <div className="text-sm text-text-secondary">Carregando imóveis...</div>
              </div>
            ) : fetchError ? (
              <div className="p-8 text-center">
                <AlertCircle className="h-6 w-6 text-danger mx-auto mb-2" />
                <div className="text-sm text-danger">Erro ao carregar imóveis</div>
              </div>
            ) : filteredProperties.length === 0 ? (
              <div className="p-8 text-center">
                <Home className="h-6 w-6 text-text-secondary mx-auto mb-2" />
                <div className="text-sm text-text-secondary">
                  {searchTerm ? 'Nenhum imóvel encontrado' : 'Nenhum imóvel disponível'}
                </div>
              </div>
            ) : (
              <div className="p-2">
                {filteredProperties.map((property) => (
                  <div
                    key={property.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors hover:bg-surface-hover',
                      selectedPropertyIds.includes(property.id) && 'bg-primary/5 border border-primary/20'
                    )}
                    onClick={() => handlePropertyToggle(property.id)}
                  >
                    <Checkbox
                      checked={selectedPropertyIds.includes(property.id)}
                      onChange={() => handlePropertyToggle(property.id)}
                    />
                    
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-primary truncate">
                        {property.title || `Propriedade #${property.id}`}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        {property.address_street && property.address_neighborhood && (
                          <div className="flex items-center gap-1 text-xs text-text-secondary">
                            <MapPin className="h-3 w-3" />
                            <span className="truncate">
                              {property.address_street}, {property.address_neighborhood}
                            </span>
                          </div>
                        )}
                        
                        {property.property_code && (
                          <div className="text-xs text-text-secondary">
                            Código: {property.property_code}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <span className={cn(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          property.status === 'active' || property.status === 'ACTIVE' 
                            ? 'bg-success/10 text-success'
                            : property.status === 'synced'
                            ? 'bg-info/10 text-info'
                            : 'bg-warning/10 text-warning'
                        )}>
                          {property.status}
                        </span>
                        
                        {property.property_type && (
                          <span className="text-xs text-text-secondary">
                            {property.property_type}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer com informações */}
          {filteredProperties.length > 0 && (
            <div className="p-3 border-t bg-surface text-xs text-text-secondary">
              {searchTerm 
                ? `${filteredProperties.length} imóveis encontrados`
                : `${availableProperties.length} imóveis disponíveis`
              }
              {selectedPropertyIds.length > 0 && (
                <span> • {selectedPropertyIds.length} selecionados</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PropertySelector;