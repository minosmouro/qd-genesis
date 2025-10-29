from app import create_app
from models import IntegrationCredentials, Property


def main():
    app = create_app()
    with app.app_context():
        try:
            rows = IntegrationCredentials.query.with_entities(IntegrationCredentials.tenant_id).distinct().all()
            print('tenant_ids em integration_credentials:')
            for r in rows:
                print(r[0])
        except Exception as e:
            print('Erro ao consultar integration_credentials:', e)

        try:
            rows = Property.query.with_entities(Property.tenant_id).distinct().all()
            print('\ntenant_ids em properties:')
            for r in rows:
                print(r[0])
        except Exception as e:
            print('Erro ao consultar properties:', e)


if __name__ == '__main__':
    main()
