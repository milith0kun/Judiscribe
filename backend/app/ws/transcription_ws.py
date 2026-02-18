"""
WebSocket handler para transcripción en tiempo real.
Recibe audio del cliente, lo reenvía a Deepgram, y retorna texto transcrito.
Graba el audio en WAV en paralelo.
"""
import asyncio
import base64
import json
import logging
import os
import uuid
import wave
from datetime import datetime

from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import async_session
from app.models.audiencia import Audiencia
from app.models.segmento import Segmento
from app.services.deepgram_streaming import DeepgramStreamingService

logger = logging.getLogger(__name__)

# Active sessions: audiencia_id → session data
active_sessions: dict[str, dict] = {}


async def transcription_websocket(websocket: WebSocket, audiencia_id: str):
    """
    WebSocket endpoint for real-time transcription.

    Flow:
    1. Client sends audio chunks (base64 PCM 16kHz mono)
    2. Backend forwards to Deepgram Nova-3
    3. Deepgram returns transcript
    4. Backend sends transcript to client
    5. Audio is recorded to WAV file in parallel
    """
    await websocket.accept()
    logger.info(f"WebSocket connected for audiencia: {audiencia_id}")

    # Audio recording setup
    audio_dir = settings.AUDIO_STORAGE_PATH
    os.makedirs(audio_dir, exist_ok=True)
    audio_path = os.path.join(audio_dir, f"{audiencia_id}.wav")
    wav_file = wave.open(audio_path, "wb")
    wav_file.setnchannels(1)
    wav_file.setsampwidth(2)  # 16-bit
    wav_file.setframerate(16000)

    segment_counter = 0

    async def on_transcript(result: dict):
        """Callback invoked for each Deepgram transcript result."""
        nonlocal segment_counter
        try:
            # Send to client always
            await websocket.send_json(result)

            # Persist final segments to DB (skip gracefully if audiencia doesn't exist)
            if result.get("is_final", False):
                segment_counter += 1
                try:
                    async with async_session() as db:
                        segmento = Segmento(
                            audiencia_id=uuid.UUID(audiencia_id),
                            speaker_id=result["speaker"],
                            texto_ia=result["text"],
                            timestamp_inicio=result["start"],
                            timestamp_fin=result["end"],
                            confianza=result["confidence"],
                            es_provisional=False,
                            fuente="streaming",
                            orden=segment_counter,
                            palabras_json=result.get("words"),
                        )
                        db.add(segmento)
                        await db.commit()
                except Exception as db_err:
                    logger.debug(f"Segment not persisted (demo mode?): {db_err}")

        except Exception as e:
            logger.error(f"Error processing transcript: {e}")

    async def on_utterance_end(data: dict):
        """Deepgram signals end of an utterance."""
        try:
            await websocket.send_json({
                "type": "utterance_end",
                "timestamp": data.get("last_word_end", 0),
            })
        except Exception:
            pass

    async def on_speech_started(data: dict):
        """Deepgram signals start of speech activity."""
        try:
            await websocket.send_json({
                "type": "speech_started",
                "timestamp": data.get("timestamp", 0),
            })
        except Exception:
            pass

    # Create Deepgram service
    dg_service = DeepgramStreamingService(
        on_transcript=on_transcript,
        on_utterance_end=on_utterance_end,
        on_speech_started=on_speech_started,
    )

    try:
        # Connect to Deepgram
        await dg_service.connect()

        # Update audiencia status (skip if demo/non-existent)
        try:
            async with async_session() as db:
                result = await db.execute(
                    select(Audiencia).where(Audiencia.id == uuid.UUID(audiencia_id))
                )
                audiencia = result.scalar_one_or_none()
                if audiencia:
                    audiencia.estado = "en_curso"
                    audiencia.audio_path = audio_path
                    await db.commit()
        except (ValueError, Exception) as e:
            logger.info(f"Skipping DB update for audiencia {audiencia_id}: {e}")

        # Send connection status
        await websocket.send_json({
            "type": "status",
            "status": "connected",
            "message": "Conexión establecida con Deepgram Nova-3",
        })

        # Store in active sessions
        active_sessions[audiencia_id] = {
            "websocket": websocket,
            "deepgram": dg_service,
            "started_at": datetime.now(),
        }

        # Main receive loop — get audio from client, forward to Deepgram
        while True:
            message = await websocket.receive_text()
            data = json.loads(message)

            if data.get("type") == "audio_chunk":
                # Decode base64 audio
                audio_bytes = base64.b64decode(data["data"])

                # Write to WAV file
                wav_file.writeframes(audio_bytes)

                # Forward to Deepgram
                await dg_service.send_audio(audio_bytes)

            elif data.get("type") == "stop":
                logger.info(f"Transcription stopped for audiencia: {audiencia_id}")
                break

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for audiencia: {audiencia_id}")
    except Exception as e:
        logger.error(f"WebSocket error for audiencia {audiencia_id}: {e}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e),
            })
        except Exception:
            pass
    finally:
        # Cleanup
        await dg_service.close()
        wav_file.close()

        # Update audiencia with audio duration
        async with async_session() as db:
            result = await db.execute(
                select(Audiencia).where(Audiencia.id == uuid.UUID(audiencia_id))
            )
            audiencia = result.scalar_one_or_none()
            if audiencia:
                # Calculate audio duration from WAV file
                try:
                    with wave.open(audio_path, "rb") as wf:
                        frames = wf.getnframes()
                        rate = wf.getframerate()
                        audiencia.audio_duration_seconds = frames / float(rate)
                except Exception:
                    pass
                audiencia.estado = "transcrita"
                await db.commit()

        # Remove from active sessions
        active_sessions.pop(audiencia_id, None)
        logger.info(f"Cleanup complete for audiencia: {audiencia_id}")
