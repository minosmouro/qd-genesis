"""
Modelos principais do backend Gandalf.
Padronização: Todos os campos de data/hora são UTC offset-aware.
"""
from datetime import datetime, timezone
from extensions import db  # pylint: disable=import-error
from sqlalchemy.dialects.postgresql import JSONB
# PADRÃO GLOBAL: Todas as datas/hora do projeto são UTC offset-aware
# Use sempre datetime.now(timezone.utc) para garantir UTC
# Ao receber datas do frontend, converter para UTC antes de salvar
# Ao serializar datas, sempre usar ISO 8601 com sufixo 'Z'

# Empreendimento model moved to empreendimentos/models/empreendimento.py
# Import it from there: from empreendimentos.models import Empreendimento

class Tenant(db.Model):  # pylint: disable=too-few-public-methods
    """Representa um tenant (cliente) do sistema Gandalf."""
    __tablename__ = 'tenant'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), unique=True, nullable=False)
    
    # Tipo de tenant: 'PF' (Pessoa Física - Corretor Autônomo) ou 'PJ' (Pessoa Jurídica - Imobiliária)
    tenant_type = db.Column(db.String(2), nullable=False, default='PJ')
    
    # Campos para Pessoa Física (Corretor Autônomo)
    cpf = db.Column(db.String(14), nullable=True)  # XXX.XXX.XXX-XX
    full_name = db.Column(db.String(200), nullable=True)
    birth_date = db.Column(db.Date, nullable=True)
    
    # Campos para Pessoa Jurídica (Imobiliária)
    cnpj = db.Column(db.String(18), nullable=True)  # XX.XXX.XXX/XXXX-XX
    company_name = db.Column(db.String(200), nullable=True)
    trade_name = db.Column(db.String(200), nullable=True)
    
    # Campos comuns
    email = db.Column(db.String(120), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    creci = db.Column(db.String(20), nullable=True)  # Registro no CRECI
    
    # Endereço
    zip_code = db.Column(db.String(10), nullable=True)
    street = db.Column(db.String(300), nullable=True)  # Logradouro
    number = db.Column(db.String(10), nullable=True)   # Número
    complement = db.Column(db.String(100), nullable=True)  # Complemento (Qd. Lt.)
    neighborhood = db.Column(db.String(100), nullable=True)  # Bairro
    city = db.Column(db.String(100), nullable=True)
    state = db.Column(db.String(2), nullable=True)
    country = db.Column(db.String(50), nullable=True, default='Brasil')
    address = db.Column(db.String(300), nullable=True)  # Endereço completo (gerado automaticamente)
    
    # Metadados
    is_master = db.Column(db.Boolean, nullable=False, default=False)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f'<Tenant {self.name} ({self.tenant_type})>'
    
    def to_dict(self):
        """Serializa o tenant para dicionário."""
        return {
            'id': self.id,
            'name': self.name,
            'tenant_type': self.tenant_type,
            'cpf': self.cpf,
            'full_name': self.full_name,
            'birth_date': self.birth_date.isoformat() if self.birth_date else None,
            'cnpj': self.cnpj,
            'company_name': self.company_name,
            'trade_name': self.trade_name,
            'email': self.email,
            'phone': self.phone,
            'creci': self.creci,
            'zip_code': self.zip_code,
            'street': self.street,
            'number': self.number,
            'complement': self.complement,
            'neighborhood': self.neighborhood,
            'city': self.city,
            'state': self.state,
            'country': self.country,
            'address': self.address,
            'is_master': self.is_master,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class User(db.Model):  # pylint: disable=too-few-public-methods
    """Usuário do sistema Gandalf."""
    __tablename__ = 'user'
    __table_args__ = (
        db.UniqueConstraint('username', 'tenant_id', name='_username_tenant_uc'),
        db.UniqueConstraint('email', 'tenant_id', name='_email_tenant_uc'),
        {'extend_existing': True}
    )
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    password = db.Column(db.String(255), nullable=False)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'), nullable=False)
    
    # ✅ NOVO: Campo para super admin (pode aprovar edições de empreendimentos)
    is_admin = db.Column(db.Boolean, nullable=False, default=False)

    def __repr__(self):
        return f'<User {self.username}>'


class Property(db.Model):  # pylint: disable=too-few-public-methods
    """Modelo de imóvel cadastrado no sistema Gandalf."""
    __tablename__ = 'property'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=True)
    external_id = db.Column(db.String(100), nullable=False)
    # Código padronizado do imóvel (ex: AP2536-1)
    property_code = db.Column(db.String(50), nullable=True, index=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'), nullable=False)

    # Campos adicionais para integração/processamento
    image_urls = db.Column(db.JSON, nullable=True)
    status = db.Column(db.String(50), nullable=False, server_default='pending')
    remote_id = db.Column(db.String(255), nullable=True)
    error = db.Column(db.Text, nullable=True)

    # CanalPro / Vivareal mappings
    provider_raw = db.Column(db.JSON, nullable=True)  # payload original

    # Address
    address_street = db.Column(db.String(255), nullable=True)
    address_number = db.Column(db.String(50), nullable=True)
    address_complement = db.Column(db.String(255), nullable=True)
    address_neighborhood = db.Column(db.String(255), nullable=True)
    address_city = db.Column(db.String(255), nullable=True)
    address_state = db.Column(db.String(100), nullable=True)
    address_zip = db.Column(db.String(20), nullable=True)
    address_name = db.Column(db.String(255), nullable=True)
    address_location_id = db.Column(db.String(255), nullable=True)
    address_precision = db.Column(db.String(50), nullable=True)

    # Campos adicionais de endereço
    address_country = db.Column(db.String(100), nullable=True, default='Brasil')
    address_reference = db.Column(db.String(255), nullable=True)
    address_district = db.Column(db.String(255), nullable=True)
    zoning_type = db.Column(db.String(100), nullable=True)
    urban_zone = db.Column(db.String(100), nullable=True)

    # Geolocation
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    display_latitude = db.Column(db.Float, nullable=True)
    display_longitude = db.Column(db.Float, nullable=True)

    # Pricing / fees
    price = db.Column(db.Numeric, nullable=True)  # price_sale
    price_rent = db.Column(db.Numeric, nullable=True)  # Valor do aluguel
    currency = db.Column(db.String(10), nullable=True)
    condo_fee = db.Column(db.Numeric, nullable=True)
    condo_fee_exempt = db.Column(db.Boolean, nullable=True, default=False)  # Isento de condomínio
    iptu = db.Column(db.Numeric, nullable=True)
    iptu_period = db.Column(db.String(50), nullable=True)
    iptu_exempt = db.Column(db.Boolean, nullable=True, default=False)  # Isento de IPTU

    # Physical attributes
    bedrooms = db.Column(db.Integer, nullable=True)
    bathrooms = db.Column(db.Integer, nullable=True)
    suites = db.Column(db.Integer, nullable=True)
    parking_spaces = db.Column(db.Integer, nullable=True)
    usable_area = db.Column(db.Float, nullable=True)
    total_area = db.Column(db.Float, nullable=True)
    unit_floor = db.Column(db.Integer, nullable=True)
    units_on_floor = db.Column(db.Integer, nullable=True)
    floors = db.Column(db.Integer, nullable=True)
    buildings = db.Column(db.Integer, nullable=True)
    # Novos campos: unidade e bloco (para apartamentos, flats e studios)
    unit = db.Column(db.String(50), nullable=True)
    block = db.Column(db.String(50), nullable=True)

    # Condominium / Building information
    # NOVO: Relacionamento com empreendimento
    empreendimento_id = db.Column(
        db.Integer,
        db.ForeignKey('empreendimentos.id', ondelete='SET NULL'),
        nullable=True,
        index=True
    )  # FK para empreendimento/condomínio
    
    # Campos legados (mantidos para compatibilidade)
    building_name = db.Column(
        db.String(255), nullable=True
    )  # Nome do empreendimento/condomínio (DEPRECADO - usar empreendimento_id)
    condo_features = db.Column(
        db.JSON, nullable=True
    )  # Características do condomínio (DEPRECADO - usar empreendimento.caracteristicas)
    custom_condo_features = db.Column(
        db.Text, nullable=True
    )  # Características personalizadas do condomínio (DEPRECADO)
    delivery_at = db.Column(
        db.String(4), nullable=True
    )  # Ano de entrega/construção (YYYY) (DEPRECADO - usar empreendimento.entrega_em)

    # Types / classification
    property_type = db.Column(db.String(100), nullable=True)
    category = db.Column(db.String(100), nullable=True)  # Categoria do imóvel (Padrão, Luxo, etc.)
    listing_type = db.Column(db.String(50), nullable=True)
    business_type = db.Column(db.String(50), nullable=True)
    usage_types = db.Column(db.JSON, nullable=True)
    unit_types = db.Column(db.JSON, nullable=True)
    unit_subtypes = db.Column(db.JSON, nullable=True)

    # Property standard & negotiation options (Step 4 - Values)
    property_standard = db.Column(db.String(50), nullable=True)  # ECONOMIC, MEDIUM, MEDIUM_HIGH, HIGH, LUXURY
    accepts_financing = db.Column(db.Boolean, nullable=True, default=False)  # Aceita financiamento bancário
    financing_details = db.Column(db.Text, nullable=True)  # Detalhes sobre o financiamento aceito
    accepts_exchange = db.Column(db.Boolean, nullable=True, default=False)  # Aceita permuta/troca
    exchange_details = db.Column(db.Text, nullable=True)  # O que aceita como permuta

    # Media & moderation
    videos = db.Column(db.JSON, nullable=True)
    video_tour_link = db.Column(db.String(512), nullable=True)
    portals = db.Column(db.JSON, nullable=True)
    stamps = db.Column(db.JSON, nullable=True)
    amenities = db.Column(db.JSON, nullable=True)
    features = db.Column(db.JSON, nullable=True)  # Características do imóvel selecionadas
    custom_features = db.Column(db.Text, nullable=True)  # Características personalizadas
    moderations = db.Column(db.JSON, nullable=True)

    # Metrics
    score = db.Column(db.Float, nullable=True)
    score_name = db.Column(db.String(100), nullable=True)
    score_status = db.Column(db.String(100), nullable=True)

    # Publication / timestamps
    # Tipo de publicação (STANDARD, PREMIUM, SUPER_PREMIUM, PREMIERE_1, PREMIERE_2, TRIPLE)
    publication_type = db.Column(db.String(50), nullable=True, default='STANDARD')
    published_at = db.Column(db.DateTime(timezone=True), nullable=True)
    delivered_at = db.Column(db.DateTime(timezone=True), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    # Relacionamento com Empreendimento (lazy import para evitar circular dependency)
    # O backref 'imoveis' permite acessar todos os imóveis de um empreendimento
    # Exemplo: empreendimento.imoveis.all()
    
    __table_args__ = (
        db.UniqueConstraint('external_id', 'tenant_id', name='_external_tenant_uc'),
        db.UniqueConstraint('property_code', 'tenant_id', name='_property_code_tenant_uc'),
    )

    def __repr__(self):
        return f'<Property {self.title}>'


class IntegrationCredentials(db.Model):  # pylint: disable=too-few-public-methods
    """Credenciais de integração por tenant.

    Armazenar token_encrypted (usar KMS/secret manager em produção) e metadata opcional.
    """
    __tablename__ = 'integration_credentials'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    provider = db.Column(db.String(100), nullable=False)  # ex: 'gandalf', 'openai'
    token_encrypted = db.Column(db.Text, nullable=False)
    refresh_token_encrypted = db.Column(db.Text, nullable=True)
    last_validated_at = db.Column(db.DateTime(timezone=True), nullable=True)
    last_validated_ok = db.Column(db.Boolean, nullable=True)
    metadata_json = db.Column('metadata', db.JSON, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    expires_at = db.Column(db.DateTime(timezone=True), nullable=True)

    __table_args__ = (
        db.UniqueConstraint('tenant_id', 'provider', name='_tenant_provider_uc'),
    )

    def __repr__(self):
        return (
            f'<IntegrationCredentials tenant={self.tenant_id} ' 
            f'provider={self.provider}>'
        )


class RefreshSchedule(db.Model):  # pylint: disable=too-few-public-methods
    """
    Lista de agendamento de refresh para imóveis
    Permite criar listas configuráveis com horários e frequências específicas
    """
    __tablename__ = 'refresh_schedule'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # "Lista 01", "Lista VIP", etc
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'), nullable=False)
    time_slot = db.Column(db.Time, nullable=False)  # Horário de execução (ex: 09:30:00)
    frequency_days = db.Column(db.Integer, nullable=False, default=1)  # 1=diário, 7=semanal
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    next_run = db.Column(db.DateTime(timezone=True), nullable=True)  # Próxima execução calculada
    last_run = db.Column(db.DateTime(timezone=True), nullable=True)  # Última execução realizada
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    days_of_week = db.Column(
        db.JSON,
        nullable=False,
        default=lambda: [1, 2, 3, 4, 5]
    )

    # Relacionamentos
    properties = db.relationship(
        'Property',
        secondary='refresh_schedule_properties',
        backref=db.backref('refresh_schedules', lazy='dynamic'),
        lazy='dynamic'
    )

    
    def __repr__(self):
        return (
            f'<RefreshSchedule {self.name} tenant={self.tenant_id} ' 
            f'time={self.time_slot}>'
        )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'tenant_id': self.tenant_id,
            'time_slot': self.time_slot.strftime('%H:%M') if self.time_slot else None,
            'execution_time': self.time_slot.strftime('%H:%M') if self.time_slot else None,
            'days_of_week': self.days_of_week,
            'frequency_days': self.frequency_days,
            'is_active': self.is_active,
            'next_run': self.next_run.isoformat() if self.next_run else None,
            'next_execution': self.next_run.isoformat() if self.next_run else None,
            'last_run': self.last_run.isoformat() if self.last_run else None,
            'properties_count': self.properties.count(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

    def ensure_utc(self):
        if self.next_run is not None and self.next_run.tzinfo is None:
            self.next_run = self.next_run.replace(tzinfo=timezone.utc)
        if self.last_run is not None and self.last_run.tzinfo is None:
            self.last_run = self.last_run.replace(tzinfo=timezone.utc)
        if self.created_at is not None and self.created_at.tzinfo is None:
            self.created_at = self.created_at.replace(tzinfo=timezone.utc)
        if self.updated_at is not None and self.updated_at.tzinfo is None:
            self.updated_at = self.updated_at.replace(tzinfo=timezone.utc)


class RefreshScheduleProperty(db.Model):  # pylint: disable=too-few-public-methods
    """
    Tabela de relacionamento many-to-many entre RefreshSchedule e Property
    """
    __tablename__ = 'refresh_schedule_properties'

    id = db.Column(db.Integer, primary_key=True)
    refresh_schedule_id = db.Column(
        db.Integer,
        db.ForeignKey('refresh_schedule.id', ondelete='CASCADE'),
        nullable=False
    )
    property_id = db.Column(
        db.Integer,
        db.ForeignKey('property.id', ondelete='CASCADE'),
        nullable=False
    )
    added_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Constraint unique para evitar duplicatas
    __table_args__ = (
        db.UniqueConstraint('refresh_schedule_id', 'property_id', name='_schedule_property_uc'),
    )

    def __repr__(self):
        return (
            f'<RefreshScheduleProperty schedule={self.refresh_schedule_id} ' \
            f'property={self.property_id}>'
        )


class RefreshJob(db.Model):  # pylint: disable=too-few-public-methods
    """
    Job de refresh de propriedade
    Representa uma tarefa de refresh agendada ou manual
    """
    __tablename__ = 'refresh_jobs'

    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(
        db.Integer,
        db.ForeignKey('property.id', ondelete='CASCADE'),
        nullable=False
    )
    refresh_schedule_id = db.Column(
        db.Integer,
        db.ForeignKey('refresh_schedule.id', ondelete='SET NULL'),
        nullable=True
    )
    status = db.Column(
        db.String(50),
        nullable=False,
        default='pending'
    )  # pending, running, completed, failed, cancelled
    refresh_type = db.Column(
        db.String(50),
        nullable=False,
        default='manual'
    )  # manual, scheduled
    scheduled_at = db.Column(db.DateTime(timezone=True), nullable=True)
    started_at = db.Column(db.DateTime(timezone=True), nullable=True)
    completed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relacionamentos
    property = db.relationship(
        'Property',
        backref=db.backref('refresh_jobs', passive_deletes=True),
        passive_deletes=True
    )
    schedule = db.relationship('RefreshSchedule', backref='refresh_jobs')

    def __repr__(self):
        return (
            f'<RefreshJob {self.id} property={self.property_id} '
            f'status={self.status}>'
        )

    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'refresh_schedule_id': self.refresh_schedule_id,
            'status': self.status,
            'refresh_type': self.refresh_type,
            'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'error_message': self.error_message,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class RefreshOperation(db.Model):  # pylint: disable=too-few-public-methods
    """
    Registra e audita cada operação de refresh manual.
    """
    __tablename__ = 'refresh_operations'

    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id', ondelete='CASCADE'), nullable=False)
    status = db.Column(db.Enum('pending', 'in_progress', 'completed', 'failed', name='refresh_status_enum'), nullable=False, default='pending')
    backup_data = db.Column(db.JSON, nullable=True)
    original_remote_id = db.Column(db.String(100), nullable=True)
    new_remote_id = db.Column(db.String(100), nullable=True)
    started_at = db.Column(db.DateTime(timezone=True), nullable=True)
    completed_at = db.Column(db.DateTime(timezone=True), nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    property = db.relationship(
        'Property',
        backref=db.backref('refresh_operations', lazy='dynamic', passive_deletes=True),
        passive_deletes=True
    )

    def __repr__(self):
        return f'<RefreshOperation {self.id} for property {self.property_id} - {self.status}>'

class PropertyRefreshSchedule(db.Model):  # pylint: disable=too-few-public-methods
    """
    Agendamento de refresh automático para propriedades individuais.
    Gerencia quando cada propriedade deve ser atualizada automaticamente.
    """
    __tablename__ = 'property_refresh_schedules'

    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(
        db.Integer,
        db.ForeignKey('property.id', ondelete='CASCADE'),
        nullable=False
    )
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'), nullable=False)

    # Configurações do agendamento
    enabled = db.Column(db.Boolean, nullable=False, default=True)
    is_running = db.Column(db.Boolean, nullable=False, default=False)

    # Horários e frequência
    schedule_type = db.Column(
        db.String(50),
        nullable=False,
        default='daily'
    )  # daily, weekly, monthly, interval
    schedule_time = db.Column(db.Time, nullable=True)  # Para daily/weekly/monthly
    interval_minutes = db.Column(db.Integer, nullable=True)  # Para interval
    schedule_days = db.Column(db.JSON, nullable=True)  # [1,2,3,4,5] para weekly
    schedule_day_of_month = db.Column(db.Integer, nullable=True)  # Para monthly

    # Controle de execução
    next_run = db.Column(db.DateTime(timezone=True), nullable=True)
    last_run = db.Column(db.DateTime(timezone=True), nullable=True)
    last_success = db.Column(db.DateTime(timezone=True), nullable=True)
    last_failure = db.Column(db.DateTime(timezone=True), nullable=True)

    # Controle de tentativas
    max_retries = db.Column(db.Integer, nullable=False, default=3)
    retry_count = db.Column(db.Integer, nullable=False, default=0)
    retry_delay_minutes = db.Column(db.Integer, nullable=False, default=5)

    # Estatísticas de execução
    total_runs = db.Column(db.Integer, nullable=False, default=0)
    successful_runs = db.Column(db.Integer, nullable=False, default=0)
    failed_runs = db.Column(db.Integer, nullable=False, default=0)

    # Metadados
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relacionamentos
    property = db.relationship(
        'Property',
        backref=db.backref('property_refresh_schedules', lazy='dynamic', passive_deletes=True),
        passive_deletes=True
    )

    __table_args__ = (
        db.UniqueConstraint('property_id', name='_property_schedule_uc'),
    )

    def __repr__(self):
        return (
            f'<PropertyRefreshSchedule property={self.property_id} '
            f'enabled={self.enabled} next_run={self.next_run}>'
        )

    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'tenant_id': self.tenant_id,
            'enabled': self.enabled,
            'is_running': self.is_running,
            'schedule_type': self.schedule_type,
            'schedule_time': self.schedule_time.strftime('%H:%M:%S') if self.schedule_time else None,
            'interval_minutes': self.interval_minutes,
            'schedule_days': self.schedule_days,
            'schedule_day_of_month': self.schedule_day_of_month,
            'next_run': self.next_run.isoformat() if self.next_run else None,
            'last_run': self.last_run.isoformat() if self.last_run else None,
            'last_success': self.last_success.isoformat() if self.last_success else None,
            'last_failure': self.last_failure.isoformat() if self.last_failure else None,
            'max_retries': self.max_retries,
            'retry_count': self.retry_count,
            'retry_delay_minutes': self.retry_delay_minutes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class TokenNotification(db.Model):  # pylint: disable=too-few-public-methods
    """Notificações relacionadas a tokens de integração.
    Armazena alertas e eventos importantes sobre tokens.
    """
    __tablename__ = 'token_notifications'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'), nullable=False)
    notification_type = db.Column(db.String(50), nullable=False)  # token_expiring, renewal_failed, etc
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    severity = db.Column(db.String(20), nullable=False, default='info')  # info, warning, error, critical
    meta_data = db.Column(db.JSON, nullable=True)  # Renomeado de 'metadata' (palavra reservada SQLAlchemy)
    read = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    
    def __repr__(self):
        return f'<TokenNotification {self.id} - {self.notification_type} for Tenant {self.tenant_id}>'
    
    def to_dict(self):
        """Converte notificação para dicionário."""
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'notification_type': self.notification_type,
            'title': self.title,
            'message': self.message,
            'severity': self.severity,
            'metadata': self.meta_data,  # Serializa como 'metadata' para compatibilidade com API
            'read': self.read,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class PropertyRefreshHistory(db.Model):  # pylint: disable=too-few-public-methods
    """
    Histórico de execuções de refresh para auditoria e monitoramento.
    Registra cada tentativa de refresh, sucesso ou falha.
    """
    __tablename__ = 'property_refresh_history'

    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(
        db.Integer,
        db.ForeignKey('property.id', ondelete='CASCADE'),
        nullable=False
    )
    schedule_id = db.Column(
        db.Integer,
        db.ForeignKey('property_refresh_schedules.id', ondelete='SET NULL'),
        nullable=True
    )
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'), nullable=False)

    # Status da execução
    status = db.Column(
        db.String(50),
        nullable=False
    )  # pending, running, completed, failed, cancelled
    execution_type = db.Column(
        db.String(50),
        nullable=False,
        default='scheduled'
    )  # manual, scheduled, retry

    # Tempos
    scheduled_at = db.Column(db.DateTime(timezone=True), nullable=True)
    started_at = db.Column(db.DateTime(timezone=True), nullable=True)
    completed_at = db.Column(db.DateTime(timezone=True), nullable=True)

    # Resultados
    success = db.Column(db.Boolean, nullable=True)
    error_message = db.Column(db.Text, nullable=True)
    duration_seconds = db.Column(db.Float, nullable=True)

    # Dados da execução
    old_remote_id = db.Column(db.String(255), nullable=True)
    new_remote_id = db.Column(db.String(255), nullable=True)
    retry_attempt = db.Column(db.Integer, nullable=False, default=0)

    # Metadados
    created_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at = db.Column(
        db.DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relacionamentos
    property = db.relationship(
        'Property',
        backref=db.backref('refresh_history', lazy='dynamic', passive_deletes=True),
        passive_deletes=True
    )
    schedule = db.relationship(
        'PropertyRefreshSchedule',
        backref=db.backref('history', lazy='dynamic')
    )

    def __repr__(self):
        return (
            f'<PropertyRefreshHistory property={self.property_id} '
            f'status={self.status} success={self.success}>'
        )

    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'schedule_id': self.schedule_id,
            'tenant_id': self.tenant_id,
            'status': self.status,
            'execution_type': self.execution_type,
            'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'success': self.success,
            'error_message': self.error_message,
            'duration_seconds': self.duration_seconds,
            'old_remote_id': self.old_remote_id,
            'new_remote_id': self.new_remote_id,
            'retry_attempt': self.retry_attempt,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class TokenScheduleConfig(db.Model):
    """Configuração de agendamento da renovação de token."""
    __tablename__ = 'token_schedule_config'
    
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, nullable=False, index=True)
    provider = db.Column(db.String(50), nullable=False)  # 'gandalf' (CanalPro)
    
    # Configuração de agendamento
    schedule_mode = db.Column(db.String(20), nullable=False, default='automatic')  # automatic, manual_once, manual_recurring
    schedule_hour = db.Column(db.String(2), nullable=True)    # 00-23
    schedule_minute = db.Column(db.String(2), nullable=True)  # 00, 15, 30, 45
    
    # Metadados
    enabled = db.Column(db.Boolean, default=True, nullable=False)
    last_execution = db.Column(db.DateTime(timezone=True), nullable=True)
    next_execution = db.Column(db.DateTime(timezone=True), nullable=True)
    
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
    
    __table_args__ = (
        db.UniqueConstraint('tenant_id', 'provider', name='_tenant_provider_schedule_uc'),
    )
    
    def to_dict(self):
        """Serializar para JSON."""
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'provider': self.provider,
            'schedule_mode': self.schedule_mode,
            'schedule_hour': self.schedule_hour,
            'schedule_minute': self.schedule_minute,
            'enabled': self.enabled,
            'last_execution': self.last_execution.isoformat() if self.last_execution else None,
            'next_execution': self.next_execution.isoformat() if self.next_execution else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<TokenScheduleConfig tenant={self.tenant_id} provider={self.provider} mode={self.schedule_mode}>'


class CanalProContract(db.Model):  # pylint: disable=too-few-public-methods
    """
    Configuração de contrato do CanalPro/Gandalf por tenant.
    Armazena limites de anúncios e destaques por tipo de publicação.
    """
    __tablename__ = 'canalpro_contracts'

    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'), nullable=False, index=True)
    provider = db.Column(db.String(50), nullable=False, default='gandalf')  # manter consistência com credenciais

    # Informações do contrato
    contract_number = db.Column(db.String(100), nullable=True)
    max_listings = db.Column(db.Integer, nullable=True)  # número máximo de anúncios permitidos

    # Limites por tipo de publicação (STANDARD, PREMIUM, SUPER_PREMIUM, PREMIERE_1, PREMIERE_2, TRIPLE)
    highlight_limits = db.Column(db.JSON, nullable=False, default=dict)

    # Metadados
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        db.UniqueConstraint('tenant_id', 'provider', name='_tenant_provider_contract_uc'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'provider': self.provider,
            'contract_number': self.contract_number,
            'max_listings': self.max_listings,
            'highlight_limits': self.highlight_limits or {},
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f'<CanalProContract tenant={self.tenant_id} provider={self.provider} max_listings={self.max_listings}>'


# ============================================================================
# SUBSCRIPTION MODELS - Sistema de Planos e Assinaturas
# ============================================================================

import enum


class BillingInterval(enum.Enum):
    """Intervalos de cobrança"""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class SubscriptionStatus(enum.Enum):
    """Status da assinatura"""
    ACTIVE = "active"
    TRIALING = "trialing"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    EXPIRED = "expired"


class InvoiceStatus(enum.Enum):
    """Status da fatura"""
    DRAFT = "draft"
    OPEN = "open"
    PAID = "paid"
    VOID = "void"
    UNCOLLECTIBLE = "uncollectible"


class SubscriptionPlan(db.Model):
    """Planos de assinatura disponíveis"""
    __tablename__ = 'subscription_plans'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    
    # Preços
    price_monthly = db.Column(db.Numeric(10, 2), nullable=False)
    price_quarterly = db.Column(db.Numeric(10, 2))
    price_yearly = db.Column(db.Numeric(10, 2))
    
    # Limites
    max_properties = db.Column(db.Integer, default=100)
    max_users = db.Column(db.Integer, default=5)
    max_highlights = db.Column(db.Integer, default=10)
    max_super_highlights = db.Column(db.Integer, default=3)
    
    # Features
    has_api_access = db.Column(db.Boolean, default=False)
    has_custom_domain = db.Column(db.Boolean, default=False)
    has_priority_support = db.Column(db.Boolean, default=False)
    has_analytics = db.Column(db.Boolean, default=False)
    has_white_label = db.Column(db.Boolean, default=False)
    
    # Metadados
    is_active = db.Column(db.Boolean, default=True)
    is_public = db.Column(db.Boolean, default=True)
    sort_order = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relacionamentos
    subscriptions = db.relationship('TenantSubscription', back_populates='plan', lazy='dynamic')
    
    def __repr__(self):
        return f'<SubscriptionPlan {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'price_monthly': float(self.price_monthly) if self.price_monthly else None,
            'price_quarterly': float(self.price_quarterly) if self.price_quarterly else None,
            'price_yearly': float(self.price_yearly) if self.price_yearly else None,
            'limits': {
                'max_properties': self.max_properties,
                'max_users': self.max_users,
                'max_highlights': self.max_highlights,
                'max_super_highlights': self.max_super_highlights
            },
            'features': {
                'api_access': self.has_api_access,
                'custom_domain': self.has_custom_domain,
                'priority_support': self.has_priority_support,
                'analytics': self.has_analytics,
                'white_label': self.has_white_label
            },
            'is_active': self.is_active,
            'is_public': self.is_public,
            'sort_order': self.sort_order,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class TenantSubscription(db.Model):
    """Assinatura de um tenant a um plano"""
    __tablename__ = 'tenant_subscriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'), nullable=False)
    plan_id = db.Column(db.Integer, db.ForeignKey('subscription_plans.id'), nullable=False)
    
    # Status e datas
    status = db.Column(db.Enum(SubscriptionStatus), default=SubscriptionStatus.ACTIVE, nullable=False)
    billing_interval = db.Column(db.Enum(BillingInterval), default=BillingInterval.MONTHLY, nullable=False)
    
    started_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    current_period_start = db.Column(db.DateTime, nullable=False)
    current_period_end = db.Column(db.DateTime, nullable=False)
    trial_end = db.Column(db.DateTime)
    canceled_at = db.Column(db.DateTime)
    ended_at = db.Column(db.DateTime)
    
    # Valores
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='BRL')
    
    # Metadados
    auto_renew = db.Column(db.Boolean, default=True)
    notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relacionamentos
    tenant = db.relationship('Tenant', backref='tenant_subscriptions')
    plan = db.relationship('SubscriptionPlan', back_populates='subscriptions')
    invoices = db.relationship('Invoice', back_populates='subscription', lazy='dynamic')
    
    def __repr__(self):
        return f'<TenantSubscription tenant={self.tenant_id} plan={self.plan_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'tenant_id': self.tenant_id,
            'plan_id': self.plan_id,
            'plan_name': self.plan.name if self.plan else None,
            'status': self.status.value if self.status else None,
            'billing_interval': self.billing_interval.value if self.billing_interval else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'current_period_start': self.current_period_start.isoformat() if self.current_period_start else None,
            'current_period_end': self.current_period_end.isoformat() if self.current_period_end else None,
            'trial_end': self.trial_end.isoformat() if self.trial_end else None,
            'canceled_at': self.canceled_at.isoformat() if self.canceled_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'amount': float(self.amount) if self.amount else None,
            'currency': self.currency,
            'auto_renew': self.auto_renew,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Invoice(db.Model):
    """Faturas geradas para assinaturas"""
    __tablename__ = 'invoices'
    
    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(50), unique=True, nullable=False)
    subscription_id = db.Column(db.Integer, db.ForeignKey('tenant_subscriptions.id'), nullable=False)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'), nullable=False)
    
    # Status e valores
    status = db.Column(db.Enum(InvoiceStatus), default=InvoiceStatus.DRAFT, nullable=False)
    amount_subtotal = db.Column(db.Numeric(10, 2), nullable=False)
    amount_tax = db.Column(db.Numeric(10, 2), default=0)
    amount_discount = db.Column(db.Numeric(10, 2), default=0)
    amount_total = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='BRL')
    
    # Datas
    issue_date = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    due_date = db.Column(db.DateTime, nullable=False)
    paid_at = db.Column(db.DateTime)
    voided_at = db.Column(db.DateTime)
    
    # Período
    period_start = db.Column(db.DateTime, nullable=False)
    period_end = db.Column(db.DateTime, nullable=False)
    
    # Pagamento
    payment_method = db.Column(db.String(50))
    payment_reference = db.Column(db.String(200))
    
    # Metadados
    description = db.Column(db.Text)
    notes = db.Column(db.Text)
    
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relacionamentos
    subscription = db.relationship('TenantSubscription', back_populates='invoices')
    tenant = db.relationship('Tenant', backref='tenant_invoices')
    
    def __repr__(self):
        return f'<Invoice {self.invoice_number}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'subscription_id': self.subscription_id,
            'tenant_id': self.tenant_id,
            'status': self.status.value if self.status else None,
            'amount_subtotal': float(self.amount_subtotal) if self.amount_subtotal else None,
            'amount_tax': float(self.amount_tax) if self.amount_tax else None,
            'amount_discount': float(self.amount_discount) if self.amount_discount else None,
            'amount_total': float(self.amount_total) if self.amount_total else None,
            'currency': self.currency,
            'issue_date': self.issue_date.isoformat() if self.issue_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'paid_at': self.paid_at.isoformat() if self.paid_at else None,
            'voided_at': self.voided_at.isoformat() if self.voided_at else None,
            'period_start': self.period_start.isoformat() if self.period_start else None,
            'period_end': self.period_end.isoformat() if self.period_end else None,
            'payment_method': self.payment_method,
            'payment_reference': self.payment_reference,
            'description': self.description,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }



# 🤝 PARTNERSHIP MODELS - Sistema de Parcerias Multi-Tenant

class TenantPartnership(db.Model):
    """Represents a partnership relationship between two tenants."""
    __tablename__ = 'tenant_partnership'
    
    id = db.Column(db.Integer, primary_key=True)
    owner_tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id', ondelete='CASCADE'), nullable=False)
    partner_tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id', ondelete='CASCADE'), nullable=False)
    
    # Status: pending, active, rejected, cancelled
    status = db.Column(db.String(20), nullable=False, default='pending')
    
    # Commission agreement (percentage)
    commission_percentage = db.Column(db.Numeric(5, 2), nullable=True)
    
    # Additional terms
    notes = db.Column(db.Text, nullable=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    accepted_at = db.Column(db.DateTime(timezone=True), nullable=True)
    rejected_at = db.Column(db.DateTime(timezone=True), nullable=True)
    cancelled_at = db.Column(db.DateTime(timezone=True), nullable=True)
    
    # Relationships
    owner_tenant = db.relationship('Tenant', foreign_keys=[owner_tenant_id], backref='owned_partnerships')
    partner_tenant = db.relationship('Tenant', foreign_keys=[partner_tenant_id], backref='partner_partnerships')
    
    def __repr__(self):
        return f'<TenantPartnership {self.owner_tenant_id} -> {self.partner_tenant_id} [{self.status}]>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'owner_tenant_id': self.owner_tenant_id,
            'partner_tenant_id': self.partner_tenant_id,
            'status': self.status,
            'commission_percentage': float(self.commission_percentage) if self.commission_percentage else None,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'accepted_at': self.accepted_at.isoformat() if self.accepted_at else None,
            'rejected_at': self.rejected_at.isoformat() if self.rejected_at else None,
            'cancelled_at': self.cancelled_at.isoformat() if self.cancelled_at else None,
        }


class PropertySharing(db.Model):
    """Represents sharing of a specific property with tenant(s)."""
    __tablename__ = 'property_sharing'
    
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id', ondelete='CASCADE'), nullable=False)
    owner_tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id', ondelete='CASCADE'), nullable=False)
    
    # NULL = share with all partners, specific ID = share with one partner
    shared_with_tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id', ondelete='CASCADE'), nullable=True)
    
    # Sharing type: partnership, marketplace, exclusive
    sharing_type = db.Column(db.String(20), nullable=False, default='partnership')
    
    # Permissions
    can_edit = db.Column(db.Boolean, nullable=False, default=False)
    can_export = db.Column(db.Boolean, nullable=False, default=True)
    
    # Override commission for this specific sharing
    commission_override = db.Column(db.Numeric(5, 2), nullable=True)
    
    # Custom terms for this sharing
    custom_terms = db.Column(db.Text, nullable=True)
    
    # Expiration
    expires_at = db.Column(db.DateTime(timezone=True), nullable=True)
    
    # Status
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    property = db.relationship('Property', backref='sharings')
    owner_tenant = db.relationship('Tenant', foreign_keys=[owner_tenant_id])
    shared_with_tenant = db.relationship('Tenant', foreign_keys=[shared_with_tenant_id])
    
    def __repr__(self):
        return f'<PropertySharing property={self.property_id} shared_with={self.shared_with_tenant_id}>'
    
    def is_expired(self):
        """Check if this sharing has expired."""
        if not self.expires_at:
            return False
        return datetime.now(timezone.utc) > self.expires_at
    
    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'owner_tenant_id': self.owner_tenant_id,
            'shared_with_tenant_id': self.shared_with_tenant_id,
            'sharing_type': self.sharing_type,
            'can_edit': self.can_edit,
            'can_export': self.can_export,
            'commission_override': float(self.commission_override) if self.commission_override else None,
            'custom_terms': self.custom_terms,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_active': self.is_active,
            'is_expired': self.is_expired(),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }


class PropertySharingActivity(db.Model):
    """Audit log for property sharing activities."""
    __tablename__ = 'property_sharing_activity'
    
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('property.id', ondelete='CASCADE'), nullable=False)
    sharing_id = db.Column(db.Integer, db.ForeignKey('property_sharing.id', ondelete='SET NULL'), nullable=True)
    actor_tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id', ondelete='CASCADE'), nullable=False)
    
    # Action: shared, unshared, viewed, exported, edited, etc.
    action = db.Column(db.String(50), nullable=False)
    
    # Additional details in JSON format
    details = db.Column(JSONB, nullable=True)
    
    # Timestamp
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))
    
    # Relationships
    property = db.relationship('Property')
    sharing = db.relationship('PropertySharing')
    actor_tenant = db.relationship('Tenant')
    
    def __repr__(self):
        return f'<PropertySharingActivity {self.action} on property {self.property_id}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'sharing_id': self.sharing_id,
            'actor_tenant_id': self.actor_tenant_id,
            'action': self.action,
            'details': self.details,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }