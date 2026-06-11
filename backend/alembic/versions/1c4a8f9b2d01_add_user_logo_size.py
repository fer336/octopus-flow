"""add user logo size

Revision ID: 1c4a8f9b2d01
Revises: fe3b9d185ed1
Create Date: 2026-06-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1c4a8f9b2d01'
down_revision: Union[str, Sequence[str], None] = 'fe3b9d185ed1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'users',
        sa.Column('logo_size', sa.Integer(), nullable=True, server_default='180'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'logo_size')
