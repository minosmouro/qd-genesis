import React, { useRef, useEffect } from 'react';
import PropertyListItem from '../PropertyListItem';
import { Property } from '@/types';
import { cn } from '@/utils/cn';
import { CheckSquare, Square } from 'lucide-react';

type Props = {
  data: Property[];
  selectedIds: (string | number)[];
  onSelectionChange: (ids: (string | number)[]) => void;
  onOpenDetail?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
  // novo: número total de resultados (opcional) para permitir "Selecionar todos X resultados"
  totalCount?: number;
  // novo: callback que o pai pode fornecer para selecionar todos os resultados (across pages)
  onSelectAllResults?: () => void;
};

const PropertyList: React.FC<Props> = ({ data, selectedIds, onSelectionChange, onOpenDetail, onEdit, onDelete, totalCount, onSelectAllResults }) => {
  const toggle = (id: number) => {
    const exists = selectedIds.includes(id);
    if (exists) {
      onSelectionChange(selectedIds.filter(s => s !== id));
    } else {
      onSelectionChange([...selectedIds, id]);
    }
  };

  // checkbox header ref para indeterminate
  const headerCheckboxRef = useRef<HTMLInputElement | null>(null);
  const allVisibleSelected = data.length > 0 && data.every(item => selectedIds.includes(item.id));
  const someVisibleSelected = data.some(item => selectedIds.includes(item.id)) && !allVisibleSelected;

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someVisibleSelected;
    }
  }, [someVisibleSelected]);

  const handleToggleVisible = () => {
    if (allVisibleSelected) {
      // remover somente os IDs visíveis
      const remaining = selectedIds.filter(s => !data.some(d => d.id === s));
      onSelectionChange(remaining);
    } else {
      // adicionar os IDs visíveis (mantendo seleções prévias em outras páginas)
      const visibleIds = data.map(d => d.id);
      const merged = Array.from(new Set([...selectedIds, ...visibleIds]));
      onSelectionChange(merged);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header com checkbox de seleção visível e botão para selecionar todos os resultados */}
      <div className="flex items-center justify-between p-3 bg-surface/50 backdrop-blur-sm rounded-lg border border-border/50">
        <label className="flex items-center gap-3 text-sm font-medium text-text-primary cursor-pointer group">
          <div className="relative">
            <input
              ref={headerCheckboxRef}
              type="checkbox"
              checked={allVisibleSelected}
              onChange={handleToggleVisible}
              className="sr-only peer"
              aria-label={`Selecionar itens visíveis (${data.length})`}
            />
            <div className={cn(
              "w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200",
              allVisibleSelected 
                ? "bg-primary border-primary" 
                : someVisibleSelected
                ? "bg-primary/50 border-primary"
                : "border-border group-hover:border-primary/50"
            )}>
              {allVisibleSelected ? (
                <CheckSquare className="w-4 h-4 text-white" />
              ) : someVisibleSelected ? (
                <Square className="w-4 h-4 text-white" />
              ) : null}
            </div>
          </div>
          <span className="group-hover:text-primary transition-colors">
            Selecionar itens visíveis ({data.length})
          </span>
        </label>

        {typeof totalCount === 'number' && totalCount > data.length && onSelectAllResults && (
          <button
            type="button"
            className="text-sm font-medium text-primary hover:text-accent transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-primary/10"
            onClick={onSelectAllResults}
          >
            <CheckSquare className="w-4 h-4" />
            Selecionar todos {totalCount} resultados
          </button>
        )}
      </div>

      {/* Property items with stagger animation */}
      <div className="space-y-3">
        {data.map((item, index) => (
          <div 
            key={item.id} 
            className="stagger-item"
            style={{ animationDelay: `${Math.min(index * 0.05, 0.4)}s` }}
          >
            <PropertyListItem
              property={item}
              selected={selectedIds.includes(item.id)}
              onToggleSelect={() => toggle(item.id)}
              onOpenDetail={onOpenDetail}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertyList;
