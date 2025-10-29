/**
 * Utility functions for formatting data
 * Centralized to avoid code duplication
 */

/**
 * Format price values to Brazilian currency format
 * @param price - The price value (number or string)
 * @param fallback - Fallback text when price is null/undefined
 * @returns Formatted currency string
 */
export const formatPrice = (
  price: number | string | null | undefined,
  fallback = 'Preço sob consulta'
): string => {
  if (!price) return fallback;
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numPrice);
};

/**
 * Format date to Brazilian locale
 * @param date - Date string or Date object
 * @param fallback - Fallback text when date is invalid
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export const formatDate = (
  date: string | Date | null | undefined,
  fallback = 'Não informado',
  options?: Intl.DateTimeFormatOptions
): string => {
  if (!date) return fallback;
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('pt-BR', options || {});
  } catch {
    return fallback;
  }
};

/**
 * Format area with unit
 * @param area - Area value
 * @param unit - Unit (default: 'm²')
 * @param fallback - Fallback text when area is null/undefined
 * @returns Formatted area string
 */
export const formatArea = (
  area: number | null | undefined,
  unit = 'm²',
  fallback = 'Não informado'
): string => {
  if (!area) return fallback;
  return `${area}${unit}`;
};

/**
 * Formata external_id para exibição curta e padronizada
 * Para IDs no formato oficial 'QD-######', retorna como está (uppercased)
 * Para formatos antigos, exibe prefixo + primeiro segmento
 */
export const formatExternalId = (
  id?: string | null,
  fallback: string = '—'
): string => {
  if (!id) return fallback;
  const s = String(id).trim();
  if (!s) return fallback;

  // Formato padrão: QD-######
  if (/^QD-\d{6}$/i.test(s)) {
    return s.toUpperCase();
  }

  // Legado: exibir prefixo + primeiro segmento após '-'
  const parts = s.split('-');
  if (parts.length > 1) {
    return `${parts[0]}-${parts[1] || ''}`.trim();
  }

  // Sem separador: truncar
  return s.length > 14 ? s.slice(0, 14) : s;
};
