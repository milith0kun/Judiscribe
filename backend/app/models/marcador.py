"""
Modelo ORM — Marcador temporal.

Los digitadores crean marcadores durante la audiencia (Ctrl+M)
para señalar momentos importantes que requieren revisión posterior.
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class Marcador(Base):
    """Marcador temporal creado por el digitador durante la audiencia."""

    __tablename__ = "marcadores"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    audiencia_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("audiencias.id", ondelete="CASCADE"), nullable=False, index=True
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuarios.id"), nullable=False
    )

    # Momento exacto del audio (en segundos)
    timestamp: Mapped[float] = mapped_column(Float, nullable=False)

    # Nota opcional del digitador
    nota: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Categoría del marcador
    tipo: Mapped[str] = mapped_column(
        String(50), nullable=False, default="revision"
    )  # revision, importante, error, pregunta

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relaciones
    audiencia = relationship("Audiencia", backref="marcadores")
    usuario = relationship("Usuario")
