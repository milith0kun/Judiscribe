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
from app.services.text_processing import clean_transcript
from app.services.real_time_enhancement import get_enhancement_service

logger = logging.getLogger(__name__)


class DeepgramStreamingService:
    """
    Manages a persistent WebSocket connection to Deepgram Nova-3.
    Receives audio chunks from the client, forwards them to Deepgram,
    and returns transcription results via a callback.
    
    Enhanced with Claude Sonnet 4 for real-time semantic refinement.
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
        self.enhancement_service = get_enhancement_service()
        self._ws: Optional[websockets.WebSocketClientProtocol] = None
        self._running = False
        self._receive_task: Optional[asyncio.Task] = None
        
        # Intelligent buffering for semantic coherence
        self._transcript_buffer = ""
        self._words_buffer = []
        self._buffer_speaker = None
        self._buffer_start = 0.0
        self._buffer_end = 0.0
        self._buffer_confidence = 1.0
        self._buffer_word_count = 0
        self._history = [] # To store recent segments for LLM context

    def _build_url(self) -> str:
        """Build the Deepgram WebSocket URL with optimized params for legal transcription."""
        base = "wss://api.deepgram.com/v1/listen"
        # Deepgram Nova-3 + Spanish Latin America for best context understanding
        params = [
            f"model={settings.DEEPGRAM_MODEL}",  # Ensure this is 'nova-3' in .env
            "language=es-419",                   # Latin American Spanish
            "smart_format=true",                 # Dates, times, currency
            "diarize=true",                      # Speaker identification
            "encoding=linear16",
            "sample_rate=16000",
            "channels=1",
            "interim_results=true",              # Essential for real-time feedback
            "utterance_end_ms=3500",             # Increased pause tolerance (3.5s)
            "vad_events=true",                   # Detect speech start/end events
            "punctuate=true",                    # Auto-punctuation based on context
            "numerals=true",                     # "Article 200" vs "two hundred"
            "filler_words=false",                # Remove "eh", "um"
            "endpointing=500",                   # 500ms silence triggers finalization check
            "paragraphs=true",                   # Detect logical paragraph breaks
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
        """Parse Deepgram results and apply intelligent semantic buffering."""
        channel = data.get("channel", {})
        alternatives_list = channel.get("alternatives", [])
        if not alternatives_list:
            return

        best = alternatives_list[0]
        transcript = best.get("transcript", "").strip()
        if not transcript:
            return

        is_final = data.get("is_final", False)
        words = best.get("words", [])

        # Speaker detection from words
        speaker = "SPEAKER_00"
        if words:
            speaker = f"SPEAKER_{words[0].get('speaker', 0):02d}"

        # If not final, just send as provisional for real-time UI
        if not is_final:
            await self.on_transcript({
                "type": "transcript",
                "is_final": False,
                "speaker": speaker,
                "text": transcript,
                "confidence": best.get("confidence", 1.0),
                "start": words[0]["start"] if words else 0.0,
                "end": words[-1]["end"] if words else 0.0,
                "words": []
            })
            return

        # --- INTELLIGENT FINALIZATION LOGIC ---
        
        # 1. Start or append to buffer
        if not self._transcript_buffer:
            self._buffer_speaker = speaker
            self._buffer_start = words[0]["start"] if words else 0.0
            self._buffer_confidence = best.get("confidence", 1.0)
            self._transcript_buffer = transcript
        else:
            # If speaker changed, flush previous buffer first
            if self._buffer_speaker != speaker:
                await self._flush_buffer()
                self._buffer_speaker = speaker
                self._buffer_start = words[0]["start"] if words else 0.0
                self._buffer_confidence = best.get("confidence", 1.0)
                self._transcript_buffer = transcript
            else:
                # Same speaker, append text
                self._transcript_buffer += " " + transcript
                # Update confidence (average)
                self._buffer_confidence = (self._buffer_confidence + best.get("confidence", 1.0)) / 2

        # Add words to buffer with alternatives for high-precision corrections
        self._buffer_end = words[-1]["end"] if words else self._buffer_end
        for w in words:
            word_confidence = w.get("confidence", 1.0)
            word_alternatives = []
            
            # Deepgram alternatives extraction logic
            if word_confidence < 0.85:
                # Use other global alternatives if they match the timing
                for alt_option in alternatives_list[1:4]:
                    alt_words = alt_option.get("words", [])
                    matching_word = next(
                        (aw for aw in alt_words if abs(aw.get("start", 0) - w.get("start", 0)) < 0.1),
                        None
                    )
                    if matching_word and matching_word["word"].lower() != w.get("word", "").lower():
                        word_alternatives.append({
                            "word": matching_word["word"],
                            "confidence": matching_word.get("confidence", 0.0)
                        })

            self._words_buffer.append({
                "word": w.get("word", ""),
                "start": w.get("start", 0.0),
                "end": w.get("end", 0.0),
                "confidence": word_confidence,
                "alternatives": word_alternatives,
            })
        
        self._buffer_word_count += len(words)

        # 2. Check if we should flush (commit) this buffer
        # Flush if: ends in punctuation (. ? !) OR buffer is too long (> 20 words)
        ends_in_punctuation = any(self._transcript_buffer.endswith(p) for p in (".", "?", "!", "..."))
        
        if ends_in_punctuation or self._buffer_word_count > 20:
            await self._flush_buffer()
        else:
            # Keep as "interim-final" in the frontend (it will look like provisional)
            await self.on_transcript({
                "type": "transcript",
                "is_final": False,
                "speaker": self._buffer_speaker,
                "text": self._transcript_buffer,
                "confidence": self._buffer_confidence,
                "start": self._buffer_start,
                "end": self._buffer_end,
                "words": []
            })

    async def _flush_buffer(self) -> None:
        """Send buffered text as a single FINAL segment to the frontend after AI enhancement."""
        if not self._transcript_buffer:
            return

        # 1. AI Enhancement with context (Claude Sonnet)
        # We pass previous segments to help the LLM understand the situation
        enhanced_data = await self.enhancement_service.enhance_segment(
            text=self._transcript_buffer,
            speaker_id=self._buffer_speaker,
            previous_segments=self._history[-5:] # Last 5 segments for context
        )
        
        final_text = enhanced_data.get("enhanced", self._transcript_buffer)
        
        # 2. Final heuristic cleanup (ensure start/end markers)
        final_text = clean_transcript(final_text)

        result = {
            "type": "transcript",
            "is_final": True,
            "speaker": self._buffer_speaker,
            "text": final_text,
            "confidence": self._buffer_confidence,
            "start": self._buffer_start,
            "end": self._buffer_end,
            "words": self._words_buffer,
        }

        await self.on_transcript(result)
        
        # Save to history for future context
        self._history.append({
            "speaker_id": self._buffer_speaker,
            "texto_ia": final_text
        })

        # Reset buffer
        self._transcript_buffer = ""
        self._words_buffer = []
        self._buffer_word_count = 0

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
