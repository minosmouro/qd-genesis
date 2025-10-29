import { PropertyFormData } from '@/types';

export interface QualityScore {
  total: number;
  breakdown: {
    title: number;
    description: number;
    keywords: number;
    photos: number;
  };
  suggestions: string[];
  level: 'poor' | 'fair' | 'good' | 'excellent';
}

// Palavras-chave importantes que devem estar na descrição
const IMPORTANT_KEYWORDS = [
  'localização',
  'acabamento',
  'condomínio',
  'iluminação',
  'ventilação',
  'segurança',
  'transporte',
  'comércio',
  'escola',
  'lazer',
  'financiamento', // ✨ NOVO
  'permuta', // ✨ NOVO
];

// ✨ NOVOS: Palavras-chave premium por padrão
const PREMIUM_KEYWORDS = {
  HIGH: ['alto padrão', 'premium', 'sofisticação', 'exclusividade', 'requinte'],
  LUXURY: ['luxo', 'exclusivo', 'obra-prima', 'ícone', 'privilégio', 'incomparável'],
  MEDIUM_HIGH: ['médio-alto', 'qualidade', 'conforto', 'bem planejado'],
  MEDIUM: ['confortável', 'espaçoso', 'funcional', 'prático'],
  ECONOMIC: ['acessível', 'custo-benefício', 'oportunidade', 'facilitado'],
};

