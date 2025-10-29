-- Migration: Add property_standard and negotiation fields
-- Date: 2025-10-22
-- Description: Adiciona campos de classificação de imóvel e facilidades de negociação

-- Add property_standard column
ALTER TABLE property ADD COLUMN IF NOT EXISTS property_standard VARCHAR(50);

-- Add negotiation fields
ALTER TABLE property ADD COLUMN IF NOT EXISTS accepts_financing BOOLEAN DEFAULT false;
ALTER TABLE property ADD COLUMN IF NOT EXISTS financing_details TEXT;
ALTER TABLE property ADD COLUMN IF NOT EXISTS accepts_exchange BOOLEAN DEFAULT false;
ALTER TABLE property ADD COLUMN IF NOT EXISTS exchange_details TEXT;

-- Add comments for documentation
COMMENT ON COLUMN property.property_standard IS 'Classificação do imóvel: ECONOMIC, MEDIUM, MEDIUM_HIGH, HIGH, LUXURY';
COMMENT ON COLUMN property.accepts_financing IS 'Aceita financiamento bancário';
COMMENT ON COLUMN property.financing_details IS 'Detalhes sobre o financiamento aceito';
COMMENT ON COLUMN property.accepts_exchange IS 'Aceita permuta/troca';
COMMENT ON COLUMN property.exchange_details IS 'Descrição do que aceita como permuta';
