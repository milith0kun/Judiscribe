JudiScribe — Plan de Implementación: Sprints 2–5
Estado Actual (Sprint 1 ✅ Completo)
Lo que ya funciona:

Docker Compose 5 servicios (backend, frontend, postgres, redis, celery-worker)
FastAPI con WebSocket → Deepgram Nova-3 streaming
Canvas TipTap básico (append-only con forwardRef para insertar frases)
Auth JWT, CRUD audiencias, segmentos, hablantes, marcadores
Captura de audio en navegador (
useAudioCapture
, 
useDeepgramSocket
)
Alembic migrations, Zustand stores, Axios con interceptor
Sprint 2 — Canvas Editable + Hablantes + Audio Vinculado
Objetivo: El digitador puede editar texto, ver hablantes con colores/roles, y reproducir cualquier segmento.

Backend
[MODIFY] 
transcription_ws.py
Enviar palabras_json (word-level timestamps) al frontend
Guardar palabras_json como JSONB en tabla 
segmentos
[MODIFY] 
hablantes.py
PUT endpoint para asignar rol, nombre, etiqueta, color al hablante
[NEW] 
frases.py
CRUD de frases estándar (10 predefinidas + personalizables)
[NEW] 
seed.py
Seed con 10 frases estándar + 15 roles de hablante
Frontend — Canvas
[MODIFY] 
TranscriptionCanvas.tsx
Modo edición completa: editable cuando soloLectura=false
Regla no-sobreescritura: marcar editado_por_usuario=true al editar, bloquear updates automáticos
Texto provisional → confirmado: transición visual suave con ProvisionalMark
SpeakerNode: etiquetas de hablante en negrita con color del rol
Auto-scroll inteligente: se desactiva al scroll manual, se reactiva con Ctrl+J
[NEW] 
SpeakerLabel.tsx
Componente de etiqueta visual para cada hablante
[NEW] 
ProvisionalText.tsx
Renderizado de texto provisional con estilo gris → negro
[MODIFY] 
SpeakerNode.ts
TipTap Node para etiquetas con attrs: speaker_id, 
rol
, etiqueta, color_hex
[MODIFY] 
SegmentMark.ts
Mark para vincular texto a segmento_id + timestamps
Frontend — Paneles
[MODIFY] 
PanelHablantes.tsx
Dropdown de 15 roles judiciales con etiquetas del PJ peruano
Campo nombre completo, color, indicador "hablando ahora"
Al cambiar rol → propagar a todas las etiquetas SpeakerNode en el Canvas
[NEW] 
AudioPlayer.tsx
wavesurfer.js con forma de onda
Play, pause, ±5s, velocidad (0.5x–2x), volumen
Click en segmento del Canvas → saltar al timestamp
[MODIFY] 
AtajosFrases.tsx
10 frases estándar con atajos Ctrl+[1-0]
Cargar desde API, permitir personalización
[MODIFY] 
BarraEstado.tsx
Conteo de palabras, tiempo transcurrido HH:MM:SS
Estado conexión Deepgram, número de segmentos
[NEW] 
KeyboardShortcuts.tsx
Registrar atajos globales (Ctrl+1–0, Ctrl+M, Ctrl+J, Ctrl+H, Ctrl+Space)
Sprint 3 — Diccionario Jurídico + Sugerencias + Marcadores
Objetivo: El sistema sugiere correcciones automáticas y el digitador trabaja a máxima velocidad.

