"""Service for managing property partnerships and sharing."""
from typing import Tuple, Dict, Any, List, Optional
from flask import g, current_app
from sqlalchemy import or_, and_
from extensions import db
from models import Property, Tenant, TenantPartnership, PropertySharing, PropertySharingActivity
from datetime import datetime


class PartnershipService:
    """Service for managing partnerships between tenants."""
    
    @staticmethod
    def create_partnership(partner_tenant_id: int, commission: Optional[float] = None, notes: Optional[str] = None) -> Tuple[bool, Dict[str, Any]]:
        """Create a partnership request from current tenant to another tenant."""
        try:
            owner_tenant_id = g.tenant_id
            
            # Cannot partner with yourself
            if owner_tenant_id == partner_tenant_id:
                return False, {'message': 'Cannot create partnership with yourself', 'status': 400}
            
            # Check if partner tenant exists
            partner = Tenant.query.filter_by(id=partner_tenant_id, is_active=True).first()
            if not partner:
                return False, {'message': 'Partner tenant not found or inactive', 'status': 404}
            
            # Check if partnership already exists
            existing = TenantPartnership.query.filter(
                or_(
                    and_(
                        TenantPartnership.owner_tenant_id == owner_tenant_id,
                        TenantPartnership.partner_tenant_id == partner_tenant_id
                    ),
                    and_(
                        TenantPartnership.owner_tenant_id == partner_tenant_id,
                        TenantPartnership.partner_tenant_id == owner_tenant_id
                    )
                )
            ).first()
            
            if existing:
                return False, {'message': 'Partnership already exists', 'status': 409}
            
            # Create new partnership
            partnership = TenantPartnership(
                owner_tenant_id=owner_tenant_id,
                partner_tenant_id=partner_tenant_id,
                commission_percentage=commission,
                notes=notes,
                status='pending'
            )
            
            db.session.add(partnership)
            db.session.commit()
            
            current_app.logger.info(f"🤝 Partnership created: {owner_tenant_id} -> {partner_tenant_id}")
            
            return True, {'partnership': partnership.to_dict(), 'status': 201}
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"❌ Error creating partnership: {str(e)}")
            return False, {'message': 'Error creating partnership', 'error': str(e), 'status': 500}
    
    @staticmethod
    def accept_partnership(partnership_id: int) -> Tuple[bool, Dict[str, Any]]:
        """Accept a partnership request (called by partner tenant)."""
        try:
            partnership = TenantPartnership.query.filter_by(
                id=partnership_id,
                partner_tenant_id=g.tenant_id,
                status='pending'
            ).first()
            
            if not partnership:
                return False, {'message': 'Partnership request not found', 'status': 404}
            
            partnership.status = 'active'
            partnership.accepted_at = datetime.utcnow()
            db.session.commit()
            
            current_app.logger.info(f"✅ Partnership accepted: {partnership_id}")
            
            return True, {'partnership': partnership.to_dict(), 'status': 200}
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"❌ Error accepting partnership: {str(e)}")
            return False, {'message': 'Error accepting partnership', 'error': str(e), 'status': 500}
    
    @staticmethod
    def get_my_partnerships() -> Tuple[bool, Dict[str, Any]]:
        """Get all partnerships for current tenant."""
        try:
            tenant_id = g.tenant_id
            
            # Get partnerships where current tenant is owner or partner
            partnerships = TenantPartnership.query.filter(
                or_(
                    TenantPartnership.owner_tenant_id == tenant_id,
                    TenantPartnership.partner_tenant_id == tenant_id
                )
            ).all()
            
            return True, {
                'partnerships': [p.to_dict() for p in partnerships],
                'status': 200
            }
            
        except Exception as e:
            current_app.logger.error(f"❌ Error fetching partnerships: {str(e)}")
            return False, {'message': 'Error fetching partnerships', 'error': str(e), 'status': 500}


