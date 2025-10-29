"""
Script para sanitizar templates resizedUrl e reconstruir property.image_urls
- Varre todas as propriedades que têm provider_raw.images
- Para cada image dict tenta montar resizedUrl com crop/870x707
- Sanitiza strings corrompidas e extrai o trecho correto
- Testa a URL (HEAD then GET) e, se válida (200), usa como imagem
- Caso falhe, tenta imageUrl (pode ser protegido)
- Persiste image_urls deduplicadas por propriedade

Uso: python scripts/rebuild_images_from_resized.py
"""
import os, sys
# Garantir que a pasta backend (pai de scripts) esteja no sys.path para permitir `from app import create_app`
SCRIPT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app
from models import Property, db
import requests
import re
import time

CROP_ACTION = 'crop'
CROP_SIZE = '870x707'
REQ_TIMEOUT = 10

app = create_app()


def sanitize_resized_template(s: str) -> str:
    if not s or not isinstance(s, str):
        return None
    # remove whitespace and newlines
    s2 = s.strip()
    # if contains accidental leading characters before http, take substring from first 'http'
    idx = s2.find('http')
    if idx != -1 and idx > 0:
        s2 = s2[idx:]
    # sometimes there are duplicated prefixes like 'h\nhttps://...'
    s2 = s2.replace('\n', '').replace('\r', '')
    # fix common typo 'aaction' -> 'action'
    s2 = s2.replace('{aaction}', '{action}').replace('aaction', 'action')
    # If it looks like a template with placeholders, prepare to replace
    return s2


def build_resized_url_from_template(tmpl: str, size: str = CROP_SIZE):
    if not tmpl:
        return None
    if '{action}' in tmpl and '{width}x{height}' in tmpl:
        return tmpl.replace('{action}/{width}x{height}', f'{CROP_ACTION}/{size}').replace('{action}', CROP_ACTION).replace('{width}x{height}', size)
    # attempt to detect placeholder combined
    if '{' in tmpl and '}' in tmpl:
        # fallback: replace common pattern
        try:
            return tmpl.replace('{action}', CROP_ACTION).replace('{width}x{height}', size).replace('{width}', size.split('x')[0]).replace('{height}', size.split('x')[1])
        except Exception:
            pass
    # If no placeholders, but contains 'vr.images.sp' in tmpl and not re.search(r'/crop/\d+x\d+/', tmpl):
    if 'vr.images.sp' in tmpl and not re.search(r'/crop/\d+x\d+/', tmpl):
        # find suffix from vr.images.sp
        m = re.search(r'(vr\.images\.sp/.*)$', tmpl)
        if m:
            return f'https://resizedimgs.vivareal.com/{CROP_ACTION}/{size}/' + m.group(1)
    return tmpl


def url_ok(url: str) -> bool:
    if not url:
        return False
    try:
        # try HEAD first
        h = requests.head(url, timeout=REQ_TIMEOUT, allow_redirects=True)
        if h.status_code == 200:
            return True
        # some hosts don't respond to HEAD correctly; try GET small
        g = requests.get(url, timeout=REQ_TIMEOUT, stream=True)
        if g.status_code == 200:
            return True
        return False
    except Exception:
        return False


with app.app_context():
    props = Property.query.all()
    total = len(props)
    updated = 0
    scanned = 0
    skipped = 0
    failed_props = []

    print(f'Starting rebuild images for {total} properties...')

    for p in props:
        scanned += 1
        provider_raw = p.provider_raw
        if not provider_raw or not isinstance(provider_raw, dict):
            skipped += 1
            continue
        imgs = provider_raw.get('images') or []
        if not isinstance(imgs, list) or not imgs:
            skipped += 1
            continue

        new_urls = []
        for img in imgs:
            cand = None
            if isinstance(img, dict):
                resized = img.get('resizedUrl') or img.get('resizedurl') or img.get('resized')
                image_url = img.get('imageUrl') or img.get('url') or img.get('src') or img.get('path') or img.get('image')
                rt = sanitize_resized_template(resized) if resized else None
                if rt:
                    cand_try = build_resized_url_from_template(rt)
                    if cand_try and url_ok(cand_try):
                        cand = cand_try
                    else:
                        # try extracting suffix
                        if rt and 'vr.images.sp' in rt:
                            alt = build_resized_url_from_template(rt)
                            if alt and url_ok(alt):
                                cand = alt
                # fallback to imageUrl if accessible
                if not cand and image_url and url_ok(image_url):
                    cand = image_url
            elif isinstance(img, str):
                s = img.strip()
                if '{' in s:
                    s2 = sanitize_resized_template(s)
                    cand_try = build_resized_url_from_template(s2)
                    if cand_try and url_ok(cand_try):
                        cand = cand_try
                else:
                    if url_ok(s):
                        cand = s

            if cand:
                # preserve order, dedupe later
                new_urls.append(cand)
        # dedupe preserving order
        seen = set(); dedup = []
        for u in new_urls:
            if u and u not in seen:
                seen.add(u); dedup.append(u)

        if dedup:
            try:
                p.image_urls = dedup
                db.session.add(p)
                db.session.commit()
                updated += 1
                if updated % 50 == 0:
                    print(f'  processed {scanned}/{total} props, updated {updated}')
            except Exception as e:
                db.session.rollback()
                failed_props.append((p.id, str(e)))
        else:
            skipped += 1
        # small sleep to be polite
        time.sleep(0.05)

    print(f'Done. scanned={scanned} updated={updated} skipped={skipped} failed={len(failed_props)}')
    if failed_props:
        print('Failed props sample:', failed_props[:20])