Backend
[NEW] 
legal_terms.json
500+ términos jurídicos con variantes erróneas y categorías
[NEW] 
legal_dictionary.py
Motor fuzzy matching: Levenshtein + Soundex/Metaphone para español
Ejecución en <50ms por segmento
[MODIFY] 
transcription_ws.py
Aplicar diccionario sobre cada segmento confirmado
Enviar mensajes tipo suggestion al frontend
Keyterm prompting dinámico (top 100 términos problemáticos)
Frontend
[NEW] 
SuggestionPlugin.ts
Subrayado naranja en texto con error detectado
Popover con corrección sugerida + Aceptar (Tab) / Rechazar (Esc)
[NEW] 
SuggestionPopover.tsx
UI del popover de sugerencia con categoría, confianza, botones
[MODIFY] 
LowConfidenceMark.ts
Fondo amarillo #FFF3CD, subrayado punteado
Click → "Confianza: X%. Haga clic para escuchar el audio."
[MODIFY] 
BookmarkNode.ts
Banderita amarilla en margen, Ctrl+M para insertar
[NEW] 
PanelMarcadores completo
Lista cronológica con HH:MM:SS, click → navegar en Canvas + audio
[NEW] 
DictionaryPanel.tsx
Búsqueda de términos jurídicos, últimas sugerencias del sistema
Sprint 4 — Pipeline Batch + Generación del Acta
Objetivo: Al finalizar la audiencia, reprocesar con máxima precisión y generar el acta oficial.

Backend
[MODIFY] 
batch_process.py
Pipeline: faster-whisper → Pyannote → alignment → merge inteligente
[NEW] 
batch_transcriber.py
faster-whisper large-v3, beam_size=5, initial_prompt judicial
[NEW] 
batch_diarizer.py
Pyannote 3.1 diarización completa
[NEW] 
alignment.py
Fusión transcripción + diarización por superposición temporal
[NEW] 
acta_generator.py
Claude Sonnet 4 con prompt judicial → acta oficial
[MODIFY] 
generate_acta.py
Celery task que orquesta generación del acta
[NEW] Modelos/Schemas para actas, templates_audiencia
Frontend
[NEW] 
revision/page.tsx
Vista diff: streaming vs batch, aceptar/rechazar propuestas
[NEW] 
ActaEditor.tsx
TipTap separado para editar el acta generada
[NEW] 
acta/page.tsx
Página de edición y aprobación del acta
Sprint 5 — Exportación + Admin + Evaluación
Objetivo: Acta exportable idéntica al formato oficial del PJ.

Backend
[NEW] 
document_export.py
python-docx: Formato A (unipersonal) y Formato B (apelaciones)
weasyprint: exportación PDF
[NEW] 
export.py
POST /api/audiencias/{id}/exportar/docx y /pdf
[NEW] Panel de administración endpoints
CRUD diccionario, frases, templates, usuarios
[NEW] audit_log + modelo AuditLog
Registro de acciones significativas
Frontend
[NEW] Panel de administración (admin dashboard)
[NEW] Vista de revisión batch con diff visual
[NEW] Upload de audio pregrabado
Evaluación
[NEW] evaluation/scripts/
compute_wer.py, compute_der.py, measure_latency.py, benchmark_full.py
Configuración de Skills
Los 10 skills genéricos en .claude/skills/ son útiles como referencia pero no son específicos a JudiScribe. Se creó 
CLAUDE.md
 en la raíz del proyecto con el contexto completo.

IMPORTANT

Próximo paso recomendado: Comenzar Sprint 2 — es el más impactante para la usabilidad del sistema. El Canvas editable con hablantes y audio es la funcionalidad core del digitador.

Verificación
Sprint 2
 Editar texto en Canvas → segmento marcado como editado_por_usuario
 Cambiar rol de hablante → etiquetas actualizadas en todo el documento
 Click en segmento → audio salta al timestamp
 Ctrl+1–0 → frase insertada en cursor
 Auto-scroll se desactiva al scroll manual
Sprint 3
 Término mal escrito → sugerencia naranja subrayada
 Tab acepta sugerencia, Esc rechaza
 Ctrl+M inserta marcador → visible en panel
Sprint 4
 Pipeline batch mejora transcripción sin tocar ediciones del usuario
 Acta generada con formato oficial
 Versionado y aprobación
Sprint 5
 .docx exportado con formato real PJ Cusco
 WER streaming < 10%, batch < 8%
