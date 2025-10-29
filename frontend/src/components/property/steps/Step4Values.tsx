import React from 'react';
import { usePropertyCreate } from '@/contexts/PropertyCreateContext';
import { DollarSign, Calculator, TrendingUp } from 'lucide-react';

const Step4Values: React.FC = () => {
  const { formData, updateField } = usePropertyCreate();

  // Definir quais tipos/categorias precisam de informações de empreendimento/condomínio
  const needsCondoInfo = (propertyType: string, category?: string) => {
    const condoTypes = [
      'APARTMENT', // Apartamento - sempre
      'FLAT', // Flat - sempre
      'CASA_CONDOMINIO', // Casa de Condomínio - sempre
      'COBERTURA', // Cobertura - sempre
      'LOFT', // Loft - sempre
      'STUDIO', // Studio - sempre
    ];

    // Lote/Terreno só precisa se for "Lote Condomínio"
    if (propertyType === 'LOTE_TERRENO') {
      return category === 'LOTE_CONDOMINIO';
    }

    return condoTypes.includes(propertyType);
  };

  // Hook para verificar se precisa mostrar taxa de condomínio
  const showCondoFee = needsCondoInfo(
    formData.property_type || '',
    formData.category
  );

  // Formata valor numérico para exibição (R$ 250.000)
  const formatCurrencyInput = (value: number | undefined): string => {
    if (!value || value === 0) return '';

    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Extrai apenas números da string (remove tudo exceto dígitos)
  const extractNumbers = (value: string): string => {
    return value.replace(/\D/g, '');
  };

  // Converte string de números para número (ex: "250000" -> 250000)
  const parseToNumber = (numericString: string): number | undefined => {
    if (!numericString) return undefined;
    const num = parseInt(numericString, 10);
    return isNaN(num) ? undefined : num;
  };

  // Handler para input de valores monetários
  const handleCurrencyInput = (
    field: 'price_sale' | 'price_rent' | 'condo_fee' | 'iptu',
    inputValue: string
  ) => {
    // Se campo está vazio, limpar
    if (!inputValue || inputValue.trim() === '') {
      updateField(field, undefined);
      return;
    }

    // Extrair apenas números
    const numbersOnly = extractNumbers(inputValue);
    
    // Se não tem números, limpar
    if (!numbersOnly) {
      updateField(field, undefined);
      return;
    }

    // Converter para número e salvar
    const numericValue = parseToNumber(numbersOnly);
    if (numericValue !== undefined) {
      updateField(field, numericValue);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Layout Principal */}
      <div className="flex-1 space-y-4 overflow-auto">
        {/* Tipo de Negócio */}
        <div className="bg-surface border border-border rounded-lg p-4">
          <h3 className="text-base font-semibold text-text-primary mb-3 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2 text-primary" />
            Modalidade de Negócio *
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                value: 'SALE',
                label: 'Apenas Venda',
                desc: 'Somente para compra',
                emoji: '🏷️',
              },
              {
                value: 'RENTAL',
                label: 'Apenas Locação',
                desc: 'Somente para aluguel',
                emoji: '🔄',
              },
              {
                value: 'SALE_RENTAL',
                label: 'Venda e Locação',
                desc: 'Ambas as modalidades',
                emoji: '🎯',
              },
            ].map(option => {
              const isSelected = formData.business_type === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => updateField('business_type', option.value)}
                  className={`
										p-3 rounded-lg border transition-all duration-200 text-left
										${
                      isSelected
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-background border-border text-text-primary hover:bg-surface hover:border-primary/30'
                    }
									`}
                >
                  <div className="flex items-center mb-1">
                    <span className="text-lg mr-2">{option.emoji}</span>
                    <span className="font-medium">{option.label}</span>
                  </div>
                  <p className="text-xs opacity-70">{option.desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Valores de Venda */}
        {(formData.business_type === 'SALE' ||
          formData.business_type === 'SALE_RENTAL') && (
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="text-base font-semibold text-text-primary mb-3 flex items-center">
              <DollarSign className="w-4 h-4 mr-2 text-secondary" />
              Valores de Venda
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Preço de Venda *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="R$ 0"
                    value={
                      formData.price_sale
                        ? formatCurrencyInput(formData.price_sale)
                        : ''
                    }
                    onChange={e =>
                      handleCurrencyInput('price_sale', e.target.value)
                    }
                    className="w-full px-3 py-2 pl-8 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Valores de Locação */}
        {(formData.business_type === 'RENTAL' ||
          formData.business_type === 'SALE_RENTAL') && (
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="text-base font-semibold text-text-primary mb-3 flex items-center">
              <Calculator className="w-4 h-4 mr-2 text-secondary" />
              Valores de Locação
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Valor do Aluguel *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="R$ 0"
                    value={
                      formData.price_rent
                        ? formatCurrencyInput(formData.price_rent)
                        : ''
                    }
                    onChange={e =>
                      handleCurrencyInput('price_rent', e.target.value)
                    }
                    className="w-full px-3 py-2 pl-8 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Taxas e Impostos - SEMPRE VISÍVEL PARA TODAS AS MODALIDADES */}
        {formData.business_type && (
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="text-base font-semibold text-text-primary mb-3 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-secondary" />
              Taxas e Impostos
            </h3>

            <div className="space-y-3">
              {/* Condomínio - só aparece para tipos que precisam */}
              {showCondoFee && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-text-primary">
                      Condomínio
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.condo_fee_exempt || false}
                        onChange={e =>
                          updateField('condo_fee_exempt', e.target.checked)
                        }
                        className="w-4 h-4 text-primary rounded border-border focus:ring-primary/20"
                      />
                      <span className="text-xs text-text-secondary">
                        Isento
                      </span>
                    </label>
                  </div>

                  {!formData.condo_fee_exempt && (
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="R$ 0"
                        value={
                          formData.condo_fee
                            ? formatCurrencyInput(formData.condo_fee)
                            : ''
                        }
                        onChange={e =>
                          handleCurrencyInput('condo_fee', e.target.value)
                        }
                        className="w-full px-3 py-2 pl-8 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      />
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                    </div>
                  )}
                </div>
              )}

              {/* Mensagem de isenção de condomínio - só aparece se isento */}
              {showCondoFee && formData.condo_fee_exempt && (
                <div className="text-xs text-secondary bg-secondary/10 border border-secondary/20 rounded p-2">
                  ✓ Imóvel isento de taxa de condomínio
                </div>
              )}

              {/* IPTU */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-text-primary">
                    IPTU
                  </label>
                  <div className="flex items-center space-x-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="iptu_period"
                        value="MONTHLY"
                        checked={formData.iptu_period === 'MONTHLY'}
                        onChange={() => updateField('iptu_period', 'MONTHLY')}
                        className="w-3 h-3 text-primary border-border focus:ring-primary/20"
                      />
                      <span className="text-xs text-text-secondary">
                        Mensal
                      </span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="iptu_period"
                        value="YEARLY"
                        checked={formData.iptu_period === 'YEARLY'}
                        onChange={() => updateField('iptu_period', 'YEARLY')}
                        className="w-3 h-3 text-primary border-border focus:ring-primary/20"
                      />
                      <span className="text-xs text-text-secondary">Anual</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.iptu_exempt || false}
                        onChange={e =>
                          updateField('iptu_exempt', e.target.checked)
                        }
                        className="w-4 h-4 text-primary rounded border-border focus:ring-primary/20"
                      />
                      <span className="text-xs text-text-secondary">
                        Isento
                      </span>
                    </label>
                  </div>
                </div>

                {!formData.iptu_exempt && (
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="R$ 0"
                      value={
                        formData.iptu ? formatCurrencyInput(formData.iptu) : ''
                      }
                      onChange={e =>
                        handleCurrencyInput('iptu', e.target.value)
                      }
                      className="w-full px-3 py-2 pl-8 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                  </div>
                )}

                {formData.iptu_exempt && (
                  <div className="text-xs text-secondary bg-secondary/10 border border-secondary/20 rounded p-2">
                    ✓ Imóvel isento de IPTU
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ✨ NOVO: Padrão do Imóvel */}
        {formData.business_type && (
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="text-base font-semibold text-text-primary mb-3 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-secondary" />
              Classificação do Imóvel
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Padrão do Imóvel *
                </label>
                <p className="text-xs text-text-secondary mb-2">
                  Isso ajuda a criar descrições personalizadas para seu público-alvo
                </p>
                <select
                  value={formData.property_standard || ''}
                  onChange={(e) => updateField('property_standard', e.target.value)}
                  className="w-full px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                >
                  <option value="">Selecione o padrão...</option>
                  <option value="ECONOMIC">💵 Econômico (até R$ 300k)</option>
                  <option value="MEDIUM">🏠 Médio (R$ 300k - R$ 800k)</option>
                  <option value="MEDIUM_HIGH">🏢 Médio-Alto (R$ 800k - R$ 1.5M)</option>
                  <option value="HIGH">💎 Alto Padrão (R$ 1.5M - R$ 3M)</option>
                  <option value="LUXURY">👑 Luxo (acima de R$ 3M)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ✨ NOVO: Facilidades de Negociação */}
        {formData.business_type === 'SALE' || formData.business_type === 'SALE_RENTAL' ? (
          <div className="bg-surface border border-border rounded-lg p-4">
            <h3 className="text-base font-semibold text-text-primary mb-3 flex items-center">
              <Calculator className="w-4 h-4 mr-2 text-secondary" />
              Facilidades de Negociação
            </h3>

            <div className="space-y-4">
              {/* Aceita Financiamento */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={formData.accepts_financing || false}
                  onChange={(e) => updateField('accepts_financing', e.target.checked)}
                  className="mt-1 w-4 h-4 text-primary rounded border-border focus:ring-primary/20"
                />
                <div className="flex-1">
                  <label className="font-medium text-text-primary">
                    ✅ Aceita Financiamento Bancário
                  </label>
                  <p className="text-xs text-text-secondary mt-1">
                    Imóveis com financiamento têm <strong>60% mais visualizações</strong>
                  </p>
                  {formData.accepts_financing && (
                    <textarea
                      placeholder="Ex: Aprovamos financiamento com todos os bancos. Temos correspondente que cuida de toda documentação."
                      value={formData.financing_details || ''}
                      onChange={(e) => updateField('financing_details', e.target.value)}
                      className="w-full mt-2 px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                      rows={2}
                    />
                  )}
                </div>
              </div>

              {/* Aceita Permuta */}
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={formData.accepts_exchange || false}
                  onChange={(e) => updateField('accepts_exchange', e.target.checked)}
                  className="mt-1 w-4 h-4 text-primary rounded border-border focus:ring-primary/20"
                />
                <div className="flex-1">
                  <label className="font-medium text-text-primary">
                    🔄 Aceita Permuta/Troca
                  </label>
                  <p className="text-xs text-text-secondary mt-1">
                    Facilita negociação e atrai <strong>40% mais compradores</strong>
                  </p>
                  {formData.accepts_exchange && (
                    <textarea
                      placeholder="Ex: Aceitamos imóveis de menor valor como parte do pagamento. Avaliamos apartamentos, casas e terrenos."
                      value={formData.exchange_details || ''}
                      onChange={(e) => updateField('exchange_details', e.target.value)}
                      className="w-full mt-2 px-3 py-2 border border-border bg-background text-text-primary rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                      rows={2}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Resumo financeiro migrado para o sidebar direito */}
      </div>
    </div>
  );
};

export default Step4Values;
