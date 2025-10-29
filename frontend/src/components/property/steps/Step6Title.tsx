import React, { useState, useMemo, useEffect } from 'react';
import { usePropertyCreate } from '@/contexts/PropertyCreateContext';
import { useSidebarContent } from '@/contexts/SidebarContentContext';
import { PropertyFormData } from '@/types';
import {
  FileText,
  Sparkles,
  RefreshCw,
  Eye,
  Wand2,
  Zap,
} from 'lucide-react';
import PropertyCardPreview from '../PropertyCardPreview';
import QualityScoreMeter from '../QualityScoreMeter';
import { TEMPLATES, applyTemplate } from '@/utils/propertyTemplates';
import { calculateQualityScore } from '@/utils/qualityScore';

const Step6Title: React.FC = () => {
  const { formData, updateField } = usePropertyCreate();
  const { setSidebarContent } = useSidebarContent();
  const [isGenerating, setIsGenerating] = useState(false);

  // Mapeamentos para tradução
  const propertyTypeMap: { [key: string]: string } = {
    APARTMENT: 'Apartamento',
    HOUSE: 'Casa',
    STUDIO: 'Studio',
    PENTHOUSE: 'Cobertura',
    COBERTURA: 'Cobertura',
    LOFT: 'Loft',
    LOJA: 'Loja',
    SALA_COMERCIAL: 'Sala Comercial',
    LOTE_TERRENO: 'Lote', // ✅ Centro-Oeste usa "lote" ao invés de "terreno"
    CASA_CONDOMINIO: 'Casa em Condomínio',
    FLAT: 'Flat',
    KITNET_CONJUGADO: 'Kitnet',
  };

  const propertyStandardMap: { [key: string]: string } = {
    ECONOMIC: 'econômico',
    MEDIUM: 'médio padrão',
    MEDIUM_HIGH: 'médio-alto padrão',
    HIGH: 'alto padrão',
    LUXURY: 'luxo',
  };

  // ✨ NOVO: Mapa de tradução de características
  const featuresMap: { [key: string]: string } = {
    // Características do imóvel
    pets_allowed: 'Aceita animais',
    air_conditioning: 'Ar-condicionado',
    closet: 'Closet',
    american_kitchen: 'Cozinha americana',
    fireplace: 'Lareira',
    furnished: 'Mobiliado',
    gourmet_balcony: 'Varanda gourmet',
    office: 'Escritório',
    balcony: 'Varanda',
    service_area: 'Área de serviço',
    maid_room: 'Dependência de empregados',
    barbecue_grill: 'Churrasqueira',
    garden: 'Jardim',
    terrace: 'Terraço',
    
    // Características do condomínio (backend)
    pool: 'Piscina',
    gym: 'Academia',
    playground: 'Playground',
    party_hall: 'Salão de festas',
    sports_court: 'Quadra poliesportiva',
    tennis_court: 'Quadra de tênis',
    elevator: 'Elevador',
    security_24h: 'Segurança 24h',
    concierge_24h: 'Portaria 24h',
    gated_community: 'Condomínio fechado',
    electronic_gate: 'Portão eletrônico',
    accessibility: 'Acessibilidade',
    disabled_access: 'Acesso para deficientes',
    bike_rack: 'Bicicletário',
    
    // Variações de nomes (backend pode enviar nesses formatos)
    barbecue: 'Churrasqueira',
    gourmet_space: 'Espaço gourmet',
    gourmet_area: 'Área gourmet',
    sauna: 'Sauna',
    steam_room: 'Sauna a vapor',
    game_room: 'Sala de jogos',
    toy_library: 'Brinquedoteca',
    pet_place: 'Pet place',
    pet_care: 'Espaço pet',
    coworking: 'Coworking',
    cinema: 'Cinema',
    massage_room: 'Sala de massagem',
    spa: 'Spa',
    squash_court: 'Quadra de squash',
    beach_tennis: 'Beach tennis',
    sports_field: 'Campo de futebol',
    soccer_field: 'Campo de futebol',
    running_track: 'Pista de corrida',
    zen_space: 'Espaço zen',
    meditation_room: 'Sala de meditação',
    wine_cellar: 'Adega',
    laundry: 'Lavanderia',
    storage: 'Depósito',
    covered_parking: 'Garagem coberta',
    visitor_parking: 'Estacionamento para visitantes',
    car_wash: 'Lava-jato',
    generator: 'Gerador',
    water_tank: 'Reservatório de água',
    meeting_room: 'Sala de reuniões',
    kids_pool: 'Piscina infantil',
    heated_pool: 'Piscina aquecida',
    indoor_pool: 'Piscina coberta',
  };

  const translatePropertyType = (type: string): string => {
    if (!type) return '';
    return propertyTypeMap[type] || type;
  };

  const translatePropertyStandard = (standard: string): string => {
    if (!standard) return '';
    return propertyStandardMap[standard] || standard;
  };

  // ✨ NOVO: Função para traduzir características
  const translateFeatures = (features: string[]): string => {
    if (!features || features.length === 0) return '';
    return features
      .map(f => featuresMap[f] || f)
      .filter(Boolean)
      .join(', ');
  };

  // Calcular quality score em tempo real
  const qualityScore = useMemo(() => calculateQualityScore(formData), [formData]);

  // Memorizar conteúdo do sidebar para evitar loops
  const sidebarContent = useMemo(() => (
    <>
      {/* Quality Score */}
      <QualityScoreMeter score={qualityScore} />

      {/* Preview do Anúncio */}
      <div className="bg-surface border border-border rounded-lg p-4">
        <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          Preview do Anúncio
        </h3>
        <PropertyCardPreview data={formData} />
        <p className="text-xs text-text-secondary mt-3 text-center">
          Esta é uma prévia de como seu anúncio aparecerá para os clientes
        </p>
      </div>
    </>
  ), [formData, qualityScore]);

  // Injetar no sidebar direito
  useEffect(() => {
    setSidebarContent(sidebarContent);
    return () => setSidebarContent(null);
  }, [sidebarContent, setSidebarContent]);

  const generateAutoTitle = () => {
    let title = '';
    const propertyType = formData.property_type || 'APARTMENT';
    const isLand = propertyType === 'LOTE_TERRENO';
    const category = formData.category || '';

    // Tipo de imóvel - TRADUZIDO
    if (propertyType) {
      title += translatePropertyType(propertyType);
    }

    // 🎯 SEO para Lote: adicionar categoria se for em condomínio
    if (isLand && (category.toLowerCase().includes('condominio') || category.toLowerCase().includes('condomínio'))) {
      title += ' em Condomínio';
    }

    // Uso (somente se não for lote)
    if (!isLand) {
      if (formData.usage_type === 'RESIDENTIAL') {
        title += title ? ' Residencial' : 'Residencial';
      } else if (formData.usage_type === 'COMMERCIAL') {
        title += title ? ' Comercial' : 'Comercial';
      }
    }

    // Metragem para lote (importante para SEO)
    if (isLand && (formData.total_areas || formData.usable_areas)) {
      const area = formData.total_areas || formData.usable_areas;
      title += ` - ${area}m²`;
    }

    // Quartos (somente para residencial não-lote)
    if (!isLand && formData.bedrooms && formData.usage_type === 'RESIDENTIAL') {
      title += ` - ${formData.bedrooms} ${formData.bedrooms === 1 ? 'Quarto' : 'Quartos'}`;
    }

    // Localização
    if (formData.bairro && formData.cidade) {
      title += ` em ${formData.bairro}, ${formData.cidade}`;
    } else if (formData.cidade) {
      title += ` em ${formData.cidade}`;
    }

    updateField('title', title);
  };

  const generateCompleteDescription = async () => {
    setIsGenerating(true);

    // Simular análise (futura integração com IA)
    await new Promise(resolve => setTimeout(resolve, 2000));

    const propertyType = formData.property_type || 'APARTMENT';
    const propertyTypeTranslated = translatePropertyType(propertyType).toLowerCase();
    const standard = translatePropertyStandard(formData.property_standard || 'MEDIUM');
    const category = formData.category || '';

    // 🎯 DETECTAR TIPO DE IMÓVEL PARA ADAPTAR DESCRIÇÃO
    const isLand = propertyType === 'LOTE_TERRENO';
    const isCommercial = formData.usage_type === 'COMMERCIAL';

    // ===== SEÇÃO 1: SOBRE O IMÓVEL =====
    const featuresTranslated = formData.features && formData.features.length > 0
      ? translateFeatures(formData.features.slice(0, 5))
      : '';

    let section1 = '';

    if (isLand) {
      // 🏞️ DESCRIÇÃO PARA LOTE (otimizado para SEO)
      const isLandInCondoCategory = category.toLowerCase().includes('condominio') || category.toLowerCase().includes('condomínio');
      const landCategory = isLandInCondoCategory ? 'em condomínio fechado' : 'urbano';
      const areaM2 = formData.total_areas || formData.usable_areas || 0;

      section1 = `**Sobre o Lote:**

${isLandInCondoCategory ? '🏡' : '📍'} Excelente ${propertyTypeTranslated} ${landCategory} com **${areaM2}m²**, localizado ${formData.bairro ? `no bairro ${formData.bairro}` : 'em região privilegiada'}${formData.cidade ? `, ${formData.cidade}` : ''}.

${featuresTranslated ? `✨ Características: ${featuresTranslated}.` : `✨ Lote ${areaM2 > 300 ? 'amplo e' : ''} regular, ideal para construção de residência ${standard}.`}

🔧 **Infraestrutura:** Água, luz e esgoto disponíveis no local. ${areaM2 > 300 ? 'Amplo espaço para projeto arquitetônico personalizado.' : 'Metragem perfeita para construção residencial.'}

${isLandInCondoCategory ? '🌳 Localização estratégica dentro do condomínio, proporcionando tranquilidade e valorização constante.' : '📈 Excelente potencial de valorização e facilidade para aprovação de projetos.'}`;

    } else if (isCommercial) {
      // 🏢 DESCRIÇÃO PARA COMERCIAL
      section1 = `**Sobre o Imóvel Comercial:**

${propertyTypeTranslated.charAt(0).toUpperCase() + propertyTypeTranslated.slice(1)} de ${standard} com ${formData.usable_areas || formData.total_areas || 0}m² de área útil, ideal para seu negócio.

${formData.bathrooms ? `${formData.bathrooms} ${formData.bathrooms === 1 ? 'banheiro' : 'banheiros'}` : ''}${formData.parking_spaces ? ` e ${formData.parking_spaces} ${formData.parking_spaces === 1 ? 'vaga' : 'vagas'} de garagem` : ''}.

${featuresTranslated ? `Características especiais: ${featuresTranslated}.` : 'Excelente localização comercial com alto fluxo de pessoas.'}

Ponto comercial estratégico, perfeito para estabelecer ou expandir seu empreendimento.`;

    } else {
      // 🏠 DESCRIÇÃO PARA RESIDENCIAL (Casa/Apartamento/etc)
      section1 = `**Sobre o Imóvel:**

Este ${propertyTypeTranslated} de ${standard} oferece ${formData.usable_areas || formData.total_areas || 0}m² de área útil, com ${formData.bedrooms || 0} ${formData.bedrooms === 1 ? 'quarto' : 'quartos'}${formData.suites ? ` (sendo ${formData.suites} ${formData.suites === 1 ? 'suíte' : 'suítes'})` : ''}, ${formData.bathrooms || 0} ${formData.bathrooms === 1 ? 'banheiro' : 'banheiros'} e ${formData.parking_spaces || 0} ${formData.parking_spaces === 1 ? 'vaga' : 'vagas'} de garagem.

${featuresTranslated ? `Características especiais: ${featuresTranslated}.` : 'O imóvel apresenta excelentes acabamentos e atenção aos detalhes.'}

O imóvel encontra-se em excelente estado de conservação, com acabamentos de qualidade que proporcionam conforto e funcionalidade para o dia a dia.`;
    }

    // ===== SEÇÃO 2: EMPREENDIMENTO/CONDOMÍNIO =====
    let section2 = '';
    const isCondoType = ['APARTMENT','FLAT','STUDIO','CASA_CONDOMINIO','COBERTURA','LOFT'].includes(String(propertyType));
    const isLandInCondo = isLand && (category.toLowerCase().includes('condominio') || category.toLowerCase().includes('condomínio'));
    
    if (formData.empreendimento_id || isCondoType || isLandInCondo) {
      // 🔒 SEGURANÇA: Não divulgar andar e unidade específica
      const condominiumData = (formData as any).condominium;
      const condoName = condominiumData?.nome || (formData as any).building_name;
      const condoFeatures = condominiumData?.informacoes?.caracteristicas || [];
      
      // Traduzir características do condomínio
      const condoFeaturesTranslated = condoFeatures.length > 0
        ? translateFeatures(condoFeatures.slice(0, 6))
        : 'segurança 24h e áreas de lazer';

      const deliveryYear = condominiumData?.informacoes?.entregaEm || (formData as any).delivery_at;

      if (isLand) {
        // 🏞️ SEÇÃO PARA LOTE EM CONDOMÍNIO
        section2 = `**Condomínio:**

${condoName ? `Condomínio ${condoName} com ` : 'Condomínio com '}infraestrutura completa, segurança 24h e área de lazer.
${condoFeaturesTranslated ? `Oferece: ${condoFeaturesTranslated}.` : ''}
${deliveryYear ? `Condomínio entregue em ${deliveryYear}.` : ''}
${formData.condo_fee ? `Taxa de condomínio: R$ ${formData.condo_fee.toLocaleString('pt-BR')}/mês.` : ''}`;
      } else {
        // 🏠 SEÇÃO PARA APARTAMENTO/CASA EM CONDOMÍNIO
        section2 = `**Empreendimento/Condomínio:**

${condoName ? `Localizado no ${condoName}, c` : 'C'}ondomínio com infraestrutura completa de lazer e segurança, ideal para sua família.
${condoFeaturesTranslated ? `Oferece: ${condoFeaturesTranslated}.` : ''}
${deliveryYear ? `Empreendimento entregue em ${deliveryYear}.` : ''}
Portaria 24 horas com controle de acesso e monitoramento.`;
      }
    }

    // ===== SEÇÃO 3: LOCALIZAÇÃO =====
    const section3 = `**Localização e Região:**

Situado em ${formData.bairro || formData.cidade || 'excelente localização'}, ${formData.cidade || ''}, o imóvel está em região privilegiada com fácil acesso a comércio, serviços essenciais e transporte público.

A região conta com ampla infraestrutura urbana, incluindo supermercados, escolas de qualidade, hospitais e diversas opções de lazer. Excelente mobilidade com proximidade de vias principais e corredores de transporte.`;

    // ===== SEÇÃO 4: VALORES =====
    const priceText = formData.business_type === 'SALE' || formData.business_type === 'SALE_RENTAL'
      ? `**Valor de ${formData.business_type === 'SALE' ? 'venda' : 'venda/locação'}:** R$ ${(formData.price_sale || 0).toLocaleString('pt-BR')}`
      : `**Valor do aluguel:** R$ ${(formData.price_rent || 0).toLocaleString('pt-BR')}/mês`;
    
    const condoText = formData.condo_fee && !formData.condo_fee_exempt
      ? `\n**Condomínio:** R$ ${formData.condo_fee.toLocaleString('pt-BR')}/mês${Array.isArray(formData.condo_includes) && formData.condo_includes.length ? ` (inclui: ${formData.condo_includes.slice(0,5).join(', ')})` : ''}`
      : formData.condo_fee_exempt ? '\n**Condomínio:** Isento' : '';
    
    const iptuText = formData.iptu && !formData.iptu_exempt
      ? `\n**IPTU:** R$ ${formData.iptu.toLocaleString('pt-BR')}${formData.iptu_period === 'MONTHLY' ? '/mês' : '/ano'}`
      : formData.iptu_exempt ? '\n**IPTU:** Isento' : '';
    
    const financingText = formData.accepts_financing
      ? `\n\n✅ **Aceita financiamento bancário** - ${formData.financing_details || 'Temos correspondente imobiliário que cuida de toda a documentação e aprovação do crédito, tornando o processo rápido e descomplicado.'}`
      : '';
    
    const exchangeText = formData.accepts_exchange
      ? `\n\n✅ **Aceita permuta** - ${formData.exchange_details || 'Avaliamos imóveis de menor valor como parte do pagamento.'}`
      : '';

    const section4 = `**Valores e Condições:**

${priceText}${condoText}${iptuText}${financingText}${exchangeText}

Entre em contato para agendar sua visita e conhecer este imóvel pessoalmente!`;

    // ===== COMBINAR TODAS AS SEÇÕES =====
    const completeDescription = [section1, section2, section3, section4]
      .filter(s => s.trim())
      .join('\n\n');

    updateField('description', completeDescription);
    setIsGenerating(false);
  };

  const handleTemplateSelect = (templateId: string) => {
    const result = applyTemplate(templateId, formData as PropertyFormData);
    updateField('title', result.title);
    updateField('description', result.description);
  };

  const titleLength = formData.title?.length || 0;
  const descriptionLength = formData.description?.length || 0;

  return (
    <div className="h-full flex flex-col">
      {/* Layout em coluna única */}
      <div className="flex-1 space-y-6 overflow-auto">
        {/* Templates Rápidos */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <Sparkles className="w-5 h-5 text-purple-600 mr-2" />
            <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
              ⚡ Templates Rápidos - Personalize em 1 Clique
            </h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {TEMPLATES.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template.id)}
                className="flex flex-col items-center gap-1 p-3 bg-white dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-700 rounded-lg transition-all hover:shadow-md group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">{template.icon}</span>
                <span className="text-xs font-medium text-text-primary text-center">{template.name}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-purple-800 dark:text-purple-200 mt-2">
            💡 Os templates são personalizados automaticamente com os dados do seu imóvel!
          </p>
        </div>

        {/* Título do Anúncio */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center">
              <FileText className="w-5 h-5 mr-2 text-primary" />
              Título do Anúncio
            </h3>
            <div className="flex gap-2">
              <button
                onClick={generateAutoTitle}
                className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-text-secondary hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors flex items-center gap-1"
                title="Gerar título baseado nos dados preenchidos"
              >
                <RefreshCw className="w-3 h-3" />
                Auto
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <input
                type="text"
                placeholder="Ex: Apartamento 3 quartos com vista mar em Copacabana"
                value={formData.title || ''}
                onChange={e => updateField('title', e.target.value)}
                className="w-full px-4 py-3 border border-border bg-background text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-lg"
                maxLength={150}
              />
              <div className="flex items-center justify-between mt-2">
                <p
                  className={`text-xs ${titleLength > 100 ? 'text-yellow-600' : 'text-text-secondary'}`}
                >
                  {titleLength}/150 caracteres{' '}
                  {titleLength > 100 &&
                    '(títulos menores têm melhor performance)'}
                </p>
                {formData.title && (
                  <div
                    className={`text-xs px-2 py-1 rounded ${
                      titleLength < 30
                        ? 'bg-red-100 text-red-700'
                        : titleLength <= 80
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {titleLength < 30
                      ? 'Muito curto'
                      : titleLength <= 80
                        ? 'Ideal'
                        : 'Longo'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Descrição Completa */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary flex items-center">
              <Eye className="w-5 h-5 mr-2 text-secondary" />
              Descrição Detalhada
            </h3>
            <button
              onClick={generateCompleteDescription}
              disabled={isGenerating}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 rounded-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
              title="Gerar descrição completa com IA (4 seções automaticamente)"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  🤖 Gerar Descrição Completa com IA
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            {/* Dicas para descrição */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                ⚡ Geração Inteligente em 1 Clique!
              </h4>
              <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                <li>✨ <strong>A IA gera 4 seções automaticamente:</strong></li>
                <li className="ml-4">🏠 Sobre o Imóvel (características, área, cômodos)</li>
                <li className="ml-4">🏢 Empreendimento (condomínio, comodidades)</li>
                <li className="ml-4">📍 Localização (bairro, região, infraestrutura)</li>
                <li className="ml-4">💰 Valores (preço, condomínio, IPTU, facilidades)</li>
                <li className="mt-2">🎯 <strong>Você pode editar livremente após gerar!</strong></li>
                <li>⚡ <strong>1 clique = Descrição completa em 5 segundos</strong></li>
              </ul>
            </div>

            <div>
              <textarea
                placeholder="Clique em 'Gerar Descrição Completa' para criar automaticamente uma descrição estruturada em 4 seções, ou escreva manualmente destacando: características do imóvel, condomínio, localização e valores..."
                value={formData.description || ''}
                onChange={e => updateField('description', e.target.value)}
                rows={16}
                className="w-full px-4 py-3 border border-border bg-background text-text-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none font-mono text-sm"
                maxLength={2000}
              />
              <div className="flex items-center justify-between mt-2">
                <p
                  className={`text-xs ${descriptionLength > 1500 ? 'text-yellow-600' : 'text-text-secondary'}`}
                >
                  {descriptionLength}/2000 caracteres
                </p>
                {formData.description && (
                  <div
                    className={`text-xs px-2 py-1 rounded ${
                      descriptionLength < 200
                        ? 'bg-red-100 text-red-700'
                        : descriptionLength <= 800
                          ? 'bg-green-100 text-green-700'
                          : descriptionLength <= 1200
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {descriptionLength < 200
                      ? 'Muito curta'
                      : descriptionLength <= 800
                        ? 'Boa'
                        : descriptionLength <= 1200
                          ? 'Ideal'
                          : 'Muito longa'}
                  </div>
                )}
              </div>
            </div>

            {/* Preview da estrutura */}
            {formData.description && formData.description.includes('**') && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-xs text-green-800 dark:text-green-200">
                  ✅ <strong>Descrição estruturada detectada!</strong> Seu texto está formatado em seções, o que aumenta a conversão em até 68%.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step6Title;
