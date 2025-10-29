import React, { useState, useEffect } from 'react';
import { Building2, Plus, Search, MapPin, Users, CheckCircle2 } from 'lucide-react';
import { empreendimentosService, Empreendimento } from '@/services/empreendimentos.service';

interface EmpreendimentoSelectorProps {
  cep?: string;
  bairro?: string;
  cidade?: string;
  selectedEmpreendimentoId?: number | null;
  onSelect: (empreendimento: Empreendimento | null) => void;
  onCreateNew: () => void;
}

const EmpreendimentoSelector: React.FC<EmpreendimentoSelectorProps> = ({
  cep,
  bairro,
  cidade,
  selectedEmpreendimentoId,
  onSelect,
  onCreateNew,
}) => {
  const [sugestoes, setSugestoes] = useState<Empreendimento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Empreendimento | null>(null);
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [manualQuery, setManualQuery] = useState('');

  // Buscar empreendimentos próximos quando CEP/bairro mudar
  useEffect(() => {
    if (cep || bairro) {
      buscarEmpreendimentosProximos();
    }
  }, [cep, bairro, cidade]);

  // Carregar empreendimento selecionado se houver ID
  useEffect(() => {
    if (selectedEmpreendimentoId && !selected) {
      carregarEmpreendimentoSelecionado(selectedEmpreendimentoId);
    }
  }, [selectedEmpreendimentoId]);

  const buscarEmpreendimentosProximos = async () => {
    if (!cep && !bairro) return;

    setLoading(true);
    setError(null);

    try {
      const encontrados = await empreendimentosService.buscarProximos(
        cep,
        bairro,
        cidade
      );

      setSugestoes(encontrados);
    } catch (err) {
      console.error('Erro ao buscar empreendimentos próximos:', err);
      setError('Erro ao buscar empreendimentos. Tente novamente.');
      setSugestoes([]);
    } finally {
      setLoading(false);
    }
  };

  const carregarEmpreendimentoSelecionado = async (id: number) => {
    try {
      const emp = await empreendimentosService.getById(id);
      if (emp) {
        setSelected(emp);
      }
    } catch (err) {
      console.error('Erro ao carregar empreendimento:', err);
    }
  };

  const handleSelect = (emp: Empreendimento) => {
    setSelected(emp);
    onSelect(emp);
  };

  const handleDeselect = () => {
    setSelected(null);
    onSelect(null);
  };

  const handleManualSearch = async () => {
    if (!manualQuery.trim()) return;

    setLoading(true);
    try {
      const resultados = await empreendimentosService.searchByName(manualQuery);
      setSugestoes(resultados);
      setError(null);
      setShowManualSearch(false);
    } catch (err) {
      console.error('Erro na busca manual:', err);
      setError('Erro ao buscar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Se já tem um empreendimento selecionado, mostrar card de confirmação
  if (selected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Empreendimento/Condomínio
          </h3>
          <button
            onClick={handleDeselect}
            className="text-sm text-primary hover:underline"
          >
            Alterar
          </button>
        </div>

        <div className="p-4 border-2 border-primary bg-primary/5 rounded-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <h4 className="font-semibold text-lg">{selected.nome}</h4>
              </div>
              
              <div className="space-y-1 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {selected.endereco.endereco}
                    {selected.endereco.numero && `, ${selected.endereco.numero}`}
                    {' - '}
                    {selected.endereco.bairro}, {selected.endereco.cidade}/{selected.endereco.estado}
                  </span>
                </div>
                
                {selected.totalImoveis > 0 && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{selected.totalImoveis} imóvel(is) cadastrado(s)</span>
                  </div>
                )}
              </div>

              {selected.informacoes?.caracteristicas && selected.informacoes.caracteristicas.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {selected.informacoes.caracteristicas.slice(0, 5).map((carac, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                    >
                      {carac}
                    </span>
                  ))}
                  {selected.informacoes.caracteristicas.length > 5 && (
                    <span className="px-2 py-1 text-xs text-gray-500">
                      +{selected.informacoes.caracteristicas.length - 5} mais
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600">
          ✅ Os dados do empreendimento serão vinculados automaticamente a este imóvel.
        </p>
      </div>
    );
  }

  // Interface de seleção
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          Empreendimento/Condomínio
        </h3>
        <button
          onClick={onCreateNew}
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <Plus className="w-4 h-4" />
          Cadastrar Novo
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-2 text-sm text-gray-600">Buscando empreendimentos próximos...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={buscarEmpreendimentosProximos}
            className="mt-2 text-sm text-red-700 hover:underline"
          >
            Tentar novamente
          </button>
        </div>
      ) : sugestoes.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              ✨ Encontramos {sugestoes.length} empreendimento(s) próximo(s):
            </p>
            <button
              onClick={() => setShowManualSearch(!showManualSearch)}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <Search className="w-4 h-4" />
              Buscar outro
            </button>
          </div>

          {showManualSearch && (
            <div className="flex gap-2 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                placeholder="Digite o nome do empreendimento..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                onClick={handleManualSearch}
                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
              >
                Buscar
              </button>
            </div>
          )}

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {sugestoes.map((emp) => (
              <div
                key={emp.id}
                onClick={() => handleSelect(emp)}
                className="p-4 border border-gray-200 rounded-lg cursor-pointer transition hover:border-primary hover:bg-primary/5"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-base">{emp.nome}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {emp.endereco.endereco}
                      {emp.endereco.numero && `, ${emp.endereco.numero}`}
                      {' - '}
                      {emp.endereco.bairro}
                    </p>
                    {emp.totalImoveis > 0 && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {emp.totalImoveis} imóvel(is) cadastrado(s)
                      </p>
                    )}
                  </div>
                  <button className="px-3 py-1 text-sm bg-primary text-white rounded hover:bg-primary/90">
                    Selecionar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 mb-2">
            {cep || bairro
              ? 'Nenhum empreendimento encontrado nesta região'
              : 'Preencha o CEP ou bairro para buscar empreendimentos'}
          </p>
          <button
            onClick={onCreateNew}
            className="mt-3 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Cadastrar primeiro imóvel deste empreendimento
          </button>
        </div>
      )}

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-800">
          💡 <strong>Dica:</strong> Selecionar um empreendimento existente economiza tempo ao cadastrar
          múltiplos imóveis do mesmo condomínio.
        </p>
      </div>
    </div>
  );
};

export default EmpreendimentoSelector;
