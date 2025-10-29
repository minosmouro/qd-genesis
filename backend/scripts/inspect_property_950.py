import os, sys, json
import requests

# garantir backend no sys.path
SCRIPT_DIR = os.path.dirname(__file__)
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import create_app

app = create_app()
with app.app_context():
    from models import Property
    p = Property.query.filter_by(id=950).first()
    if not p:
        print('Property id=950 not found')
        sys.exit(1)
    print('id:', p.id)
    print('external_id:', p.external_id)
    print('image_urls type:', type(p.image_urls))
    try:
        print('image_urls len:', len(p.image_urls) if p.image_urls else 0)
    except Exception as e:
        print('image_urls error:', e)
    print('\nimage_urls sample:')
    print(p.image_urls)

    pr = p.provider_raw
    print('\nprovider_raw type:', type(pr))
    if isinstance(pr, dict):
        imgs = pr.get('images') or []
        print('provider_raw images count:', len(imgs))
        if imgs:
            for i, img in enumerate(imgs[:10]):
                print(f' img[{i}]:', type(img))
                if isinstance(img, dict):
                    for k in ('resizedUrl','resizedurl','imageUrl','url','src'):
                        if k in img:
                            print(f'   {k}:', img.get(k))
                else:
                    print('   raw:', img)
    else:
        print('provider_raw not dict or empty')

    # Check first image_urls reachable
    def check_url(u):
        if not u:
            return 'empty'
        try:
            h = requests.head(u, timeout=10, allow_redirects=True)
            s = h.status_code
            if s == 200:
                return f'HEAD 200 ({h.headers.get("Content-Type")})'
            # try GET
            g = requests.get(u, timeout=10, stream=True)
            return f'GET {g.status_code} ({g.headers.get("Content-Type")})'
        except Exception as e:
            return f'error: {e}'

    print('\ncheck saved image_urls:')
    if p.image_urls:
        for u in p.image_urls[:5]:
            print(' ', u, '->', check_url(u))
    else:
        print(' no image_urls')

    # check provider_raw first image candidate
    if isinstance(pr, dict):
        imgs = pr.get('images') or []
        if imgs:
            first = imgs[0]
            cand = None
            if isinstance(first, dict):
                cand = first.get('resizedUrl') or first.get('resizedurl') or first.get('imageUrl')
            elif isinstance(first, str):
                cand = first
            print('\nprovider_raw first image candidate ->', cand)
            print(' check ->', check_url(cand))
    print('\nDone')
