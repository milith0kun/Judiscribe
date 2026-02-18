"""
Schemas Pydantic — Marcador temporal.
"""
import uuid
from pydantic import BaseModel


class MarcadorCreate(BaseModel):
    """Datos para crear un marcador."""
    timestamp: float
    nota: str | None = None
    tipo: str = "revision"  # revision, importante, error, pregunta


class MarcadorResponse(BaseModel):
    """Respuesta de marcador."""
    id: uuid.UUID
    audiencia_id: uuid.UUID
    usuario_id: uuid.UUID
    timestamp: float
    nota: str | None
    tipo: str
    created_at: str  # ISO datetime

    model_config = {"from_attributes": True}
