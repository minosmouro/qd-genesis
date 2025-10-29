"""
Rotas de exclusão de imóveis com proteção contra exclusão indevida
"""

from flask import Blueprint, request, jsonify, g
from properties.services.property_delete_service import PropertyDeleteService
from auth import tenant_required


def create_delete_routes(bp: Blueprint):
    """Criar rotas de exclusão protegidas"""
    
    @bp.route('/<int:property_id>/delete-impact', methods=['GET'])
    @tenant_required
    def check_delete_impact(property_id: int):
        """
        Verifica o impacto da exclusão de um imóvel
        
        GET /api/properties/123/delete-impact
        
        Retorna:
        - Informações sobre o imóvel
        - Avisos sobre impacto da exclusão
        - Recomendações
        """
        impact = PropertyDeleteService.check_deletion_impact(property_id)
        
        if not impact.get('found'):
            return jsonify({
                'success': False,
                'message': impact.get('message', 'Property not found')
            }), 404
        
        return jsonify({
            'success': True,
            'impact': impact
        }), 200

    @bp.route('/<int:property_id>/delete-canalpro', methods=['DELETE'])
    @tenant_required
    def delete_canalpro_only(property_id: int):
        """
        Deleta APENAS do Canal Pro, mantendo o imóvel no Quadradois.

        DELETE /api/properties/<id>/delete-canalpro

        Body opcional:
        {
          "reason": "string",
          "notes": "string"
        }
        """
        data = request.get_json() or {}
        reason = data.get('reason')
        notes = data.get('notes')

        success, result = PropertyDeleteService.delete_canalpro_only(
            property_id,
            reason=reason,
            notes=notes,
        )

        return jsonify({
            'success': success,
            **result
        }), result.get('status', 200 if success else 500)

    @bp.route('/<int:property_id>/soft-delete', methods=['DELETE'])
    @tenant_required
    def soft_delete(property_id: int):
        """
        Soft delete: marca como deletado, pode ser restaurado
        NÃO deleta do Canal Pro
        
        DELETE /api/properties/123/soft-delete
        
        Recomendado para a maioria dos casos
        """
        success, result = PropertyDeleteService.soft_delete_property(property_id)
        
        return jsonify({
            'success': success,
            **result
        }), result.get('status', 200 if success else 500)
    
    @bp.route('/<int:property_id>/delete-local', methods=['DELETE'])
    @tenant_required
    def delete_local(property_id: int):
        """
        Deleta APENAS do Quadradois, mantém no Canal Pro
        
        DELETE /api/properties/123/delete-local
        
        Use quando quiser remover do Quadradois mas manter nos portais
        """
        success, result = PropertyDeleteService.delete_local_only(property_id)
        
        return jsonify({
            'success': success,
            **result
        }), result.get('status', 200 if success else 500)
    
    @bp.route('/<int:property_id>/delete-both', methods=['DELETE'])
    @tenant_required
    def delete_both(property_id: int):
        """
        Deleta do Quadradois E do Canal Pro
        ATENÇÃO: Ação irreversível!
        
        DELETE /api/properties/123/delete-both
        
        Requer confirmação explícita no frontend
        """
        # Verificar confirmação
        data = request.get_json() or {}
        confirmed = data.get('confirmed', False)
        
        if not confirmed:
            return jsonify({
                'success': False,
                'message': 'Confirmação necessária para excluir de ambos os sistemas',
                'requires_confirmation': True
            }), 400
        
        success, result = PropertyDeleteService.delete_from_both(property_id)
        
        return jsonify({
            'success': success,
            **result
        }), result.get('status', 200 if success else 500)
    
    @bp.route('/<int:property_id>/restore', methods=['POST'])
    @tenant_required
    def restore(property_id: int):
        """
        Restaura um imóvel soft deleted
        
        POST /api/properties/123/restore
        """
        success, result = PropertyDeleteService.restore_property(property_id)
        
        return jsonify({
            'success': success,
            **result
        }), result.get('status', 200 if success else 500)
