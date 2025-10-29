# Modelo simplificado para teste
from extensions import db

class Empreendimento(db.Model):
    __tablename__ = 'empreendimentos'
    
    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(255), nullable=False)
    cep = db.Column(db.String(10), nullable=False)
    bairro = db.Column(db.String(100), nullable=False)
    cidade = db.Column(db.String(100), nullable=False)
    total_imoveis = db.Column(db.Integer, default=0)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'), nullable=False)
    ativo = db.Column(db.Boolean, default=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'nome': self.nome,
            'endereco': {
                'cep': self.cep,
                'bairro': self.bairro,
                'cidade': self.cidade
            },
            'totalImoveis': self.total_imoveis,
            'ativo': self.ativo
        }
