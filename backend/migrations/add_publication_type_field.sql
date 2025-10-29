-- Migration: Adicionar campo publication_type para tipo de destaque
-- Data: ${new Date().toISOString().split('T')[0]}
-- Objetivo: Permitir seleção de tipo de destaque CanalPro no cadastro

-- Adicionar coluna publication_type
ALTER TABLE property ADD COLUMN publication_type VARCHAR(50) DEFAULT 'STANDARD';

-- Adicionar índice para consultas por tipo
CREATE INDEX IF NOT EXISTS idx_property_publication_type ON property(publication_type);

-- Adicionar constraint para validação dos valores
ALTER TABLE property ADD CONSTRAINT chk_publication_type 
CHECK (publication_type IN ('STANDARD', 'PREMIUM', 'SUPER_PREMIUM', 'PREMIERE_1', 'PREMIERE_2', 'TRIPLE'));

-- Adicionar comentário para documentação
COMMENT ON COLUMN property.publication_type IS 'Tipo de publicação CanalPro/Gandalf: STANDARD, PREMIUM, SUPER_PREMIUM, PREMIERE_1, PREMIERE_2, TRIPLE';

-- Atualizar propriedades existentes (todas como STANDARD)
UPDATE property SET publication_type = 'STANDARD' WHERE publication_type IS NULL;

-- Log da migração
-- Opcional: registrar migração em log próprio
-- INSERT INTO migration_log (migration_name, executed_at, description) 
-- VALUES ('add_publication_type_field', NOW(), 'Adicionar campo publication_type em property');

COMMIT;
