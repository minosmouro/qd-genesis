"""
Migração para corrigir campos datetime naive para UTC offset-aware em refresh_schedules
"""
from alembic import op

def upgrade():
    connection = op.get_bind()
    connection.execute("""
        UPDATE refresh_schedule 
        SET 
            created_at = created_at AT TIME ZONE 'UTC',
            updated_at = updated_at AT TIME ZONE 'UTC',
            last_run = CASE 
                WHEN last_run IS NOT NULL 
                THEN last_run AT TIME ZONE 'UTC' 
                ELSE NULL 
            END,
            next_run = CASE 
                WHEN next_run IS NOT NULL 
                THEN next_run AT TIME ZONE 'UTC' 
                ELSE NULL 
            END
        WHERE created_at AT TIME ZONE 'UTC' IS NOT NULL;
    """)

def downgrade():
    # Não implementado: reversão não recomendada
    pass
