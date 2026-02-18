"""
Tarea Celery — procesamiento batch post-audiencia.
Sprint 4: faster-whisper + Pyannote + alignment temporal.
Sprint 1: stub placeholder.
"""
from app.tasks.celery_app import celery_app


@celery_app.task(name="batch_process_audio", bind=True, max_retries=3)
def batch_process_audio(self, audiencia_id: str):
    """
    Procesa el audio grabado de una audiencia:
    1. faster-whisper (transcripción batch de alta calidad)
    2. Pyannote Audio (diarización)
    3. Alignment temporal (fusión)
    4. Merge inteligente con segmentos streaming
    
    Requiere GPU NVIDIA RTX 3060+.
    Implementación completa en Sprint 4.
    """
    raise NotImplementedError("Tarea batch implementada en Sprint 4")
