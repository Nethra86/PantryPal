"""add_auth_and_user_scoping

Revision ID: 9eda7d1238d2
Revises: e0ca11e6846c
Create Date: 2026-09-26 15:31:52.615473

"""
from typing import Sequence, Union
from datetime import datetime, timezone
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9eda7d1238d2'
down_revision: Union[str, Sequence[str], None] = 'e0ca11e6846c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=150), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)

    # 2. Insert primary seed user (Chef Rowan / rowan@kitchen.local / Password123!)
    users_table = sa.table(
        'users',
        sa.column('id', sa.Integer),
        sa.column('email', sa.String),
        sa.column('hashed_password', sa.String),
        sa.column('name', sa.String),
        sa.column('created_at', sa.DateTime),
        sa.column('updated_at', sa.DateTime)
    )
    op.bulk_insert(
        users_table,
        [
            {
                'id': 1,
                'email': 'rowan@kitchen.local',
                'hashed_password': '$2b$12$JwtLvoGiiFL93lpofvzNGumRz0H2e7lBkLsZYJ4W6h1JNeXEVlAdC',
                'name': 'Chef Rowan',
                'created_at': datetime.now(timezone.utc),
                'updated_at': datetime.now(timezone.utc),
            }
        ]
    )

    # 3. Create sessions table
    op.create_table(
        'sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_token', sa.String(length=128), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('csrf_token', sa.String(length=128), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sessions_expires_at'), 'sessions', ['expires_at'], unique=False)
    op.create_index(op.f('ix_sessions_id'), 'sessions', ['id'], unique=False)
    op.create_index(op.f('ix_sessions_session_token'), 'sessions', ['session_token'], unique=True)
    op.create_index(op.f('ix_sessions_user_id'), 'sessions', ['user_id'], unique=False)

    # 4. Create favorites table
    op.create_table(
        'favorites',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('recipe_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['recipe_id'], ['recipes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'recipe_id', name='uq_user_recipe_favorite')
    )
    op.create_index(op.f('ix_favorites_id'), 'favorites', ['id'], unique=False)
    op.create_index(op.f('ix_favorites_recipe_id'), 'favorites', ['recipe_id'], unique=False)
    op.create_index(op.f('ix_favorites_user_id'), 'favorites', ['user_id'], unique=False)

    # 5. Create shopping_items table
    op.create_table(
        'shopping_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('quantity', sa.Float(), nullable=True),
        sa.Column('unit', sa.String(length=30), nullable=True),
        sa.Column('is_purchased', sa.Boolean(), nullable=True),
        sa.Column('recipe_source_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['recipe_source_id'], ['recipes.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_shopping_items_id'), 'shopping_items', ['id'], unique=False)
    op.create_index(op.f('ix_shopping_items_user_id'), 'shopping_items', ['user_id'], unique=False)

    # Migrate any existing records from grocery_items to shopping_items
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'grocery_items' in inspector.get_table_names():
        op.execute(
            "INSERT INTO shopping_items (id, user_id, name, category, quantity, unit, is_purchased, recipe_source_id, created_at) "
            "SELECT id, 1, name, category, quantity, unit, is_purchased, recipe_source_id, created_at FROM grocery_items"
        )
        op.drop_table('grocery_items')

    # 6. Add user_id to pantry_items using batch_alter_table
    with op.batch_alter_table('pantry_items') as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=False, server_default='1'))
        batch_op.create_foreign_key('fk_pantry_items_user_id', 'users', ['user_id'], ['id'], ondelete='CASCADE')
        batch_op.create_index('ix_pantry_items_user_id', ['user_id'])

    # 7. Add user_id to recipes using batch_alter_table
    with op.batch_alter_table('recipes') as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key('fk_recipes_user_id', 'users', ['user_id'], ['id'], ondelete='CASCADE')
        batch_op.create_index('ix_recipes_user_id', ['user_id'])

    # 8. Add user_id to meal_plans using batch_alter_table
    with op.batch_alter_table('meal_plans') as batch_op:
        batch_op.add_column(sa.Column('user_id', sa.Integer(), nullable=False, server_default='1'))
        batch_op.create_foreign_key('fk_meal_plans_user_id', 'users', ['user_id'], ['id'], ondelete='CASCADE')
        batch_op.create_index('ix_meal_plans_user_id', ['user_id'])


def downgrade() -> None:
    with op.batch_alter_table('meal_plans') as batch_op:
        batch_op.drop_constraint('fk_meal_plans_user_id', type_='foreignkey')
        batch_op.drop_index('ix_meal_plans_user_id')
        batch_op.drop_column('user_id')

    with op.batch_alter_table('recipes') as batch_op:
        batch_op.drop_constraint('fk_recipes_user_id', type_='foreignkey')
        batch_op.drop_index('ix_recipes_user_id')
        batch_op.drop_column('user_id')

    with op.batch_alter_table('pantry_items') as batch_op:
        batch_op.drop_constraint('fk_pantry_items_user_id', type_='foreignkey')
        batch_op.drop_index('ix_pantry_items_user_id')
        batch_op.drop_column('user_id')

    op.drop_table('shopping_items')
    op.drop_table('favorites')
    op.drop_table('sessions')
    op.drop_table('users')
