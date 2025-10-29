"""Routes for managing partnerships and property sharing."""
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required
from auth import tenant_required
from properties.services.partnership_service import PartnershipService, PropertySharingService


def create_partnership_routes(partnerships_bp: Blueprint):
    """Add partnership routes to the blueprint."""
    
    # ==================== PARTNERSHIP MANAGEMENT ====================
    
    @partnerships_bp.route('/partnerships', methods=['POST'], strict_slashes=False)
    @jwt_required()
    @tenant_required
    def create_partnership():
        """Create a new partnership request with another tenant."""
        data = request.get_json() or {}
        partner_tenant_id = data.get('partner_tenant_id')
        commission = data.get('commission_percentage')
        notes = data.get('notes')
        
        if not partner_tenant_id:
            return jsonify({'message': 'partner_tenant_id is required'}), 400
        
        success, result = PartnershipService.create_partnership(
            partner_tenant_id=partner_tenant_id,
            commission=commission,
            notes=notes
        )
        
        if not success:
            return jsonify({'message': result['message']}), result['status']
        
        return jsonify(result['partnership']), result['status']
    
    @partnerships_bp.route('/partnerships', methods=['GET'], strict_slashes=False)
    @jwt_required()
    @tenant_required
    def list_partnerships():
        """Get all partnerships for current tenant."""
        success, result = PartnershipService.get_my_partnerships()
        
        if not success:
            return jsonify({'message': result['message']}), result['status']
        
        return jsonify(result), result['status']
    
    @partnerships_bp.route('/partnerships/<int:partnership_id>/accept', methods=['POST'], strict_slashes=False)
    @jwt_required()
    @tenant_required
    def accept_partnership(partnership_id):
        """Accept a partnership request."""
        success, result = PartnershipService.accept_partnership(partnership_id)
        
        if not success:
            return jsonify({'message': result['message']}), result['status']
        
        return jsonify(result['partnership']), result['status']
    
    # ==================== PROPERTY SHARING ====================
    
    @partnerships_bp.route('/properties/<int:property_id>/share', methods=['POST'], strict_slashes=False)
    @jwt_required()
    @tenant_required
    def share_property(property_id):
        """Share a property with partner tenant(s)."""
        data = request.get_json() or {}
        
        # NULL = share with all partners
        shared_with_tenant_id = data.get('shared_with_tenant_id')
        can_edit = data.get('can_edit', False)
        can_export = data.get('can_export', True)
        commission = data.get('commission_override')
        custom_terms = data.get('custom_terms')
        expires_at = data.get('expires_at')
        
        success, result = PropertySharingService.share_property(
            property_id=property_id,
            shared_with_tenant_id=shared_with_tenant_id,
            can_edit=can_edit,
            can_export=can_export,
            commission=commission,
            custom_terms=custom_terms,
            expires_at=expires_at
        )
        
        if not success:
            return jsonify({'message': result['message']}), result['status']
        
        return jsonify(result['sharing']), result['status']
    
    @partnerships_bp.route('/sharings/<int:sharing_id>', methods=['DELETE'], strict_slashes=False)
    @jwt_required()
    @tenant_required
    def unshare_property(sharing_id):
        """Remove property sharing."""
        success, result = PropertySharingService.unshare_property(sharing_id)
        
        if not success:
            return jsonify({'message': result['message']}), result['status']
        
        return jsonify(result), result['status']
    
    @partnerships_bp.route('/sharings', methods=['GET'], strict_slashes=False)
    @jwt_required()
    @tenant_required
    def list_shared_properties():
        """Get properties shared by me and shared with me."""
        include_owned = request.args.get('include_owned', 'true').lower() == 'true'
        include_received = request.args.get('include_received', 'true').lower() == 'true'
        
        success, result = PropertySharingService.get_shared_properties(
            include_owned=include_owned,
            include_received=include_received
        )
        
        if not success:
            return jsonify({'message': result['message']}), result['status']
        
        return jsonify(result), result['status']
