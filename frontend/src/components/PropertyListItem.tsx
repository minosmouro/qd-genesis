import React from 'react';
import { Property } from '@/types';
import StatusPill from '@/components/ui/StatusPill';
import { Edit, Eye, Bed, Bath, Car, Maximize2, Trash2, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { formatExternalId } from '@/utils/formatters';
import { useImageLoader } from '@/hooks/useImageLoader';

type Props = {
  property: Property;
  selected: boolean;
  onToggleSelect: (id: number) => void;
  onOpenMenu?: (id: number, e: React.MouseEvent) => void;
  onOpenDetail?: (id: number) => void;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
};

const PropertyListItem: React.FC<Props> = ({
  property,
  selected,
  onToggleSelect,
  onOpenDetail,
  onEdit,
  onDelete,
}) => {
  const imageUrl = property.image_urls?.[0] || '';
  const { imageSrc, isLoading: imageLoading } = useImageLoader({
    src: imageUrl,
    fallbackSrc: '/placeholder-property.jpg',
  });

  // Normalizar nomes de campos entre backend e tipos
  const price = property.price_sale 
    ? `R$ ${property.price_sale.toLocaleString('pt-BR')}` 
    : property.price_rent 
    ? `R$ ${property.price_rent.toLocaleString('pt-BR')}/mês` 
    : 'Preço sob consulta';
  
  // Endereço melhorado com logradouro, bairro e empreendimento
  const addressParts = [];
  if (property.address?.street) {
    let streetInfo = property.address.street;
    if (property.address.number) {
      streetInfo += `, ${property.address.number}`;
    }
    addressParts.push(streetInfo);
  }
  if (property.address?.neighborhood) {
    addressParts.push(property.address.neighborhood);
  }
  if (property.condominium?.name) {
    addressParts.push(`${property.condominium.name}`);
  }
  const addressSummary = addressParts.join(' • ') || 'Endereço não informado';
  
  const area = property.area_total ?? property.area_util ?? null;
  const bedrooms = property.bedrooms ?? 0;
  const bathrooms = property.bathrooms ?? 0;
  const parking = property.parking_spaces ?? property.garage_spots ?? 0;

  // Badge de Destaque (publication_type)
  const getHighlightBadge = () => {
    const pub = property.publication_type;
    if (!pub || pub === 'STANDARD') return null; // Sem etiqueta
    const LABELS: Record<string, string> = {
      PREMIUM: 'Destaque',
      SUPER_PREMIUM: 'Super destaque',
      PREMIERE_1: 'Destaque Exclusivo',
      PREMIERE_2: 'Destaque Superior',
      TRIPLE: 'Destaque Triplo',
    };
    const STYLES: Record<string, string> = {
      PREMIUM: 'bg-primary text-white',
      SUPER_PREMIUM: 'bg-success text-white',
      PREMIERE_1: 'bg-warning text-white',
      PREMIERE_2: 'bg-warning text-white',
      TRIPLE: 'bg-accent text-white',
    };
    const label = LABELS[pub] || 'Destaque';
    const style = STYLES[pub] || 'bg-primary text-white';
    return (
      <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-sm', style)}>
        <Sparkles className="w-3 h-3" />
        <span>{label}</span>
      </div>
    );
  };

  // Formatação melhorada das datas
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short', 
        year: 'numeric'
      });
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <div 
      className={cn(
        'group relative flex items-stretch bg-surface/80 backdrop-blur-sm rounded-lg border transition-all duration-300 overflow-hidden h-[181px]',
        selected 
          ? 'border-primary/50 shadow-md ring-1 ring-primary/20' 
          : 'border-border/50 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5'
      )}
    >
      {/* Accent on hover */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-brand-yellow dark:bg-brand-yellow-light opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Image Section - Fixed 255x181 */}
      <div className="relative flex-shrink-0 w-[255px] h-[181px]">
        {/* Checkbox overlay */}
        <div className="absolute left-2 top-2 z-20">
          <input
            type="checkbox"
            aria-label={`Selecionar imóvel ${property.property_code || property.external_id || property.id}`}
            checked={selected}
            onChange={() => onToggleSelect(Number(property.id))}
            className={cn(
              'w-4 h-4 rounded border-2 cursor-pointer transition-all duration-200',
              'checked:bg-primary checked:border-primary',
              'focus:ring-2 focus:ring-primary/50 focus:ring-offset-1',
              selected ? 'bg-primary border-primary' : 'bg-white/90 border-white/50 backdrop-blur-sm'
            )}
          />
        </div>

        {/* Status Badge */}
        <div className="absolute right-2 top-2 z-20">
          <StatusPill status={property.status} showIcon={false} />
        </div>

        {/* Highlight Badge */}
        <div className="absolute left-2 bottom-2 z-20">
          {getHighlightBadge()}
        </div>

        {/* Image with loading state */}
        <div className="relative w-full h-full">
          {imageLoading && (
            <div className="absolute inset-0 bg-border/50 animate-pulse" />
          )}
          <img
            src={imageSrc}
            alt={property.title || addressSummary || 'Imagem do imóvel'}
            className={cn(
              'w-full h-full object-cover transition-all duration-500',
              'group-hover:scale-105',
              !imageLoading ? 'opacity-100' : 'opacity-0'
            )}
            loading="lazy"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      </div>

      {/* Content Section */}
      <div className="flex-1 min-w-0 px-4 py-3 flex flex-col justify-between">
        {/* Top Section */}
        <div>
          {/* Codes Badges + Status inline */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {property.property_code && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface/70 border border-border/50 text-text-primary text-[11px] font-semibold">
                  Código: {property.property_code}
                </div>
              )}
              {property.external_id && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-semibold">
                  #{formatExternalId(property.external_id)}
                </div>
              )}
              {/* Inline highlight badge for extra visibility on desktop */}
              <div className="hidden md:block">
                {getHighlightBadge()}
              </div>
            </div>
            {/* Action Buttons - Desktop */}
            <div className="hidden md:flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenDetail && onOpenDetail(Number(property.id));
                }}
                className="p-1 hover:bg-primary/10 hover:text-primary"
                title="Ver detalhes"
              >
                <Eye className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit && onEdit(Number(property.id));
                }}
                className="p-1 hover:bg-accent/10 hover:text-accent"
                title="Editar imóvel"
              >
                <Edit className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete && onDelete(Number(property.id));
                }}
                className="p-1 hover:bg-danger/10 hover:text-danger"
                title="Excluir imóvel"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          
          {/* Price - Prominent */}
          <div className="text-xl font-bold text-brand-navy dark:text-brand-navy-lighter mb-1.5">
            {price}
          </div>

          {/* Address */}
          <div className="text-xs text-text-secondary line-clamp-2 leading-relaxed mb-2">
            {addressSummary}
          </div>
        </div>

        {/* Bottom Section - Features + Dates */}
        <div>
          {/* Features - Horizontal compact */}
          <div className="flex items-center gap-3 mb-2 pb-2 border-b border-border/30">
            {area && (
              <div className="flex items-center gap-1 text-text-primary">
                <Maximize2 className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">{area} m²</span>
              </div>
            )}
            {bedrooms > 0 && (
              <div className="flex items-center gap-1 text-text-primary">
                <Bed className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">{bedrooms}</span>
              </div>
            )}
            {bathrooms > 0 && (
              <div className="flex items-center gap-1 text-text-primary">
                <Bath className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">{bathrooms}</span>
              </div>
            )}
            {parking > 0 && (
              <div className="flex items-center gap-1 text-text-primary">
                <Car className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold">{parking}</span>
              </div>
            )}
          </div>

          {/* Dates - Compact */}
          <div className="flex items-center justify-between text-[10px] text-text-secondary">
            <span>Criado {property.created_at ? formatDate(property.created_at) : '-'}</span>
            <span>Atualizado {property.updated_at ? formatDate(property.updated_at) : '-'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(PropertyListItem);