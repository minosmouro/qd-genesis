from celery_app import make_celery
from app import create_app
from extensions import db
from models import Property
import requests
import os
import io
import traceback

# boto3 é opcional — usado apenas se variáveis S3 estiverem configuradas
try:
    import boto3
    from botocore.exceptions import BotoCoreError, ClientError
    _HAS_BOTO3 = True
except Exception:
    _HAS_BOTO3 = False

app = create_app()
celery = make_celery()

@celery.task(name='download_and_attach')
def download_and_attach(property_id, urls):
    with app.app_context():
        prop = Property.query.get(property_id)
        if not prop:
            return {'status': 'not_found'}

        saved_urls = prop.image_urls or []

        # Verifica configuração S3
        s3_bucket = os.environ.get('AWS_S3_BUCKET_NAME')
        s3_region = os.environ.get('AWS_S3_REGION')
        aws_key = os.environ.get('AWS_ACCESS_KEY_ID')
        aws_secret = os.environ.get('AWS_SECRET_ACCESS_KEY')

        use_s3 = bool(s3_bucket and s3_region and _HAS_BOTO3)
        s3_client = None
        if use_s3:
            try:
                if aws_key and aws_secret:
                    s3_client = boto3.client('s3', region_name=s3_region,
                                             aws_access_key_id=aws_key,
                                             aws_secret_access_key=aws_secret)
                else:
                    s3_client = boto3.client('s3', region_name=s3_region)
            except Exception as e:
                app.logger.error('Erro ao inicializar S3 client: %s', e)
                use_s3 = False

        uploads_dir = os.environ.get('IMAGE_UPLOAD_DIR', os.path.join(os.getcwd(), 'uploads'))
        if not use_s3:
            os.makedirs(uploads_dir, exist_ok=True)

        succeeded = 0
        for idx, url in enumerate(urls or []):
            try:
                resp = requests.get(url, timeout=20)
                if resp.status_code != 200:
                    app.logger.warning('Falha ao baixar imagem %s (status %s)', url, resp.status_code)
                    continue

                ext = os.path.splitext(url.split('?')[0])[1].lower() or '.jpg'
                if ext not in ['.jpg', '.jpeg', '.png', '.webp', '.gif']:
                    # normalize unknown extensions
                    ext = '.jpg'

                filename = f"property_{property_id}_{idx}{ext}"

                if use_s3 and s3_client:
                    key = f"properties/{property_id}/{filename}"
                    try:
                        # usa put_object com bytes para evitar salvar arquivo localmente
                        s3_client.put_object(Bucket=s3_bucket, Key=key, Body=resp.content, ContentType=resp.headers.get('Content-Type', 'image/jpeg'))
                        # monta URL pública (assume bucket público ou com CloudFront)
                        if s3_region == 'us-east-1':
                            url_out = f"https://{s3_bucket}.s3.amazonaws.com/{key}"
                        else:
                            url_out = f"https://{s3_bucket}.s3.{s3_region}.amazonaws.com/{key}"

                        saved_urls.append(url_out)
                        succeeded += 1
                    except (BotoCoreError, ClientError) as e:
                        app.logger.error('Erro ao enviar imagem para S3 (%s): %s', url, e)
                        # fallback para salvar localmente se possível
                        if not os.path.exists(uploads_dir):
                            os.makedirs(uploads_dir, exist_ok=True)
                        path = os.path.join(uploads_dir, filename)
                        with open(path, 'wb') as f:
                            f.write(resp.content)
                        saved_urls.append(path)
                        succeeded += 1
                else:
                    # salvar localmente
                    path = os.path.join(uploads_dir, filename)
                    with open(path, 'wb') as f:
                        f.write(resp.content)
                    saved_urls.append(path)
                    succeeded += 1

            except Exception as e:
                app.logger.error('Exception ao processar imagem %s: %s\n%s', url, e, traceback.format_exc())
                continue

        prop.image_urls = saved_urls
        # Opcional: atualizar status se desejar (por ex. 'images_attached')
        try:
            db.session.commit()
        except Exception as e:
            app.logger.error('Erro ao commitar Property.image_urls: %s', e)
            db.session.rollback()
            return {'status': 'db_error'}

        return {'status': 'ok', 'saved': succeeded, 'total': len(urls or [])}
