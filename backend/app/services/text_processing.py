"""
Módulo de procesamiento de texto para transcripción judicial.

Centraliza:
- Detección de preguntas (detect_question)
- Limpieza de transcripciones (clean_transcript)
- Capitalización de títulos legales
"""
import re

# Palabras que deben capitalizarse siempre (cargos, instituciones)
CAPITALIZE_WORDS = {
    "juez": "Juez",
    "fiscal": "Fiscal",
    "doctor": "Doctor",
    "doctora": "Doctora",
    "abogado": "Abogado",
    "abogada": "Abogada",
    "señor": "Señor",
    "señora": "Señora",
    "señoría": "Señoría",
    "magistrado": "Magistrado",
    "magistrada": "Magistrada",
    "defensor": "Defensor",
    "defensora": "Defensora",
    "procurador": "Procurador",
    "procuradora": "Procuradora",
    "perito": "Perito",
    "testigo": "Testigo",
    "imputado": "Imputado",
    "imputada": "Imputada",
    "acusado": "Acusado",
    "acusada": "Acusada",
    "agraviado": "Agraviado",
    "agraviada": "Agraviada",
}

# Palabras interrogativas (conjunto completo para detección de preguntas)
QUESTION_WORDS = {
    # Interrogativas básicas
    "qué", "que", "cómo", "como", "cuándo", "cuando", "dónde", "donde",
    "por qué", "quién", "quien", "cuál", "cual", "cuánto", "cuanto",
    "para qué",
    # Verbos que inician preguntas judiciales
    "acaso", "puede", "podría", "sabe", "conoce", "recuerda",
    "entiende", "confirma", "niega", "reconoce", "acepta",
}

# Patrones de preguntas indirectas
QUESTION_PATTERNS = [
    "es cierto que", "verdad que", "acaso", "¿",
    "puede indicar", "podría decir", "sabe usted",
    "recuerda usted", "conoce usted",
]


def detect_question(text: str) -> bool:
    """
    Detecta si el texto es una pregunta usando múltiples indicadores.

    Indicadores:
    1. Signos de interrogación (? o ¿)
    2. Empieza con palabra interrogativa
    3. Patrones de preguntas indirectas judiciales

    Args:
        text: Texto a analizar

    Returns:
        True si es una pregunta, False en caso contrario
    """
    if not text or not text.strip():
        return False

    # 1. Tiene signos de interrogación
    if "?" in text or "¿" in text:
        return True

    # 2. Empieza con palabra interrogativa
    clean_text = text.strip().lower()
    first_word = clean_text.split()[0] if clean_text.split() else ""
    if first_word in QUESTION_WORDS:
        return True

    # 3. Patrones de preguntas indirectas
    if any(clean_text.startswith(p) for p in QUESTION_PATTERNS):
        return True

    return False


def clean_transcript(text: str) -> str:
    """
    Applies heuristic formatting to the transcript to improve legal drafting quality.
    - Capitalizes the first letter of sentences.
    - Capitalizes after periods (. ? !)
    - Capitalizes legal titles and roles.
    - Adds opening question/exclamation marks if missing.
    - Trims excess whitespace.
    """
    if not text:
        return text

    # 1. Trim whitespace and normalize spaces
    text = re.sub(r'\s+', ' ', text.strip())

    # 2. Capitalize first letter of the text
    if text:
        text = text[0].upper() + text[1:]

    # 3. Capitalize after sentence-ending punctuation (. ? !)
    def capitalize_after_punct(match):
        return match.group(1) + match.group(2).upper()

    text = re.sub(r'([.?!]\s+)([a-záéíóúñ])', capitalize_after_punct, text)

    # 4. Capitalize legal titles and roles
    for word_lower, word_cap in CAPITALIZE_WORDS.items():
        # Match word boundaries to avoid partial replacements
        pattern = r'\b' + word_lower + r'\b'
        text = re.sub(pattern, word_cap, text, flags=re.IGNORECASE)

    # 5. Add opening question mark if it's a question
    if text.endswith("?") and not text.startswith("¿"):
        # Check if it starts with a question word
        first_word = text.split()[0].lower() if text.split() else ""
        if first_word in QUESTION_WORDS:
            text = "¿" + text

    # 6. Add opening exclamation mark if needed
    if text.endswith("!") and not text.startswith("¡"):
        text = "¡" + text

    # 7. Ensure proper spacing after punctuation
    text = re.sub(r'([,;:])\s*', r'\1 ', text)
    text = re.sub(r'\s+([,;:.?!])', r'\1', text)

    return text.strip()
