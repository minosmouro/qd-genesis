-- Migration: Adicionar relacionamento entre Property e Empreendimento
-- Data: 2025-10-10
-- Descrição: Adiciona FK empreendimento_id na tabela property para vincular imóveis a empreendimentos

-- 1. Adicionar coluna empreendimento_id
ALTER TABLE property 
ADD COLUMN IF NOT EXISTS empreendimento_id INTEGER;

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_property_empreendimento_id 
ON property(empreendimento_id);

-- 3. Adicionar foreign key constraint
ALTER TABLE property
ADD CONSTRAINT fk_property_empreendimento
FOREIGN KEY (empreendimento_id) 
REFERENCES empreendimentos(id) 
ON DELETE SET NULL;

-- 4. Comentários
COMMENT ON COLUMN property.empreendimento_id IS 'FK para empreendimento/condomínio. Substitui building_name (campo legado).';

-- 5. Atualizar campos legados (opcional - comentar se não quiser executar agora)
-- COMMENT ON COLUMN property.building_name IS 'DEPRECADO: Usar empreendimento_id. Mantido para compatibilidade.';
-- COMMENT ON COLUMN property.condo_features IS 'DEPRECADO: Usar empreendimento.caracteristicas. Mantido para compatibilidade.';
-- COMMENT ON COLUMN property.delivery_at IS 'DEPRECADO: Usar empreendimento.entrega_em. Mantido para compatibilidade.';

-- Rollback (se necessário):
-- ALTER TABLE property DROP CONSTRAINT IF EXISTS fk_property_empreendimento;
-- DROP INDEX IF EXISTS idx_property_empreendimento_id;
-- ALTER TABLE property DROP COLUMN IF EXISTS empreendimento_id;
