"""
Schemas Pydantic — Frase estándar.
"""
import uuid
from pydantic import BaseModel


class FraseEstandarCreate(BaseModel):
    """Datos para crear una frase estándar."""
    numero_atajo: int  # 0-9
    codigo: str  # F01, F02...
    texto: str
    categoria: str = "general"


class FraseEstandarUpdate(BaseModel):
    """Datos para actualizar una frase estándar."""
    texto: str | None = None
    categoria: str | None = None


class FraseEstandarResponse(BaseModel):
    """Respuesta de frase estándar."""
    id: uuid.UUID
    numero_atajo: int
    codigo: str
    texto: str
    categoria: str
    usuario_id: uuid.UUID | None

    model_config = {"from_attributes": True}
