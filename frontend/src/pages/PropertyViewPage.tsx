import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Share2, Heart, Edit, Trash2 } from 'lucide-react';
import { Property } from '@/types';
import { formatPrice, formatDate } from '@/utils/formatters';
import StatusPill from '@/components/ui/StatusPill';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { useConfirm } from '@/hooks/useConfirm';
import { FEATURES_MAP, CONDO_FEATURES } from '@/constants/condoFeatures';
import { propertiesService } from '@/services/properties.service';
import toast from 'react-hot-toast';

const SobreCard: React.FC<{ property: Property | null }> = ({ property }) => (
  <div className="p-6">
    <h3 className="text-lg font-semibold mb-4 text-text-primary">
      Sobre o imóvel
    </h3>
    {!property ? (
      <p className="text-text-secondary">Nenhuma informação disponível.</p>
    ) : (
      <div className="space-y-3 text-text-secondary">
        <p className="text-text-primary">
          <strong>Título:</strong> {property.title || '—'}
        </p>
        <p>
          <strong>Descrição:</strong> {property.description || '—'}
        </p>
        <p>
          <strong>ID Externo:</strong> {property.external_id || '—'}
        </p>
        <p>
          <strong>Código do Imóvel:</strong> {property.property_code || '—'}
        </p>
        <div className="flex items-center gap-2">
          <strong>Status:</strong> <StatusPill status={property.status} />
        </div>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {property.bedrooms !== undefined && (
            <div>
              <strong>Dormitórios:</strong>
              <div>{property.bedrooms}</div>
            </div>
          )}
          {property.bathrooms !== undefined && (
            <div>
              <strong>Banheiros:</strong>
              <div>{property.bathrooms}</div>
            </div>
          )}
          {property.suites !== undefined && (
            <div>
              <strong>Suítes:</strong>
              <div>{property.suites}</div>
            </div>
          )}
          {(property.parking_spaces !== undefined ||
            property.garage_spots !== undefined) && (
            <div>
              <strong>Vagas:</strong>
              <div>
                {property.parking_spaces ?? property.garage_spots ?? '—'}
              </div>
            </div>
          )}
          {property.area_util && (
            <div>
              <strong>Área útil:</strong>
              <div>{property.area_util} m²</div>
            </div>
          )}
          {property.area_total && (
            <div>
              <strong>Área total:</strong>
              <div>{property.area_total} m²</div>
            </div>
          )}
        </div>
      </div>
    )}
  </div>
);

