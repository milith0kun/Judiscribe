"""add texto_mejorado to segmentos

Revision ID: b8c3f2e9d1a0
Revises: 4a0f144e34db
Create Date: 2026-02-18 10:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8c3f2e9d1a0'
down_revision: Union[str, None] = '4a0f144e34db'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Agregar columna texto_mejorado a segmentos
    op.add_column('segmentos', sa.Column('texto_mejorado', sa.Text(), nullable=True))


def downgrade() -> None:
    # Eliminar columna texto_mejorado
    op.drop_column('segmentos', 'texto_mejorado')
