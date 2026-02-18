"""
Modelo ORM: Audiencia.
Representa una audiencia judicial con todos los metadatos del encabezado.
"""
import uuid
from datetime import date, datetime, time
from typing import Optional

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, String, Time, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Audiencia(Base):
    __tablename__ = "audiencias"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    expediente: Mapped[str] = mapped_column(String(50), nullable=False)
    juzgado: Mapped[str] = mapped_column(String(200), nullable=False)
    tipo_audiencia: Mapped[str] = mapped_column(String(100), nullable=False)
    instancia: Mapped[str] = mapped_column(String(50), nullable=False)
    fecha: Mapped[date] = mapped_column(Date, nullable=False)
    hora_inicio: Mapped[time] = mapped_column(Time, nullable=False)
    hora_fin: Mapped[Optional[time]] = mapped_column(Time, nullable=True)
    sala: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    delito: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    imputado_nombre: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True
    )
    agraviado_nombre: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True
    )
    especialista_causa: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True
    )
    especialista_audiencia: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True
    )
    estado: Mapped[str] = mapped_column(
        Enum(
            "pendiente",
            "en_curso",
            "transcrita",
            "en_revision",
            "finalizada",
            name="estado_audiencia",
        ),
        nullable=False,
        default="pendiente",
    )
    audio_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    audio_duration_seconds: Mapped[Optional[float]] = mapped_column(
        Float, nullable=True
    )
    deepgram_session_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("usuarios.id"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    segmentos = relationship("Segmento", back_populates="audiencia", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Audiencia {self.expediente} ({self.estado})>"
