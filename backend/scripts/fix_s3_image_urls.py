"""
Script para corrigir propriedades com URLs antigas do S3, substituindo por URLs do VivaReal CDN

Problema: Algumas propriedades têm URLs do S3 (vr-prod-listings-temp-downloader-images.s3.amazonaws.com)
que expiraram e retornam 403 Forbidden.

Solução: Buscar em provider_raw.images o campo resizedUrl e atualizar property.image_urls

Uso: python scripts/fix_s3_image_urls.py [--dry-run]
"""
import os
import sys
import argparse

# Garantir que a pasta backend esteja no sys.path
SCRIPT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app
from models import Property, db
from sqlalchemy import text

app = create_app()


def extract_resized_urls(provider_raw):
    """Extrai URLs resizadas do provider_raw.images"""
    if not provider_raw or not isinstance(provider_raw, dict):
        return []
    
    images = provider_raw.get('images', [])
    if not isinstance(images, list):
        return []
    
    resized_urls = []
    for img in images:
        if isinstance(img, dict):
            # Priorizar resizedUrl (VivaReal CDN) sobre imageUrl (S3 temporário)
            url = img.get('resizedUrl') or img.get('imageUrl')
            if url and 'resizedimgs.vivareal.com' in url:
                # Processar templates da VivaReal CDN
                if '{action}' in url and '{width}' in url and '{height}' in url:
                    url = url.replace('{action}', 'fit-in').replace('{width}x{height}', '870x653')
                resized_urls.append(url)
    
    # Deduplicate mantendo ordem
    seen = set()
    return [url for url in resized_urls if url and not (url in seen or seen.add(url))]


def fix_property_images(prop, dry_run=False):
    """Corrige as image_urls de uma propriedade"""
    old_urls = prop.image_urls or []
    new_urls = extract_resized_urls(prop.provider_raw)
    
    if not new_urls:
        return None, 'No resized URLs found in provider_raw'
    
    if old_urls == new_urls:
        return None, 'URLs already correct'
    
    result = {
        'id': prop.id,
        'external_id': prop.external_id,
        'property_code': prop.property_code,
        'old_count': len(old_urls),
        'new_count': len(new_urls),
        'old_first': old_urls[0] if old_urls else None,
        'new_first': new_urls[0] if new_urls else None,
    }
    
    if not dry_run:
        prop.image_urls = new_urls
        return result, 'Fixed'
    else:
        return result, 'Would fix (dry-run)'


def main():
    parser = argparse.ArgumentParser(description='Corrige URLs de imagens do S3 para VivaReal CDN')
    parser.add_argument('--dry-run', action='store_true', help='Apenas simula sem fazer alterações')
    parser.add_argument('--all', action='store_true', help='Processar TODAS as propriedades, não apenas com S3')
    args = parser.parse_args()
    
    with app.app_context():
        # Buscar propriedades com URLs do S3 OU todas se --all
        if args.all:
            query = text("""
                SELECT id 
                FROM property 
                WHERE provider_raw IS NOT NULL 
                AND provider_raw->'images' IS NOT NULL
                ORDER BY id
            """)
        else:
            query = text("""
                SELECT id 
                FROM property 
                WHERE image_urls::text LIKE '%vr-prod-listings-temp-downloader-images.s3.amazonaws.com%'
                ORDER BY id
            """)
        
        result = db.session.execute(query)
        property_ids = [row[0] for row in result]
        
        print(f"\n{'=' * 80}")
        print(f"🔍 Encontradas {len(property_ids)} propriedades com URLs do S3")
        print(f"{'=' * 80}\n")
        
        if args.dry_run:
            print("⚠️  MODO DRY-RUN - Nenhuma alteração será feita\n")
        
        fixed = 0
        skipped = 0
        errors = []
        
        for prop_id in property_ids:
            prop = Property.query.get(prop_id)
            if not prop:
                continue
            
            try:
                result, status = fix_property_images(prop, dry_run=args.dry_run)
                
                if result:
                    fixed += 1
                    print(f"✅ [{prop.id}] {prop.external_id or 'N/A'}")
                    print(f"   Old: {result['old_count']} imagens ({result['old_first'][:80]}...)")
                    print(f"   New: {result['new_count']} imagens ({result['new_first'][:80]}...)")
                    print(f"   Status: {status}\n")
                else:
                    skipped += 1
                    print(f"⏭️  [{prop.id}] {prop.external_id or 'N/A'}: {status}")
                    
            except Exception as e:
                errors.append({'id': prop.id, 'error': str(e)})
                print(f"❌ [{prop.id}] Erro: {e}\n")
        
        # Commit se não for dry-run
        if not args.dry_run and fixed > 0:
            try:
                db.session.commit()
                print(f"\n{'=' * 80}")
                print(f"💾 Alterações salvas no banco de dados")
                print(f"{'=' * 80}\n")
            except Exception as e:
                db.session.rollback()
                print(f"\n{'=' * 80}")
                print(f"❌ Erro ao salvar: {e}")
                print(f"{'=' * 80}\n")
                return 1
        
        # Resumo
        print(f"\n{'=' * 80}")
        print(f"📊 RESUMO")
        print(f"{'=' * 80}")
        print(f"Total analisadas: {len(property_ids)}")
        print(f"✅ Corrigidas:    {fixed}")
        print(f"⏭️  Ignoradas:     {skipped}")
        print(f"❌ Erros:         {len(errors)}")
        
        if args.dry_run:
            print(f"\n⚠️  Execute sem --dry-run para aplicar as alterações")
        
        print(f"{'=' * 80}\n")
        
        if errors:
            print("\n❌ Erros detalhados:")
            for err in errors:
                print(f"   - Propriedade {err['id']}: {err['error']}")
        
        return 0 if not errors else 1


if __name__ == '__main__':
    sys.exit(main())
