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

# Palabras interrogativas
QUESTION_STARTERS = [
    "qué", "cómo", "cuándo", "dónde", "por qué", "quién", "cuál", "cuánto",
    "para qué", "acaso", "verdad", "cierto"
]


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
        if any(first_word.startswith(q) for q in QUESTION_STARTERS):
            text = "¿" + text

    # 6. Add opening exclamation mark if needed
    if text.endswith("!") and not text.startswith("¡"):
        text = "¡" + text

    # 7. Ensure proper spacing after punctuation
    text = re.sub(r'([,;:])\s*', r'\1 ', text)
    text = re.sub(r'\s+([,;:.?!])', r'\1', text)

    return text.strip()
