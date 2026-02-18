"""
Tarea Celery — generación de acta judicial con LLM.
Sprint 4: Claude Sonnet 4 con prompt completo.
Sprint 1: stub placeholder.
"""
from app.tasks.celery_app import celery_app


@celery_app.task(name="generate_acta", bind=True, max_retries=2)
def generate_acta(self, audiencia_id: str, formato: str = "A"):
    """
    Genera el acta oficial de audiencia:
    1. Recopila todos los segmentos editados
    2. Envía a Claude Sonnet 4 con prompt jurídico
    3. Genera documento con formato oficial (A=Unipersonal, B=Apelaciones)
    4. Guarda versión en BD
    
    Implementación completa en Sprint 4.
    """
    raise NotImplementedError("Generación de actas implementada en Sprint 4")
