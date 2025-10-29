try:
    from app import create_app
except Exception:
    from backend.app import create_app
from models import User

app = create_app()
with app.app_context():
    u = User.query.filter((User.email == 'consultor.eliezer@gmail.com') | (User.username == 'consultor.eliezer')).first()
    if not u:
        print('NOT_FOUND')
    else:
        print('FOUND', u.id, u.username, u.email)
