"""
Script de inicialización — crea el usuario admin y frases del sistema.
Ejecutar: python -m app.scripts.seed
"""
import asyncio
import sys
import os

# Agregar el directorio del backend al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.database import async_session, engine, Base
from app.models.usuario import Usuario
from app.models.frase_estandar import FraseEstandar
from app.services.auth_service import hash_password


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


async def seed():
    """Crear tablas, usuario admin, y frases del sistema."""
    
    # Crear todas las tablas
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tablas creadas correctamente")

    async with async_session() as db:
        # ── Crear usuario admin ──
        from sqlalchemy import select
        resultado = await db.execute(
            select(Usuario).where(Usuario.email == "admin@judiscribe.pe")
        )
        admin_existente = resultado.scalar_one_or_none()

        if not admin_existente:
            admin = Usuario(
                email="admin@judiscribe.pe",
                nombre="Administrador del Sistema",
                password_hash=hash_password("JudiScribe2024!"),
                rol="admin",
                activo=True,
            )
            db.add(admin)
            print("✅ Usuario admin creado: admin@judiscribe.pe / JudiScribe2024!")
        else:
            print("ℹ️  Usuario admin ya existe")

        # ── Crear usuario digitador de prueba ──
        resultado = await db.execute(
            select(Usuario).where(Usuario.email == "digitador@judiscribe.pe")
        )
        digitador_existente = resultado.scalar_one_or_none()

        if not digitador_existente:
            digitador = Usuario(
                email="digitador@judiscribe.pe",
                nombre="Digitador de Prueba",
                password_hash=hash_password("Digitador2024!"),
                rol="transcriptor",
                activo=True,
            )
            db.add(digitador)
            print("✅ Usuario digitador creado: digitador@judiscribe.pe / Digitador2024!")
        else:
            print("ℹ️  Usuario digitador ya existe")

        # ── Crear frases del sistema ──
        resultado = await db.execute(
            select(FraseEstandar).where(FraseEstandar.usuario_id == None)  # noqa: E711
        )
        if not resultado.scalars().first():
            for frase_data in FRASES_SISTEMA:
                frase = FraseEstandar(**frase_data)
                db.add(frase)
            print(f"✅ {len(FRASES_SISTEMA)} frases estándar del sistema creadas")
        else:
            print("ℹ️  Frases del sistema ya existen")

        await db.commit()

    print("\n🚀 Seed completado. El sistema está listo para usar.")
    print("   Acceder con: admin@judiscribe.pe / JudiScribe2024!")
    print("   O con:       digitador@judiscribe.pe / Digitador2024!")


if __name__ == "__main__":
    asyncio.run(seed())
