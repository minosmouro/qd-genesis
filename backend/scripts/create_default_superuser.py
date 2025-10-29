#!/usr/bin/env python3
"""
Script para criar superusuário padrão durante inicialização do container.
Executado automaticamente quando o backend inicia.
"""

import os
import sys
from pathlib import Path

# Adicionar o diretório backend ao path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

try:
    # Importar configurações e modelos
    from app import create_app
    from models import User, Tenant, db
    from werkzeug.security import generate_password_hash
    import logging

    # Configurar logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)

    def create_default_superuser():
        """Cria o superusuário padrão se não existir."""

        # Dados do superusuário
        email = "consultor.eliezer@gmail.com"
        username = "consultor.eliezer"
        password = os.environ.get("DEFAULT_SUPERUSER_PASSWORD", "ChangeMe123!")

        try:
            # Criar aplicação
            app = create_app()

            with app.app_context():
                # Verificar/Criar tenant padrão
                tenant = Tenant.query.filter_by(id=1).first()
                if not tenant:
                    tenant = Tenant(
                        id=1,
                        name="QuadraDois",
                        tenant_type="PJ",
                        company_name="QuadraDois Imobiliária",
                        email="admin@quadradois.com.br"
                    )
                    db.session.add(tenant)
                    db.session.commit()
                    logger.info("Tenant padrão criado: QuadraDois")
                else:
                    logger.info("Tenant padrão já existe")

                # Verificar se usuário já existe
                existing_user = User.query.filter(
                    (User.email == email) | (User.username == username)
                ).first()

                if existing_user:
                    logger.info(f"Superusuário já existe: {email}")
                    return True

                # Criar novo superusuário
                hashed_password = generate_password_hash(password)

                new_user = User(
                    email=email,
                    username=username,
                    password=hashed_password,
                    is_admin=True,
                    tenant_id=1  # Tenant padrão
                )

                db.session.add(new_user)
                db.session.commit()

                logger.info(f"Superusuário criado com sucesso: {email}")
                return True

        except Exception as e:
            logger.error(f"Erro ao criar superusuário: {e}")
            return False

    if __name__ == "__main__":
        logger.info("Verificando/criando superusuário padrão...")
        success = create_default_superuser()

        if success:
            logger.info("Superusuário configurado com sucesso!")
            sys.exit(0)
        else:
            logger.error("Falha ao configurar superusuário!")
            sys.exit(1)

except ImportError as e:
    print(f"Erro de importação: {e}")
    print("Certifique-se de que todas as dependências estão instaladas")
    sys.exit(1)