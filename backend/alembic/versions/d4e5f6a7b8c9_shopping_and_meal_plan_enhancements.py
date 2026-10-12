"""shopping_and_meal_plan_enhancements

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-09-28 11:05:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, Sequence[str], None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('shopping_items') as batch_op:
        batch_op.add_column(sa.Column('normalized_name', sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column('notes', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('needs_review', sa.Boolean(), nullable=False, server_default='0'))
        batch_op.add_column(sa.Column('review_warning', sa.Text(), nullable=True))
        batch_op.create_index('ix_shopping_items_normalized_name', ['normalized_name'], unique=False)

    with op.batch_alter_table('meal_plans') as batch_op:
        batch_op.add_column(sa.Column('plan_date', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('planned_servings', sa.Integer(), nullable=False, server_default='2'))
        batch_op.add_column(sa.Column('custom_meal_name', sa.String(length=150), nullable=True))
        batch_op.add_column(sa.Column('notes', sa.Text(), nullable=True))
        batch_op.alter_column('recipe_id', existing_type=sa.Integer(), nullable=True)
        batch_op.create_index('ix_meal_plans_plan_date', ['plan_date'], unique=False)


def downgrade() -> None:
    with op.batch_alter_table('meal_plans') as batch_op:
        batch_op.drop_index('ix_meal_plans_plan_date')
        batch_op.drop_column('notes')
        batch_op.drop_column('custom_meal_name')
        batch_op.drop_column('planned_servings')
        batch_op.drop_column('plan_date')

    with op.batch_alter_table('shopping_items') as batch_op:
        batch_op.drop_index('ix_shopping_items_normalized_name')
        batch_op.drop_column('review_warning')
        batch_op.drop_column('needs_review')
        batch_op.drop_column('notes')
        batch_op.drop_column('normalized_name')
