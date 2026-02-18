"""
API de Marcadores — notas temporales durante la audiencia.

El digitador crea marcadores con Ctrl+M para señalar momentos
que requieren revisión posterior.
"""
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.database import get_db
from app.models.marcador import Marcador
from app.models.usuario import Usuario
from app.schemas.marcador import MarcadorCreate, MarcadorResponse

router = APIRouter(prefix="/api/audiencias/{audiencia_id}/marcadores", tags=["marcadores"])


@router.get("", response_model=list[MarcadorResponse])
async def listar_marcadores(
    audiencia_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _usuario: Usuario = Depends(get_current_user),
):
    """Lista todos los marcadores de una audiencia, ordenados por timestamp."""
    resultado = await db.execute(
        select(Marcador)
        .where(Marcador.audiencia_id == audiencia_id)
        .order_by(Marcador.timestamp)
    )
    return resultado.scalars().all()


@router.post("", response_model=MarcadorResponse, status_code=201)
async def crear_marcador(
    audiencia_id: uuid.UUID,
    datos: MarcadorCreate,
    db: AsyncSession = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """Crea un nuevo marcador (Ctrl+M desde el Canvas)."""
    marcador = Marcador(
        audiencia_id=audiencia_id,
        usuario_id=usuario.id,
        timestamp=datos.timestamp,
        nota=datos.nota,
        tipo=datos.tipo,
    )
    db.add(marcador)
    await db.commit()
    await db.refresh(marcador)
    return marcador


@router.delete("/{marcador_id}", status_code=204)
async def eliminar_marcador(
    audiencia_id: uuid.UUID,
    marcador_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _usuario: Usuario = Depends(get_current_user),
):
    """Elimina un marcador."""
    resultado = await db.execute(
        select(Marcador).where(
            Marcador.id == marcador_id,
            Marcador.audiencia_id == audiencia_id,
        )
    )
    marcador = resultado.scalar_one_or_none()
    if not marcador:
        raise HTTPException(status_code=404, detail="Marcador no encontrado")

    await db.delete(marcador)
    await db.commit()
