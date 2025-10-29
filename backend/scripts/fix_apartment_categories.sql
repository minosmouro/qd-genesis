-- ============================================================================
-- Script SQL: Definir categoria 'Padrão' para apartamentos sem categoria
-- ============================================================================
--
-- Este script:
-- 1. Mostra estatísticas ANTES da correção
-- 2. Aplica a correção (UPDATE)
-- 3. Mostra estatísticas DEPOIS da correção
--
-- Uso no Windows PowerShell:
--   Get-Content backend\scripts\fix_apartment_categories.sql | docker-compose exec -T postgres psql -U postgres -d gandalf_db
--
-- Ou diretamente:
--   docker-compose exec -T postgres psql -U postgres -d gandalf_db -f backend/scripts/fix_apartment_categories.sql
--
-- ============================================================================

\echo ''
\echo '🔍 ESTATÍSTICAS ANTES DA CORREÇÃO:'
\echo '===================================='

\echo ''
\echo '📊 Total de apartamentos por categoria:'
SELECT 
  COALESCE(category, '(vazio)') as categoria,
  COUNT(*) as total
FROM property 
WHERE property_type = 'APARTMENT'
GROUP BY category
ORDER BY total DESC;

\echo ''
\echo '📊 Apartamentos SEM categoria:'
SELECT COUNT(*) as apartamentos_sem_categoria
FROM property 
WHERE property_type = 'APARTMENT' 
  AND (category IS NULL OR category = '');

\echo ''
\echo '🔧 APLICANDO CORREÇÃO...'
\echo '========================'

-- UPDATE: Definir categoria 'Padrão' para apartamentos sem categoria
UPDATE property 
SET category = 'Padrão' 
WHERE property_type = 'APARTMENT' 
  AND (category IS NULL OR category = '');

-- Mostrar quantos registros foram atualizados
\echo ''
\echo '✅ Registros atualizados:'
SELECT COUNT(*) as total_atualizado
FROM property 
WHERE property_type = 'APARTMENT' 
  AND category = 'Padrão';

\echo ''
\echo '📊 ESTATÍSTICAS DEPOIS DA CORREÇÃO:'
\echo '===================================='

\echo ''
\echo '📊 Total de apartamentos por categoria:'
SELECT 
  COALESCE(category, '(vazio)') as categoria,
  COUNT(*) as total
FROM property 
WHERE property_type = 'APARTMENT'
GROUP BY category
ORDER BY total DESC;

\echo ''
\echo '✅ CORREÇÃO CONCLUÍDA!'
\echo ''
