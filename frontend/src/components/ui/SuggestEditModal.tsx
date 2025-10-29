import React, { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';
import {
  empreendimentosService,
  Empreendimento,
  CreateEmpreendimentoRequest,
} from '@/services/empreendimentos.service';

interface SuggestEditModalProps {
  empreendimento: Empreendimento;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SuggestEditModal: React.FC<SuggestEditModalProps> = ({
  empreendimento,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Estados dos campos editáveis
  const [nome, setNome] = useState(empreendimento.nome);
  const [bairro, setBairro] = useState(empreendimento.endereco.bairro);
  const [cidade, setCidade] = useState(empreendimento.endereco.cidade);
  const [andares, setAndares] = useState(
    empreendimento.informacoes.andares?.toString() || ''
  );
  const [unidadesPorAndar, setUnidadesPorAndar] = useState(
    empreendimento.informacoes.unidadesPorAndar?.toString() || ''
  );
  const [blocos, setBlocos] = useState(
    empreendimento.informacoes.blocos?.toString() || ''
  );
  const [reason, setReason] = useState('');

  // Verifica se houve alterações
  const hasChanges = () => {
    return (
      nome !== empreendimento.nome ||
      bairro !== empreendimento.endereco.bairro ||
      cidade !== empreendimento.endereco.cidade ||
      andares !== (empreendimento.informacoes.andares?.toString() || '') ||
      unidadesPorAndar !==
        (empreendimento.informacoes.unidadesPorAndar?.toString() || '') ||
      blocos !== (empreendimento.informacoes.blocos?.toString() || '')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!hasChanges()) {
      setError('Nenhuma alteração foi feita.');
      return;
    }

    if (!reason.trim()) {
      setError('Por favor, justifique a alteração sugerida.');
      return;
    }

    setLoading(true);

    try {
      // Monta apenas os campos que foram alterados
      const suggestedChanges: Partial<CreateEmpreendimentoRequest> = {};

      if (nome !== empreendimento.nome) {
        suggestedChanges.nome = nome;
      }

      if (
        bairro !== empreendimento.endereco.bairro ||
        cidade !== empreendimento.endereco.cidade
      ) {
        suggestedChanges.endereco = {
          ...empreendimento.endereco,
          bairro: bairro,
          cidade: cidade,
        };
      }

      const andaresNum = andares ? parseInt(andares) : undefined;
      const unidadesNum = unidadesPorAndar
        ? parseInt(unidadesPorAndar)
        : undefined;
      const blocosNum = blocos ? parseInt(blocos) : undefined;

      if (
        andaresNum !== empreendimento.informacoes.andares ||
        unidadesNum !== empreendimento.informacoes.unidadesPorAndar ||
        blocosNum !== empreendimento.informacoes.blocos
      ) {
        suggestedChanges.informacoes = {
          ...empreendimento.informacoes,
          andares: andaresNum,
          unidadesPorAndar: unidadesNum,
          blocos: blocosNum,
        };
      }

      await empreendimentosService.suggestEdit(
        empreendimento.id,
        suggestedChanges,
        reason
      );

      setSuccess(true);
      setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar sugestão');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-background border border-border rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">
              Sugerir Edição
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {empreendimento.nome}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Message */}
        {success && (
          <div className="m-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 font-medium">
              ✅ Sugestão enviada com sucesso!
            </p>
            <p className="text-green-600 text-sm mt-1">
              Aguarde a análise do administrador.
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="m-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              💡 <strong>Importante:</strong> Suas alterações serão analisadas
              por um administrador antes de serem aplicadas.
            </p>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Nome do Empreendimento
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-4 py-2 border border-border bg-background text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="Nome do empreendimento"
            />
          </div>

          {/* Localização */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Bairro
              </label>
              <input
                type="text"
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                className="w-full px-4 py-2 border border-border bg-background text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Cidade
              </label>
              <input
                type="text"
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                className="w-full px-4 py-2 border border-border bg-background text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Informações Estruturais */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-3">
              Informações Estruturais
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  Andares
                </label>
                <input
                  type="number"
                  value={andares}
                  onChange={(e) => setAndares(e.target.value)}
                  min="0"
                  className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  Unidades/Andar
                </label>
                <input
                  type="number"
                  value={unidadesPorAndar}
                  onChange={(e) => setUnidadesPorAndar(e.target.value)}
                  min="0"
                  className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1">
                  Blocos
                </label>
                <input
                  type="number"
                  value={blocos}
                  onChange={(e) => setBlocos(e.target.value)}
                  min="0"
                  className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Justificativa */}
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Justificativa <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
              className="w-full px-4 py-2 border border-border bg-background text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              placeholder="Por que estas informações devem ser alteradas? (ex: Informações desatualizadas, condomínio passou por reforma, etc.)"
            />
            <p className="text-xs text-text-secondary mt-1">
              Explique o motivo da alteração para facilitar a análise do
              administrador.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-border text-text-primary rounded-lg hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !hasChanges() || success}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Enviar Sugestão
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SuggestEditModal;
