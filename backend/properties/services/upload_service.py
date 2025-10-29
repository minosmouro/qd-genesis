"""
AWS S3 Upload Service
"""
import os
import time
from typing import Dict, Any, Tuple
from werkzeug.utils import secure_filename
from flask import current_app, g

from ..utils.constants import DEFAULT_AWS_REGION, DEFAULT_S3_BUCKET


class UploadService:
    """Handles file upload operations to AWS S3."""
    
    @staticmethod
    def upload_to_s3(file, filename: str, property_code: str = None) -> Tuple[bool, Dict[str, Any]]:
        """
        Upload file to AWS S3 with organized folder structure.
        
        Args:
            file: File object to upload
            filename: Original filename
            property_code: Optional property code for organized folder structure
            
        Folder structure:
            - With property_code: uploads/{tenant_id}/{property_code}/photos/{timestamp}_{filename}
            - Without property_code: uploads/{tenant_id}/temp/{timestamp}_{filename}
        """
        try:
            import boto3
            from botocore.exceptions import NoCredentialsError, PartialCredentialsError
            
            # AWS S3 Configuration
            aws_access_key = (current_app.config.get('AWS_ACCESS_KEY_ID') or 
                            os.environ.get('AWS_ACCESS_KEY_ID'))
            aws_secret_key = (current_app.config.get('AWS_SECRET_ACCESS_KEY') or 
                            os.environ.get('AWS_SECRET_ACCESS_KEY'))
            aws_region = (current_app.config.get('AWS_S3_REGION') or 
                        os.environ.get('AWS_S3_REGION') or 
                        DEFAULT_AWS_REGION)
            bucket_name = (current_app.config.get('AWS_S3_BUCKET_NAME') or 
                         os.environ.get('AWS_S3_BUCKET_NAME') or 
                         DEFAULT_S3_BUCKET)
            
            # Create S3 client
            s3_client = boto3.client(
                's3',
                aws_access_key_id=aws_access_key,
                aws_secret_access_key=aws_secret_key,
                region_name=aws_region
            )
            
            # Generate organized key structure
            secure_name = secure_filename(filename)
            tenant_id = getattr(g, 'tenant_id', 'unknown')
            timestamp = int(time.time())
            
            # Build path based on property_code
            if property_code:
                # Organized: uploads/{tenant_id}/{property_code}/photos/{timestamp}_{filename}
                s3_key = f"uploads/{tenant_id}/{property_code}/photos/{timestamp}_{secure_name}"
            else:
                # Temporary folder for uploads without property code
                s3_key = f"uploads/{tenant_id}/temp/{timestamp}_{secure_name}"
            
            # Upload file to S3
            file_bytes = file.read()
            s3_client.put_object(
                Bucket=bucket_name,
                Key=s3_key,
                Body=file_bytes,
                ContentType=file.content_type or 'application/octet-stream'
            )
            
            # Generate public URL
            s3_url = f"https://{bucket_name}.s3.{aws_region}.amazonaws.com/{s3_key}"
            
            return True, {
                'url': s3_url,
                'uploaded_to': 's3',
                's3_key': s3_key,
                'property_code': property_code,
                'status': 201
            }
            
        except (NoCredentialsError, PartialCredentialsError) as e:
            current_app.logger.exception('AWS S3 credentials error: %s', str(e))
            return False, {
                'message': 'S3 credentials error',
                'error': str(e),
                'status': 500
            }
        except Exception as e:
            current_app.logger.exception('Failed to upload image to S3: %s', str(e))
            return False, {
                'message': 'Upload to S3 failed',
                'error': str(e),
                'status': 500
            }
    
    @staticmethod
    def validate_upload_request(request) -> Tuple[bool, Dict[str, Any]]:
        """Validate upload request and return file if valid."""
        if 'file' not in request.files:
            return False, {'message': 'No file part', 'status': 400}
        
        file = request.files['file']
        if not file or file.filename == '':
            return False, {'message': 'No selected file', 'status': 400}
        
        return True, {'file': file, 'filename': file.filename}
