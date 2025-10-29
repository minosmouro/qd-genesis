import { PropertyFormData } from '@/types';

export const TEMPLATES = [
  { id: 'clean', name: 'Direto ao Ponto', icon: '🧼' },
  { id: 'family', name: 'Famílias', icon: '👨‍👩‍👦' },
  { id: 'invest', name: 'Investidor', icon: '📈' },
  { id: 'premium', name: 'Alto Padrão', icon: '💎' },
  { id: 'student', name: 'Estudantes', icon: '🎓' },
  { id: 'pet', name: 'Pet Friendly', icon: '🐾' },
  { id: 'quick', name: 'Rápido', icon: '⚡' },
];

const translateType = (type?: string) => {
  const map: Record<string, string> = {
    APARTMENT: 'Apartamento',
    HOUSE: 'Casa',
    STUDIO: 'Studio',
    COBERTURA: 'Cobertura',
    LOFT: 'Loft',
    FLAT: 'Flat',
    CASA_CONDOMINIO: 'Casa em Condomínio',
    SALA_COMERCIAL: 'Sala Comercial',
    LOJA: 'Loja',
    LOTE_TERRENO: 'Terreno',
  };
  return (type && map[type]) || (type || 'Imóvel');
};

const translateStandard = (std?: string) => {
  const map: Record<string, string> = {
    ECONOMIC: 'econômico',
    MEDIUM: 'médio padrão',
    MEDIUM_HIGH: 'médio-alto padrão',
    HIGH: 'alto padrão',
    LUXURY: 'luxo',
  };
  return (std && map[std]) || 'médio padrão';
};

export function applyTemplate(templateId: string, data: PropertyFormData) {
  const type = translateType(data.property_type);
  const standard = translateStandard(data.property_standard);

  const area = data.usable_areas || data.total_areas || 0;
  const rooms = data.bedrooms || 0;
  const suites = data.suites || 0;
  const baths = data.bathrooms || 0;
  const garages = data.parking_spaces || 0;

  const location = data.bairro && data.cidade
    ? `${data.bairro}, ${data.cidade}`
    : data.cidade || '';

  // Headline
  const baseTitleParts: string[] = [];
  baseTitleParts.push(type);
  if (rooms) baseTitleParts.push(`${rooms} ${rooms === 1 ? 'quarto' : 'quartos'}`);
  if (location) baseTitleParts.push(`em ${location}`);
  const title = baseTitleParts.join(' - ');

  // Build condo text without legacy fields
  const condoIncludesText = Array.isArray(data.condo_includes) && data.condo_includes.length
    ? `Condomínio com ${data.condo_includes.slice(0, 6).join(', ')}.`
    : (data.empreendimento_id ? 'Condomínio com infraestrutura completa de lazer e segurança.' : '');

  const priceLines: string[] = [];
  if (data.business_type === 'SALE' || data.business_type === 'SALE_RENTAL') {
    const sale = data.price_sale || 0;
    priceLines.push(`Valor de venda: R$ ${sale.toLocaleString('pt-BR')}`);
  }
  if (data.business_type === 'RENTAL' || data.business_type === 'SALE_RENTAL') {
    const rent = data.price_rent || 0;
    priceLines.push(`Aluguel: R$ ${rent.toLocaleString('pt-BR')}/mês`);
  }
  if (data.condo_fee && !data.condo_fee_exempt) {
    priceLines.push(`Condomínio: R$ ${data.condo_fee.toLocaleString('pt-BR')}/mês${Array.isArray(data.condo_includes) && data.condo_includes.length ? ` (inclui: ${data.condo_includes.slice(0,5).join(', ')})` : ''}`);
  } else if (data.condo_fee_exempt) {
    priceLines.push('Condomínio: Isento');
  }
  if (data.iptu && !data.iptu_exempt) {
    priceLines.push(`IPTU: R$ ${data.iptu.toLocaleString('pt-BR')}${data.iptu_period === 'MONTHLY' ? '/mês' : '/ano'}`);
  } else if (data.iptu_exempt) {
    priceLines.push('IPTU: Isento');
  }

  const valuesBlock = priceLines.length ? `\n\n${priceLines.join(' | ')}` : '';

  // Template variations
  let body = '';
  switch (templateId) {
    case 'family':
      body = `🏠 ${type} de ${standard} com ${area}m², perfeito para a família! São ${rooms} ${rooms === 1 ? 'quarto' : 'quartos'}${suites ? ` (inclui ${suites} ${suites === 1 ? 'suíte' : 'suítes'})` : ''}, ${baths} ${baths === 1 ? 'banheiro' : 'banheiros'} e ${garages} ${garages === 1 ? 'vaga' : 'vagas'} de garagem.${data.unit_floor ? ` Localizado no ${data.unit_floor}º andar.` : ''}

${condoIncludesText}
Localização excelente em ${location || 'região com serviços e comodidades por perto.'}${valuesBlock}`;
      break;
    case 'invest':
      body = `📈 Oportunidade para investir! ${type} ${standard} com ${area}m² em ${location || 'ótima localização'}. Planta funcional, ${rooms} ${rooms === 1 ? 'quarto' : 'quartos'} e ${garages} ${garages === 1 ? 'vaga' : 'vagas'}. ${condoIncludesText}${valuesBlock}`;
      break;
    case 'premium':
      body = `💎 ${type} de ${standard} com acabamentos de alto nível e ${area}m². ${rooms} ${rooms === 1 ? 'quarto' : 'quartos'}${suites ? `, ${suites} ${suites === 1 ? 'suíte' : 'suítes'}` : ''}, ${garages} ${garages === 1 ? 'vaga' : 'vagas'} de garagem. ${condoIncludesText}${valuesBlock}`;
      break;
    case 'student':
      body = `🎓 Perfeito para estudantes! ${type} com ${area}m² em ${location || 'localização estratégica'}. ${rooms} ${rooms === 1 ? 'quarto' : 'quartos'} e condomínio seguro. ${condoIncludesText}${valuesBlock}`;
      break;
    case 'pet':
      body = `🐾 Pet friendly! ${type} com ${area}m², ${rooms} ${rooms === 1 ? 'quarto' : 'quartos'} e áreas para seu pet aproveitar. ${condoIncludesText}${valuesBlock}`;
      break;
    case 'quick':
      body = `⚡ ${type} ${standard} com ${area}m² em ${location || 'boa localização'}. ${rooms} ${rooms === 1 ? 'quarto' : 'quartos'}, ${garages} ${garages === 1 ? 'vaga' : 'vagas'}. ${condoIncludesText}${valuesBlock}`;
      break;
    case 'clean':
    default:
      body = `${type} ${standard} com ${area}m²${location ? ` em ${location}` : ''}. ${rooms} ${rooms === 1 ? 'quarto' : 'quartos'}, ${baths} ${baths === 1 ? 'banheiro' : 'banheiros'} e ${garages} ${garages === 1 ? 'vaga' : 'vagas'}.${data.unit_floor ? ` ${data.unit_floor}º andar.` : ''} ${condoIncludesText}${valuesBlock}`;
      break;
  }

  return {
    title,
    description: body,
  };
}