const EmpreendimentoCard: React.FC<{ property: Property | null }> = ({
  property,
}) => {
  if (!property) {
    return (
      <div className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-text-primary">
          Empreendimento
        </h3>
        <p className="text-text-secondary">
          Nenhuma informação de empreendimento cadastrada.
        </p>
      </div>
    );
  }

  const condo = (property as any).condominium as any;

  // Debug temporário para diagnóstico
  console.log('DEBUG EmpreendimentoCard data:', {
    property,
    condo,
    building_name: (property as any)?.building_name,
    floors: (property as any)?.floors,
    units_on_floor: (property as any)?.units_on_floor,
    buildings: (property as any)?.buildings
  });

  const name =
    condo?.nome ??
    (property as any).building_name ??
    null;

  const floors =
    condo?.informacoes?.andares ??
    (property as any).floors ??
    null;

  const unitsOnFloor =
    condo?.informacoes?.unidadesPorAndar ??
    (property as any).units_on_floor ??
    null;

  const blocks =
    condo?.informacoes?.blocos ??
    (property as any).buildings ??
    null;

  const unitFloor =
    (property as any).unit_floor ??
    null;

  // Removido: variável 'unit' não utilizada

  // Removido: variável 'block' não utilizada

  const delivery =
    condo?.informacoes?.entregaEm ??
    (property as any).delivery_at ??
    null;

  const features: string[] =
    (property as any).condo_features ??
    condo?.informacoes?.caracteristicas ??
    [];

  const customFeatures: string | undefined =
    (property as any).custom_condo_features ??
    condo?.informacoes?.caracteristicasPersonalizadas ??
    null;

  const buildingAddress =
    condo?.endereco ?? (property as any).building_address ?? null;

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4 text-text-primary">
        Empreendimento
      </h3>

      {/* Sempre renderizar os campos do empreendimento — mostrar valor ou '—' quando ausente */}
      <div className="space-y-4 text-text-secondary">
        <p>
          <strong>Nome do empreendimento:</strong> {name ?? '—'}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <strong>Nº de andares:</strong>
            <div>{floors !== undefined && floors !== null ? floors : '—'}</div>
          </div>

          <div>
            <strong>Unidades por andar:</strong>
            <div>
              {unitsOnFloor !== undefined && unitsOnFloor !== null
                ? unitsOnFloor
                : '—'}
            </div>
          </div>

          <div>
            <strong>Nº de blocos/torres:</strong>
            <div>{blocks !== undefined && blocks !== null ? blocks : '—'}</div>
          </div>

          <div>
            <strong>Andar da unidade:</strong>
            <div>{unitFloor !== undefined && unitFloor !== null ? unitFloor : '—'}</div>
          </div>
        </div>

        {delivery && (
          <p>
            <strong>Previsão de entrega:</strong>{' '}
            {delivery ? (formatDate ? formatDate(delivery) : delivery) : '—'}
          </p>
        )}

        {buildingAddress && (
          (buildingAddress.endereco || buildingAddress.street || buildingAddress.street_address || buildingAddress.cep || buildingAddress.bairro || buildingAddress.cidade) ? (
            <div>
              <h4 className="font-medium text-text-primary">Endereço do empreendimento</h4>
              <p>
                {buildingAddress.endereco || buildingAddress.street || buildingAddress.street_address || '—'}
              </p>
              {buildingAddress.cep && <p>CEP: {buildingAddress.cep}</p>}
              {buildingAddress.bairro && <p>{buildingAddress.bairro}</p>}
              { (buildingAddress.cidade || buildingAddress.estado) && (
                <p>
                  {buildingAddress.cidade || '—'}
                  {buildingAddress.estado ? ` / ${buildingAddress.estado}` : ''}
                </p>
              )}
            </div>
          ) : null
        )}

        <div>
          <h4 className="font-medium text-text-primary mb-2">Comodidades</h4>
          {features && features.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {features.map(f => (
                <span key={f} className="text-xs px-2 py-1 bg-surface border border-border rounded-full">
                  {FEATURES_MAP[f] ?? f}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary">—</p>
          )}
        </div>

        <div>
          <h4 className="font-medium text-text-primary mb-1">Outras comodidades</h4>
          <p className="text-text-secondary">{customFeatures ?? '—'}</p>
        </div>
      </div>

      {/* Lista de referência de comodidades: sempre visível no card */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-text-primary mb-2">
          Comodidades (referência)
        </h4>
        <div className="flex flex-wrap gap-2">
          {CONDO_FEATURES.map(f => (
            <span
              key={f.id}
              className="text-xs px-2 py-1 bg-surface border border-border rounded-full"
            >
              {f.name}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

const EnderecoCard: React.FC<{ property: Property | null }> = ({
  property,
}) => (
  <div className="p-6">
    <h3 className="text-lg font-semibold mb-4 text-text-primary">Endereço</h3>
    {!property ? (
      <p className="text-text-secondary">Endereço não cadastrado.</p>
    ) : property.address ? (
      <div className="space-y-2 text-text-secondary">
        <p>
          <strong>Rua:</strong> {property.address.street || '—'}
          {property.address.number ? `, ${property.address.number}` : ''}
        </p>
        <p>
          <strong>Bairro:</strong> {property.address.neighborhood || '—'}
        </p>
        <p>
          <strong>Cidade / Estado:</strong> {property.address.city || '—'}{' '}
          {property.address.state ? `/ ${property.address.state}` : ''}
        </p>
        {property.address.zip_code && (
          <p>
            <strong>CEP:</strong> {property.address.zip_code}
          </p>
        )}
        {property.coordinates &&
          (property.coordinates.latitude || property.coordinates.longitude) && (
            <p>
              <strong>Coordenadas:</strong>{' '}
              {property.coordinates.latitude || '—'},{' '}
              {property.coordinates.longitude || '—'}
            </p>
          )}
      </div>
    ) : (
      <p className="text-text-secondary">Endereço não cadastrado.</p>
    )}
  </div>
);

const ValoresCard: React.FC<{ property: Property | null }> = ({ property }) => {
  const condoFeeVal = property?.condominium?.condo_fee ?? property?.condo_fee;
  const iptuVal = property?.condominium?.iptu ?? property?.iptu;
  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4 text-text-primary">Valores</h3>
      {!property ? (
        <p className="text-text-secondary">
          Nenhuma informação de valores cadastrada.
        </p>
      ) : (
        <div className="space-y-2 text-text-secondary">
          <p>
            <strong>Venda:</strong>{' '}
            {property.price_sale !== undefined
              ? formatPrice(property.price_sale)
              : '—'}
          </p>
          <p>
            <strong>Aluguel:</strong>{' '}
            {property.price_rent !== undefined
              ? formatPrice(property.price_rent)
              : '—'}
          </p>
          {condoFeeVal !== undefined && (
            <p>
              <strong>Condomínio:</strong> {formatPrice(condoFeeVal)}
            </p>
          )}
          {iptuVal !== undefined && (
            <p>
              <strong>IPTU:</strong> {formatPrice(iptuVal)}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const FotosCard: React.FC<{ property: Property | null }> = ({ property }) => {
  const vt =
    property?.virtual_tour_link ??
    (property as any)?.condominium?.virtual_tour_link ??
    (property as any)?.virtualTour ??
    (property as any)?.videos ??
    null;
  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-4 text-text-primary">
        Fotos e Vídeos
      </h3>
      {!property ? (
        <p className="text-text-secondary">Nenhuma mídia cadastrada.</p>
      ) : (
        <>
          {property.image_urls && property.image_urls.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {property.image_urls.map((url, i) => (
                <div key={i} className="group relative">
                  <img
                    src={url}
                    alt={`${property.title} ${i + 1}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary">Nenhuma mídia cadastrada.</p>
          )}

          {/* vídeos, tour virtual */}
          {vt && (
            <div className="mt-4">
              <h4 className="font-medium text-text-primary mb-2">
                Tour virtual
              </h4>
              <a
                href={vt}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                Abrir tour virtual
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
};

const PropertyViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Hook de confirmação moderna
  const confirm = useConfirm();

  const handleDelete = async () => {
    if (!id) return;
    
    const confirmed = await confirm.showConfirm({
      title: 'Excluir Imóvel?',
      message: 'Tem certeza que deseja excluir este imóvel? Esta ação não pode ser desfeita.',
      confirmText: 'Sim, Excluir',
      cancelText: 'Cancelar',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      setDeleting(true);
      await propertiesService.delete(Number(id));
      toast.success('Imóvel excluído com sucesso!');
      navigate('/properties');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir imóvel.');
    } finally {
      setDeleting(false);
    }
  };
  // Usaremos layout de página única com cards; não precisamos de estado de abas

  useEffect(() => {
    const loadProperty = async () => {
      if (!id) return;

      try {
        setLoading(true);
        // Usando rota pública
        const apiUrl = import.meta.env.VITE_API_URL || 'https://api.quadradois.com.br';
        const response = await fetch(
          `${apiUrl}/properties/public/${id}`
        );
        if (!response.ok) {
          throw new Error('Imóvel não encontrado');
        }
        const data = await response.json();
        setProperty(data);
      } catch (err) {
        console.error('Erro ao carregar imóvel:', String(err));
        setError('Erro ao carregar dados do imóvel');
      } finally {
        setLoading(false);
      }
    };

    loadProperty();
  }, [id]);

  if (loading) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* COCKPIT PADRONIZADO - 80px */}
        <header className="fixed top-16 left-0 right-0 md:left-64 z-30 bg-surface border-b border-border h-20 flex items-center shadow-sm">
          <div className="w-full px-4 md:px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/properties')}
                className="flex items-center text-text-secondary hover:text-text-primary transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="animate-pulse">
                <div className="h-5 bg-surface rounded w-48 mb-1"></div>
                <div className="h-3 bg-surface rounded w-32"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo principal */}
        <main className="flex-1 min-h-0 px-6 py-4 overflow-auto">
          <div className="animate-pulse space-y-4">
            <div className="flex space-x-2 mb-6">
              <div className="h-8 bg-surface rounded w-24"></div>
              <div className="h-8 bg-surface rounded w-20"></div>
              <div className="h-8 bg-surface rounded w-16"></div>
            </div>
            <div className="bg-surface rounded-lg h-64"></div>
            <div className="space-y-2">
              <div className="h-4 bg-surface rounded w-3/4"></div>
              <div className="h-4 bg-surface rounded w-1/2"></div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* COCKPIT PADRONIZADO - 80px */}
        <header className="fixed top-16 left-0 right-0 md:left-64 z-30 bg-surface border-b border-border h-20 flex items-center shadow-sm">
          <div className="w-full px-4 md:px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/properties')}
                className="flex items-center text-text-secondary hover:text-text-primary transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-text-primary">
                  Imóvel não encontrado
                </h1>
              </div>
            </div>
          </div>
        </header>

        {/* Conteúdo principal */}
        <main className="flex-1 min-h-0 px-6 py-4 overflow-auto flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🏠</div>
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              Imóvel não encontrado
            </h1>
            <p className="text-text-secondary mb-4">
              {error ||
                'O imóvel que você está procurando não existe ou foi removido.'}
            </p>
            <button
              onClick={() => navigate('/properties')}
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Voltar para Imóveis
            </button>
          </div>
        </main>
      </div>
    );
  }

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

              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-text-primary truncate">
                  {property.title}
                </h1>
                <div className="flex items-center space-x-2">
                  <StatusPill status={property.status} />
                  <span className="text-xs text-text-secondary">
                    #{property.external_id}
                  </span>
                </div>
              </div>
            </div>

            {/* Lado direito */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-background rounded-lg transition-colors">
                <Heart className="w-4 h-4" />
              </button>
              <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-background rounded-lg transition-colors">
                <Share2 className="w-4 h-4" />
              </button>
              <button className="bg-primary text-white px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-colors flex items-center text-sm">
                <Edit className="w-3 h-3 mr-1.5" />
                Editar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors flex items-center text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3 h-3 mr-1.5" />
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="flex-1 min-h-0 px-6 py-4 overflow-auto">
        {/* Página única com blocos (cards) para cada seção */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <SobreCard property={property} />
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <EmpreendimentoCard property={property} />
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <EnderecoCard property={property} />
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <ValoresCard property={property} />
          </div>

          <div className="bg-card border border-border rounded-lg overflow-hidden">
            <FotosCard property={property} />
          </div>
        </div>
      </main>

      {/* Modal de Confirmação Moderna */}
      <ConfirmModal
        isOpen={confirm.isOpen}
        onClose={confirm.handleClose}
        onConfirm={confirm.handleConfirm}
        title={confirm.options.title}
        message={confirm.options.message}
        confirmText={confirm.options.confirmText}
        cancelText={confirm.options.cancelText}
        variant={confirm.options.variant}
      />
    </div>
  );
};

export default PropertyViewPage;
