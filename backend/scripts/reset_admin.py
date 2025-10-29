from werkzeug.security import generate_password_hash

from app import create_app
from models import db, User

USERNAME = "admin"
EMAIL = "admin@quadradois.com"
PASSWORD = "admin123"

def main():
    app = create_app()
    with app.app_context():
        user = User.query.first()
        if not user:
            user = User(
                username=USERNAME,
                email=EMAIL,
                tenant_id=1,
                password=generate_password_hash(PASSWORD),
            )
            db.session.add(user)
        else:
            user.username = USERNAME
            user.email = EMAIL
            user.password = generate_password_hash(PASSWORD)
        db.session.commit()
        print("✅ Admin credentials reset to admin/admin123")

if __name__ == "__main__":
    main()
