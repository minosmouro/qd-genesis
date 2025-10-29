import React, { useState } from 'react';
import { X, Building2, MapPin, Info } from 'lucide-react';
import { empreendimentosService, CreateEmpreendimentoRequest, Empreendimento } from '@/services/empreendimentos.service';

interface EmpreendimentoQuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (empreendimento: Empreendimento) => void;
  initialData?: {
    cep?: string;
    endereco?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
  };
}

const EmpreendimentoQuickCreateModal: React.FC<EmpreendimentoQuickCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    cep: initialData?.cep || '',
    endereco: initialData?.endereco || '',
    numero: '',
    bairro: initialData?.bairro || '',
    cidade: initialData?.cidade || '',
    estado: initialData?.estado || '',
    andares: '',
    unidadesPorAndar: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome || !formData.cep || !formData.bairro || !formData.cidade) {
      setError('Preencha os campos obrigatórios');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: CreateEmpreendimentoRequest = {
        nome: formData.nome,
        endereco: {
          cep: formData.cep,
          endereco: formData.endereco,
          numero: formData.numero || undefined,
          bairro: formData.bairro,
          cidade: formData.cidade,
          estado: formData.estado,
        },
        informacoes: {
          andares: formData.andares ? parseInt(formData.andares) : undefined,
          unidadesPorAndar: formData.unidadesPorAndar ? parseInt(formData.unidadesPorAndar) : undefined,
        },
      };

      const novoEmpreendimento = await empreendimentosService.create(payload);
      onSuccess(novoEmpreendimento);
      onClose();
    } catch (err: any) {
      console.error('Erro ao criar empreendimento:', err);
      setError(err.message || 'Erro ao criar empreendimento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">Cadastro Rápido de Empreendimento</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Cadastro Rápido</p>
              <p>Preencha apenas as informações básicas. Você poderá adicionar mais detalhes depois.</p>
            </div>
          </div>

          {/* Nome do Empreendimento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Empreendimento/Condomínio *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => handleChange('nome', e.target.value)}
              placeholder="Ex: Residencial Parque das Flores"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              required
            />
          </div>

          {/* Endereço */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-700">
              <MapPin className="w-5 h-5" />
              <h3 className="font-medium">Endereço</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CEP *
                </label>
                <input
                  type="text"
                  value={formData.cep}
                  onChange={(e) => handleChange('cep', e.target.value)}
                  placeholder="12345-678"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número
                </label>
                <input
                  type="text"
                  value={formData.numero}
                  onChange={(e) => handleChange('numero', e.target.value)}
                  placeholder="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logradouro
              </label>
              <input
                type="text"
                value={formData.endereco}
                onChange={(e) => handleChange('endereco', e.target.value)}
                placeholder="Rua das Flores"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bairro *
                </label>
                <input
                  type="text"
                  value={formData.bairro}
                  onChange={(e) => handleChange('bairro', e.target.value)}
                  placeholder="Centro"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cidade *
                </label>
                <input
                  type="text"
                  value={formData.cidade}
                  onChange={(e) => handleChange('cidade', e.target.value)}
                  placeholder="São Paulo"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estado *
              </label>
              <input
                type="text"
                value={formData.estado}
                onChange={(e) => handleChange('estado', e.target.value.toUpperCase())}
                placeholder="SP"
                maxLength={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                required
              />
            </div>
          </div>

          {/* Informações do Prédio (Opcional) */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">Informações do Prédio (Opcional)</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Andares
                </label>
                <input
                  type="number"
                  value={formData.andares}
                  onChange={(e) => handleChange('andares', e.target.value)}
                  placeholder="10"
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unidades por Andar
                </label>
                <input
                  type="number"
                  value={formData.unidadesPorAndar}
                  onChange={(e) => handleChange('unidadesPorAndar', e.target.value)}
                  placeholder="4"
                  min="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Cadastrando...' : 'Cadastrar Empreendimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmpreendimentoQuickCreateModal;
