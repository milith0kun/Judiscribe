"""
JudiScribe — Punto de entrada FastAPI.
Configura CORS, routers REST, WebSocket, y eventos de startup/shutdown.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, func

from app.api.router import router as api_router
from app.config import settings
from app.database import engine, async_session, Base
from app.models.usuario import Usuario
from app.models.frase_estandar import FraseEstandar
from app.services.auth_service import hash_password
from app.ws.transcription_ws import transcription_websocket

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


# Frases estándar del sistema
FRASES_SISTEMA = [
    {"numero_atajo": 1, "codigo": "F01", "texto": "SE DEJA CONSTANCIA QUE LA PRESENTE AUDIENCIA SE DESARROLLA DE MANERA VIRTUAL, A TRAVÉS DE LA PLATAFORMA GOOGLE MEET.", "categoria": "identificación"},
    {"numero_atajo": 2, "codigo": "F02", "texto": "HACE USO DE LA PALABRA EL/LA REPRESENTANTE DEL MINISTERIO PÚBLICO.", "categoria": "desarrollo"},
    {"numero_atajo": 3, "codigo": "F03", "texto": "HACE USO DE LA PALABRA LA DEFENSA TÉCNICA DEL ACUSADO/A.", "categoria": "desarrollo"},
    {"numero_atajo": 4, "codigo": "F04", "texto": "SEGUIDAMENTE SE LE CONCEDE EL USO DE LA PALABRA AL ACUSADO/A PARA QUE EJERZA SU DERECHO DE AUTODEFENSA.", "categoria": "desarrollo"},
    {"numero_atajo": 5, "codigo": "F05", "texto": "SE DEJA CONSTANCIA QUE SE HA PROCEDIDO A ORALIZAR LA PRUEBA DOCUMENTAL.", "categoria": "desarrollo"},
    {"numero_atajo": 6, "codigo": "F06", "texto": "SE SUSPENDE LA AUDIENCIA PARA CONTINUARLA EL DÍA {FECHA} A LAS {HORA} HORAS.", "categoria": "cierre"},
    {"numero_atajo": 7, "codigo": "F07", "texto": "SE DA POR CONCLUIDA LA PRESENTE AUDIENCIA, FIRMANDO LOS QUE EN ELLA INTERVINIERON.", "categoria": "cierre"},
    {"numero_atajo": 8, "codigo": "F08", "texto": "QUEDA CONSENTIDA LA RESOLUCIÓN AL NO SER IMPUGNADA POR LAS PARTES.", "categoria": "cierre"},
    {"numero_atajo": 9, "codigo": "F09", "texto": "SE PROCEDE AL EXAMEN DEL TESTIGO/PERITO, PREVIA JURAMENTACIÓN DE LEY.", "categoria": "desarrollo"},
    {"numero_atajo": 0, "codigo": "F10", "texto": "SIENDO LAS {HORA} HORAS DEL DÍA {FECHA}, SE DA INICIO A LA PRESENTE AUDIENCIA.", "categoria": "identificación"},
]


async def auto_seed_database():
    """Puebla automáticamente la base de datos si está vacía."""
    try:
        # Crear tablas si no existen
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        async with async_session() as db:
            # Verificar si hay usuarios
            resultado = await db.execute(select(func.count(Usuario.id)))
            total_usuarios = resultado.scalar()
            
            if total_usuarios == 0:
                logger.info("📦 Base de datos vacía. Iniciando seed automático...")
                
                # Crear usuario admin
                admin = Usuario(
                    email="admin@judiscribe.pe",
                    nombre="Administrador del Sistema",
                    password_hash=hash_password("JudiScribe2024!"),
                    rol="admin",
                    activo=True,
                )
                db.add(admin)
                logger.info("   ✅ Usuario admin creado")
                
                # Crear usuario digitador
                digitador = Usuario(
                    email="digitador@judiscribe.pe",
                    nombre="Digitador de Audiencias",
                    password_hash=hash_password("Digitador2024!"),
                    rol="transcriptor",
                    activo=True,
                )
                db.add(digitador)
                logger.info("   ✅ Usuario digitador creado")
                
                # Crear frases estándar
                for frase_data in FRASES_SISTEMA:
                    frase = FraseEstandar(**frase_data)
                    db.add(frase)
                logger.info(f"   ✅ {len(FRASES_SISTEMA)} frases estándar creadas")
                
                await db.commit()
                logger.info("🎉 Seed automático completado. Sistema listo.")
                logger.info("   📧 Login: digitador@judiscribe.pe / Digitador2024!")
            else:
                logger.info(f"✅ Base de datos ya poblada ({total_usuarios} usuarios)")
                
    except Exception as e:
        logger.error(f"❌ Error en seed automático: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("🚀 JudiScribe backend starting...")
    logger.info(f"   Environment: {settings.ENVIRONMENT}")
    logger.info(f"   CORS origins: {settings.cors_origins_list}")
    
    # Seed automático de la base de datos
    await auto_seed_database()
    
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
