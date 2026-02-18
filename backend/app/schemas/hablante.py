"""
Schemas Pydantic — Hablante.
"""
import uuid
from pydantic import BaseModel


class HablanteCreate(BaseModel):
    """Datos para crear un hablante."""
    speaker_id: str
    rol: str = "otro"
    etiqueta: str = "OTRO:"
    nombre: str | None = None
    color: str = "#94A3B8"
    orden: int = 0


class HablanteUpdate(BaseModel):
    """Datos para actualizar un hablante (asignar rol)."""
    rol: str | None = None
    etiqueta: str | None = None
    nombre: str | None = None
    color: str | None = None
    orden: int | None = None


class HablanteResponse(BaseModel):
    """Respuesta de hablante."""
    id: uuid.UUID
    audiencia_id: uuid.UUID
    speaker_id: str
    rol: str
    etiqueta: str
    nombre: str | None
    color: str
    orden: int
    auto_detectado: bool

    model_config = {"from_attributes": True}
