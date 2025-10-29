"""Partnership models for multi-tenant collaboration."""
from extensions import db
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime


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
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
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
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
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
        return datetime.utcnow() > self.expires_at
    
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
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=datetime.utcnow)
    
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
