"""
Upload routes for property images
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from auth import tenant_required

from ..services.upload_service import UploadService


def create_upload_routes(properties_bp: Blueprint):
    """Add upload routes to the blueprint."""
    
    @properties_bp.route('/images/upload', methods=['POST'], strict_slashes=False)
    @jwt_required()
    @tenant_required
    def upload_property_image():
        """Upload a single property image to AWS S3."""
        # Validate request
        is_valid, result = UploadService.validate_upload_request(request)
        if not is_valid:
            return jsonify({'message': result['message']}), result['status']
        
        file = result['file']
        filename = result['filename']
        
        # Get optional property_code from form data
        property_code = request.form.get('property_code', None)
        
        # Upload to S3 with organized folder structure
        success, upload_result = UploadService.upload_to_s3(file, filename, property_code)
        if not success:
            return jsonify({
                'message': upload_result['message'], 
                'error': upload_result.get('error')
            }), upload_result['status']
        
        return jsonify({
            'url': upload_result['url'],
            'uploaded_to': upload_result['uploaded_to'],
            's3_key': upload_result['s3_key']
        }), upload_result['status']
