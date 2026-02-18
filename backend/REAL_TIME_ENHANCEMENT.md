# Sistema de Mejoramiento en Tiempo Real - JudiScribe

## Descripción General

El sistema de mejoramiento en tiempo real utiliza **Claude Sonnet 4** para procesar y mejorar las transcripciones de audio mientras ocurren, proporcionando un documento más profesional y legible sin perder fidelidad al audio original.

## Flujo del Sistema

```
Audio → Deepgram Nova-3 → Texto Transcrito → Claude Sonnet 4 → Texto Mejorado → Frontend
```

### 1. **Captura de Audio**
- El cliente captura audio del micrófono o sistema
- Envía chunks de audio por WebSocket al backend
- El audio se graba en WAV para archivo

### 2. **Transcripción con Deepgram**
- Deepgram Nova-3 transcribe en tiempo real (streaming)
- Parámetros optimizados:
  - `utterance_end_ms=3000` - Espera 3s antes de considerar fin de expresión
  - `endpointing=500` - Espera 500ms para pausas naturales
  - `diarize=true` - Identifica hablantes
  - `smart_format=true` - Formateo inteligente
  - 100+ términos judiciales como keyterms

### 3. **Mejoramiento con Claude Sonnet 4** (NUEVO)
Cuando Deepgram marca un segmento como "final" (`is_final: true`):

#### 3.1 Contexto
- Claude recibe los **últimos 10 segmentos** para contexto
- Incluye speaker_id y texto de cada segmento
- Permite entender el flujo de la conversación

#### 3.2 Mejoras Aplicadas
Claude mejora el texto manteniendo **exactamente el mismo significado**:

**Puntuación:**
- Añade puntos, comas, puntos y comas
- Identifica preguntas y añade "¿" y "?"
- Detecta exclamaciones

**Capitalización:**
- Mayúsculas al inicio de oraciones
- Nombres propios (Juez, Fiscal, Doctor, etc.)
- Cargos y títulos

**Completar Frases:**
- Si una frase está incompleta pero el contexto es claro, la completa naturalmente
- NO inventa información
- Ejemplo: "vamos a empezar la audiencia diciendo que todos" → "Vamos a empezar la audiencia diciendo que todos podemos..."

**Detección de Pausas Contextuales:**
- NO interpreta pausas naturales como silencios
- Reconoce pausas por preguntas, dudas, énfasis
- Mantiene el flujo natural del discurso

**Redacción Profesional:**
- Tono formal y legal
- Estructura de documento judicial
- Sin puntos suspensivos innecesarios

#### 3.3 Prompt de Claude
```
Eres un asistente especializado en transcripción judicial para el Distrito Judicial de Cusco, Perú.

CONTEXTO DE LA CONVERSACIÓN:
SPEAKER_00: Vamos a iniciar la audiencia...
SPEAKER_01: Buenos días, Señor Juez...

HABLANTE ACTUAL: SPEAKER_00
TEXTO TRANSCRITO: vamos a empezar la audiencia diciendo que todos podemos

REGLAS:
1. NO inventes información
2. NO cambies el significado
3. Si es pausa natural (pregunta, duda), mantén el sentido pero mejora
4. Detecta preguntas → usa "¿" y "?"
5. Capitaliza nombres propios y cargos
6. Completa frases incompletas si el contexto es claro
7. Tono formal y legal
8. NO agregues puntos suspensivos
```

### 4. **Almacenamiento en Base de Datos**
Cada segmento se guarda con:
- `texto_ia` - Texto original de Deepgram
- `texto_mejorado` - Texto mejorado por Claude (NUEVO)
- `texto_editado` - Ediciones manuales del usuario
- `confianza` - Nivel de confianza de Deepgram
- `palabras_json` - Timestamps y alternativas por palabra

### 5. **Visualización en Frontend**
Prioridad de visualización:
1. `texto_editado` (si el usuario editó manualmente)
2. `texto_mejorado` (si Claude procesó)
3. `texto_ia` (texto original de Deepgram)

Indicador visual: ✓ verde cuando el texto fue mejorado por IA

## Ventajas del Sistema

### Para el Transcriptor
- **Menos trabajo manual**: Claude corrige puntuación y mayúsculas
- **Documento más profesional**: Redacción formal desde el inicio
- **Menos errores**: Detección inteligente de preguntas y exclamaciones
- **Contexto preservado**: Frases completas aunque haya pausas

### Para el Sistema
- **Fidelidad al audio**: Texto original siempre disponible
- **Trazabilidad**: 3 versiones del texto (IA, mejorado, editado)
- **Reversible**: El usuario siempre puede ver/recuperar el texto original
- **Inteligente**: Claude entiende contexto judicial peruano

### Para el Documento Final
- **Formato A4 profesional**: Listo para imprimir
- **Puntuación correcta**: Sin necesidad de revisión básica
- **Estructura clara**: Párrafos bien formados
- **Legalmente válido**: Mantiene significado original

## Configuración

### Variables de Entorno
```bash
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-20250514
```

### Parámetros de Claude
- **Temperatura**: 0.3 (baja para consistencia)
- **Max tokens**: 500 (suficiente para mejorar segmentos)
- **Modelo**: Claude Sonnet 4 (más avanzado)

### Contexto
- **max_context_segments**: 10 segmentos previos
- Se limpia al iniciar nueva audiencia

## Migración de Base de Datos

```bash
# Aplicar migración para agregar texto_mejorado
alembic upgrade head
```

Migración: `b8c3f2e9d1a0_add_texto_mejorado_to_segmentos.py`

## Monitoreo y Logs

```python
logger.info("Mejoramiento aplicado: confianza=0.95")
logger.warning("Enhancement failed, using original")
```

## Fallback

Si Claude falla:
- Capitaliza primera letra
- Añade punto final si falta
- Confianza = 0.5
- Usa texto original de Deepgram

## Ejemplo Real

**Deepgram (original):**
```
vamos a empezar la audiencia diciendo que todos podemos
```

**Claude (mejorado):**
```
Vamos a empezar la audiencia diciendo que todos podemos participar.
```

**Usuario (editado):**
```
Vamos a iniciar la audiencia manifestando que todas las partes pueden participar.
```

## Desactivar Mejoramiento

Para desactivar temporalmente:
```python
# En transcription_ws.py
# Comentar la línea de enhancement:
# result["texto_mejorado"] = enhancement["enhanced"]
```

## Próximas Mejoras

- [ ] Toggle en UI para ver original vs mejorado
- [ ] Estadísticas de mejoramiento (% de cambios)
- [ ] Configuración por usuario de nivel de mejoramiento
- [ ] Pre-prompts personalizados por tipo de audiencia
- [ ] Detección de jurisprudencia mencionada
