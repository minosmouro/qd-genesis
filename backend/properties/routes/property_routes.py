"""
Basic CRUD routes for properties
"""
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required
from auth import tenant_required

from ..services.property_service import PropertyService
from ..validators.property_validator import PropertyValidator
from ..utils.constants import MAX_PAGE_SIZE, MAX_PUBLIC_PAGE_SIZE
from ..serializers.property_serializer import PropertySerializer


def create_property_routes(properties_bp: Blueprint):
    """Add property CRUD routes to the blueprint."""
    
    @properties_bp.route('/', methods=['POST'], strict_slashes=False)
    @jwt_required()
    @tenant_required
    def create_property():
        """Create a new property."""
        data = request.get_json()
        
        # Validate input data
        is_valid, error = PropertyValidator.validate_create_data(data)
        if not is_valid:
            return jsonify({'message': error['message']}), error['status']
        
        # Create property
        success, result = PropertyService.create_property(data)
        if not success:
            return jsonify({'message': result['message'], 'error': result.get('error')}), result['status']
        
        return jsonify(result), 201

    @properties_bp.route('/', methods=['GET'], strict_slashes=False)
    @jwt_required()
    @tenant_required
    def list_properties():
        """List properties with pagination and filters.
        
        Includes:
        - Properties owned by the tenant
        - Properties shared with the tenant via partnerships
        """
        # Validate pagination parameters
        page, page_size = PropertyValidator.validate_pagination_params(
            request.args.get('page'),
            request.args.get('page_size'),
            MAX_PAGE_SIZE
        )
        
        q = request.args.get('q')
        status = request.args.get('status')
        sort_by = request.args.get('sort_by', 'updated_at')
        sort_order = request.args.get('sort_order', 'desc')
        
        # Get filter for accessible properties (own + shared)
        include_shared = request.args.get('include_shared', 'true').lower() == 'true'
        
        from models import Property
        from properties.services.partnership_service import PropertySharingService
        
        if include_shared:
            # Get all property IDs accessible by tenant (own + shared)
            accessible_property_ids = PropertySharingService.get_property_ids_accessible_by_tenant(g.tenant_id)
            query = Property.query.filter(Property.id.in_(accessible_property_ids))
        else:
            # Only own properties
            query = Property.query.filter_by(tenant_id=g.tenant_id)
        
        # Apply search filter (melhorado para buscar por códigos, título e endereço)
        if q:
            try:
                like = f"%{q}%"
                query = query.filter(
                    (Property.title.ilike(like)) | 
                    (Property.external_id.ilike(like)) |
                    (Property.property_code.ilike(like)) |
                    (Property.address_neighborhood.ilike(like)) |
                    (Property.address_street.ilike(like))
                )
            except Exception:
                pass
        
        # Apply status filter
        if status:
            query = query.filter_by(status=status)
        
        # Apply property type filter
        property_type = request.args.get('property_type')
        if property_type:
            query = query.filter_by(property_type=property_type)
        
        total = query.count()
        
        # Apply sorting
        sort_column = getattr(Property, sort_by, Property.created_at)
        if sort_order.lower() == 'asc':
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())
        
        # Pagination
        items = query.offset((page - 1) * page_size).limit(page_size).all()
        
        # Serialize response
        response = PropertySerializer.to_list_response(items, total, page, page_size)
        return jsonify(response), 200

    @properties_bp.route('/public', methods=['GET'], strict_slashes=False)
    def list_properties_public():
        """Public version of property listing - no authentication required."""
        # Validate pagination parameters
        page, page_size = PropertyValidator.validate_pagination_params(
            request.args.get('page'),
            request.args.get('page_size'),
            MAX_PUBLIC_PAGE_SIZE
        )
        
        # Optional filters
        q = request.args.get('q')
        status_filter = request.args.get('status')
        city_filter = request.args.get('city')
        min_price = request.args.get('min_price')
        max_price = request.args.get('max_price')
        sort_by = request.args.get('sort_by', 'updated_at')
        sort_order = request.args.get('sort_order', 'desc')
        
        # Base query - all properties (no tenant restriction)
        from models import Property
        query = Property.query
        
        # Apply search filter (melhorado para buscar por código externo e bairro)
        if q:
            try:
                like = f"%{q}%"
                query = query.filter(
                    (Property.title.ilike(like)) | 
                    (Property.external_id.ilike(like)) |
                    (Property.property_code.ilike(like)) |
                    (Property.address_neighborhood.ilike(like)) |
                    (Property.address_street.ilike(like))
                )
            except Exception:
                pass
        
        # Apply filters
        if status_filter:
            query = query.filter(Property.status == status_filter)
        if city_filter:
            query = query.filter(Property.address_city.ilike(f'%{city_filter}%'))
        if min_price:
            try:
                query = query.filter(Property.price >= float(min_price))
            except Exception:
                pass
        if max_price:
            try:
                query = query.filter(Property.price <= float(max_price))
            except Exception:
                pass
        
        # Apply sorting
        sort_column = getattr(Property, sort_by, Property.created_at)
        if sort_order.lower() == 'asc':
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())
        
        # Pagination
        total = query.count()
        properties = query.offset((page - 1) * page_size).limit(page_size).all()
        
        # Serialize response
        response = PropertySerializer.to_list_response(properties, total, page, page_size)
        return jsonify(response), 200

    @properties_bp.route('/<int:property_id>', methods=['GET'], strict_slashes=False)
    @jwt_required()
    @tenant_required
    def get_property(property_id):
        """Get a specific property by ID."""
        success, result = PropertyService.get_property(property_id)
        if not success:
            return jsonify({'message': result['message']}), result['status']
        
        return jsonify(result), 200

    @properties_bp.route('/public/<int:property_id>', methods=['GET'], strict_slashes=False)
    def get_property_public(property_id):
        """Get a specific property by ID - public version without authentication."""
        success, result = PropertyService.get_property_public(property_id)
        if not success:
            return jsonify({'message': result['message']}), result['status']
        
        return jsonify(result), 200

    @properties_bp.route('/<int:property_id>', methods=['PUT', 'PATCH'], strict_slashes=False)
    @jwt_required()
    @tenant_required
    def update_property(property_id):
        """Update a specific property by ID."""
        data = request.get_json()
        
        success, result = PropertyService.update_property(property_id, data)
        if not success:
            return jsonify({'message': result['message'], 'error': result.get('error')}), result['status']
        
        return jsonify(result), 200

    @properties_bp.route('/<int:property_id>', methods=['DELETE'], strict_slashes=False)
    @jwt_required()
    @tenant_required
    def delete_property(property_id):
        """Delete a specific property by ID."""
        success, result = PropertyService.delete_property(property_id)

        # Return detailed response including CanalPro status
        response_data = {
            'success': success,
            'message': result['message'],
            'property_id': property_id,
            'canalpro_status': result.get('canalpro_status', 'unknown'),
            'local_status': result.get('local_status', 'unknown')
        }

        # Add CanalPro details if available
        if 'canalpro_details' in result:
            response_data['canalpro_details'] = result['canalpro_details']

        # Add consistency issue warning if present
        if result.get('consistency_issue'):
            response_data['consistency_issue'] = True
            response_data['warning'] = 'Property was deleted from CanalPro but local deletion failed. Data inconsistency detected!'

        return jsonify(response_data), result['status']

    @properties_bp.route('/stats', methods=['GET'], strict_slashes=False)
    @jwt_required()
    @tenant_required
    def get_properties_stats():
        """Get property statistics for the current tenant."""
        success, result = PropertyService.get_properties_stats()
        if not success:
            return jsonify({'message': result['message']}), result['status']
        
        return jsonify(result), 200

    @properties_bp.route('/<int:property_id>/duplicate', methods=['POST'], strict_slashes=False)
    @jwt_required()
    @tenant_required
    def duplicate_property(property_id):
        """Duplicate a property (creates a new property with a new external_id and code)."""
        success, result = PropertyService.duplicate_property(property_id)
        if not success:
            return jsonify({'message': result['message'], 'error': result.get('error')}), result['status']
        return jsonify(result), 201

    # Handler explícito para métodos não permitidos na rota base
    @properties_bp.route('/', methods=['PUT', 'PATCH', 'DELETE'], strict_slashes=False)
    def method_not_allowed_root():
        return jsonify({
            'success': False,
            'error': 'Method not allowed',
            'message': 'Use POST para criar propriedades ou GET para listar.',
            'allowed_methods': ['GET', 'POST']
        }), 405

    # Handler explícito para métodos não permitidos em rotas com ID
    @properties_bp.route('/<int:property_id>', methods=['POST'], strict_slashes=False)
    def method_not_allowed_by_id(property_id):
        return jsonify({
            'success': False,
            'error': 'Method not allowed',
            'message': 'Use GET para consultar, PUT/PATCH para atualizar, ou DELETE para excluir.',
            'allowed_methods': ['GET', 'PUT', 'PATCH', 'DELETE'],
            'resource_id': property_id
        }), 405
