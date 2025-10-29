from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt
from .adapter import MCPAdapter

mcp_bp = Blueprint('mcp', __name__, url_prefix='/api/mcp')
adapter = MCPAdapter()


@mcp_bp.route('/upsert', methods=['POST'])
@jwt_required()
def upsert():
    data = request.get_json() or {}
    claims = get_jwt()
    tenant_id = data.get('tenant_id') or claims.get('tenant_id')
    if tenant_id is None:
        return jsonify({'message': 'tenant_id required'}), 400
    point_id = data.get('id')
    text = data.get('text')
    metadata = data.get('metadata')
    if not point_id or not text:
        return jsonify({'message': 'id and text required'}), 400
    adapter.upsert(tenant_id=int(tenant_id), point_id=str(point_id), text=text, metadata=metadata)
    return jsonify({'message': 'upserted'}), 200


@mcp_bp.route('/search', methods=['POST'])
@jwt_required()
def search():
    data = request.get_json() or {}
    claims = get_jwt()
    tenant_id = data.get('tenant_id') or claims.get('tenant_id')
    if tenant_id is None:
        return jsonify({'message': 'tenant_id required'}), 400
    query = data.get('query')
    if not query:
        return jsonify({'message': 'query required'}), 400
    top = int(data.get('top') or data.get('top_k') or 5)
    results = adapter.search(tenant_id=int(tenant_id), query=query, top_k=top)
    return jsonify({'results': results}), 200
