import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Edit, Trash2, AlertCircle, LogIn, Copy } from 'lucide-react';
import { propertiesService } from '@/services/properties.service';
import { formatPrice } from '@/utils/formatters';
import Button from '@/components/ui/Button';
import StatusPill from '@/components/ui/StatusPill';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { PropertyCreateProvider } from '@/contexts/PropertyCreateContext';
import PropertyCreateStepper from '@/components/property/PropertyCreateStepper';
import { useAuth } from '@/contexts/AuthContext';

const PropertyDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRemoteDeleteModal, setShowRemoteDeleteModal] = useState(false);
  const [remoteListingIds, setRemoteListingIds] = useState<string[]>([]);
  const [remoteDeleteLoading, setRemoteDeleteLoading] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const isEditMode = searchParams.get('edit') === 'true';

  // Se estiver em modo de edição mas não autenticado, redirecionar para login
  React.useEffect(() => {
    if (!authLoading && isEditMode && !isAuthenticated) {
      toast.error('Você precisa estar logado para editar imóveis');
      navigate(`/login?redirect=/properties/${id}?edit=true`);
    }
  }, [isEditMode, isAuthenticated, authLoading, navigate, id]);

  const {
    data: property,
    isLoading,
    error,
  } = useQuery({
    // incluir isEditMode no cacheKey para evitar responder com dados públicos quando precisar dos dados completos
    queryKey: ['property', id, isEditMode],
    queryFn: () => propertiesService.getById(Number(id)),
    enabled: !!id && (!isEditMode || isAuthenticated),
  });

  const deleteMutation = useMutation({
    mutationFn: propertiesService.delete,
  });

  const duplicateMutation = useMutation({
    mutationFn: propertiesService.duplicate,
    onSuccess: (data) => {
      toast.success('Imóvel duplicado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      navigate(`/properties/${data.id}`);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao duplicar imóvel.');
    },
  });

  const handleSync = async () => {
    if (!property) return;
    toast
      .promise(propertiesService.syncWithGandalf(property.id), {
        loading: 'Sincronizando...',
        success: 'Propriedade sincronizada com sucesso!',
        error: 'Erro ao sincronizar propriedade',
      })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['properties'] });
      });
  };

  const handleDelete = () => {
    if (!id) return;
    const listingIds = property?.remote_id ? [String(property.remote_id)] : [];
    deleteMutation.mutate(Number(id), {
      onSuccess: () => {
        toast.success('Imóvel excluído localmente!');
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        if (listingIds.length > 0) {
          setRemoteListingIds(listingIds);
          setShowRemoteDeleteModal(true);
        } else {
          navigate('/properties');
        }
      },
      onError: (err: any) => {
        toast.error(err.message || 'Erro ao excluir imóvel.');
      },
    });
  };

  const handleDuplicate = () => {
    if (id) {
      duplicateMutation.mutate(Number(id));
    }
  };

  const confirmRemoteDelete = async () => {
    if (!remoteListingIds || remoteListingIds.length === 0) {
      setShowRemoteDeleteModal(false);
      navigate('/properties');
      return;
    }
    setRemoteDeleteLoading(true);
    try {
      const res = await fetch('/integrations/canalpro/bulk_delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingIds: remoteListingIds }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data && data.success) {
        toast.success('Imóvel excluído do CanalPro com sucesso!');
      } else if (data && data.reason === 'no_credentials') {
        toast.error('Integração com CanalPro não configurada para este tenant.');
      } else {
        const msg = data && data.result && data.result.data && data.result.data.bulkDeleteListing && data.result.data.bulkDeleteListing.message;
        toast.error(msg || 'Falha ao excluir imóvel no CanalPro.');
      }
    } catch (e) {
      toast.error('Erro ao contatar o servidor para exclusão remota.');
    } finally {
      setRemoteDeleteLoading(false);
      setShowRemoteDeleteModal(false);
      navigate('/properties');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se estiver carregando autenticação, mostrar loading
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se estiver em modo de edição mas não autenticado, mostrar mensagem
  if (isEditMode && !isAuthenticated) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <LogIn className="mx-auto h-12 w-12 text-primary" />
        <h3 className="mt-2 text-lg font-semibold text-text-primary">
          Autenticação Necessária
        </h3>
        <p className="mt-1 text-sm">
          Você precisa estar logado para editar imóveis.
        </p>
        <Button
          onClick={() => navigate(`/login?redirect=/properties/${id}?edit=true`)}
          variant="primary"
          className="mt-6"
        >
          Fazer Login
        </Button>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="text-center py-12 text-text-secondary">
        <AlertCircle className="mx-auto h-12 w-12 text-danger" />
        <h3 className="mt-2 text-lg font-semibold text-text-primary">
          Imóvel não encontrado
        </h3>
        <p className="mt-1 text-sm">
          {error?.message ||
            'A propriedade que você está procurando não existe ou foi removida.'}
        </p>
        <Button
          onClick={() => navigate('/properties')}
          variant="primary"
          className="mt-6"
        >
          Voltar para lista
        </Button>
      </div>
    );
  }

  // Se estiver em modo de edição, renderizar o editor
  if (isEditMode) {
    // DIAGNÓSTICO: imprimir payload recebido para investigação de campos faltantes
    // Remover após verificação
    // eslint-disable-next-line no-console
    console.debug('DEBUG property payload for edit mode:', {
      id,
      isEditMode,
      property,
    });
    return (
      <PropertyCreateProvider
        totalSteps={7}
        initialData={property}
        isEditMode={true}
        propertyId={Number(id)}
      >
        <PropertyCreateStepper />
      </PropertyCreateProvider>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/properties')}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {property.title}
            </h1>
            <p className="text-text-secondary">ID: {property.external_id}</p>
            <p className="text-text-secondary">
              Código: {property.property_code ?? 'N/A'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <StatusPill status={property.status} />
          {property.status !== 'synced' && (
            <Button variant="secondary" onClick={handleSync}>
              Sincronizar
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => navigate(`/properties/${property.id}?edit=true`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar
          </Button>
          <Button
            variant="secondary"
            onClick={handleDuplicate}
            loading={duplicateMutation.isPending}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicar
          </Button>
          <Button variant="danger" onClick={() => setShowDeleteModal(true)}>
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="bg-surface rounded-lg border border-border p-6 space-y-6 text-text-secondary">
        <h3 className="text-lg font-semibold text-text-primary">
          Informações Gerais
        </h3>
        <p>
          <strong>Título:</strong> {property.title}
        </p>
        <p>
          <strong>ID Externo:</strong> {property.external_id}
        </p>
        <p>
          <strong>Código do Imóvel:</strong> {property.property_code ?? 'N/A'}
        </p>
        <p>
          <strong>Descrição:</strong> {property.description || 'N/A'}
        </p>

        {property.address && (
          <div className="pt-4 border-t border-border">
            <h3 className="text-lg font-semibold text-text-primary">
              Endereço
            </h3>
            <p>
              <strong>CEP:</strong> {property.address.zip_code || 'N/A'}
            </p>
            <p>
              <strong>Rua:</strong> {property.address.street || 'N/A'},{' '}
              {property.address.number || 'N/A'}
            </p>
            <p>
              <strong>Bairro:</strong> {property.address.neighborhood || 'N/A'}
            </p>
            <p>
              <strong>Cidade/Estado:</strong> {property.address.city || 'N/A'} -{' '}
              {property.address.state || 'N/A'}
            </p>
          </div>
        )}

        {(property.bedrooms ||
          property.bathrooms ||
          property.suites ||
          property.parking_spaces ||
          property.garage_spots ||
          property.total_areas ||
          property.area_total ||
          property.usable_areas ||
          property.area_util) && (
          <div className="pt-4 border-t border-border">
            <h3 className="text-lg font-semibold text-text-primary">
              Detalhes do Imóvel
            </h3>
            {property.bedrooms && (
              <p>
                <strong>Quartos:</strong> {property.bedrooms}
              </p>
            )}
            {property.bathrooms && (
              <p>
                <strong>Banheiros:</strong> {property.bathrooms}
              </p>
            )}
            {property.suites && (
              <p>
                <strong>Suítes:</strong> {property.suites}
              </p>
            )}
            {(property.parking_spaces || property.garage_spots) && (
              <p>
                <strong>Vagas:</strong>{' '}
                {property.parking_spaces || property.garage_spots}
              </p>
            )}
            {(property.total_areas || property.area_total) && (
              <p>
                <strong>Área Total:</strong>{' '}
                {property.total_areas || property.area_total} m²
              </p>
            )}
            {(property.usable_areas || property.area_util) && (
              <p>
                <strong>Área Útil:</strong>{' '}
                {property.usable_areas || property.area_util} m²
              </p>
            )}
          </div>
        )}

        {(property.price_sale ||
          property.price_rent ||
          property.condo_fee ||
          property.iptu) && (
          <div className="pt-4 border-t border-border">
            <h3 className="text-lg font-semibold text-text-primary">Valores</h3>
            {property.price_sale && (
              <p>
                <strong>Preço de Venda:</strong>{' '}
                {formatPrice(property.price_sale)}
              </p>
            )}
            {property.price_rent && (
              <p>
                <strong>Preço de Aluguel:</strong>{' '}
                {formatPrice(property.price_rent)}
              </p>
            )}
            {property.condo_fee && (
              <p>
                <strong>Condomínio:</strong> {formatPrice(property.condo_fee)}
              </p>
            )}
            {property.iptu && (
              <p>
                <strong>IPTU:</strong> {formatPrice(property.iptu)}
              </p>
            )}
          </div>
        )}

        {property.owner && (
          <div className="pt-4 border-t border-border">
            <h3 className="text-lg font-semibold text-text-primary">
              Informações do Proprietário
            </h3>
            <p>
              <strong>Nome:</strong> {property.owner.owner_name || 'N/A'}
            </p>
            <p>
              <strong>Contato:</strong> {property.owner.owner_contact || 'N/A'}
            </p>
          </div>
        )}

        {property.image_urls && property.image_urls.length > 0 && (
          <div className="pt-4 border-t border-border">
            <h3 className="text-lg font-semibold text-text-primary">
              Imagens ({property.image_urls.length})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-2">
              {property.image_urls.map((url: string, index: number) => (
                <img
                  key={index}
                  src={url}
                  alt={`${property.title} - Imagem ${index + 1}`}
                  className="w-full h-32 object-cover rounded-md border border-border"
                />
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-border text-sm">
          <p>
            <strong>Criado em:</strong>{' '}
            {new Date(property.created_at).toLocaleDateString('pt-BR')}
          </p>
          <p>
            <strong>Última atualização:</strong>{' '}
            {new Date(property.updated_at).toLocaleDateString('pt-BR')}
          </p>
          {property.remote_id && (
            <p>
              <strong>ID Remoto:</strong> {property.remote_id}
            </p>
          )}
          {property.error && (
            <p className="text-danger">
              <strong>Erro:</strong> {property.error}
            </p>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Tem certeza que deseja excluir o imóvel{' '}
            <span className="font-semibold text-text-primary">
              {property.title}
            </span>
            ? Esta ação não pode ser desfeita.
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => setShowDeleteModal(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              loading={deleteMutation.isPending}
            >
              Excluir
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remote Delete Modal (após exclusão local) */}
      <Modal
        isOpen={showRemoteDeleteModal}
        onClose={() => { setShowRemoteDeleteModal(false); navigate('/properties'); }}
        title="Excluir também no CanalPro?"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            O imóvel possui ID remoto vinculado ao CanalPro:
          </p>
          <ul className="list-disc list-inside text-text-primary">
            {remoteListingIds.map((rid) => (
              <li key={rid}>{rid}</li>
            ))}
          </ul>
          <p className="text-text-secondary">Deseja excluir este(s) listing(s) também no CanalPro?</p>
          <div className="flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => { setShowRemoteDeleteModal(false); navigate('/properties'); }}
            >
              Não
            </Button>
            <Button
              variant="danger"
              onClick={confirmRemoteDelete}
              loading={remoteDeleteLoading}
            >
              Excluir no CanalPro
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PropertyDetailPage;
