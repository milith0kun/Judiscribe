"""
API endpoints para predicción de texto y autocompletado.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Dict

from app.services.text_prediction import (
    get_prediction_service,
    detect_names,
    detect_expediente,
    detect_paragraph_structure,
    capitalize_proper_nouns,
)

router = APIRouter(prefix="/prediction", tags=["prediction"])


class PredictionRequest(BaseModel):
    """Request para obtener predicción de texto."""
    text: str
    speaker_id: Optional[str] = None
    max_tokens: Optional[int] = 50


class PredictionResponse(BaseModel):
    """Response con predicción y análisis de texto."""
    suggestion: Optional[str] = None
    corrected_text: Optional[str] = None
    names: List[Dict] = []
    expedientes: List[Dict] = []
    structure: Dict = {}


class CapitalizeRequest(BaseModel):
    """Request para capitalizar nombres en texto."""
    text: str


class CapitalizeResponse(BaseModel):
    """Response con texto corregido."""
    original: str
    corrected: str
    changes: List[Dict] = []


@router.post("/suggest", response_model=PredictionResponse)
async def get_suggestion(request: PredictionRequest):
    """
    Obtiene sugerencia de autocompletado para el texto.

    Analiza el contexto y devuelve:
    - Predicción de continuación
    - Nombres detectados para capitalizar
    - Códigos de expediente detectados
    - Información de estructura de párrafo
    """
    try:
        service = get_prediction_service()
        result = await service.get_suggestion(
            text=request.text,
            speaker_id=request.speaker_id,
        )
        return PredictionResponse(**result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/capitalize", response_model=CapitalizeResponse)
async def capitalize_text(request: CapitalizeRequest):
    """
    Capitaliza nombres propios en el texto.

    Detecta y corrige:
    - Nombres de persona
    - Apellidos
    - Nombres después de títulos (Sr., Sra., Don, Doña)
    """
    try:
        names = detect_names(request.text)
        corrected = capitalize_proper_nouns(request.text)

        return CapitalizeResponse(
            original=request.text,
            corrected=corrected,
            changes=names,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detect-expediente")
async def detect_expediente_endpoint(request: CapitalizeRequest):
    """
    Detecta códigos de expediente judicial en el texto.

    Formatos soportados:
    - NNNNN-YYYY-0-DDDD-JR-PE-01 (completo)
    - NNNNN-YYYY (parcial)
    - Exp. N° NNNNN-YYYY
    """
    try:
        expedientes = detect_expediente(request.text)
        return {
            "expedientes": expedientes,
            "count": len(expedientes),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-structure")
async def analyze_structure(request: CapitalizeRequest):
    """
    Analiza la estructura del texto para formateo de párrafos.

    Detecta:
    - Inicio de nuevas intervenciones
    - Numeración de puntos
    - Viñetas
    - Citas textuales
    """
    try:
        structure = detect_paragraph_structure(request.text)
        return structure
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
