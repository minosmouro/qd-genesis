# Modelo para empreendimentos/condomínios
from datetime import datetime
from extensions import db
import re

class Empreendimento(db.Model):
    __tablename__ = 'empreendimentos'
    
    # Campos principais
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False, index=True)
    
    # Endereço (estruturado)
    cep = db.Column(db.String(10), nullable=False, index=True)
    endereco = db.Column(db.String(255), nullable=False)
    numero = db.Column(db.String(20))
    complemento = db.Column(db.String(100))
    bairro = db.Column(db.String(100), nullable=False, index=True)
    cidade = db.Column(db.String(100), nullable=False, index=True)
    estado = db.Column(db.String(2), nullable=False)
    ponto_referencia = db.Column(db.String(255))
    zona = db.Column(db.String(50))
    
    # Informações estruturais
    andares = db.Column(db.Integer)
    unidades_por_andar = db.Column(db.Integer)
    blocos = db.Column(db.Integer)
    entrega_em = db.Column(db.String(7))  # Formato YYYY-MM (otimizado para 7 chars)
    
    # Características (JSON array - compatível com PostgreSQL/MySQL 5.7+)
    caracteristicas = db.Column(db.JSON)  # ['pool', 'gym', 'playground', etc.]
    caracteristicas_personalizadas = db.Column(db.Text)
    
    # Metadados
    ativo = db.Column(db.Boolean, default=True)
    total_imoveis = db.Column(db.Integer, default=0)  # Contador GLOBAL de imóveis cadastrados (todos os corretores)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'), nullable=False)  # Rastreabilidade: quem criou
    created_at = db.Column(db.DateTime, server_default=db.func.now())
    updated_at = db.Column(db.DateTime, server_default=db.func.now(), onupdate=db.func.now())
    
    # Relacionamentos
    tenant = db.relationship('Tenant', backref='empreendimentos')  # Tenant que criou (auditoria)
    
    # ✅ NOVO: Relacionamento bidirecional com Property
    imoveis = db.relationship(
        'Property',
        backref=db.backref('empreendimento', lazy='joined'),
        lazy='dynamic',
        foreign_keys='Property.empreendimento_id'
    )
    
    # Índices compostos para buscas eficientes
    __table_args__ = (
        db.Index('idx_nome_cep', 'nome', 'cep'),
        db.Index('idx_cidade_bairro', 'cidade', 'bairro'),
        db.Index('idx_busca_completa', 'nome', 'bairro', 'cidade'),
        db.Index('idx_tenant_nome', 'tenant_id', 'nome'),
    )
    
    def to_dict(self):
        """Converte o modelo para dicionário compatível com o frontend"""
        return {
            'id': self.id,
            'nome': self.nome,
            'endereco': {
                'cep': self.cep,
                'endereco': self.endereco,
                'numero': self.numero,
                'complemento': self.complemento,
                'bairro': self.bairro,
                'cidade': self.cidade,
                'estado': self.estado,
                'pontoReferencia': self.ponto_referencia,
                'zona': self.zona
            },
            'informacoes': {
                'andares': self.andares,
                'unidadesPorAndar': self.unidades_por_andar,
                'blocos': self.blocos,
                'entregaEm': self.entrega_em,
                'caracteristicas': self.caracteristicas or [],
                'caracteristicasPersonalizadas': self.caracteristicas_personalizadas
            },
            'ativo': self.ativo,
            'totalImoveis': self.total_imoveis,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None
        }
    
    @classmethod
    def from_dict(cls, data, tenant_id):
        """Cria instância a partir de dicionário do frontend

        Normaliza CEP (remove caracteres não numéricos) para armazenar em formato consistente
        e garante que 'caracteristicas' seja uma lista mesmo se não fornecido.
        """
        endereco = data.get('endereco', {})
        informacoes = data.get('informacoes', {})

        cep_raw = endereco.get('cep') or ''
        cep_clean = re.sub(r'[^0-9]', '', cep_raw) if cep_raw else None

        caracteristicas_val = informacoes.get('caracteristicas', [])
        if caracteristicas_val is None:
            caracteristicas_val = []

        return cls(
            nome=data['nome'],
            cep=cep_clean,
            endereco=endereco.get('logradouro') or endereco.get('endereco'),  # Frontend envia como 'logradouro'
            numero=endereco.get('numero'),
            complemento=endereco.get('complemento'),
            bairro=endereco.get('bairro'),
            cidade=endereco.get('cidade'),
            estado=endereco.get('estado'),
            ponto_referencia=endereco.get('pontoReferencia'),
            zona=endereco.get('zona'),
            andares=informacoes.get('andares'),
            unidades_por_andar=informacoes.get('unidadesPorAndar'),
            blocos=informacoes.get('blocos'),
            entrega_em=informacoes.get('entregaEm'),
            caracteristicas=caracteristicas_val,
            caracteristicas_personalizadas=informacoes.get('caracteristicasPersonalizadas'),
            tenant_id=tenant_id
        )
    
    def __repr__(self):
        return f'<Empreendimento {self.nome} - {self.bairro}, {self.cidade}>'
