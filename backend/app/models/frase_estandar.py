"""
Modelo ORM — Frase estándar.

Frases rápidas que el digitador inserta con Ctrl+[0-9].
Ejemplos: "SE DEJA CONSTANCIA QUE...", "HACE USO DE LA PALABRA..."
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.database import Base


class FraseEstandar(Base):
    """Frase estándar rápida con atajo de teclado."""

    __tablename__ = "frases_estandar"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )

    # Número del atajo (0-9 → Ctrl+0 a Ctrl+9)
    numero_atajo: Mapped[int] = mapped_column(Integer, nullable=False)

    # Código (F01, F02...)
    codigo: Mapped[str] = mapped_column(String(10), nullable=False, unique=True)

    # Texto completo de la frase
    texto: Mapped[str] = mapped_column(Text, nullable=False)

    # Categoría (identificación, desarrollo, cierre, general)
    categoria: Mapped[str] = mapped_column(
        String(50), nullable=False, default="general"
    )

    # Usuario propietario (null = frase global del sistema)
    usuario_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("usuarios.id"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relaciones
    usuario = relationship("Usuario", backref="frases")
