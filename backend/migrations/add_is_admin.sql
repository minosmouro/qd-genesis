-- Migration: Add is_admin column to user table
-- Date: 2025-10-17

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- Adicionar comentário explicativo
COMMENT ON COLUMN "user".is_admin IS 'Super admin flag - can approve/reject empreendimento edit suggestions';

-- Registrar na tabela alembic_version
INSERT INTO alembic_version (version_num) VALUES ('20251017_add_is_admin_to_user');
