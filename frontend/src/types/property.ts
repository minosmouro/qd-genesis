/**
 * Types para propriedades
 */

export interface Property {
  id: number;
  title?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  property_type?: string;
  status?: string;
  canalpro_id?: string;
  // Campos usados em componentes de refresh/seleção
  property_code?: string;
  remote_id?: string;
  // Variações de endereço planas usadas em buscas/exibição
  address_street?: string;
  address_neighborhood?: string;
  address_city?: string;
  created_at?: string;
  updated_at?: string;
}