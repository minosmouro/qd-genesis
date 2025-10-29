# Modelo para sugestões de edição de empreendimentos
from datetime import datetime
from extensions import db

class EmpreendimentoEditSuggestion(db.Model):
    """
    Sugestões de edição de empreendimentos enviadas por corretores
    Apenas super usuário pode aprovar/rejeitar
    """
    __tablename__ = 'empreendimento_edit_suggestions'
    
    id = db.Column(db.Integer, primary_key=True)
    empreendimento_id = db.Column(
        db.Integer, 
        db.ForeignKey('empreendimentos.id', ondelete='CASCADE'),
        nullable=False,
        index=True
    )
    
    # Quem sugeriu a edição
    suggested_by_tenant_id = db.Column(
        db.Integer, 
        db.ForeignKey('tenant.id'),
        nullable=False
    )
    suggested_by_user_id = db.Column(
        db.Integer,
        db.ForeignKey('user.id'),
        nullable=True
    )
    
    # Dados sugeridos (JSON com campos a serem alterados)
    suggested_changes = db.Column(db.JSON, nullable=False)
    # Exemplo: {
    #   "nome": "Novo Nome",
    #   "endereco": {"bairro": "Novo Bairro"},
    #   "informacoes": {"andares": 15}
    # }
    
    # Justificativa da sugestão
    reason = db.Column(db.Text, nullable=True)
    
    # Status da sugestão
    status = db.Column(
        db.String(20), 
        nullable=False, 
        default='pending'
    )  # pending, approved, rejected
    
    # Revisão pelo super usuário
    reviewed_by_user_id = db.Column(
        db.Integer,
        db.ForeignKey('user.id'),
        nullable=True
    )
    reviewed_at = db.Column(db.DateTime, nullable=True)
    review_notes = db.Column(db.Text, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())
    
    # Relacionamentos
    empreendimento = db.relationship('Empreendimento', backref='edit_suggestions')
    suggested_by_tenant = db.relationship(
        'Tenant', 
        foreign_keys=[suggested_by_tenant_id],
        backref='suggested_edits'
    )
    suggested_by_user = db.relationship(
        'User',
        foreign_keys=[suggested_by_user_id],
        backref='suggested_edits'
    )
    reviewed_by_user = db.relationship(
        'User',
        foreign_keys=[reviewed_by_user_id],
        backref='reviewed_suggestions'
    )
    
    # Índices
    __table_args__ = (
        db.Index('idx_status_created', 'status', 'created_at'),
        db.Index('idx_empreendimento_status', 'empreendimento_id', 'status'),
    )
    
    def to_dict(self):
        """Converte para dicionário"""
        return {
            'id': self.id,
            'empreendimento_id': self.empreendimento_id,
            'empreendimento_nome': self.empreendimento.nome if self.empreendimento else None,
            'suggested_changes': self.suggested_changes,
            'reason': self.reason,
            'status': self.status,
            'suggested_by': {
                'tenant_id': self.suggested_by_tenant_id,
                'user_id': self.suggested_by_user_id
            },
            'reviewed_by_user_id': self.reviewed_by_user_id,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'review_notes': self.review_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<EditSuggestion {self.id} for Empreendimento {self.empreendimento_id} [{self.status}]>'
