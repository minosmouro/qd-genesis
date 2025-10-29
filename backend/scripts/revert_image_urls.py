#!/usr/bin/env python3
"""
Script para reverter as URLs de imagem que foram alteradas incorretamente.
Restaura as URLs originais do S3 a partir do provider_raw.
"""
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app
from extensions import db
from models import Property
import json

app = create_app()

def revert_urls():
    with app.app_context():
        # Buscar propriedades com placeholders nas URLs
        properties = Property.query.filter(
            Property.image_urls.cast(db.Text).like('%{action}%')
        ).all()
        
        print(f"\n{'='*80}")
        print(f"🔄 Encontradas {len(properties)} propriedades para reverter")
        print(f"{'='*80}\n")
        
        fixed = 0
        errors = 0
        
        for prop in properties:
            try:
                if not prop.provider_raw or 'images' not in prop.provider_raw:
                    print(f"⚠️  [{prop.id}] {prop.property_code or 'N/A'}: Sem dados em provider_raw")
                    errors += 1
                    continue
                
                # Extrair URLs originais do imageUrl (S3)
                original_urls = []
                for img in prop.provider_raw.get('images', []):
                    if isinstance(img, dict):
                        # Pegar imageUrl (S3) mesmo que seja temporário
                        url = img.get('imageUrl') or img.get('url')
                        if url:
                            original_urls.append(url)
                
                if not original_urls:
                    print(f"⚠️  [{prop.id}] {prop.property_code or 'N/A'}: Nenhuma URL encontrada")
                    errors += 1
                    continue
                
                # Atualizar
                old_count = len(prop.image_urls) if prop.image_urls else 0
                prop.image_urls = original_urls
                
                print(f"✅ [{prop.id}] {prop.property_code or 'N/A'}")
                print(f"   Revertido: {len(original_urls)} imagens")
                print(f"   URL: {original_urls[0][:80]}...")
                
                fixed += 1
                
            except Exception as e:
                print(f"❌ [{prop.id}] Erro: {str(e)}")
                errors += 1
        
        # Salvar alterações
        if fixed > 0:
            db.session.commit()
            print(f"\n{'='*80}")
            print(f"💾 Alterações salvas no banco de dados")
            print(f"{'='*80}\n")
        
        # Resumo
        print(f"\n{'='*80}")
        print(f"📊 RESUMO")
        print(f"{'='*80}")
        print(f"Total analisadas: {len(properties)}")
        print(f"✅ Revertidas:    {fixed}")
        print(f"❌ Erros:         {errors}")
        print(f"{'='*80}\n")

if __name__ == '__main__':
    revert_urls()
