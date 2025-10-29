import React, { useRef, useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Search,
  PlusCircle,
  SortAsc,
  SortDesc,
  ChevronDown,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { cn } from '@/utils/cn';

type Counts = {
  imported: number;
  pending: number;
  synced: number;
  error: number;
};

type Props = {
  total: number;
  counts: Counts;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  onNewClick: () => void;
  statusFilter: string;
  setStatusFilter: (v: any) => void;
  propertyTypeFilter?: string;
  setPropertyTypeFilter?: (v: string) => void;
  // Novos props para ordenação
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
};

const StatChip: React.FC<{
  label: string;
  value: number;
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}> = ({ label, value, icon, variant = 'default' }) => {
  const variantClasses = {
    default: 'bg-surface/80 border-border/50 text-text-primary',
    primary: 'bg-primary/10 border-primary/30 text-primary',
    success: 'bg-success/10 border-success/30 text-success',
    warning: 'bg-warning/10 border-warning/30 text-warning',
    danger: 'bg-danger/10 border-danger/30 text-danger',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm border backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:shadow-md',
        variantClasses[variant]
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <div className="flex flex-col">
        <div className="text-xs font-medium opacity-80">{label}</div>
        <div className="text-lg font-bold leading-none">{value}</div>
      </div>
    </div>
  );
};

const CockpitBar: React.FC<Props> = ({
  total,
  counts,
  searchTerm,
  setSearchTerm,
  onNewClick,
  statusFilter,
  setStatusFilter,
  propertyTypeFilter = '',
  setPropertyTypeFilter,
  sortBy = 'updated_at',
  sortOrder = 'desc',
  onSortChange,
}) => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [showSortMenu, setShowSortMenu] = useState(false);

  const sortOptions = [
    { key: 'updated_at', label: 'Data de Atualização', field: 'updated_at' },
    { key: 'created_at', label: 'Data de Criação', field: 'created_at' },
    { key: 'price', label: 'Preço de Venda', field: 'price' },
    { key: 'price_rent', label: 'Preço de Aluguel', field: 'price_rent' },
    { key: 'usable_area', label: 'Área Útil', field: 'usable_area' },
    { key: 'total_area', label: 'Área Total', field: 'total_area' },
  ];

  const currentSortOption = sortOptions.find(opt => opt.key === sortBy) || sortOptions[0];

  const handleSortChange = (newSortBy: string) => {
    if (newSortBy === sortBy) {
      // Se é o mesmo campo, inverte a ordem
      const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      onSortChange?.(sortBy, newOrder);
    } else {
      // Se é um campo diferente, usar ordem lógica por tipo de campo
      let defaultOrder: 'asc' | 'desc' = 'desc';
      
      // Para datas, preços e áreas, ordem decrescente faz mais sentido (mais recente/maior primeiro)
      if (['created_at', 'updated_at', 'price', 'price_rent', 'usable_area', 'total_area'].includes(newSortBy)) {
        defaultOrder = 'desc';
      }
      
      onSortChange?.(newSortBy, defaultOrder);
    }
    setShowSortMenu(false);
  };

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const update = () => {
      const height = Math.round(el.getBoundingClientRect().height || 0);
      try {
        document.documentElement.style.setProperty(
          '--cockpit-height',
          `${height}px`
        );
      } catch (e) {
        // noop
      }
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fechar menu de ordenação ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showSortMenu && !target.closest('.sort-menu-container')) {
        setShowSortMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSortMenu]);

  return (
    <div
      ref={rootRef}
      className="fixed top-16 left-0 right-0 md:left-64 z-30 bg-surface/95 backdrop-blur-xl border-b border-border/50 shadow-soft"
    >
      {/* Accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-brand-yellow dark:bg-brand-yellow-light opacity-70" />
      
      <div className="w-full px-4 md:px-6 py-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          {/* Left section - Title and Stats */}
          <div className="min-w-0 flex-shrink-0">
            <div className="flex items-center gap-6">
              <div className="min-w-0">
                <h2 className="text-2xl font-display font-bold text-brand-navy dark:text-brand-navy-lighter mb-1">
                  Meus Imóveis
                </h2>
                <p className="text-sm text-text-secondary">
                  Gerencie, importe e sincronize suas propriedades
                </p>
              </div>


            </div>
          </div>

          {/* Right section - Search and Actions */}
          <div className="flex items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="flex-1 min-w-0 max-w-md">
              <Input
                icon={<Search className="h-4 w-4" />}
                placeholder="Buscar por título, código, ID ou bairro..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-10 bg-background/50 backdrop-blur-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Sort Menu */}
              <div className="relative sort-menu-container">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    'bg-surface/80 backdrop-blur-sm border border-border/50 hover:border-primary/50 hover:bg-surface',
                    'focus:outline-none focus:ring-2 focus:ring-primary/50',
                    showSortMenu && 'border-primary/50 bg-surface'
                  )}
                >
                  {sortOrder === 'asc' ? (
                    <SortAsc className="h-4 w-4 text-primary" />
                  ) : (
                    <SortDesc className="h-4 w-4 text-primary" />
                  )}
                  <span className="hidden sm:inline text-text-primary">{currentSortOption.label}</span>
                  <ChevronDown className={cn(
                    "h-4 w-4 text-text-secondary transition-transform",
                    showSortMenu && "rotate-180"
                  )} />
                </button>
                
                {showSortMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-surface/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-soft-lg z-50 overflow-hidden animate-fade-in-down">
                    <div className="py-2">
                      {sortOptions.map((option) => (
                        <button
                          key={option.key}
                          onClick={() => handleSortChange(option.key)}
                          className={cn(
                            'w-full text-left px-4 py-2.5 text-sm transition-all duration-200 flex items-center justify-between group',
                            sortBy === option.key 
                              ? 'bg-primary/10 text-primary font-medium' 
                              : 'text-text-primary hover:bg-surface/80'
                          )}
                        >
                          <span>{option.label}</span>
                          {sortBy === option.key && (
                            <span className="flex items-center gap-1">
                              {sortOrder === 'asc' ? (
                                <SortAsc className="h-4 w-4" />
                              ) : (
                                <SortDesc className="h-4 w-4" />
                              )}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                  'bg-surface/80 backdrop-blur-sm border border-border/50 hover:border-primary/50',
                  'focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary cursor-pointer'
                )}
              >
                <option value="">Todos os status</option>
                <option value="imported">Importado</option>
                <option value="pending">Pendente</option>
                <option value="synced">Sincronizado</option>
                <option value="error">Erro</option>
              </select>

              {/* Property Type Filter */}
              {setPropertyTypeFilter && (
                <select
                  value={propertyTypeFilter}
                  onChange={e => setPropertyTypeFilter(e.target.value)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    'bg-surface/80 backdrop-blur-sm border border-border/50 hover:border-primary/50',
                    'focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary cursor-pointer'
                  )}
                >
                  <option value="">Todos os tipos</option>
                  <option value="APARTMENT">Apartamento</option>
                  <option value="HOUSE">Casa</option>
                  <option value="CASA_CONDOMINIO">Casa de Condomínio</option>
                  <option value="CASA_VILA">Casa de Vila</option>
                  <option value="COBERTURA">Cobertura</option>
                  <option value="FAZENDA_SITIO_CHACARA">Fazenda / Sítio / Chácara</option>
                  <option value="FLAT">Flat</option>
                  <option value="KITNET_CONJUGADO">Kitnet / Conjugado</option>
                  <option value="LOFT">Loft</option>
                  <option value="LOTE_TERRENO">Lote / Terreno</option>
                  <option value="PREDIO_EDIFICIO_INTEIRO">Prédio / Edifício Inteiro</option>
                  <option value="STUDIO">Studio</option>
                </select>
              )}

              {/* New Button */}
              <Button 
                variant="accent" 
                size="md" 
                onClick={onNewClick}
                icon={<PlusCircle className="h-4 w-4" />}
                className="font-display shadow-lg hover:shadow-xl"
              >
                <span className="hidden sm:inline">Novo</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Stats - Visible only on small screens */}
        <div className="flex xl:hidden items-center gap-2 mt-4 overflow-x-auto pb-2 scrollbar-hide">
          <StatChip 
            label="Total" 
            value={total} 
            icon={<TrendingUp className="w-3 h-3" />}
            variant="primary"
          />
          <StatChip 
            label="Importados" 
            value={counts.imported}
            icon={<CheckCircle2 className="w-3 h-3" />}
            variant="success"
          />
          <StatChip 
            label="Pendentes" 
            value={counts.pending}
            icon={<Clock className="w-3 h-3" />}
            variant="warning"
          />
          {counts.error > 0 && (
            <StatChip 
              label="Erros" 
              value={counts.error}
              icon={<AlertCircle className="w-3 h-3" />}
              variant="danger"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CockpitBar;