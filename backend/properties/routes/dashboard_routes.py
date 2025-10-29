"""
Dashboard routes for properties
"""
from flask import Blueprint, jsonify, g
from flask_jwt_extended import jwt_required
from sqlalchemy import func
from extensions import db
from models import Property
from auth import tenant_required
from properties.utils.status_catalog import aggregate_status_counts


# Mapeamento de tipos de imóveis para português
PROPERTY_TYPE_TRANSLATIONS = {
    'APARTMENT': 'Apartamento',
    'CASA_CONDOMINIO': 'Casa em Condomínio',
    'HOUSE': 'Casa',
    'LOTE_TERRENO': 'Lote/Terreno',
    'PENTHOUSE': 'Cobertura',
    'STUDIO': 'Studio',
    'FLAT': 'Flat',
    'FARM': 'Fazenda',
    'COMMERCIAL': 'Comercial',
    'INDUSTRIAL': 'Industrial',
    'RESIDENTIAL': 'Residencial',
    'RURAL': 'Rural',
    'STORE': 'Loja',
    'OFFICE': 'Escritório',
    'WAREHOUSE': 'Galpão',
    'LAND': 'Terreno',
    'BUILDING': 'Prédio',
    'TOWNHOUSE': 'Sobrado',
}


def create_dashboard_routes(properties_bp: Blueprint):
    """Create dashboard routes."""
    
    @properties_bp.route('/dashboard/stats', methods=['GET'], strict_slashes=False)
    @jwt_required()
    @tenant_required
    def get_dashboard_stats():
        """Get dashboard statistics for properties."""
        try:
            tenant_id = g.tenant_id
            
            # Total de imóveis
            total_properties = Property.query.filter_by(tenant_id=tenant_id).count()
            
            # Última atualização
            last_update_query = db.session.query(
                func.max(Property.updated_at)
            ).filter(Property.tenant_id == tenant_id).scalar()
            
            last_update = last_update_query.isoformat() if last_update_query else None
            
            # Distribuição por tipo (traduzido para português)
            properties_by_type = {}
            type_query = db.session.query(
                Property.property_type,
                func.count(Property.id)
            ).filter(
                Property.tenant_id == tenant_id,
                Property.property_type.isnot(None)
            ).group_by(Property.property_type).all()
            
            for prop_type, count in type_query:
                # Traduz o tipo para português, ou usa o original se não houver tradução
                translated_type = PROPERTY_TYPE_TRANSLATIONS.get(prop_type, prop_type)
                properties_by_type[translated_type] = count
            
            # Imóveis por status com resumo padronizado
            status_query = db.session.query(
                Property.status,
                func.count(Property.id)
            ).filter(Property.tenant_id == tenant_id).group_by(Property.status).all()

            raw_status_counts = {status: count for status, count in status_query}
            status_summary = aggregate_status_counts(raw_status_counts)

            active_properties = status_summary['active_total']
            inactive_properties = status_summary['inactive_total']
            properties_in_refresh = status_summary['counts_by_key'].get('refreshing', 0)
            
            # Imóveis com destaque (publication_type diferente de STANDARD ou NULL)
            highlighted_properties = Property.query.filter(
                Property.tenant_id == tenant_id,
                Property.publication_type.isnot(None),
                Property.publication_type != 'STANDARD',
                Property.publication_type != ''
            ).count()
            
            return jsonify({
                'total_properties': total_properties,
                'properties_in_refresh': properties_in_refresh,
                'last_update': last_update,
                'properties_by_type': properties_by_type,
                'active_properties': active_properties,
                'inactive_properties': inactive_properties,
                'highlighted_properties': highlighted_properties,
                'status_summary': status_summary,
            }), 200
            
        except Exception as e:
            return jsonify({
                'message': f'Error fetching dashboard stats: {str(e)}'
            }), 500
    
    @properties_bp.route('/dashboard/debug-status', methods=['GET'], strict_slashes=False)
    @jwt_required()
    @tenant_required
    def debug_property_status():
        """Debug endpoint para verificar os status dos imóveis."""
        try:
            tenant_id = g.tenant_id
            
            # Busca todos os status distintos
            status_query = db.session.query(
                Property.status,
                func.count(Property.id)
            ).filter(
                Property.tenant_id == tenant_id
            ).group_by(Property.status).all()
            
            status_counts = {}
            for status, count in status_query:
                status_counts[status] = count
            
            # Busca alguns exemplos de cada status
            examples = {}
            for status in status_counts.keys():
                sample_properties = Property.query.filter_by(
                    tenant_id=tenant_id,
                    status=status
                ).limit(3).all()
                
                examples[status] = [
                    {
                        'id': p.id,
                        'title': p.title,
                        'property_code': p.property_code,
                        'status': p.status
                    }
                    for p in sample_properties
                ]
            
            return jsonify({
                'status_counts': status_counts,
                'examples': examples,
                'total': sum(status_counts.values())
            }), 200
            
        except Exception as e:
            return jsonify({
                'message': f'Error debugging status: {str(e)}'
            }), 500
    
    @properties_bp.route('/dashboard/debug/status', methods=['GET'], strict_slashes=False)
    @jwt_required()
    @tenant_required
    def debug_status():
        """Debug: Ver todos os status distintos e suas contagens."""
        try:
            tenant_id = g.tenant_id
            
            # Contagem por status
            status_counts = db.session.query(
                Property.status,
                func.count(Property.id)
            ).filter(
                Property.tenant_id == tenant_id
            ).group_by(Property.status).all()
            
            # Pegar alguns exemplos de cada status
            status_examples = {}
            for status, count in status_counts:
                examples = Property.query.filter_by(
                    tenant_id=tenant_id,
                    status=status
                ).limit(3).all()
                
                status_examples[status] = {
                    'count': count,
                    'examples': [
                        {
                            'id': p.id,
                            'title': p.title,
                            'property_code': p.property_code,
                            'status': p.status
                        }
                        for p in examples
                    ]
                }
            
            return jsonify({
                'status_summary': status_examples
            }), 200
            
        except Exception as e:
            return jsonify({
                'message': f'Error in debug: {str(e)}'
            }), 500
