-- Migration: Criar tabela de notificações de tokens
-- Data: 2025-10-10
-- Descrição: Adiciona suporte para notificações de eventos de tokens de integração

CREATE TABLE IF NOT EXISTS token_notifications (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'info',
    meta_data JSONB,  -- Renomeado de 'metadata' (palavra reservada)
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_token_notifications_tenant_id ON token_notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_token_notifications_read ON token_notifications(read);
CREATE INDEX IF NOT EXISTS idx_token_notifications_created_at ON token_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_notifications_type ON token_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_token_notifications_severity ON token_notifications(severity);

-- Índice composto para queries comuns
CREATE INDEX IF NOT EXISTS idx_token_notifications_tenant_read ON token_notifications(tenant_id, read);

-- Comentários
COMMENT ON TABLE token_notifications IS 'Notificações relacionadas a tokens de integração';
COMMENT ON COLUMN token_notifications.notification_type IS 'Tipo: token_expiring, renewal_failed, invalid_credentials, etc';
COMMENT ON COLUMN token_notifications.severity IS 'Severidade: info, warning, error, critical';
COMMENT ON COLUMN token_notifications.meta_data IS 'Metadados adicionais em formato JSON';
