# Paquete de modelos ORM
from app.models.usuario import Usuario
from app.models.audiencia import Audiencia
from app.models.segmento import Segmento
from app.models.hablante import Hablante
from app.models.marcador import Marcador
from app.models.frase_estandar import FraseEstandar

__all__ = [
    "Usuario",
    "Audiencia",
    "Segmento",
    "Hablante",
    "Marcador",
    "FraseEstandar",
]
