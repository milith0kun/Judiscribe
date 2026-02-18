#!/usr/bin/env python3
"""
Script para verificar el estado de la base de datos en producción.
Ejecutar dentro del contenedor del backend en Dokploy.
"""
import asyncio
import sys
import os

# Agregar el directorio del backend al path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import async_session
from app.models.usuario import Usuario
from app.models.frase_estandar import FraseEstandar
from app.models.audiencia import Audiencia
from sqlalchemy import select, func


async def verificar_bd():
    """Verificar el estado de la base de datos."""
    
    async with async_session() as db:
        # Contar usuarios
        resultado = await db.execute(select(func.count(Usuario.id)))
        total_usuarios = resultado.scalar()
        
        # Contar frases estándar
        resultado = await db.execute(select(func.count(FraseEstandar.id)))
        total_frases = resultado.scalar()
        
        # Contar audiencias
        resultado = await db.execute(select(func.count(Audiencia.id)))
        total_audiencias = resultado.scalar()
        
        # Listar usuarios
        resultado = await db.execute(select(Usuario.email, Usuario.nombre, Usuario.rol))
        usuarios = resultado.all()
        
        print("\n" + "="*60)
        print("Estado de la Base de Datos")
        print("="*60)
        print(f"\n📊 Estadísticas:")
        print(f"   • Usuarios: {total_usuarios}")
        print(f"   • Frases estándar: {total_frases}")
        print(f"   • Audiencias: {total_audiencias}")
        
        if total_usuarios > 0:
            print(f"\n👥 Usuarios en el sistema:")
            for email, nombre, rol in usuarios:
                print(f"   • {email} - {nombre} ({rol})")
        else:
            print(f"\n⚠️  No hay usuarios en el sistema!")
            print(f"   Ejecuta: python -m app.scripts.seed")
        
        print("\n" + "="*60 + "\n")
        
        return total_usuarios > 0


if __name__ == "__main__":
    tiene_datos = asyncio.run(verificar_bd())
    sys.exit(0 if tiene_datos else 1)
