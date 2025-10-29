-- Migration: Criar tabela de configuração de agendamento de renovação de token
-- Data: 2025-10-10
-- Descrição: Permite configurar agendamento manual (único ou recorrente) para renovação de tokens

-- Criar tabela
CREATE TABLE IF NOT EXISTS token_schedule_config (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    provider VARCHAR(50) NOT NULL,
    
    -- Configuração de agendamento
    schedule_mode VARCHAR(20) NOT NULL DEFAULT 'automatic',
    schedule_hour VARCHAR(2),
    schedule_minute VARCHAR(2),
    
    -- Metadados
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_execution TIMESTAMP WITH TIME ZONE,
    next_execution TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraint: apenas uma configuração por tenant/provider
    CONSTRAINT _tenant_provider_schedule_uc UNIQUE (tenant_id, provider)
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_token_schedule_tenant ON token_schedule_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_token_schedule_enabled ON token_schedule_config(enabled);
CREATE INDEX IF NOT EXISTS idx_token_schedule_next_execution ON token_schedule_config(next_execution);

-- Comentários
COMMENT ON TABLE token_schedule_config IS 'Configuração de agendamento da renovação de token';
COMMENT ON COLUMN token_schedule_config.schedule_mode IS 'Modo: automatic, manual_once, manual_recurring';
COMMENT ON COLUMN token_schedule_config.schedule_hour IS 'Hora da execução (00-23)';
COMMENT ON COLUMN token_schedule_config.schedule_minute IS 'Minuto da execução (00, 15, 30, 45)';
COMMENT ON COLUMN token_schedule_config.next_execution IS 'Próxima execução agendada';

-- Rollback (se necessário):
-- DROP TABLE IF EXISTS token_schedule_config CASCADE;
