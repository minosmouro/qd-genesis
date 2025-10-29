"""Add CanalPro fields to property

Revision ID: 20250828_add_canalpro_fields
Revises: f1f7384dad93_add_integration_credentials
Create Date: 2025-08-28 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20250828_add_canalpro_fields'
down_revision = '76bdad4a6bcd'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('property', sa.Column('provider_raw', postgresql.JSON(), nullable=True))

    # address
    op.add_column('property', sa.Column('address_street', sa.String(length=255), nullable=True))
    op.add_column('property', sa.Column('address_number', sa.String(length=50), nullable=True))
    op.add_column('property', sa.Column('address_complement', sa.String(length=255), nullable=True))
    op.add_column('property', sa.Column('address_neighborhood', sa.String(length=255), nullable=True))
    op.add_column('property', sa.Column('address_city', sa.String(length=255), nullable=True))
    op.add_column('property', sa.Column('address_state', sa.String(length=100), nullable=True))
    op.add_column('property', sa.Column('address_zip', sa.String(length=20), nullable=True))
    op.add_column('property', sa.Column('address_name', sa.String(length=255), nullable=True))
    op.add_column('property', sa.Column('address_location_id', sa.String(length=255), nullable=True))
    op.add_column('property', sa.Column('address_precision', sa.String(length=50), nullable=True))

    # geolocation
    op.add_column('property', sa.Column('latitude', sa.Float(), nullable=True))
    op.add_column('property', sa.Column('longitude', sa.Float(), nullable=True))
    op.add_column('property', sa.Column('display_latitude', sa.Float(), nullable=True))
    op.add_column('property', sa.Column('display_longitude', sa.Float(), nullable=True))

    # pricing
    op.add_column('property', sa.Column('price', sa.Numeric(), nullable=True))
    op.add_column('property', sa.Column('currency', sa.String(length=10), nullable=True))
    op.add_column('property', sa.Column('condo_fee', sa.Numeric(), nullable=True))
    op.add_column('property', sa.Column('iptu', sa.Numeric(), nullable=True))
    op.add_column('property', sa.Column('iptu_period', sa.String(length=50), nullable=True))

    # physical
    op.add_column('property', sa.Column('bedrooms', sa.Integer(), nullable=True))
    op.add_column('property', sa.Column('bathrooms', sa.Integer(), nullable=True))
    op.add_column('property', sa.Column('suites', sa.Integer(), nullable=True))
    op.add_column('property', sa.Column('parking_spaces', sa.Integer(), nullable=True))
    op.add_column('property', sa.Column('usable_area', sa.Float(), nullable=True))
    op.add_column('property', sa.Column('total_area', sa.Float(), nullable=True))
    op.add_column('property', sa.Column('unit_floor', sa.Integer(), nullable=True))
    op.add_column('property', sa.Column('units_on_floor', sa.Integer(), nullable=True))
    op.add_column('property', sa.Column('floors', sa.Integer(), nullable=True))
    op.add_column('property', sa.Column('buildings', sa.Integer(), nullable=True))

    # classification
    op.add_column('property', sa.Column('property_type', sa.String(length=100), nullable=True))
    op.add_column('property', sa.Column('listing_type', sa.String(length=50), nullable=True))
    op.add_column('property', sa.Column('business_type', sa.String(length=50), nullable=True))
    op.add_column('property', sa.Column('usage_types', postgresql.JSON(), nullable=True))
    op.add_column('property', sa.Column('unit_types', postgresql.JSON(), nullable=True))
    op.add_column('property', sa.Column('unit_subtypes', postgresql.JSON(), nullable=True))

    # media/moderation
    op.add_column('property', sa.Column('videos', postgresql.JSON(), nullable=True))
    op.add_column('property', sa.Column('video_tour_link', sa.String(length=512), nullable=True))
    op.add_column('property', sa.Column('portals', postgresql.JSON(), nullable=True))
    op.add_column('property', sa.Column('stamps', postgresql.JSON(), nullable=True))
    op.add_column('property', sa.Column('amenities', postgresql.JSON(), nullable=True))
    op.add_column('property', sa.Column('moderations', postgresql.JSON(), nullable=True))

    # metrics
    op.add_column('property', sa.Column('score', sa.Float(), nullable=True))
    op.add_column('property', sa.Column('score_name', sa.String(length=100), nullable=True))
    op.add_column('property', sa.Column('score_status', sa.String(length=100), nullable=True))

    # publication / timestamps
    op.add_column('property', sa.Column('published_at', sa.DateTime(), nullable=True))
    op.add_column('property', sa.Column('delivered_at', sa.DateTime(), nullable=True))
    op.add_column('property', sa.Column('created_at', sa.DateTime(), nullable=True))
    op.add_column('property', sa.Column('updated_at', sa.DateTime(), nullable=True))


def downgrade():
    # reverse order of upgrade
    op.drop_column('property', 'updated_at')
    op.drop_column('property', 'created_at')
    op.drop_column('property', 'delivered_at')
    op.drop_column('property', 'published_at')

    op.drop_column('property', 'score_status')
    op.drop_column('property', 'score_name')
    op.drop_column('property', 'score')

    op.drop_column('property', 'moderations')
    op.drop_column('property', 'amenities')
    op.drop_column('property', 'stamps')
    op.drop_column('property', 'portals')
    op.drop_column('property', 'video_tour_link')
    op.drop_column('property', 'videos')

    op.drop_column('property', 'unit_subtypes')
    op.drop_column('property', 'unit_types')
    op.drop_column('property', 'usage_types')
    op.drop_column('property', 'business_type')
    op.drop_column('property', 'listing_type')
    op.drop_column('property', 'property_type')

    op.drop_column('property', 'buildings')
    op.drop_column('property', 'floors')
    op.drop_column('property', 'units_on_floor')
    op.drop_column('property', 'unit_floor')
    op.drop_column('property', 'total_area')
    op.drop_column('property', 'usable_area')
    op.drop_column('property', 'parking_spaces')
    op.drop_column('property', 'suites')
    op.drop_column('property', 'bathrooms')
    op.drop_column('property', 'bedrooms')

    op.drop_column('property', 'iptu_period')
    op.drop_column('property', 'iptu')
    op.drop_column('property', 'condo_fee')
    op.drop_column('property', 'currency')
    op.drop_column('property', 'price')

    op.drop_column('property', 'display_longitude')
    op.drop_column('property', 'display_latitude')
    op.drop_column('property', 'longitude')
    op.drop_column('property', 'latitude')

    op.drop_column('property', 'address_precision')
    op.drop_column('property', 'address_location_id')
    op.drop_column('property', 'address_name')
    op.drop_column('property', 'address_zip')
    op.drop_column('property', 'address_state')
    op.drop_column('property', 'address_city')
    op.drop_column('property', 'address_neighborhood')
    op.drop_column('property', 'address_complement')
    op.drop_column('property', 'address_number')
    op.drop_column('property', 'address_street')

    op.drop_column('property', 'provider_raw')
