"""add_allergens_and_source_to_recipes

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-09-28 10:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('recipes') as batch_op:
        batch_op.add_column(sa.Column('allergens', sa.String(length=200), nullable=True, server_default=''))
        batch_op.add_column(sa.Column('source', sa.String(length=50), nullable=True, server_default='sample'))


def downgrade() -> None:
    with op.batch_alter_table('recipes') as batch_op:
        batch_op.drop_column('source')
        batch_op.drop_column('allergens')
