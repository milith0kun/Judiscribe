"""
CRUD de audiencias.
POST, GET (list), GET (detail), PUT.
Sin autenticación por ahora — se agregará después.
"""
import uuid
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.audiencia import Audiencia
from app.models.segmento import Segmento
from app.schemas.audiencia import (
    AudienciaCreate,
    AudienciaListResponse,
    AudienciaResponse,
    AudienciaUpdate,
)
from app.schemas.segmento import SegmentoResponse

router = APIRouter(prefix="/api/audiencias", tags=["audiencias"])


@router.post("", response_model=AudienciaResponse, status_code=status.HTTP_201_CREATED)
async def crear_audiencia(
    data: AudienciaCreate,
    db: AsyncSession = Depends(get_db),
):
    audiencia = Audiencia(
        **data.model_dump(),
        created_by=uuid.UUID("00000000-0000-0000-0000-000000000001"),  # default user
    )
    db.add(audiencia)
    await db.flush()
    await db.refresh(audiencia)
    return audiencia


@router.get("", response_model=AudienciaListResponse)
async def listar_audiencias(
    db: AsyncSession = Depends(get_db),
    fecha_desde: Optional[date] = Query(None),
    fecha_hasta: Optional[date] = Query(None),
    juzgado: Optional[str] = Query(None),
    estado: Optional[str] = Query(None),
    expediente: Optional[str] = Query(None),
    tipo_audiencia: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    query = select(Audiencia)

    if fecha_desde:
        query = query.where(Audiencia.fecha >= fecha_desde)
    if fecha_hasta:
        query = query.where(Audiencia.fecha <= fecha_hasta)
    if juzgado:
        query = query.where(Audiencia.juzgado.ilike(f"%{juzgado}%"))
    if estado:
        query = query.where(Audiencia.estado == estado)
    if expediente:
        query = query.where(Audiencia.expediente.ilike(f"%{expediente}%"))
    if tipo_audiencia:
        query = query.where(Audiencia.tipo_audiencia == tipo_audiencia)

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Pagination
    query = (
        query.order_by(Audiencia.fecha.desc(), Audiencia.hora_inicio.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )

    result = await db.execute(query)
    items = result.scalars().all()

    return AudienciaListResponse(items=items, total=total)


@router.get("/{audiencia_id}", response_model=AudienciaResponse)
async def obtener_audiencia(
    audiencia_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Audiencia).where(Audiencia.id == audiencia_id)
    )
    audiencia = result.scalar_one_or_none()
    if audiencia is None:
        raise HTTPException(status_code=404, detail="Audiencia no encontrada")
    return audiencia


@router.put("/{audiencia_id}", response_model=AudienciaResponse)
async def actualizar_audiencia(
    audiencia_id: uuid.UUID,
    data: AudienciaUpdate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Audiencia).where(Audiencia.id == audiencia_id)
    )
    audiencia = result.scalar_one_or_none()
    if audiencia is None:
        raise HTTPException(status_code=404, detail="Audiencia no encontrada")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(audiencia, key, value)

    await db.flush()
    await db.refresh(audiencia)
    return audiencia


# ── Segmentos de una audiencia ───────────────────────────

@router.get("/{audiencia_id}/segmentos", response_model=list[SegmentoResponse])
async def obtener_segmentos(
    audiencia_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Segmento)
        .where(Segmento.audiencia_id == audiencia_id)
        .order_by(Segmento.orden)
    )
    return result.scalars().all()


@router.put(
    "/{audiencia_id}/segmentos/{segmento_id}",
    response_model=SegmentoResponse,
)
async def editar_segmento(
    audiencia_id: uuid.UUID,
    segmento_id: uuid.UUID,
    data: dict,
    db: AsyncSession = Depends(get_db),
):
    """Guardar texto editado por el digitador."""
    result = await db.execute(
        select(Segmento).where(
            Segmento.id == segmento_id,
            Segmento.audiencia_id == audiencia_id,
        )
    )
    segmento = result.scalar_one_or_none()
    if segmento is None:
        raise HTTPException(status_code=404, detail="Segmento no encontrado")

    if "texto_editado" in data:
        segmento.texto_editado = data["texto_editado"]
        segmento.editado_por_usuario = True

    await db.flush()
    await db.refresh(segmento)
    return segmento


# ── Audio de la audiencia ────────────────────────────────

@router.get("/{audiencia_id}/audio")
async def obtener_audio(
    audiencia_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Servir el archivo WAV grabado de la audiencia."""
    import os
    from fastapi.responses import FileResponse

    result = await db.execute(
        select(Audiencia).where(Audiencia.id == audiencia_id)
    )
    audiencia = result.scalar_one_or_none()
    if audiencia is None:
        raise HTTPException(status_code=404, detail="Audiencia no encontrada")

    if not audiencia.audio_path or not os.path.exists(audiencia.audio_path):
        raise HTTPException(status_code=404, detail="Audio no disponible")

    return FileResponse(
        audiencia.audio_path,
        media_type="audio/wav",
        filename=f"{audiencia.expediente}.wav",
    )
