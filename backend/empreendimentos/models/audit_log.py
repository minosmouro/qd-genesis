# Modelo de auditoria para empreendimentos
from datetime import datetime
from extensions import db

class EmpreendimentoAuditLog(db.Model):
    """Log de auditoria para mudanças em empreendimentos
    
    Registra QUEM, QUANDO e O QUE foi alterado nos empreendimentos compartilhados.
    Permite rastreabilidade completa das mudanças feitas por diferentes corretores.
    """
    __tablename__ = 'empreendimento_audit_log'
    
    id = db.Column(db.Integer, primary_key=True)
    empreendimento_id = db.Column(db.Integer, db.ForeignKey('empreendimentos.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='SET NULL'), nullable=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id', ondelete='SET NULL'), nullable=True)
    
    # Tipo de ação
    action = db.Column(db.String(50), nullable=False)  # 'create', 'update', 'delete'
    
    # Detalhes da mudança
    field_name = db.Column(db.String(100), nullable=True)  # Ex: 'caracteristicas', 'nome', 'andares'
    old_value = db.Column(db.JSON, nullable=True)  # Valor anterior
    new_value = db.Column(db.JSON, nullable=True)  # Novo valor
    changes = db.Column(db.JSON, nullable=True)  # Todas as mudanças (se múltiplos campos)
    
    # Metadados da requisição
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(500), nullable=True)
    
    # Timestamp
    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)
    
    # Relacionamentos
    empreendimento = db.relationship('Empreendimento', backref='audit_logs')
    user = db.relationship('User')
    tenant = db.relationship('Tenant')
    
    def to_dict(self):
        """Converte para dicionário para APIs"""
        return {
            'id': self.id,
            'empreendimento_id': self.empreendimento_id,
            'user_id': self.user_id,
            'tenant_id': self.tenant_id,
            'action': self.action,
            'field_name': self.field_name,
            'old_value': self.old_value,
            'new_value': self.new_value,
            'changes': self.changes,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'user': {
                'id': self.user.id,
                'username': self.user.username,
                'tenant_id': self.user.tenant_id
            } if self.user else None
        }
    
    def __repr__(self):
        return f'<EmpreendimentoAuditLog {self.action} on emp_{self.empreendimento_id} by user_{self.user_id}>'
