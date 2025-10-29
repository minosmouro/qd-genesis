from celery_app import make_celery
from app import create_app
from integrations.gandalf_service import upload_image, create_listing, GandalfError
from properties.mapper import map_property_to_listing
from extensions import db
from models import Property

import os
import base64

app = create_app()
celery = make_celery()

@celery.task(name='process_listing')
def process_listing(property_id, publication_type=None):
    with app.app_context():
        prop = Property.query.get(property_id)
        if not prop:
            return {'status': 'not_found'}

        # Obter credenciais de integração pelo tenant (não depender de campos do registro de Property)
        try:
            from utils.integration_tokens import get_valid_integration_headers
            creds = get_valid_integration_headers(prop.tenant_id, 'gandalf')
        except Exception as e:
            prop.status = 'error'
            prop.error = f'Failed to obtain integration credentials: {e}'
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
            return {'status': 'error', 'exception': str(e)}

        # Preparar e fazer upload automático de imagens do S3 para Gandalf
        final_images = []
        try:
            raw_images = prop.image_urls or []
            for idx, img in enumerate(raw_images):
                if not img or not isinstance(img, str):
                    continue
                lower = img.lower()
                
                # Se já é uma URL do nosso S3, fazer download e upload para Gandalf
                if lower.startswith('https://quadra-fotos.s3.'):
                    try:
                        import requests
                        # Download da imagem do S3
                        response = requests.get(img, timeout=30)
                        response.raise_for_status()
                        file_bytes = response.content
                        
                        # Determinar extensão do arquivo
                        ext = 'jpg'  # padrão
                        if 'content-type' in response.headers:
                            content_type = response.headers['content-type'].lower()
                            if 'png' in content_type:
                                ext = 'png'
                            elif 'gif' in content_type:
                                ext = 'gif'
                            elif 'webp' in content_type:
                                ext = 'webp'
                        
                        filename = f'property_{prop.id}_{idx}.{ext}'
                        
                        # Upload para Gandalf
                        resp = upload_image(file_bytes, filename, creds)
                        gandalf_url = (resp.get('data') or {}).get('uploadImage', {}).get('urlImage') if isinstance(resp, dict) else None
                        
                        if gandalf_url:
                            final_images.append({'imageUrl': gandalf_url})
                            app.logger.info('Imagem %d do imóvel %s enviada do S3 para Gandalf: %s', idx, prop.id, gandalf_url)
                        else:
                            app.logger.warning('Falha ao enviar imagem %d do imóvel %s para Gandalf', idx, prop.id)
                            # Fallback: usar URL original do S3
                            final_images.append({'imageUrl': img})
                            
                    except Exception as e:
                        app.logger.warning('Erro ao processar imagem S3 %s para imóvel %s: %s', img, prop.id, str(e))
                        # Fallback: manter URL original
                        final_images.append({'imageUrl': img})
                        continue
                
                # URLs externas (não S3) - manter como estão
                elif lower.startswith('http://') or lower.startswith('https://'):
                    final_images.append({'imageUrl': img})
                    continue

                # Qualquer outro formato (data URIs, paths locais) - pular
                else:
                    app.logger.info('Ignorando imagem não suportada para imóvel %s: %s', prop.id, img)
                    continue
        except Exception as e:
            app.logger.exception('Unexpected error while processing images for property %s: %s', prop.id if prop else 'unknown', str(e))

        # Montar payload usando mapper centralizado e sobrescrever images com final_images
        try:
            listing_payload = map_property_to_listing(prop, publication_type=publication_type)
            # garantir que imagens usadas sejam as já enviadas ao Gandalf (final_images)
            if final_images:
                listing_payload['images'] = final_images
        except Exception as e:
            prop.status = 'error'
            prop.error = f'Failed to build listing payload via mapper: {e}'
            try:
                db.session.commit()
            except Exception:
                db.session.rollback()
            return {'status': 'error', 'exception': str(e)}

        try:
            result = create_listing(listing_payload, creds)
            # handle result structure
            if isinstance(result, dict) and 'data' in result and result['data'].get('createListing'):
                r = result['data']['createListing']
                if r.get('id'):
                    prop.remote_id = r.get('id')
                    prop.status = 'created'
                    db.session.commit()
                    return {'status': 'created', 'remote_id': r.get('id')}
                else:
                    prop.status = 'error'
                    prop.error = str(r.get('errors'))
                    db.session.commit()
                    return {'status': 'error', 'errors': r.get('errors')}
            else:
                prop.status = 'error'
                prop.error = str(result)
                db.session.commit()
                return {'status': 'error', 'result': result}
        except GandalfError as e:
            prop.status = 'error'
            prop.error = str(e)
            db.session.commit()
            return {'status': 'error', 'exception': str(e)}
