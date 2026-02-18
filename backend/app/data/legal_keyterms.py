"""
Corpus de keyterms jurídicos peruanos para Deepgram Nova-3.

Organizado por categoría procesal. Deepgram acepta hasta 100 keyterms
por sesión, así que se seleccionan los más frecuentes y problemáticos
para transcripción de audiencias penales en el Poder Judicial de Cusco.

Ref: https://developers.deepgram.com/docs/keywords
"""

# ── Procesal Penal ───────────────────────────────────────
PROCESAL_PENAL = [
    "sobreseimiento",
    "acusación fiscal",
    "prisión preventiva",
    "comparecencia restringida",
    "comparecencia simple",
    "sentencia condenatoria",
    "sentencia absolutoria",
    "resolución judicial",
    "auto de enjuiciamiento",
    "auto de citación a juicio",
    "control de acusación",
    "requerimiento acusatorio",
    "requerimiento fiscal",
    "determinación de pena",
    "tipificación",
    "subsunción",
    "alegatos de apertura",
    "alegatos de clausura",
    "oralización de pruebas",
    "actuación probatoria",
    "prueba de oficio",
    "prueba anticipada",
    "delito de omisión",
    "tentativa",
    "consumación",
    "concurso real",
    "concurso ideal",
    "reparación civil",
    "pena privativa de libertad",
    "suspensión de la pena",
    "pena efectiva",
    "beneficio penitenciario",
    "terminación anticipada",
    "conclusión anticipada",
    "principio de oportunidad",
    "acuerdo reparatorio",
]

# ── Delitos Frecuentes (términos modernos) ────────────────
DELITOS_FRECUENTES = [
    "feminicidio",
    "violación sexual",
    "trata de personas",
    "lavado de activos",
    "organización criminal",
    "corrupción de funcionarios",
    "cohecho",
    "peculado",
    "colusión",
    "robo agravado",
    "hurto agravado",
    "extorsión",
    "secuestro",
    "homicidio calificado",
    "lesiones graves",
    "violencia familiar",
    "agresiones en contra de las mujeres",
    "acoso sexual",
    "tráfico ilícito de drogas",
    "microcomercialización",
]

# ── Partes / Actores ────────────────────────────────────
PARTES_PROCESALES = [
    "imputado",
    "agraviado",
    "actor civil",
    "tercero civil responsable",
    "representante del Ministerio Público",
    "fiscal",
    "fiscal provincial",
    "fiscal adjunto",
    "abogado defensor",
    "defensa técnica",
    "defensa pública",
    "procurador público",
    "testigo",
    "perito",
    "intérprete",
]

# ── Institucional / Poder Judicial ──────────────────────
INSTITUCIONAL = [
    "Poder Judicial",
    "Ministerio Público",
    "Corte Superior de Justicia de Cusco",
    "juzgado penal unipersonal",
    "juzgado de investigación preparatoria",
    "sala penal de apelaciones",
    "INPE",
    "Policía Nacional del Perú",
    "Defensoría del Pueblo",
    "Registro Nacional de Condenas",
    "RENIEC",
]

# ── Artículos / Normativa ────────────────────────────────
NORMATIVA = [
    "Código Procesal Penal",
    "Código Penal",
    "artículo doscientos sesenta y ocho",
    "artículo trescientos cuarenta y nueve",
    "artículo trescientos noventa y cuatro",
    "Decreto Legislativo",
    "Ley Orgánica",
    "Acuerdo Plenario",
    "Casación",
    "jurisprudencia vinculante",
]

# ── Prisión Preventiva (alta frecuencia) ────────────────
PRISION_PREVENTIVA = [
    "peligro de fuga",
    "peligro de obstaculización",
    "arraigo domiciliario",
    "arraigo familiar",
    "arraigo laboral",
    "gravedad de la pena",
    "proporcionalidad",
    "plazo razonable",
    "presunción de inocencia",
    "medida cautelar",
    "variación de medida",
    "cesación de prisión preventiva",
    "prolongación de prisión preventiva",
]

# ── Cusqueño / Regional ─────────────────────────────────
REGIONAL = [
    "Cusco",
    "Wanchaq",
    "Santiago",
    "San Sebastián",
    "San Jerónimo",
    "Sicuani",
    "Quispicanchis",
    "Calca",
    "Urubamba",
]


def get_keyterms(max_terms: int = 100) -> list[str]:
    """
    Return a prioritized list of legal keyterms for Deepgram.

    Categories are ordered by importance for transcription accuracy:
    1. Procesal penal (most frequent errors)
    2. Delitos frecuentes (términos modernos)
    3. Partes procesales (speaker identification)
    4. Prisión preventiva (common hearing type)
    5. Institucional
    6. Normativa
    7. Regional
    """
    all_terms = (
        PROCESAL_PENAL
        + DELITOS_FRECUENTES
        + PARTES_PROCESALES
        + PRISION_PREVENTIVA
        + INSTITUCIONAL
        + NORMATIVA
        + REGIONAL
    )
    
    # Deduplicate preserving order
    seen: set[str] = set()
    unique: list[str] = []
    for term in all_terms:
        if term.lower() not in seen:
            seen.add(term.lower())
            unique.append(term)
    
    return unique[:max_terms]
