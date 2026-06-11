"""add user pdf text sizes

Revision ID: 4f5c7d9e2a10
Revises: 1c4a8f9b2d01
Create Date: 2026-06-11 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4f5c7d9e2a10'
down_revision: Union[str, Sequence[str], None] = '1c4a8f9b2d01'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'users',
        sa.Column('pdf_font_size', sa.Integer(), nullable=True, server_default='13'),
    )
    op.add_column(
        'users',
        sa.Column('pdf_description_font_size', sa.Integer(), nullable=True, server_default='14'),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('users', 'pdf_description_font_size')
    op.drop_column('users', 'pdf_font_size')