class PropertySharingService:
    """Service for managing property sharing within partnerships."""
    
    @staticmethod
    def share_property(property_id: int, shared_with_tenant_id: Optional[int] = None, 
                      can_edit: bool = False, can_export: bool = True,
                      commission: Optional[float] = None, custom_terms: Optional[str] = None,
                      expires_at: Optional[datetime] = None) -> Tuple[bool, Dict[str, Any]]:
        """Share a property with partner tenant(s)."""
        try:
            owner_tenant_id = g.tenant_id
            
            # Verify property ownership
            property = Property.query.filter_by(id=property_id, tenant_id=owner_tenant_id).first()
            if not property:
                return False, {'message': 'Property not found or access denied', 'status': 404}
            
            # If sharing with specific tenant, verify partnership exists
            if shared_with_tenant_id:
                partnership = TenantPartnership.query.filter(
                    or_(
                        and_(
                            TenantPartnership.owner_tenant_id == owner_tenant_id,
                            TenantPartnership.partner_tenant_id == shared_with_tenant_id,
                            TenantPartnership.status == 'active'
                        ),
                        and_(
                            TenantPartnership.owner_tenant_id == shared_with_tenant_id,
                            TenantPartnership.partner_tenant_id == owner_tenant_id,
                            TenantPartnership.status == 'active'
                        )
                    )
                ).first()
                
                if not partnership:
                    return False, {'message': 'No active partnership with this tenant', 'status': 403}
            
            # Check if already shared
            existing = PropertySharing.query.filter_by(
                property_id=property_id,
                shared_with_tenant_id=shared_with_tenant_id
            ).first()
            
            if existing:
                return False, {'message': 'Property already shared with this tenant', 'status': 409}
            
            # Create sharing
            sharing = PropertySharing(
                property_id=property_id,
                owner_tenant_id=owner_tenant_id,
                shared_with_tenant_id=shared_with_tenant_id,
                can_edit=can_edit,
                can_export=can_export,
                commission_override=commission,
                custom_terms=custom_terms,
                expires_at=expires_at,
                is_active=True
            )
            
            # Update property sharing flags
            property.sharing_enabled = True
            if shared_with_tenant_id is None:
                property.sharing_scope = 'all_partners'
            else:
                property.sharing_scope = 'specific'
            
            db.session.add(sharing)
            
            # Log activity
            activity = PropertySharingActivity(
                property_id=property_id,
                sharing_id=sharing.id,
                actor_tenant_id=owner_tenant_id,
                action='shared',
                details={
                    'shared_with': shared_with_tenant_id or 'all_partners',
                    'permissions': {'can_edit': can_edit, 'can_export': can_export}
                }
            )
            db.session.add(activity)
            
            db.session.commit()
            
            current_app.logger.info(f"📤 Property {property_id} shared by tenant {owner_tenant_id}")
            
            return True, {'sharing': sharing.to_dict(), 'status': 201}
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"❌ Error sharing property: {str(e)}")
            return False, {'message': 'Error sharing property', 'error': str(e), 'status': 500}
    
    @staticmethod
    def unshare_property(sharing_id: int) -> Tuple[bool, Dict[str, Any]]:
        """Remove property sharing."""
        try:
            sharing = PropertySharing.query.filter_by(
                id=sharing_id,
                owner_tenant_id=g.tenant_id
            ).first()
            
            if not sharing:
                return False, {'message': 'Sharing not found', 'status': 404}
            
            property_id = sharing.property_id
            
            # Log activity before deleting
            activity = PropertySharingActivity(
                property_id=property_id,
                actor_tenant_id=g.tenant_id,
                action='unshared',
                details={'sharing_id': sharing_id}
            )
            db.session.add(activity)
            
            db.session.delete(sharing)
            
            # Check if property still has other sharings
            remaining = PropertySharing.query.filter_by(property_id=property_id).count()
            if remaining == 0:
                property = Property.query.get(property_id)
                if property:
                    property.sharing_enabled = False
                    property.sharing_scope = 'none'
            
            db.session.commit()
            
            current_app.logger.info(f"📥 Sharing {sharing_id} removed")
            
            return True, {'message': 'Sharing removed successfully', 'status': 200}
            
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"❌ Error unsharing property: {str(e)}")
            return False, {'message': 'Error unsharing property', 'error': str(e), 'status': 500}
    
    @staticmethod
    def get_shared_properties(include_owned: bool = True, include_received: bool = True) -> Tuple[bool, Dict[str, Any]]:
        """Get properties shared by current tenant and properties shared with current tenant."""
        try:
            tenant_id = g.tenant_id
            result = {}
            
            if include_owned:
                # Properties I own and have shared
                owned_sharings = PropertySharing.query.filter_by(
                    owner_tenant_id=tenant_id,
                    is_active=True
                ).all()
                result['shared_by_me'] = [s.to_dict() for s in owned_sharings]
            
            if include_received:
                # Properties shared with me (specific or all partners)
                received_sharings = PropertySharing.query.filter(
                    and_(
                        PropertySharing.is_active == True,
                        or_(
                            PropertySharing.shared_with_tenant_id == tenant_id,
                            PropertySharing.shared_with_tenant_id.is_(None)  # Shared with all
                        )
                    )
                ).all()
                
                # Filter out expired sharings
                received_sharings = [s for s in received_sharings if not s.is_expired()]
                result['shared_with_me'] = [s.to_dict() for s in received_sharings]
            
            return True, {**result, 'status': 200}
            
        except Exception as e:
            current_app.logger.error(f"❌ Error fetching shared properties: {str(e)}")
            return False, {'message': 'Error fetching shared properties', 'error': str(e), 'status': 500}
    
    @staticmethod
    def get_property_ids_accessible_by_tenant(tenant_id: int) -> List[int]:
        """
        Get all property IDs that a tenant can access:
        1. Properties they own
        2. Properties shared with them specifically
        3. Properties shared with all partners (if they have an active partnership)
        """
        try:
            # 1. Own properties
            own_property_ids = [p.id for p in Property.query.filter_by(tenant_id=tenant_id).all()]
            
            # 2. Properties shared specifically with this tenant
            specific_sharings = PropertySharing.query.filter_by(
                shared_with_tenant_id=tenant_id,
                is_active=True
            ).all()
            specific_property_ids = [s.property_id for s in specific_sharings if not s.is_expired()]
            
            # 3. Properties shared with all partners (if tenant has active partnerships)
            has_partnerships = TenantPartnership.query.filter(
                or_(
                    and_(
                        TenantPartnership.owner_tenant_id == tenant_id,
                        TenantPartnership.status == 'active'
                    ),
                    and_(
                        TenantPartnership.partner_tenant_id == tenant_id,
                        TenantPartnership.status == 'active'
                    )
                )
            ).first()
            
            all_partners_property_ids = []
            if has_partnerships:
                all_partners_sharings = PropertySharing.query.filter_by(
                    shared_with_tenant_id=None,
                    is_active=True
                ).all()
                all_partners_property_ids = [s.property_id for s in all_partners_sharings if not s.is_expired()]
            
            # Combine and deduplicate
            all_accessible_ids = list(set(own_property_ids + specific_property_ids + all_partners_property_ids))
            
            return all_accessible_ids
            
        except Exception as e:
            current_app.logger.error(f"❌ Error getting accessible properties: {str(e)}")
            return []
