"""
JudiScribe — Punto de entrada FastAPI.
Configura CORS, routers REST, WebSocket, y eventos de startup/shutdown.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import router as api_router
from app.config import settings
from app.database import engine
from app.ws.transcription_ws import transcription_websocket

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🚀 JudiScribe backend starting...")
    logger.info(f"   Environment: {settings.ENVIRONMENT}")
    logger.info(f"   CORS origins: {settings.cors_origins_list}")
    yield
    logger.info("🛑 JudiScribe backend shutting down...")
    await engine.dispose()


app = FastAPI(
    title="JudiScribe API",
    description="Sistema de transcripción judicial en tiempo real para el Distrito Judicial de Cusco",
    version="0.1.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── REST routes ──────────────────────────────────────────
app.include_router(api_router)

# ── WebSocket routes ─────────────────────────────────────
app.websocket("/ws/transcripcion/{audiencia_id}")(transcription_websocket)


# ── Health check ─────────────────────────────────────────
@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "service": "judiscribe-backend",
        "version": "0.1.0",
    }