export const calculateQualityScore = (
  data: Partial<PropertyFormData>
): QualityScore => {
  const suggestions: string[] = [];
  let titleScore = 0;
  let descriptionScore = 0;
  let keywordsScore = 0;
  let photosScore = 0;

  // ===== 1. TÍTULO (30 pontos) =====
  const titleLength = data.title?.length || 0;
  
  if (!data.title || titleLength === 0) {
    suggestions.push('Adicione um título para o anúncio (+30 pontos)');
    titleScore = 0;
  } else if (titleLength < 30) {
    suggestions.push('Título muito curto. Ideal entre 40-80 caracteres (+15 pontos)');
    titleScore = 10;
  } else if (titleLength >= 30 && titleLength <= 80) {
    titleScore = 30; // Ideal!
  } else if (titleLength > 80 && titleLength <= 100) {
    titleScore = 25;
    suggestions.push('Título um pouco longo. Idealmente até 80 caracteres (+5 pontos)');
  } else {
    titleScore = 20;
    suggestions.push('Título muito longo. Mantenha entre 40-80 caracteres (+10 pontos)');
  }

  // ===== 2. DESCRIÇÃO (30 pontos) =====
  const descriptionLength = data.description?.length || 0;
  
  if (!data.description || descriptionLength === 0) {
    suggestions.push('Adicione uma descrição detalhada (+30 pontos)');
    descriptionScore = 0;
  } else if (descriptionLength < 200) {
    suggestions.push('Descrição muito curta. Mínimo recomendado: 300 caracteres (+20 pontos)');
    descriptionScore = 10;
  } else if (descriptionLength >= 200 && descriptionLength < 300) {
    descriptionScore = 20;
    suggestions.push('Descrição boa! Adicione mais detalhes para alcançar 300+ caracteres (+10 pontos)');
  } else if (descriptionLength >= 300 && descriptionLength <= 1200) {
    descriptionScore = 30; // Ideal!
    
    // ✨ NOVO: Bonus por descrição estruturada (verifica se tem seções)
    const hasSections = data.description.includes('**') || 
                        data.description.split('\n\n').length >= 3;
    if (hasSections) {
      descriptionScore = 35; // +5 bonus!
      suggestions.unshift('🌟 Bonus: Descrição estruturada em seções! (+5 pontos)');
    }
  } else if (descriptionLength > 1200 && descriptionLength <= 1500) {
    descriptionScore = 28;
    suggestions.push('Descrição extensa. Considere ser mais conciso (-2 pontos)');
  } else {
    descriptionScore = 25;
    suggestions.push('Descrição muito longa. Foque nos pontos principais (-5 pontos)');
  }

  // ✨ NOVO: Bonus por mencionar facilidades (financiamento/permuta)
  if (data.accepts_financing || data.accepts_exchange) {
    const bonusPoints = (data.accepts_financing ? 3 : 0) + (data.accepts_exchange ? 2 : 0);
    descriptionScore += bonusPoints;
    if (data.accepts_financing) {
      suggestions.unshift('🎁 Bonus: Aceita financiamento! (+3 pontos)');
    }
    if (data.accepts_exchange) {
      suggestions.unshift('🎁 Bonus: Aceita permuta! (+2 pontos)');
    }
  }

  // ===== 3. PALAVRAS-CHAVE (20 pontos) =====
  if (data.description) {
    const descriptionLower = data.description.toLowerCase();
    const foundKeywords = IMPORTANT_KEYWORDS.filter(keyword =>
      descriptionLower.includes(keyword)
    );
    
    const keywordPercentage = foundKeywords.length / IMPORTANT_KEYWORDS.length;
    keywordsScore = Math.round(keywordPercentage * 20);

    // ✨ NOVO: Bonus por usar palavras-chave do padrão do imóvel
    if (data.property_standard && PREMIUM_KEYWORDS[data.property_standard]) {
      const premiumKeywords = PREMIUM_KEYWORDS[data.property_standard];
      const foundPremium = premiumKeywords.filter(kw => descriptionLower.includes(kw));
      if (foundPremium.length > 0) {
        const bonusPoints = Math.min(5, foundPremium.length * 2);
        keywordsScore = Math.min(25, keywordsScore + bonusPoints);
        suggestions.unshift(`✨ Bonus: Linguagem adequada ao padrão "${data.property_standard}" (+${bonusPoints} pontos)`);
      }
    }

    // Sugestões específicas de palavras-chave faltantes
    const missingKeywords = IMPORTANT_KEYWORDS.filter(
      keyword => !descriptionLower.includes(keyword)
    ).slice(0, 3); // Top 3 mais importantes

    if (missingKeywords.length > 0 && keywordsScore < 20) {
      const keywordList = missingKeywords.map(k => `"${k}"`).join(', ');
      const points = Math.round((missingKeywords.length / IMPORTANT_KEYWORDS.length) * 20);
      suggestions.push(`Mencione: ${keywordList} (+${points} pontos)`);
    }
  } else {
    suggestions.push('Adicione descrição com palavras-chave importantes (+20 pontos)');
  }

  // ===== 4. FOTOS (20 pontos) =====
  // ✨ MELHORADO: Contar images + image_urls (fix do bug anterior)
  const newPhotos = (data.images?.length || 0);
  const existingPhotos = (data.image_urls?.length || 0);
  const photoCount = newPhotos + existingPhotos;
  
  if (photoCount === 0) {
    suggestions.push('Adicione fotos do imóvel. Mínimo: 10 fotos (+20 pontos)');
    photosScore = 0;
  } else if (photoCount < 5) {
    suggestions.push(`Adicione mais fotos (${photoCount}/10). Anúncios com 10+ fotos têm 40% mais visualizações (+${20 - photosScore} pontos)`);
    photosScore = 5;
  } else if (photoCount >= 5 && photoCount < 10) {
    photosScore = 12;
    suggestions.push(`Bom! Adicione mais ${10 - photoCount} fotos para atingir o ideal (+8 pontos)`);
  } else if (photoCount >= 10 && photoCount < 15) {
    photosScore = 18;
    suggestions.push('Ótimo! Adicione mais fotos para máximo impacto (+2 pontos)');
  } else {
    photosScore = 20; // Ideal: 15+ fotos
  }

  // ===== CÁLCULO FINAL =====
  const totalScore = titleScore + descriptionScore + keywordsScore + photosScore;

  // Determinar nível
  let level: 'poor' | 'fair' | 'good' | 'excellent';
  if (totalScore < 50) {
    level = 'poor';
  } else if (totalScore < 70) {
    level = 'fair';
  } else if (totalScore < 85) {
    level = 'good';
  } else {
    level = 'excellent';
  }

  // Adicionar dicas gerais baseadas no nível
  if (level === 'excellent') {
    suggestions.unshift('🎉 Excelente! Seu anúncio está otimizado para máxima conversão!');
  } else if (level === 'good') {
    suggestions.unshift('✅ Bom trabalho! Seu anúncio está bem estruturado.');
  } else if (level === 'fair') {
    suggestions.unshift('⚠️ Razoável. Implemente as sugestões abaixo para melhorar.');
  } else {
    suggestions.unshift('❌ Crítico. Seu anúncio precisa de melhorias urgentes.');
  }

  return {
    total: totalScore,
    breakdown: {
      title: titleScore,
      description: descriptionScore,
      keywords: keywordsScore,
      photos: photosScore,
    },
    suggestions,
    level,
  };
};

// Cores para o score
export const getScoreColor = (score: number): { bg: string; text: string; border: string } => {
  if (score >= 85) {
    return { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' };
  } else if (score >= 70) {
    return { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' };
  } else if (score >= 50) {
    return { bg: 'bg-yellow-50 dark:bg-yellow-900/20', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800' };
  } else {
    return { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' };
  }
};

export const getScoreLabel = (score: number): string => {
  if (score >= 85) return 'Excelente';
  if (score >= 70) return 'Bom';
  if (score >= 50) return 'Razoável';
  return 'Precisa Melhorar';
};
