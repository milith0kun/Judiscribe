"""
Router central de la API — registra todos los sub-routers.
"""
from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.audiencias import router as audiencias_router
from app.api.hablantes import router as hablantes_router
from app.api.marcadores import router as marcadores_router
from app.api.frases import router as frases_router

router = APIRouter()

router.include_router(auth_router)
router.include_router(audiencias_router)
router.include_router(hablantes_router)
router.include_router(marcadores_router)
router.include_router(frases_router)

