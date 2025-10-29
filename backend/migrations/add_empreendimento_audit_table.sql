-- Criar tabela de auditoria para empreendimentos
CREATE TABLE IF NOT EXISTS empreendimento_audit_log (
    id SERIAL PRIMARY KEY,
    empreendimento_id INTEGER REFERENCES empreendimentos(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES "user"(id) ON DELETE SET NULL,
    tenant_id INTEGER REFERENCES tenant(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    field_name VARCHAR(100),
    old_value JSON,
    new_value JSON,
    changes JSON,
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Criar índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_audit_empreendimento ON empreendimento_audit_log(empreendimento_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON empreendimento_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON empreendimento_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON empreendimento_audit_log(created_at);

-- Verificar criação
SELECT 'Tabela empreendimento_audit_log criada com sucesso!' as resultado;
