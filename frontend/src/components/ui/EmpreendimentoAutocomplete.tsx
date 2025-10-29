import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Building,
  MapPin,
  Clock,
  ChevronDown,
  Plus,
  Check,
} from 'lucide-react';
import {
  empreendimentosService,
  Empreendimento,
} from '@/services/empreendimentos.service';

interface EmpreendimentoAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (empreendimento: Empreendimento) => void;
  placeholder?: string;
  className?: string;
}

const EmpreendimentoAutocomplete: React.FC<EmpreendimentoAutocompleteProps> = ({
  value,
  onChange,
  onSelect,
  placeholder = 'Digite o nome do empreendimento...',
  className = '',
}) => {
  const [suggestions, setSuggestions] = useState<Empreendimento[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mostUsed, setMostUsed] = useState<Empreendimento[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carregar empreendimentos mais utilizados
  useEffect(() => {
    const loadMostUsed = async () => {
      const empreendimentos = await empreendimentosService.getMostUsed(5);
      setMostUsed(empreendimentos);
    };
    loadMostUsed();
  }, []);

  // Buscar sugestões conforme o usuário digita
  useEffect(() => {
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const results = await empreendimentosService.searchByName(value);
        setSuggestions(results);
      } catch (error) {
        console.error('Erro na busca:', String(error));
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [value]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSelectEmpreendimento = (empreendimento: Empreendimento) => {
    onChange(empreendimento.nome);
    onSelect(empreendimento);
    setIsOpen(false);
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const showMostUsed = !value && mostUsed.length > 0;
  const showSuggestions = value.length >= 2 && suggestions.length > 0;
  const showDropdown = isOpen && (showMostUsed || showSuggestions || isLoading);

  return (
    <div className="relative">
      {/* Campo de input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className={`w-full px-4 py-3 pl-10 pr-10 border border-border bg-background text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${className}`}
        />

        {/* Ícone de busca */}
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-secondary" />

        {/* Ícone de dropdown */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-secondary hover:text-text-primary"
        >
          <ChevronDown
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Loading indicator */}
        {isLoading && (
          <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {/* Dropdown de sugestões */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-background border border-border rounded-lg shadow-lg max-h-80 overflow-auto"
        >
          {/* Empreendimentos mais utilizados */}
          {showMostUsed && (
            <div className="p-3">
              <div className="flex items-center text-xs font-medium text-text-secondary mb-2">
                <Clock className="w-3 h-3 mr-1" />
                Mais Utilizados
              </div>
              <div className="space-y-1">
                {mostUsed.map(empreendimento => (
                  <button
                    key={empreendimento.id}
                    onClick={() => handleSelectEmpreendimento(empreendimento)}
                    className="w-full text-left px-3 py-2 hover:bg-surface rounded-md transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <Building className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-text-primary truncate">
                          {empreendimento.nome}
                        </div>
                        <div className="text-xs text-text-secondary flex items-center mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {empreendimento.endereco.bairro},{' '}
                          {empreendimento.endereco.cidade}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {empreendimento.totalImoveis}{' '}
                          {empreendimento.totalImoveis === 1
                            ? 'imóvel'
                            : 'imóveis'}{' '}
                          cadastrado
                          {empreendimento.totalImoveis === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Resultados da busca */}
          {showSuggestions && (
            <div className="p-3">
              {showMostUsed && (
                <div className="border-t border-border -mx-3 mb-3"></div>
              )}

              <div className="flex items-center text-xs font-medium text-text-secondary mb-2">
                <Search className="w-3 h-3 mr-1" />
                Resultados da Busca
              </div>
              <div className="space-y-1">
                {suggestions.map(empreendimento => (
                  <button
                    key={empreendimento.id}
                    onClick={() => handleSelectEmpreendimento(empreendimento)}
                    className="w-full text-left px-3 py-2 hover:bg-surface rounded-md transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      <Building className="w-4 h-4 text-secondary mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-text-primary truncate">
                          {empreendimento.nome}
                        </div>
                        <div className="text-xs text-text-secondary flex items-center mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {empreendimento.endereco.endereco},{' '}
                          {empreendimento.endereco.numero}
                        </div>
                        <div className="text-xs text-text-secondary">
                          {empreendimento.endereco.bairro},{' '}
                          {empreendimento.endereco.cidade}
                        </div>
                        {empreendimento.totalImoveis > 0 && (
                          <div className="text-xs text-green-600 font-medium flex items-center mt-1">
                            <Check className="w-3 h-3 mr-1" />
                            {empreendimento.totalImoveis}{' '}
                            {empreendimento.totalImoveis === 1
                              ? 'imóvel'
                              : 'imóveis'}{' '}
                            cadastrado
                            {empreendimento.totalImoveis === 1 ? '' : 's'}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Mensagem informativa quando não encontrar */}
          {value.length >= 2 && !isLoading && suggestions.length === 0 && (
            <div className="border-t border-border">
              <div className="px-6 py-3 text-center">
                <div className="flex items-center justify-center space-x-2 text-blue-600">
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    Novo empreendimento "{value}" será criado ao salvar
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Continue preenchendo os dados do empreendimento
                </p>
              </div>
            </div>
          )}

          {/* Estado vazio */}
          {!isLoading &&
            !showMostUsed &&
            !showSuggestions &&
            value.length >= 2 && (
              <div className="p-6 text-center text-text-secondary">
                <Building className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum empreendimento encontrado</p>
                <p className="text-xs mt-1">
                  Continue digitando para criar um novo
                </p>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default EmpreendimentoAutocomplete;
