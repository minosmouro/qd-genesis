import React, { useState, useEffect } from 'react';
import { errorLog } from '@/utils/logger';
import {
  CheckCircle,
  XCircle,
  Building,
  User,
  Calendar,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';
import { empreendimentosService } from '@/services/empreendimentos.service';

interface Suggestion {
  id: number;
  empreendimento_id: number;
  empreendimento_nome: string;
  suggested_changes: any;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  suggested_by: {
    tenant_id: number;
    user_id: number;
  };
  created_at: string;
  reviewed_at?: string;
  review_notes?: string;
}

const SuggestionsAdminDashboard: React.FC = () => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [reviewNotes, setReviewNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, [filter]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const result = await empreendimentosService.listSuggestions(filter, 1, 50);
      setSuggestions(result.data);
    } catch (error: any) {
      errorLog('Erro ao carregar sugestões:', error);
      alert(error.message || 'Erro ao carregar sugestões');
    } finally {
      setLoading(false);
    }
  };

  const openReviewModal = (suggestion: Suggestion, action: 'approve' | 'reject') => {
    setSelectedSuggestion(suggestion);
    setReviewAction(action);
    setReviewNotes('');
    setShowReviewModal(true);
  };

  const handleReview = async () => {
    if (!selectedSuggestion) return;

    if (reviewAction === 'reject' && !reviewNotes.trim()) {
      alert('Por favor, informe o motivo da rejeição.');
      return;
    }

    setProcessing(true);
    try {
      if (reviewAction === 'approve') {
        await empreendimentosService.approveSuggestion(
          selectedSuggestion.id,
          reviewNotes || 'Aprovado'
        );
      } else {
        await empreendimentosService.rejectSuggestion(
          selectedSuggestion.id,
          reviewNotes
        );
      }

      alert(
        reviewAction === 'approve'
          ? '✅ Sugestão aprovada com sucesso!'
          : '❌ Sugestão rejeitada'
      );

      setShowReviewModal(false);
      loadSuggestions();
    } catch (error: any) {
      alert(error.message || 'Erro ao processar sugestão');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderChanges = (changes: any) => {
    const items: string[] = [];

    if (changes.nome) items.push(`Nome: "${changes.nome}"`);
    if (changes.endereco) {
      if (changes.endereco.bairro) items.push(`Bairro: "${changes.endereco.bairro}"`);
      if (changes.endereco.cidade) items.push(`Cidade: "${changes.endereco.cidade}"`);
    }
    if (changes.informacoes) {
      if (changes.informacoes.andares) items.push(`Andares: ${changes.informacoes.andares}`);
      if (changes.informacoes.unidadesPorAndar)
        items.push(`Unidades/Andar: ${changes.informacoes.unidadesPorAndar}`);
      if (changes.informacoes.blocos) items.push(`Blocos: ${changes.informacoes.blocos}`);
    }

    return items;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            Sugestões de Edição de Empreendimentos
          </h1>
          <p className="text-text-secondary">
            Analise e aprove/rejeite alterações sugeridas pelos corretores
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? 'bg-primary text-white'
                  : 'bg-surface text-text-secondary hover:bg-surface-hover'
              }`}
            >
              {status === 'pending' && '⏳ Pendentes'}
              {status === 'approved' && '✅ Aprovadas'}
              {status === 'rejected' && '❌ Rejeitadas'}
              {status === 'all' && '📋 Todas'}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && suggestions.length === 0 && (
          <div className="text-center py-12">
            <AlertCircle className="w-16 h-16 text-text-secondary mx-auto mb-4" />
            <p className="text-text-secondary">Nenhuma sugestão encontrada</p>
          </div>
        )}

        {/* Suggestions List */}
        {!loading && suggestions.length > 0 && (
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="bg-surface border border-border rounded-lg p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Building className="w-5 h-5 text-primary flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold text-text-primary">
                        {suggestion.empreendimento_nome}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        ID: {suggestion.empreendimento_id}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      suggestion.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : suggestion.status === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {suggestion.status === 'pending' && '⏳ Pendente'}
                    {suggestion.status === 'approved' && '✅ Aprovada'}
                    {suggestion.status === 'rejected' && '❌ Rejeitada'}
                  </span>
                </div>

                {/* Changes */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-text-primary mb-2">
                    Alterações Sugeridas:
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-sm text-text-secondary">
                    {renderChanges(suggestion.suggested_changes).map((change, idx) => (
                      <li key={idx}>{change}</li>
                    ))}
                  </ul>
                </div>

                {/* Reason */}
                {suggestion.reason && (
                  <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <MessageSquare className="w-4 h-4 inline mr-1" />
                      <strong>Justificativa:</strong> {suggestion.reason}
                    </p>
                  </div>
                )}

                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-text-secondary mb-4">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Tenant ID: {suggestion.suggested_by.tenant_id}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(suggestion.created_at)}
                  </span>
                </div>

                {/* Review Notes (if reviewed) */}
                {suggestion.review_notes && (
                  <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-sm text-gray-800">
                      <strong>Comentário do Admin:</strong> {suggestion.review_notes}
                    </p>
                    {suggestion.reviewed_at && (
                      <p className="text-xs text-gray-600 mt-1">
                        Revisado em: {formatDate(suggestion.reviewed_at)}
                      </p>
                    )}
                  </div>
                )}

                {/* Actions (only for pending) */}
                {suggestion.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => openReviewModal(suggestion, 'approve')}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aprovar
                    </button>
                    <button
                      onClick={() => openReviewModal(suggestion, 'reject')}
                      className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Rejeitar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedSuggestion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-background border border-border rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                {reviewAction === 'approve' ? '✅ Aprovar Sugestão' : '❌ Rejeitar Sugestão'}
              </h3>

              <p className="text-sm text-text-secondary mb-4">
                Empreendimento: <strong>{selectedSuggestion.empreendimento_nome}</strong>
              </p>

              <label className="block text-sm font-medium text-text-primary mb-2">
                {reviewAction === 'approve' ? 'Comentário (opcional)' : 'Motivo da Rejeição *'}
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                required={reviewAction === 'reject'}
                className="w-full px-4 py-2 border border-border bg-background text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                placeholder={
                  reviewAction === 'approve'
                    ? 'Adicione um comentário sobre a aprovação...'
                    : 'Explique por que esta sugestão foi rejeitada...'
                }
              />

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowReviewModal(false)}
                  disabled={processing}
                  className="flex-1 px-4 py-2 border border-border text-text-primary rounded-lg hover:bg-surface transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReview}
                  disabled={processing}
                  className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center gap-2 ${
                    reviewAction === 'approve'
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-red-500 hover:bg-red-600'
                  }`}
                >
                  {processing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processando...
                    </>
                  ) : (
                    <>
                      {reviewAction === 'approve' ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Confirmar Aprovação
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          Confirmar Rejeição
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuggestionsAdminDashboard;
