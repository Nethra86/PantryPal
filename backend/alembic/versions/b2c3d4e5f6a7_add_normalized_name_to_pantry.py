"""add_normalized_name_to_pantry

Revision ID: b2c3d4e5f6a7
Revises: 9eda7d1238d2
Create Date: 2026-09-28 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from app.normalization import normalize_ingredient_name

revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = '9eda7d1238d2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('pantry_items') as batch_op:
        batch_op.add_column(sa.Column('normalized_name', sa.String(length=100), nullable=False, server_default=''))
        batch_op.create_index('ix_pantry_items_normalized_name', ['normalized_name'])

    # Backfill normalized_name for any existing rows
    conn = op.get_bind()
    pantry_rows = conn.execute(sa.text("SELECT id, name FROM pantry_items")).fetchall()
    for row in pantry_rows:
        item_id = row[0]
        item_name = row[1]
        norm = normalize_ingredient_name(item_name)
        conn.execute(
            sa.text("UPDATE pantry_items SET normalized_name = :norm WHERE id = :item_id"),
            {"norm": norm, "item_id": item_id}
        )


def downgrade() -> None:
    with op.batch_alter_table('pantry_items') as batch_op:
        batch_op.drop_index('ix_pantry_items_normalized_name')
        batch_op.drop_column('normalized_name')
