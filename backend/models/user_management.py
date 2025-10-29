"""
Modelos para gestão de usuários, roles e permissões em sistema multi-tenant.
"""
from datetime import datetime, timezone
from extensions import db
from sqlalchemy.orm import relationship


class Role(db.Model):
    """Roles disponíveis no sistema (por tenant)"""
    __tablename__ = 'roles'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), nullable=False)  # admin, manager, agent, viewer
    display_name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'), nullable=False)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    is_system_role = db.Column(db.Boolean, default=False)  # Roles padrão do sistema
    
    # Audit
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))
    
    # Constraints
    __table_args__ = (
        db.UniqueConstraint('name', 'tenant_id', name='_role_name_tenant_uc'),
        {'extend_existing': True}
    )
    
    def __repr__(self):
        return f'<Role {self.name} (Tenant {self.tenant_id})>'


class Permission(db.Model):
    """Permissões específicas do sistema"""
    __tablename__ = 'permissions'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False, unique=True)  # properties.create, properties.read
    display_name = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    module = db.Column(db.String(50), nullable=False)  # properties, users, integrations
    
    # Audit
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.now(timezone.utc))
    
    def __repr__(self):
        return f'<Permission {self.name}>'


class RolePermission(db.Model):
    """Associação entre Roles e Permissões"""
    __tablename__ = 'role_permissions'
    
    id = db.Column(db.Integer, primary_key=True)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id', ondelete='CASCADE'), nullable=False)
    permission_id = db.Column(db.Integer, db.ForeignKey('permissions.id', ondelete='CASCADE'), nullable=False)
    
    # Relationships
    role = relationship('Role', backref='role_permissions')
    permission = relationship('Permission', backref='role_permissions')
    
    # Audit
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.now(timezone.utc))
    
    # Constraints
    __table_args__ = (
        db.UniqueConstraint('role_id', 'permission_id', name='_role_permission_uc'),
        {'extend_existing': True}
    )


class UserRole(db.Model):
    """Associação entre Usuários e Roles"""
    __tablename__ = 'user_roles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id', ondelete='CASCADE'), nullable=False)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # Metadata
    assigned_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    assigned_at = db.Column(db.DateTime(timezone=True), default=datetime.now(timezone.utc))
    
    # Relationships
    user = relationship('User', foreign_keys=[user_id], backref='user_roles')
    role = relationship('Role', backref='user_roles')
    assigned_by = relationship('User', foreign_keys=[assigned_by_user_id])
    
    # Constraints
    __table_args__ = (
        db.UniqueConstraint('user_id', 'role_id', name='_user_role_uc'),
        {'extend_existing': True}
    )


class UserSession(db.Model):
    """Controle de sessões de usuário"""
    __tablename__ = 'user_sessions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    token_jti = db.Column(db.String(36), nullable=False, unique=True)  # JWT ID
    
    # Session info
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(500), nullable=True)
    device_info = db.Column(db.JSON, nullable=True)
    
    # Status
    is_active = db.Column(db.Boolean, default=True)
    
    # Timestamps
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.now(timezone.utc))
    last_activity = db.Column(db.DateTime(timezone=True), default=datetime.now(timezone.utc))
    expires_at = db.Column(db.DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship('User', backref='sessions')
    
    def __repr__(self):
        return f'<UserSession {self.token_jti} (User {self.user_id})>'


class UserProfile(db.Model):
    """Perfil extendido do usuário"""
    __tablename__ = 'user_profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    
    # Personal info
    first_name = db.Column(db.String(100), nullable=True)
    last_name = db.Column(db.String(100), nullable=True)
    display_name = db.Column(db.String(200), nullable=True)
    phone = db.Column(db.String(20), nullable=True)
    avatar_url = db.Column(db.String(500), nullable=True)
    
    # Professional info
    position = db.Column(db.String(100), nullable=True)
    department = db.Column(db.String(100), nullable=True)
    
    # Preferences
    language = db.Column(db.String(10), default='pt-BR')
    timezone = db.Column(db.String(50), default='America/Sao_Paulo')
    theme = db.Column(db.String(20), default='light')
    
    # Status
    is_email_verified = db.Column(db.Boolean, default=False)
    is_phone_verified = db.Column(db.Boolean, default=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime(timezone=True), default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))
    
    # Relationships
    user = relationship('User', backref=db.backref('profile', uselist=False))
    
    def get_full_name(self):
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.display_name or self.user.username
    
    def __repr__(self):
        return f'<UserProfile {self.get_full_name()} (User {self.user_id})>'


class UserInvitation(db.Model):
    """Convites para usuários"""
    __tablename__ = 'user_invitations'
    
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenant.id'), nullable=False)
    
    # Invitation info
    email = db.Column(db.String(120), nullable=False)
    token = db.Column(db.String(100), nullable=False, unique=True)
    role_id = db.Column(db.Integer, db.ForeignKey('roles.id'), nullable=True)
    
    # Metadata
    invited_by_user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    message = db.Column(db.Text, nullable=True)
    
    # Status
    status = db.Column(db.String(20), default='pending')  # pending, accepted, expired, cancelled
    
    # Timestamps
    created_at = db.Column(db.DateTime(timezone=True), default=datetime.now(timezone.utc))
    expires_at = db.Column(db.DateTime(timezone=True), nullable=False)
    accepted_at = db.Column(db.DateTime(timezone=True), nullable=True)
    
    # Relationships
    tenant = relationship('Tenant')
    invited_by = relationship('User')
    role = relationship('Role')
    
    # Constraints
    __table_args__ = (
        db.Index('idx_invitation_email_tenant', 'email', 'tenant_id'),
        {'extend_existing': True}
    )
    
    def is_valid(self):
        return (
            self.status == 'pending' and 
            self.expires_at > datetime.now(timezone.utc)
        )
    
    def __repr__(self):
        return f'<UserInvitation {self.email} (Tenant {self.tenant_id})>'
