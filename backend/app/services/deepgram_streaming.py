"""
Servicio de streaming con Deepgram Nova-3.
Mantiene una conexión WebSocket persistente con Deepgram por cada audiencia activa.
"""
import asyncio
import json
import logging
from typing import Callable, Optional

import websockets

from app.config import settings
from app.data.legal_keyterms import get_keyterms

logger = logging.getLogger(__name__)



class DeepgramStreamingService:
    """
    Manages a persistent WebSocket connection to Deepgram Nova-3.
    Receives audio chunks from the client, forwards them to Deepgram,
    and returns transcription results via a callback.
    
    Optimized for Peruvian legal proceedings:
    - 100+ judicial keyterms for domain-specific accuracy
    - Extended utterance end for legal pauses
    - Numerals formatting for article references
    """

    def __init__(
        self,
        on_transcript: Callable,
        on_utterance_end: Optional[Callable] = None,
        on_speech_started: Optional[Callable] = None,
        keyterms: Optional[list[str]] = None,
    ):
        self.on_transcript = on_transcript
        self.on_utterance_end = on_utterance_end
        self.on_speech_started = on_speech_started
        self.keyterms = keyterms or get_keyterms(100)
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._running = False
        self._receive_task: Optional[asyncio.Task] = None

    def _build_url(self) -> str:
        """Build the Deepgram WebSocket URL with optimized params for legal transcription."""
        base = "wss://api.deepgram.com/v1/listen"
        params = [
            f"model={settings.DEEPGRAM_MODEL}",
            "language=es",
            "smart_format=true",
            "diarize=true",
            "encoding=linear16",
            "sample_rate=16000",
            "channels=1",
            "interim_results=true",
            "utterance_end_ms=2000",  # Longer for legal proceedings (pauses between statements)
            "vad_events=true",
            "punctuate=true",
            "numerals=true",  # Format article numbers: "doscientos sesenta y ocho" → "268"
            "filler_words=true",  # Detect muletillas for cleaner transcription
        ]
        # Add keyterms (up to 100)
        for term in self.keyterms[:100]:
            params.append(f"keyterms={term}")

        return f"{base}?{'&'.join(params)}"

    async def connect(self) -> None:
        """Establish connection to Deepgram."""
        url = self._build_url()
        headers = {"Authorization": f"Token {settings.DEEPGRAM_API_KEY}"}

        try:
            self._ws = await websockets.connect(
                url,
                additional_headers=headers,
                ping_interval=20,
                ping_timeout=10,
            )
            self._running = True
            self._receive_task = asyncio.create_task(self._receive_loop())
            logger.info("Connected to Deepgram Nova-3")
        except Exception as e:
            logger.error(f"Failed to connect to Deepgram: {e}")
            raise

    async def send_audio(self, audio_data: bytes) -> None:
        """Send raw PCM audio chunk to Deepgram."""
        if self._ws and self._running:
            try:
                await self._ws.send(audio_data)
            except Exception as e:
                logger.error(f"Error sending audio to Deepgram: {e}")

    async def _receive_loop(self) -> None:
        """Listen for transcription results from Deepgram."""
        try:
            async for message in self._ws:
                data = json.loads(message)
                msg_type = data.get("type", "")

                if msg_type == "Results":
                    await self._handle_results(data)
                elif msg_type == "UtteranceEnd":
                    if self.on_utterance_end:
                        await self.on_utterance_end(data)
                elif msg_type == "SpeechStarted":
                    if self.on_speech_started:
                        await self.on_speech_started(data)

        except websockets.exceptions.ConnectionClosed:
            logger.warning("Deepgram connection closed")
        except Exception as e:
            logger.error(f"Error in Deepgram receive loop: {e}")
        finally:
            self._running = False

    async def _handle_results(self, data: dict) -> None:
        """Parse Deepgram results and invoke callback."""
        channel = data.get("channel", {})
        alternatives = channel.get("alternatives", [])
        if not alternatives:
            return

        best = alternatives[0]
        transcript = best.get("transcript", "").strip()
        if not transcript:
            return

        is_final = data.get("is_final", False)
        words = best.get("words", [])

        # Extract speaker from first word (Deepgram diarization)
        speaker = "SPEAKER_00"
        if words:
            speaker = f"SPEAKER_{words[0].get('speaker', 0):02d}"

        # Calculate confidence
        confidence = best.get("confidence", 1.0)

        # Timestamps
        start = words[0]["start"] if words else 0.0
        end = words[-1]["end"] if words else 0.0

        result = {
            "type": "transcript",
            "is_final": is_final,
            "speaker": speaker,
            "text": transcript,
            "confidence": confidence,
            "start": start,
            "end": end,
            "words": [
                {
                    "word": w.get("word", ""),
                    "start": w.get("start", 0.0),
                    "end": w.get("end", 0.0),
                    "confidence": w.get("confidence", 1.0),
                }
                for w in words
            ],
        }

        await self.on_transcript(result)

    async def close(self) -> None:
        """Close the Deepgram connection."""
        self._running = False
        if self._ws:
            try:
                # Send close message to Deepgram
                await self._ws.send(json.dumps({"type": "CloseStream"}))
                await self._ws.close()
            except Exception:
                pass
            self._ws = None

        if self._receive_task:
            self._receive_task.cancel()
            try:
                await self._receive_task
            except asyncio.CancelledError:
                pass

        logger.info("Deepgram connection closed")

    @property
    def is_connected(self) -> bool:
        return self._running and self._ws is not None
