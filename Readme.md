# JudiScribe — Guía Maestra de Implementación

> Documento de referencia técnica completa para implementar el sistema desde cero usando Cursor o Claude Code. No contiene código fuente. Contiene todo lo que la IA necesita entender para construir el sistema correctamente.

---

## 1. Qué es el sistema y qué problema resuelve

JudiScribe es una aplicación web para transcriptores judiciales (llamados "digitadores") del Distrito Judicial de Cusco, Perú. Su función principal es transcribir audiencias judiciales en tiempo real usando inteligencia artificial y producir el acta oficial al finalizar.

El problema central: el habla humana ocurre a 150-180 palabras por minuto, un mecanógrafo rápido escribe 60-80, y las audiencias duran entre 2 y 5 horas. El digitador pierde información, se fatiga y después invierte horas adicionales formateando el acta. Los términos jurídicos técnicos se transcriben mal bajo presión.

La solución: un editor (Canvas) donde el texto aparece automáticamente mientras los participantes hablan, el digitador corrige lo que necesita corregir, y al finalizar genera el acta con formato oficial del Poder Judicial peruano con un solo clic.

**Principio absoluto del sistema:** el digitador siempre tiene el control. La IA nunca sobrescribe lo que el digitador ya editó. El digitador puede rechazar cualquier propuesta automática.

---

## 2. Usuarios del sistema

Hay tres roles de usuario:

**Transcriptor (digitador):** es el usuario principal. Asiste a la audiencia, supervisa la transcripción en tiempo real, corrige errores, inserta marcadores, asigna roles a los hablantes y genera el acta final. Tiene acceso al Canvas de transcripción y a todas las herramientas de edición.

**Supervisor:** revisa actas generadas por los transcriptores, puede hacer correcciones menores y es quien las aprueba formalmente para que puedan exportarse como documento oficial.

**Administrador:** gestiona usuarios (solo el admin puede crear nuevas cuentas), configura el diccionario jurídico, edita los keyterms que se envían a Deepgram, modifica el prompt de faster-whisper, y administra los templates de actas.

---

## 3. Stack tecnológico — decisiones fijas

Estas decisiones no se discuten. Están tomadas y justificadas en la especificación original.

### Backend
- **FastAPI** con Python 3.11, usando SQLAlchemy async con asyncpg
- **PostgreSQL 16** como base de datos principal, con soporte JSONB
- **Redis 7** como broker de Celery y caché
- **Celery** para tareas en segundo plano (procesamiento batch de audio)
- **Alembic** para migraciones de base de datos
- **Deepgram Nova-3** para transcripción streaming en tiempo real vía WebSocket
- **faster-whisper large-v3** para transcripción batch post-audiencia (requiere GPU)
- **Pyannote Audio 3.1** para diarización batch post-audiencia (requiere GPU)
- **Claude Sonnet 4** (API de Anthropic) para generación del acta final con formato oficial
- **python-docx** para exportación a Word (.docx)
- **weasyprint** para exportación a PDF

### Frontend
- **Next.js 14** con React 18 y TypeScript
- **TipTap** (basado en ProseMirror) como editor de texto enriquecido para el Canvas
- **wavesurfer.js** para el reproductor de audio con forma de onda
- **Zustand** para estado global
- **Socket.IO** para comunicación WebSocket con el backend
- **Tailwind CSS** para estilos
- **axios** para llamadas REST

### Infraestructura
- **Docker Compose** con seis servicios: backend, frontend, celery-worker, redis, postgres, nginx
- El celery-worker requiere GPU (NVIDIA RTX 3060 12GB mínimo) para faster-whisper y Pyannote
- El resto de servicios no requieren GPU
- **nginx** como reverse proxy con TLS termination

---

## 4. Estructura de carpetas del proyecto

```
judiscribe/
├── docker-compose.yml
├── docker-compose.override.yml      ← configuración GPU para celery-worker
├── .env.example
├── README.md
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   └── app/
│       ├── main.py                  ← FastAPI app, startup, shutdown
│       ├── config.py                ← Settings con pydantic-settings
│       ├── database.py              ← SQLAlchemy async engine + session
│       ├── models/                  ← ORM models
│       │   ├── audiencia.py
│       │   ├── segmento.py
│       │   ├── hablante.py
│       │   ├── marcador.py
│       │   ├── acta.py
│       │   ├── usuario.py
│       │   ├── frase_estandar.py
│       │   ├── template_audiencia.py
│       │   └── audit_log.py
│       ├── schemas/                 ← Pydantic schemas request/response
│       │   ├── audiencia.py
│       │   ├── segmento.py
│       │   ├── acta.py
│       │   ├── hablante.py
│       │   ├── marcador.py
│       │   └── auth.py
│       ├── api/                     ← REST endpoints
│       │   ├── router.py
│       │   ├── audiencias.py
│       │   ├── segmentos.py
│       │   ├── actas.py
│       │   ├── marcadores.py
│       │   ├── hablantes.py
│       │   ├── export.py
│       │   └── auth.py
│       ├── ws/                      ← WebSocket handlers
│       │   ├── transcription_ws.py  ← audio in → texto out en tiempo real
│       │   └── events.py
│       ├── services/                ← lógica de negocio
│       │   ├── deepgram_streaming.py
│       │   ├── audio_processor.py
│       │   ├── legal_dictionary.py
│       │   ├── batch_transcriber.py
│       │   ├── batch_diarizer.py
│       │   ├── alignment.py
│       │   ├── acta_generator.py
│       │   ├── document_export.py
│       │   └── auth_service.py
│       ├── tasks/                   ← Celery tasks
│       │   ├── batch_process.py
│       │   └── generate_acta.py
│       └── data/
│           ├── legal_terms.json
│           ├── acta_template.json
│           └── prompts/
│               ├── acta_generation.txt
│               └── role_detection.txt
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx             ← dashboard principal
│       │   ├── login/page.tsx
│       │   └── audiencia/
│       │       ├── nueva/page.tsx
│       │       └── [id]/
│       │           ├── page.tsx     ← vista Canvas principal
│       │           ├── acta/page.tsx
│       │           └── revision/page.tsx
│       ├── components/
│       │   ├── canvas/
│       │   │   ├── TranscriptionCanvas.tsx
│       │   │   ├── SpeakerLabel.tsx
│       │   │   ├── ProvisionalText.tsx
│       │   │   ├── ConfidenceHighlight.tsx
│       │   │   ├── SuggestionPopover.tsx
│       │   │   └── BookmarkFlag.tsx
│       │   ├── panels/
│       │   │   ├── SpeakerPanel.tsx
│       │   │   ├── AudioPlayer.tsx
│       │   │   ├── BookmarkPanel.tsx
│       │   │   ├── DictionaryPanel.tsx
│       │   │   └── StatusBar.tsx
│       │   ├── acta/
│       │   │   ├── ActaEditor.tsx
│       │   │   ├── ActaPreview.tsx
│       │   │   └── ExportDialog.tsx
│       │   └── shared/
│       │       ├── Header.tsx
│       │       ├── Sidebar.tsx
│       │       └── KeyboardShortcuts.tsx
│       ├── hooks/
│       │   ├── useDeepgramSocket.ts
│       │   ├── useCanvas.ts
│       │   ├── useAudioCapture.ts
│       │   ├── useBookmarks.ts
│       │   └── useSpeakers.ts
│       ├── stores/
│       │   ├── audienciaStore.ts
│       │   ├── canvasStore.ts
│       │   └── authStore.ts
│       ├── lib/
│       │   ├── tiptap-extensions/
│       │   │   ├── SpeakerNode.ts
│       │   │   ├── ProvisionalMark.ts
│       │   │   ├── LowConfidenceMark.ts
│       │   │   ├── SuggestionPlugin.ts
│       │   │   └── BookmarkNode.ts
│       │   ├── api.ts
│       │   └── constants.ts
│       └── types/
│           └── index.ts
│
├── evaluation/
│   ├── scripts/
│   │   ├── compute_wer.py
│   │   ├── compute_der.py
│   │   ├── measure_latency.py
│   │   └── benchmark_full.py
│   └── corpus/
│       ├── audio/
│       └── reference/
│
├── nginx/
│   ├── nginx.conf
│   └── ssl/
│
└── docs/
    ├── api-reference.md
    ├── deployment-guide.md
    └── user-manual.md
```

---

## 5. Modelo de datos completo

### Tabla: audiencias

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | UUID | PK, default uuid4 | Identificador único |
| expediente | VARCHAR(50) | NOT NULL | Número de expediente judicial |
| juzgado | VARCHAR(200) | NOT NULL | Nombre del juzgado |
| tipo_audiencia | VARCHAR(100) | NOT NULL | Juicio oral, prisión preventiva, apelación, etc. |
| instancia | VARCHAR(50) | NOT NULL | juzgado_unipersonal o sala_apelaciones |
| fecha | DATE | NOT NULL | Fecha de la audiencia |
| hora_inicio | TIME | NOT NULL | Hora de inicio |
| hora_fin | TIME | NULLABLE | Hora de fin |
| sala | VARCHAR(100) | NULLABLE | Ej: GOOGLE MEET / 11VA SALA |
| delito | VARCHAR(200) | NULLABLE | Tipo de delito |
| imputado_nombre | VARCHAR(200) | NULLABLE | Nombre del imputado |
| agraviado_nombre | VARCHAR(200) | NULLABLE | Nombre del agraviado |
| especialista_causa | VARCHAR(200) | NULLABLE | Nombre del especialista de causa |
| especialista_audiencia | VARCHAR(200) | NULLABLE | Nombre del especialista de audiencia (digitador) |
| estado | ENUM | NOT NULL, default 'pendiente' | pendiente, en_curso, transcrita, en_revision, finalizada |
| audio_path | VARCHAR(500) | NULLABLE | Ruta al archivo WAV almacenado en servidor |
| audio_duration_seconds | FLOAT | NULLABLE | Duración total del audio |
| deepgram_session_id | VARCHAR(100) | NULLABLE | ID de sesión de Deepgram para tracking |
| created_by | UUID | FK → usuarios.id | Quién creó la audiencia |
| created_at | TIMESTAMP | default now() | |
| updated_at | TIMESTAMP | auto-update | |

### Tabla: segmentos

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | UUID | PK | |
| audiencia_id | UUID | FK → audiencias.id, INDEX | |
| speaker_id | VARCHAR(20) | NOT NULL | SPEAKER_00, SPEAKER_01, etc. |
| texto_ia | TEXT | NOT NULL | Texto original generado por la IA |
| texto_editado | TEXT | NULLABLE | Texto corregido por el digitador |
| timestamp_inicio | FLOAT | NOT NULL | Segundo de inicio en el audio |
| timestamp_fin | FLOAT | NOT NULL | Segundo de fin en el audio |
| confianza | FLOAT | NOT NULL, default 1.0 | Score de confianza del ASR (0.0-1.0) |
| es_provisional | BOOLEAN | default false | Si Deepgram aún no confirmó el segmento |
| editado_por_usuario | BOOLEAN | default false | Si el digitador modificó este segmento |
| fuente | ENUM | default 'streaming' | streaming (Deepgram) o batch (faster-whisper) |
| orden | INTEGER | NOT NULL, INDEX | Orden secuencial en la audiencia |
| palabras_json | JSONB | NULLABLE | [{word, start, end, confidence}] por cada palabra |

### Tabla: hablantes

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | UUID | PK | |
| audiencia_id | UUID | FK → audiencias.id | |
| speaker_id | VARCHAR(20) | NOT NULL | SPEAKER_00, etc. |
| rol | VARCHAR(100) | NULLABLE | Ver lista de roles en sección 10 |
| etiqueta_canvas | VARCHAR(100) | NULLABLE | Texto que aparece en el Canvas |
| nombre_completo | VARCHAR(200) | NULLABLE | Nombre real del participante |
| color_hex | VARCHAR(7) | NOT NULL | Color asignado para diferenciarlo visualmente |
| prioridad_transcripcion | VARCHAR(20) | default 'media' | critica, alta, media, ninguna |
| auto_detected | BOOLEAN | default false | Si el rol fue detectado automáticamente por IA |
| UNIQUE | | (audiencia_id, speaker_id) | |

### Tabla: marcadores

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | UUID | PK | |
| audiencia_id | UUID | FK → audiencias.id | |
| timestamp_audio | FLOAT | NOT NULL | Segundo en el audio donde se creó el marcador |
| nota | TEXT | NOT NULL | Nota escrita por el digitador |
| tipo | VARCHAR(20) | default 'general' | general, importante, revisar, sentencia |
| created_by | UUID | FK → usuarios.id | |
| created_at | TIMESTAMP | | |

### Tabla: actas

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | UUID | PK | |
| audiencia_id | UUID | FK → audiencias.id | |
| contenido_canvas | TEXT | NOT NULL | Snapshot del Canvas al momento de generar |
| contenido_llm | TEXT | NULLABLE | Acta generada por Claude Sonnet 4 |
| contenido_final | TEXT | NULLABLE | Acta editada y aprobada por el digitador |
| version | INTEGER | NOT NULL, default 1 | Se incrementa con cada nueva generación |
| formato | VARCHAR(20) | NULLABLE | formato_a (unipersonal) o formato_b (apelaciones) |
| llm_model_used | VARCHAR(50) | NULLABLE | claude-sonnet-4, llama-3.1-70b |
| llm_prompt_version | VARCHAR(20) | NULLABLE | Versión del prompt usado |
| estado | ENUM | default 'borrador' | borrador, en_revision, aprobada, exportada |
| aprobada_por | UUID | FK → usuarios.id, NULLABLE | |
| aprobada_at | TIMESTAMP | NULLABLE | |
| created_at | TIMESTAMP | | |

### Tabla: usuarios

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | UUID | PK | |
| email | VARCHAR(200) | UNIQUE, NOT NULL | |
| nombre | VARCHAR(200) | NOT NULL | |
| password_hash | VARCHAR(200) | NOT NULL | bcrypt |
| rol | ENUM | NOT NULL | admin, transcriptor, supervisor |
| activo | BOOLEAN | default true | |
| created_at | TIMESTAMP | | |

### Tabla: frases_estandar

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | PK |
| usuario_id | UUID | FK → usuarios.id (nullable = frase global del sistema) |
| texto | TEXT | Texto de la frase |
| descripcion | VARCHAR(100) | Descripción para mostrar en el menú |
| atajo | VARCHAR(20) | Atajo de teclado asignado |
| orden | INTEGER | Orden en el menú |

### Tabla: templates_audiencia

| Campo | Tipo | Descripción |
|---|---|---|
| id | UUID | PK |
| tipo_audiencia | VARCHAR(100) | Juicio oral, apelación, prisión preventiva, etc. |
| instancia | VARCHAR(50) | juzgado_unipersonal o sala_apelaciones |
| secciones_json | JSONB | Lista ordenada: [{titulo, contenido_default, obligatoria}] |
| formato_encabezado | VARCHAR(20) | tabla o narrativo |
| activo | BOOLEAN | default true |

### Tabla: audit_log

| Campo | Tipo | Restricciones | Descripción |
|---|---|---|---|
| id | UUID | PK | |
| usuario_id | UUID | FK → usuarios.id | |
| audiencia_id | UUID | FK → audiencias.id, NULLABLE | |
| accion | VARCHAR(50) | NOT NULL | crear, editar, exportar, aprobar, eliminar |
| detalle | JSONB | NULLABLE | Detalles adicionales de la acción |
| ip_address | VARCHAR(45) | NULLABLE | |
| created_at | TIMESTAMP | | |

---

## 6. API REST — todos los endpoints

### Autenticación

| Método | Ruta | Descripción |
|---|---|---|
| POST | /api/auth/login | Login con email y password, retorna JWT access + refresh |
| POST | /api/auth/register | Registro (solo admin puede ejecutar este endpoint) |
| POST | /api/auth/refresh | Renovar access token usando refresh token |

### Audiencias

| Método | Ruta | Descripción |
|---|---|---|
| POST | /api/audiencias | Crear nueva audiencia con todos los metadatos del encabezado |
| GET | /api/audiencias | Listar audiencias con filtros por fecha, juzgado, estado, expediente |
| GET | /api/audiencias/{id} | Detalle completo con metadatos |
| PUT | /api/audiencias/{id} | Actualizar metadatos (hora_fin, estado, etc.) |
| POST | /api/audiencias/{id}/upload | Subir audio pregrabado para procesamiento batch |
| POST | /api/audiencias/{id}/start | Iniciar sesión de transcripción en vivo |
| POST | /api/audiencias/{id}/stop | Finalizar sesión y disparar pipeline batch automáticamente |

### Segmentos

| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/audiencias/{id}/segmentos | Obtener todos los segmentos transcritos |
| PUT | /api/audiencias/{id}/segmentos/{seg_id} | Guardar texto editado por el digitador |
| POST | /api/audiencias/{id}/segmentos/batch-update | Aceptar o rechazar propuestas de mejora del batch |

### Hablantes

| Método | Ruta | Descripción |
|---|---|---|
| GET | /api/audiencias/{id}/hablantes | Listar hablantes detectados |
| PUT | /api/audiencias/{id}/hablantes/{speaker_id} | Asignar rol, nombre y etiqueta a un hablante |

### Marcadores

| Método | Ruta | Descripción |
|---|---|---|
| POST | /api/audiencias/{id}/marcadores | Crear marcador |
| GET | /api/audiencias/{id}/marcadores | Listar marcadores |
| DELETE | /api/audiencias/{id}/marcadores/{marc_id} | Eliminar marcador |

### Actas

| Método | Ruta | Descripción |
|---|---|---|
| POST | /api/audiencias/{id}/generar-acta | Disparar generación con Claude Sonnet 4 |
| GET | /api/audiencias/{id}/acta | Obtener acta en su última versión |
| GET | /api/audiencias/{id}/acta/versiones | Listar historial de versiones |
| PUT | /api/audiencias/{id}/acta | Guardar ediciones del digitador |
| POST | /api/audiencias/{id}/acta/aprobar | Aprobar acta (cambia estado a 'aprobada') |

### Exportación

| Método | Ruta | Descripción |
|---|---|---|
| POST | /api/audiencias/{id}/exportar/docx | Generar y descargar Word con formato oficial |
| POST | /api/audiencias/{id}/exportar/pdf | Generar y descargar PDF |

### Configuración (solo admin)

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST/PUT/DELETE | /api/admin/diccionario | CRUD del diccionario jurídico |
| GET/PUT | /api/admin/frases | Gestionar frases estándar |
| GET/PUT | /api/admin/templates | Gestionar templates por tipo de audiencia |
| GET/POST/PUT | /api/admin/usuarios | Gestionar usuarios |

---

## 7. WebSocket — canales y mensajes

### Canales

| Canal | Dirección | Descripción |
|---|---|---|
| /ws/audio/{audiencia_id} | Cliente → Servidor | Chunks de audio PCM 16kHz cada 250ms |
| /ws/transcripcion/{audiencia_id} | Servidor → Cliente | Texto transcrito con speaker, confianza, timestamps |
| /ws/sugerencias/{audiencia_id} | Servidor → Cliente | Sugerencias del diccionario jurídico |
| /ws/status/{audiencia_id} | Bidireccional | Estado de conexión, errores, progreso del batch |

### Formato del mensaje de audio (cliente → servidor)

```json
{
  "type": "audio_chunk",
  "data": "<base64 encoded PCM 16kHz mono>",
  "sequence": 142,
  "timestamp": 1708300000.123
}
```

### Formato del mensaje de transcripción (servidor → cliente)

```json
{
  "type": "transcript",
  "is_final": true,
  "speaker": "SPEAKER_00",
  "text": "El fiscal solicita que se declare la responsabilidad penal",
  "confidence": 0.92,
  "start": 45.2,
  "end": 48.7,
  "words": [
    {"word": "El", "start": 45.2, "end": 45.4, "confidence": 0.98},
    {"word": "fiscal", "start": 45.4, "end": 45.9, "confidence": 0.95}
  ]
}
```

### Formato del mensaje de sugerencia jurídica (servidor → cliente)

```json
{
  "type": "suggestion",
  "segment_order": 42,
  "original_word": "a pelación",
  "suggested_word": "apelación",
  "position": {"start": 12, "end": 22},
  "confidence": 0.94,
  "category": "término_procesal"
}
```

---

## 8. Flujos principales del sistema

### Flujo 1: Transcripción en tiempo real

1. El digitador crea una audiencia con todos los datos del encabezado (expediente, juzgado, tipo, instancia, fecha, hora, sala, delito, imputado, agraviado, especialistas).
2. El sistema pre-carga el Canvas con las secciones correspondientes al tipo de audiencia seleccionado.
3. El digitador presiona "Iniciar transcripción" y selecciona la fuente de audio.
4. El navegador solicita permisos de audio y comienza a capturar con MediaRecorder API a 16kHz mono, enviando chunks de 250ms por WebSocket al backend.
5. El backend recibe los chunks y los reenvía en tiempo real a Deepgram Nova-3 por un segundo WebSocket persistente.
6. Deepgram retorna texto con: is_final (booleano), speaker_id, texto, confianza, y timestamps por palabra.
7. El backend aplica el diccionario jurídico (fuzzy matching) sobre el texto recibido.
8. El backend envía al navegador: texto + speaker + confianza + sugerencias jurídicas si las hay.
9. El Canvas de TipTap renderiza el texto con los indicadores visuales correspondientes.
10. En paralelo, el audio completo se graba en el servidor como archivo WAV.
11. Cada segmento confirmado (is_final=true) se almacena en PostgreSQL.

### Flujo 2: Pipeline batch post-audiencia

1. El digitador presiona "Detener transcripción" o el sistema lo dispara automáticamente al finalizar.
2. Se dispara una tarea Celery en segundo plano.
3. faster-whisper large-v3 transcribe el audio completo con máxima precisión (beam_size=5, word_timestamps=True, language="es", initial_prompt con terminología judicial extendida de Cusco).
4. Pyannote 3.1 realiza diarización completa sobre el audio.
5. alignment.py fusiona transcripción y diarización por superposición temporal a nivel de palabra.
6. El sistema compara resultado batch contra el Canvas. Para cada segmento: si editado_por_usuario=true, no se toca. Si no fue editado y la diferencia Levenshtein > 0.1, se genera una propuesta de mejora.
7. El digitador ve la vista de revisión con propuestas y acepta o rechaza cada una.

### Flujo 3: Generación del acta

1. El digitador presiona "Generar Acta" y selecciona el formato (Formato A para juzgado unipersonal, Formato B para sala de apelaciones).
2. Se toma un snapshot del Canvas con todas las ediciones del digitador.
3. Se envía a Claude Sonnet 4 con el prompt oficial que incluye: datos de la audiencia en JSON, lista de participantes, contenido del Canvas, instrucciones de formato según el tipo seleccionado, glosario jurídico, y restricción de no inventar contenido.
4. Claude retorna el acta estructurada con el formato oficial del Poder Judicial de Cusco.
5. El acta se carga en el ActaEditor (editor TipTap separado) para que el digitador la revise.
6. El digitador edita lo que sea necesario, aprueba, y exporta como .docx o PDF.

### Flujo 4: Captura de audio según escenario

El sistema soporta cuatro escenarios de captura:

- **Audiencia presencial con consola de audio:** capturar desde la salida de la consola central que ya tiene todas las voces mezcladas. Se usa PulseAudio monitor en Linux o WASAPI loopback en Windows. No requiere hardware adicional si JudiScribe corre en la misma computadora de grabación.
- **Audiencia virtual por Google Meet:** capturar el audio de salida del sistema usando getDisplayMedia con audio:true en Chrome.
- **Audiencia mixta:** la consola central ya integra el audio presencial y el virtual, se captura igual que en el primer caso.
- **Audio pregrabado:** el digitador sube un archivo (wav, mp3, m4a, ogg) y el sistema ejecuta el pipeline batch completo.

El frontend muestra un selector de fuente de audio antes de iniciar la transcripción: "Audio del sistema", "Micrófono", o "Dispositivo específico" (lista todos los dispositivos disponibles con enumerateDevices).

---

## 9. Canvas de TipTap — comportamiento completo

### Layout de pantalla

La pantalla de transcripción se divide en dos zonas. La zona izquierda ocupa el 72% del ancho y contiene el Canvas (editor TipTap). La zona derecha ocupa el 28% y contiene el panel de control con paneles colapsables.

### Indicadores visuales en el Canvas

- **Texto provisional** (is_final=false de Deepgram): fondo #F5F5F5, color de texto #999999. Transición suave a negro cuando Deepgram confirma.
- **Texto confirmado** (is_final=true): texto negro sólido.
- **Baja confianza** (score < 0.7): fondo #FFF3CD amarillo tenue con subrayado punteado. Al hacer clic muestra: "Confianza: X%. Haga clic para escuchar el audio."
- **Sugerencia jurídica**: subrayado punteado color #E67E22 naranja. Al hover aparece un popover con la corrección sugerida, la categoría del término y botones Aceptar/Rechazar.
- **Etiqueta de hablante**: nodo SpeakerNode en negrita y mayúsculas con el color del rol. Se inserta cuando cambia el speaker.
- **Marcador**: banderita amarilla en el margen izquierdo con tooltip mostrando la nota.
- **Borde del Canvas**: azul cuando el hablante activo tiene prioridad crítica (alegatos, declaración del acusado, resolución del juez). Indicador neutral en otros casos.

### Auto-scroll

El Canvas hace auto-scroll al texto más reciente mientras la transcripción está activa. Se desactiva automáticamente si el digitador hace scroll manual hacia arriba para editar. Se reactiva con Ctrl+J.

### Regla de no-sobreescritura

Esta es la regla más importante del sistema. Cuando el digitador edita cualquier contenido de un segmento, ese segmento se marca con editado_por_usuario=true en la base de datos. A partir de ese momento, ningún proceso automático (streaming de Deepgram, pipeline batch, LLM) puede modificar ese segmento. El texto nuevo de la IA siempre se agrega al final del Canvas, nunca reemplaza contenido existente.

### Extensiones TipTap a implementar

- **SpeakerNode:** nodo bloque que representa la etiqueta de un hablante. Contiene: speaker_id, rol, etiqueta en texto, color_hex. No es editable directamente (solo mediante el panel de hablantes).
- **ProvisionalMark:** marca de texto que aplica el estilo provisional (gris semitransparente). Se elimina cuando el segmento se confirma.
- **LowConfidenceMark:** marca de texto que aplica el estilo de baja confianza (fondo amarillo). Guarda el score de confianza y el timestamp para el click-to-play.
- **SuggestionPlugin:** plugin que gestiona sugerencias inline. Subraya texto con error detectado, muestra popover al hover, permite Aceptar con Tab y Rechazar con Esc.
- **BookmarkNode:** nodo inline que representa un marcador. Muestra la banderita en el margen y guarda el timestamp_audio y la nota.

### Panel de Control (sidebar derecho)

El sidebar tiene cinco paneles colapsables en este orden:

1. **Panel de Hablantes** (siempre visible): lista todos los hablantes detectados. Cada uno muestra: muestra de color, dropdown de rol (15 roles disponibles), campo de texto para nombre completo, indicador de "hablando ahora" (borde brillante animado). Al cambiar el rol, se actualizan todas las etiquetas SpeakerNode de ese hablante en el Canvas y se guarda en la tabla hablantes.

2. **Panel de Audio**: reproductor wavesurfer.js con forma de onda del audio grabado. Controles: play, pause, retroceder 5s, avanzar 5s, selector de velocidad (0.5x, 1x, 1.5x, 2x), volumen. Al hacer clic en cualquier segmento del Canvas, el reproductor salta al timestamp_inicio de ese segmento.

3. **Panel de Marcadores**: lista cronológica de marcadores con icono del tipo, timestamp formateado como HH:MM:SS y nota truncada. Click en un marcador navega al punto correspondiente en el Canvas y posiciona el audio.

4. **Panel de Diccionario**: campo de búsqueda para consultar el diccionario jurídico. El digitador escribe un término parcial y ve definiciones breves. Muestra también las últimas sugerencias hechas por el sistema.

5. **Botón "Generar Acta"**: solo visible después de que la audiencia ha finalizado.

### Barra de estado

En la parte inferior del Canvas, muestra en tiempo real: conteo de palabras, tiempo transcurrido de la audiencia en formato HH:MM:SS, estado de la conexión con Deepgram (Conectado / Reconectando... / Desconectado), y número de segmentos.

---

## 10. Roles de hablante — lista completa

El sistema tiene 15 roles predefinidos con etiquetas exactas del Poder Judicial peruano y colores asignados:

| N° | Rol | Etiqueta en Canvas | Color hex |
|---|---|---|---|
| 1 | Juez (1ra instancia) | JUEZ: | #1B3A5C |
| 2 | Juez Director de Debates (2da instancia) | JUEZ SUPERIOR – DIRECTOR DE DEBATES: | #1B3A5C |
| 3 | Jueces del Colegiado | JUECES SUPERIORES: | #2C5282 |
| 4 | Fiscal | REPRESENTANTE DEL MINISTERIO PÚBLICO: | #2D6A4F |
| 5 | Defensa del imputado | DEFENSA DEL SENTENCIADO (A): | #9B2226 |
| 6 | Defensa del agraviado | DEFENSA DE LA PARTE AGRAVIADA: | #B44D12 |
| 7 | Imputado/Acusado | IMPUTADO: / ACUSADO: / SENTENCIADO: | #BC6C25 |
| 8 | Agraviado/Víctima | AGRAVIADO: | #6B21A8 |
| 9 | Víctima (diferente al agraviado) | VÍCTIMA: | #7C3AED |
| 10 | Asesor Jurídico de Víctimas | ASESOR JURÍDICO DE VÍCTIMAS: | #DB2777 |
| 11 | Perito | PERITO: | #0E7490 |
| 12 | Testigo | TESTIGO: | #65A30D |
| 13 | Asistente/Especialista | ASISTENTE DE AUDIENCIA: | #64748B |
| 14 | Partes en general | PARTES PROCESALES: | #78716C |
| 15 | Otro | OTRO: | #94A3B8 |

### Prioridad de transcripción por rol

- **Prioridad crítica** (transcripción textual completa obligatoria): Juez en resoluciones orales y sentencias, Fiscal en alegatos, Defensa en alegatos, Imputado/Acusado en declaraciones y último dicho.
- **Prioridad alta** (se transcribe o se referencia al audio): Testigos, Peritos, Víctima/Agraviado.
- **Prioridad media** (puede reemplazarse con frase estándar): Preguntas durante examen de testigos, precisiones del colegiado, intervenciones administrativas del especialista.
- **Sin transcripción**: conversaciones imputado-defensor (privilegio abogado-cliente), comentarios del público, policía procesal.

---

## 11. Frases estándar del sistema

Diez frases predefinidas que el digitador puede insertar con atajos o desde menú contextual:

| ID | Frase | Atajo |
|---|---|---|
| F01 | "Preguntas y respuestas registrados en audio." | Ctrl+1 |
| F02 | "quedando grabado en el registro de audio." | Ctrl+2 |
| F03 | "y demás extremos que corren registrado en audio." | Ctrl+3 |
| F04 | "SE DA POR VALIDAMENTE INSTALADA la presente audiencia." | Ctrl+4 |
| F05 | "Se da por concluida la presente audiencia y por cerrada la grabación en audio." | Ctrl+5 |
| F06 | "Instruye sobre su declaración y le toma juramento de ley." | Ctrl+6 |
| F07 | "Da por concluida su declaración." | Ctrl+7 |
| F08 | "Corre traslado a las partes." | Ctrl+8 |
| F09 | "[SEGMENTO INAUDIBLE]" | Ctrl+9 |
| F10 | "No desea que se oralice medio probatorio alguno." | Ctrl+0 |

El administrador puede editar estas frases y los usuarios pueden agregar las propias desde el panel de configuración.

---

## 12. Templates de secciones por tipo de audiencia

Al crear una audiencia, el Canvas se pre-carga automáticamente con la estructura de secciones del tipo seleccionado. Cada sección es un bloque editable con título pre-insertado.

### Juicio Oral (Juzgado Unipersonal)
Encabezado tipo tabla → INTRODUCCIÓN → ACREDITACIÓN → INSTALACIÓN DE LA AUDIENCIA → DECLARACIÓN DE TESTIGOS → DECLARACIÓN DEL PERITO → ORALIZACIÓN DE DOCUMENTALES → ALEGATOS FINALES → AUTODEFENSA DEL ACUSADO → CONCLUSIÓN

### Apelación de Sentencia (Sala de Apelaciones)
Encabezado narrativo → VERIFICACIÓN DE LAS PARTES INTERVINIENTES → ALEGATOS DE INICIO → PRUEBA NUEVA → EXAMEN DEL ACUSADO → ETAPA PROBATORIA → ALEGATOS FINALES → PRECISIONES DEL COLEGIADO → ÚLTIMO DICHO DEL SENTENCIADO → DECISIÓN Y PROGRAMACIÓN

### Prisión Preventiva
Encabezado tipo tabla → INTRODUCCIÓN → ACREDITACIÓN → INSTALACIÓN → REQUERIMIENTO FISCAL → OPOSICIÓN DE LA DEFENSA → RÉPLICA DEL FISCAL → DÚPLICA DE LA DEFENSA → AUTODEFENSA DEL IMPUTADO → RESOLUCIÓN DEL JUEZ → CONCLUSIÓN

### Lectura de Sentencia
Encabezado tipo tabla → INTRODUCCIÓN → ACREDITACIÓN → INSTALACIÓN → LECTURA DE SENTENCIA → NOTIFICACIÓN → RESOLUCIÓN SOBRE RECURSO → CONCLUSIÓN

---

## 13. Formatos de exportación del acta

### Formato A — Juzgado Penal Unipersonal (primera instancia)

Encabezado: Logo del Poder Judicial en esquina superior izquierda. "CORTE SUPERIOR DE JUSTICIA DEL CUSCO" centrado en negrita. Nombre del juzgado centrado en negrita. Título "ACTA DE REGISTRO DE AUDIENCIA DE [TIPO]" centrado, negrita, subrayado.

Sección I — tabla de datos con bordes que incluye: EXPEDIENTE N°, JUEZ, FECHA, HORA DE INICIO, SALA DE AUD., DELITO, IMPUTADO, AGRAVIADO, ESPECIALISTA DE CAUSA, ESPECIALISTA DE AUDIENCIA. Al pie de la tabla: "Audiencia que será grabada en sistema de audio (Art. 361.2 CPP y Art. 26 REGA)".

Sección II — ACREDITACIÓN: lista numerada de participantes con datos completos (nombre, DNI, cargo, casilla electrónica según corresponda).

INSTALACIÓN: "JUEZ: Estando las partes procesales, SE DA POR VALIDAMENTE INSTALADA la presente audiencia."

DESARROLLO: intervenciones con etiqueta del hablante en negrita mayúscula seguida de dos puntos, luego el texto.

CONCLUSIÓN con hora de fin.

Firmas: espacio para firma digital del juez con sello institucional, nombre y cargo del especialista de audiencia.

Tipografía: Times New Roman 12pt. Interlineado 1.5. Márgenes: superior 3cm, inferior 2.5cm, izquierdo 3cm, derecho 2.5cm. Numeración de páginas.

### Formato B — Sala Penal de Apelaciones (segunda instancia)

Primera línea: "Cuaderno Nro. [número de expediente]". Título centrado: "ACTA DE REGISTRO DE AUDIENCIA DE [TIPO] (SESION [N])".

Párrafo introductorio narrativo: "En la ciudad de Cusco, siendo las [hora] del día [fecha en letras mayúsculas], se constituyen los Magistrados Superiores de la [nombre de la sala]: [nombres y cargos], en las instalaciones de [lugar], con las partes intervinientes, para realizar la audiencia de [tipo] en el proceso penal que se sigue contra [nombre], por la comisión del delito de [delito], en agravio de [nombre]."

"ASUME LA DIRECCIÓN DE DEBATES: JUEZ SUPERIOR [nombre]."

Constancia de grabación (Art. 361 inciso 2 CPP).

VERIFICACIÓN DE LAS PARTES INTERVINIENTES: lista numerada.

Desarrollo por etapas procesales con títulos centrados en mayúsculas.

Cierre: "Se da por concluida la presente audiencia y por cerrada la grabación en audio."

Firmas: firma del Presidente de la Sala con sello, nombre y cargo del especialista.

### Metadatos del archivo .docx

El archivo exportado incluye en sus metadatos: autor (nombre del especialista de audiencia), título (tipo de audiencia + número de expediente), categoría (Poder Judicial del Perú), fecha de creación.

---

## 14. Configuración de Deepgram Nova-3

### Parámetros de conexión WebSocket

URL: wss://api.deepgram.com/v1/listen

Headers requeridos: Authorization: Token {DEEPGRAM_API_KEY}

Query parameters:
- model=nova-3
- language=es
- smart_format=true
- diarize=true
- encoding=linear16
- sample_rate=16000
- channels=1
- interim_results=true
- utterance_end_ms=1500
- vad_events=true
- punctuate=true
- keyterms={término1}&keyterms={término2}... (hasta 100 términos)

### Tipos de mensajes que envía Deepgram

- **Results con is_final=false:** transcripción provisional, mostrar en gris en el Canvas, no persistir en BD.
- **Results con is_final=true:** transcripción confirmada, mostrar en negro, persistir en BD como segmento.
- **UtteranceEnd:** fin de una intervención, usar para insertar separador si el siguiente segmento tiene speaker_id diferente.
- **SpeechStarted:** inicio de nueva actividad de voz, útil para el indicador visual de "hablando ahora".

### Keyterm Prompting dinámico

El backend mantiene un ranking de términos por frecuencia de error. Cada vez que el digitador acepta una sugerencia del diccionario jurídico para un término, se incrementa su contador. Los 100 términos con mayor contador se envían como keyterms al iniciar cada sesión de Deepgram.

---

## 15. Diccionario jurídico — estructura del JSON

Archivo: `backend/app/data/legal_terms.json`

El JSON tiene la siguiente estructura:

```
{
  "version": "1.0",
  "total_terms": 500,
  "categories": ["procesal", "medida_coercitiva", "sujeto_procesal", "delito", "norma", "entidad"],
  "terms": [
    {
      "id": "t001",
      "forma_correcta": "apelación",
      "variantes_erroneas": ["a pelación", "apelacion", "apelaciòn"],
      "categoria": "procesal",
      "descripcion": "Recurso impugnatorio contra resoluciones judiciales"
    }
  ]
}
```

El sistema debe tener mínimo 500 términos distribuidos así:
- Términos procesales: 150+ (apelación, sobreseimiento, tipificación, requerimiento, acusación, sentencia, resolución, auto, decreto, expediente, cuaderno, nulidad, prescripción, casación, inmediación, oralidad, contradicción, tutela de derechos, medios de prueba, prueba anticipada, oralización, contraexamen, interrogatorio, careo, pericia, testimonial, documental, entre otros)
- Medidas coercitivas: 30+ (prisión preventiva, comparecencia restringida, detención domiciliaria, impedimento de salida del país, embargo, incautación, allanamiento, vigilancia electrónica, caución, detención preliminar)
- Sujetos procesales: 30+ (juez, fiscal, defensor público, imputado, agraviado, parte civil, testigo, perito, intérprete, procurador público, Ministerio Público)
- Delitos frecuentes: 100+ (hurto, robo, extorsión, estafa, homicidio, feminicidio, violación sexual, tráfico ilícito de drogas, peculado, colusión, cohecho, lavado de activos, organización criminal, trata de personas, entre otros)
- Normas y cuerpos legales: 50+ (Código Penal, Código Procesal Penal, Ley Orgánica del Poder Judicial, Decreto Legislativo, Acuerdo Plenario, Casación Vinculante)
- Entidades: 40+ (Poder Judicial, Ministerio Público, Corte Superior de Justicia de Cusco, Sala Penal de Apelaciones, Juzgado de Investigación Preparatoria, INPE, Defensoría del Pueblo)
- Frases frecuentes: 100+ ("se deja constancia", "pena privativa de libertad", "reparación civil", "se declara fundada", "peligro de fuga", "arraigo domiciliario", "gravedad de la pena")

### Motor de fuzzy matching en `legal_dictionary.py`

El motor aplica en secuencia: (a) comparación exacta contra variantes conocidas del término, (b) distancia de Levenshtein normalizada con umbral 0.8, (c) comparación fonética con Soundex/Metaphone adaptado al español. Se ejecuta sobre cada segmento confirmado en menos de 50ms.

---

## 16. Initial prompt judicial para faster-whisper

El `initial_prompt` que se pasa a faster-whisper large-v3 debe tener más de 200 palabras e incluir: nombres completos de los juzgados de Cusco (Juzgado Penal Colegiado Supraprovincial, Juzgado de Investigación Preparatoria, Sala Penal de Apelaciones, Quinto Juzgado Penal Unipersonal de Cusco), artículos frecuentes del CPP (Art. 268 para prisión preventiva, Art. 349 para acusación, Art. 399 para sentencia), delitos frecuentes en la jurisdicción, terminología procesal completa, y fórmulas típicas de instalación de audiencia en Cusco.

---

## 17. Prompt de generación del acta (Claude Sonnet 4)

El prompt completo que se envía a Claude Sonnet 4 para generar el acta tiene esta estructura:

**System:** "Eres un redactor judicial especializado en actas de audiencia del Poder Judicial del Perú, específicamente de la Corte Superior de Justicia de Cusco. Tu tarea es tomar la transcripción de una audiencia judicial y convertirla en un acta de registro de audiencia con el formato oficial exacto que usa el Poder Judicial peruano."

**Reglas absolutas:**
1. No inventes información. Solo usa lo que está en la transcripción.
2. Si hay un vacío o segmento incomprensible, escribe "[SEGMENTO INAUDIBLE]".
3. Las intervenciones extensas no transcritas en detalle se resumen con "quedando grabado en el registro de audio" o "Preguntas y respuestas registrados en audio."
4. Usa tercera persona y tiempo presente para las acciones del juez ("El juez dispone...", "La jueza instruye...").
5. Los alegatos y declaraciones del acusado se transcriben en primera persona tal como fueron dichos.
6. Mantén la terminología jurídica exacta sin simplificar ni parafrasear.

**Instrucciones de formato:** según el tipo de audiencia (Formato A o Formato B) con todos los detalles de estructura, etiquetas de hablante, y secciones.

**Datos de la audiencia:** en JSON con todos los campos del encabezado.

**Participantes:** en JSON con roles y nombres asignados por el digitador.

**Transcripción:** contenido completo del Canvas.

---

## 18. Atajos de teclado completos

| Atajo | Acción |
|---|---|
| Tab | Aceptar sugerencia jurídica activa |
| Esc | Rechazar sugerencia jurídica activa |
| Ctrl+1 a Ctrl+0 | Insertar frase estándar F01 a F10 |
| Ctrl+M | Insertar marcador en posición actual |
| Ctrl+Space | Pausar/reanudar transcripción en vivo |
| Ctrl+H | Cambiar hablante manualmente (abre selector rápido) |
| Ctrl+J | Scroll al final del Canvas (texto más reciente) |
| Ctrl+R | Reproducir audio del segmento donde está el cursor |
| Ctrl+Shift+R | Retroceder audio 5 segundos y reproducir |
| Ctrl+B | Negrita |
| Ctrl+I | Cursiva |
| Ctrl+Enter | Insertar separador de sección |
| Ctrl+F | Buscar texto en el Canvas |
| Ctrl+/ | Mostrar overlay con todos los atajos |

---

## 19. Seguridad y privacidad

- TLS 1.3 en todas las comunicaciones HTTP y WebSocket. Certificados con Let's Encrypt gestionados desde nginx.
- JWT con access token de 15 minutos y refresh token de 7 días almacenado en httpOnly cookie.
- Los archivos de audio almacenados en disco deben estar cifrados con AES-256-GCM. La clave se deriva de una variable de entorno.
- Eliminación automática de archivos de audio 30 días después de que el acta se haya exportado (período configurable).
- A Claude Sonnet 4 se envía solo el texto del Canvas, nunca el audio. Para máxima privacidad, la especificación prevé una alternativa con Llama 3.1 70B local vía vLLM.
- Todas las acciones significativas se registran en audit_log con usuario, IP, timestamp y detalle.
- Las variables sensibles (API keys, passwords, JWT secrets) van en el archivo .env, nunca en el código.
- Cumplimiento con la Ley N.° 29733 de Protección de Datos Personales del Perú.

---

## 20. Variables de entorno requeridas (.env)

```
# Base de datos
DATABASE_URL=postgresql+asyncpg://usuario:password@postgres:5432/judiscribe
POSTGRES_USER=judiscribe
POSTGRES_PASSWORD=...
POSTGRES_DB=judiscribe

# Redis
REDIS_URL=redis://redis:6379/0

# Deepgram
DEEPGRAM_API_KEY=...

# Anthropic (Claude Sonnet 4)
ANTHROPIC_API_KEY=...

# Hugging Face (Pyannote)
HF_TOKEN=...

# Autenticación
JWT_SECRET_KEY=...
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Audio
AUDIO_STORAGE_PATH=/app/audio_files
AUDIO_ENCRYPTION_KEY=...
AUDIO_RETENTION_DAYS=30

# Configuración general
ENVIRONMENT=production
CORS_ORIGINS=https://judiscribe.dominio.com
```

---

## 21. Dependencias exactas

### Backend (requirements.txt)

```
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
python-multipart>=0.0.9
sqlalchemy[asyncio]>=2.0.0
asyncpg>=0.29.0
alembic>=1.13.0
celery>=5.4.0
redis>=5.0.0
deepgram-sdk>=3.7.0
faster-whisper>=1.1.0
torch>=2.1.0
torchaudio>=2.1.0
pyannote.audio>=3.1.0
ffmpeg-python>=0.2.0
noisereduce>=3.0.0
pydub>=0.25.0
anthropic>=0.40.0
python-docx>=1.1.0
weasyprint>=62.0
python-Levenshtein>=0.25.0
jellyfish>=1.0.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.0
jiwer>=3.0.0
pydantic-settings>=2.0.0
httpx>=0.27.0
python-dotenv>=1.0.0
```

### Frontend (package.json — dependencias principales)

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@tiptap/react": "^2.6.0",
    "@tiptap/starter-kit": "^2.6.0",
    "@tiptap/extension-collaboration": "^2.6.0",
    "@tiptap/extension-placeholder": "^2.6.0",
    "socket.io-client": "^4.7.0",
    "wavesurfer.js": "^7.8.0",
    "zustand": "^4.5.0",
    "tailwindcss": "^3.4.0",
    "@headlessui/react": "^2.1.0",
    "lucide-react": "^0.400.0",
    "date-fns": "^3.6.0",
    "axios": "^1.7.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/react": "^18.3.0",
    "@types/node": "^20.14.0"
  }
}
```

---

## 22. Servicios Docker Compose

| Servicio | Imagen base | Puerto | GPU | Descripción |
|---|---|---|---|---|
| backend | python:3.11-slim | 8000 | No | FastAPI + Uvicorn, WebSocket gateway, lógica de negocio |
| frontend | node:20-alpine | 3000 | No | Next.js con Canvas TipTap |
| celery-worker | python:3.11-slim + CUDA | — | Sí | faster-whisper + Pyannote para batch |
| redis | redis:7-alpine | 6379 | No | Broker de Celery y caché |
| postgres | postgres:16-alpine | 5432 | No | Base de datos principal |
| nginx | nginx:alpine | 80, 443 | No | Reverse proxy, TLS termination |

El `docker-compose.override.yml` configura el soporte de GPU para el celery-worker usando NVIDIA Container Toolkit.

---

## 23. Hardware mínimo requerido

| Componente | Especificación | Justificación |
|---|---|---|
| CPU | 8 cores (i7 o Ryzen 7) | FastAPI async, procesamiento de audio |
| RAM | 32 GB DDR4 | faster-whisper + Pyannote en batch simultáneo |
| GPU | NVIDIA RTX 3060 12GB | faster-whisper large-v3 en int8 (~4GB) + Pyannote (~2GB) |
| SSD | 512 GB NVMe | Audio temporal, modelos ML, base de datos |
| Red | 50 Mbps estable | Streaming a Deepgram, descargas de modelos |
| SO | Ubuntu 22.04 LTS | Compatibilidad con Docker y CUDA |

Software adicional requerido: Docker 24+ con Docker Compose v2, NVIDIA Container Toolkit, CUDA 12.x.

---

## 24. Métricas de evaluación del sistema

### Cuantitativas

| Métrica | Objetivo | Herramienta |
|---|---|---|
| WER streaming | < 10% | jiwer |
| WER batch | < 8% | jiwer |
| WER post-LLM | < 6% | jiwer |
| DER diarización | < 20% | pyannote.metrics |
| Latencia streaming | < 3 segundos | measure_latency.py |
| RTF batch | < 0.15 | benchmark_full.py |
| Tiempo generación acta | < 10 min para 1h de audio | medición manual |
| Precisión diccionario | > 85% sugerencias aceptadas | tracking en BD |

### Scripts de evaluación

La carpeta `evaluation/scripts/` contiene: `compute_wer.py` (calcula WER comparando output del sistema vs. transcripción manual de referencia usando jiwer), `compute_der.py` (calcula DER usando pyannote.metrics), `measure_latency.py` (mide latencia promedio habla-a-texto), `benchmark_full.py` (ejecuta todos los benchmarks y genera reporte). La carpeta `evaluation/corpus/` contiene las audiencias de prueba con audio WAV y transcripciones de referencia.

---

## 25. Funcionalidades específicas del dashboard

El dashboard principal muestra la lista de audiencias del digitador con:
- Filtros por rango de fechas, juzgado, tipo de audiencia y estado
- Búsqueda por número de expediente
- Indicadores de estado con colores: verde=finalizada, amarillo=en revisión, azul=en curso, gris=pendiente
- Contadores: audiencias del día, pendientes de revisión, actas por aprobar
- El dashboard debe cargar en menos de 2 segundos

---

## 26. Reconexión automática WebSocket

Si la conexión WebSocket se pierde, el sistema reintenta automáticamente cada 2 segundos hasta 10 intentos. Si la reconexión tiene éxito antes de 15 segundos, el audio del período de corte se almacena en un buffer local y se envía al reconectar, de modo que no haya pérdida visible de transcripción. Si los 10 intentos fallan, el sistema cambia a modo offline: sigue grabando el audio localmente, y al recuperar la conexión dispara el pipeline batch sobre los segmentos perdidos.

---

## 27. Funcionalidad de subida de audio pregrabado

El digitador puede subir un archivo de audio (formatos: wav, mp3, m4a, ogg) para procesar audiencias que no se transcribieron en vivo. Al subir el archivo, el sistema ejecuta: transcripción con faster-whisper → diarización con Pyannote → alignment → generación del Canvas con toda la transcripción lista para revisión. El digitador entonces revisa, edita y genera el acta igual que en el flujo normal.

---

## 28. Detección automática de roles (Sprint 4)

Durante los primeros 3 minutos de transcripción, el sistema envía el texto a Claude Sonnet 4 con el prompt `role_detection.txt`. El objetivo es identificar quién es quién basándose en frases de auto-identificación (ej: "soy el fiscal...", "representando a la defensa..."). Claude propone asignaciones de rol que el digitador puede aceptar o modificar desde el panel de hablantes.

---

## 29. Vista de revisión batch (Sprint 5)

La vista de revisión (`/audiencia/[id]/revision`) muestra dos columnas lado a lado: la izquierda muestra la transcripción streaming original (lo que se vio en vivo), la derecha muestra la transcripción batch reprocesada con faster-whisper. Las diferencias se resaltan con color verde para mejoras y rojo para cambios. El digitador acepta propuestas selectivamente o en bloque.

---

## 30. Panel de administración (Sprint 5)

El panel de administración (solo accesible para el rol admin) incluye:
- Gestión de usuarios: crear, editar, activar/desactivar cuentas
- Diccionario jurídico: interfaz para agregar, editar y eliminar términos con sus variantes erróneas y categoría
- Configuración de keyterms: vista del ranking actual de términos más problemáticos
- Initial prompt: editor de texto para modificar el prompt judicial de faster-whisper
- Templates de audiencia: gestionar secciones predefinidas por tipo
- Frases estándar: gestionar el catálogo global de frases
- Template del acta: configurar encabezado, membrete y márgenes del documento exportado

---

## 31. Orden de implementación por sprints

### Sprint 1 — Semanas 1 y 2: Base del sistema + transcripción streaming

El objetivo es que al finalizar, el digitador pueda abrir el navegador, crear una audiencia, hablar por el micrófono y ver texto aparecer en el Canvas en tiempo real.

Funcionalidades a implementar: configuración completa de Docker Compose con los seis servicios, modelo de datos inicial con migraciones Alembic (audiencias, segmentos, usuarios), autenticación JWT completa, CRUD de audiencias, hook de captura de audio en el navegador con MediaRecorder API, WebSocket gateway en backend, servicio Deepgram streaming con conexión persistente, pipeline de retorno del texto al Canvas, Canvas básico en modo visualización (solo append, sin edición), persistencia de segmentos en PostgreSQL, grabación paralela del audio completo en WAV.

Criterio de aceptación: latencia menor a 3 segundos, diarización básica visible, segmentos guardados en BD.

### Sprint 2 — Semanas 3 y 4: Canvas editable + hablantes + audio vinculado

El objetivo es que el digitador pueda editar el texto, ver hablantes con colores y roles, y reproducir cualquier segmento de audio.

Funcionalidades: Canvas en modo edición completa con TipTap, regla de no-sobreescritura (editado_por_usuario), texto provisional vs. confirmado con ProvisionalMark, etiquetas de hablante con SpeakerNode y colores, panel de hablantes con dropdown de roles, propagación de roles a todo el Canvas, reproductor de audio con wavesurfer.js, click-to-play desde cualquier segmento, timestamps a nivel de palabra en palabras_json, barra de estado, catálogo de 10 frases estándar con atajos Ctrl+[1-0], templates de secciones por tipo de audiencia, formulario de encabezado con todos los campos del acta, selector de fuente de audio.

### Sprint 3 — Semanas 5 y 6: Diccionario jurídico + sugerencias + atajos

El objetivo es que el sistema sugiera correcciones automáticas y el digitador trabaje a máxima velocidad.

Funcionalidades: diccionario jurídico de 500+ términos en JSON, motor de fuzzy matching con Levenshtein y comparación fonética, sugerencias inline con SuggestionPlugin (subrayado naranja + popover), aceptar con Tab / rechazar con Esc, keyterm prompting dinámico basado en ranking de errores, indicador de baja confianza con LowConfidenceMark, marcadores con Ctrl+M y BookmarkNode, panel de marcadores, panel de diccionario con búsqueda, todos los atajos de teclado registrados globalmente con KeyboardShortcuts.tsx, etiquetas de hablante específicas del Poder Judicial (15 roles), indicador de prioridad de transcripción por hablante, botón "Pausa inteligente".

### Sprint 4 — Semanas 7 y 8: Pipeline batch + generación del acta

El objetivo es que al finalizar la audiencia el sistema reprocese con máxima precisión y genere el acta oficial.

Funcionalidades: tarea Celery de pipeline batch completo (faster-whisper + Pyannote + alignment), merge inteligente que respeta ediciones del digitador, vista de propuestas de mejora lado a lado, detección automática de roles con Claude, botón "Generar Acta" con selector de formato, prompt de acta optimizado con los dos formatos reales, ActaEditor (TipTap separado para el acta), versionado de actas, estados del acta (borrador → en_revision → aprobada → exportada).

### Sprint 5 — Semanas 9 y 10: Exportación + gestión documental + evaluación

El objetivo es que el acta exportada sea indistinguible del formato oficial del Poder Judicial.

Funcionalidades: exportación Word Formato A (juzgado unipersonal) y Formato B (sala de apelaciones) con python-docx, exportación PDF con weasyprint, firma digital placeholder compatible con SINOE, metadatos del documento .docx, dashboard completo con filtros y contadores, vista de revisión batch con diff visual, historial de versiones con diff y reversión, subida de audio pregrabado, auditoría completa en audit_log, reconexión automática con buffer de audio, scripts de evaluación (WER, DER, latencia), panel de administración, documentación completa.

---

## 32. Reglas absolutas del sistema (nunca violar)

1. **El Canvas nunca sobreescribe ediciones del digitador.** Si `editado_por_usuario=true`, ningún proceso automático toca ese segmento: ni Deepgram, ni el batch, ni el LLM.

2. **El LLM nunca inventa contenido.** Claude Sonnet 4 solo reformatea, corrige estilo y estructura. Si hay vacíos en la transcripción, escribe `[SEGMENTO INAUDIBLE]`.

3. **Todo texto está vinculado al audio.** Cada segmento tiene `timestamp_inicio` y `timestamp_fin`. Cada palabra tiene su timestamp individual en `palabras_json`.

4. **El digitador siempre tiene la última palabra.** Ninguna operación automática se ejecuta sin posibilidad de revisión y reversión.

5. **La privacidad es prioritaria.** Datos judiciales son sensibles. Cifrado en tránsito y en reposo. A la API de Claude solo se envía texto, nunca audio.

6. **El sistema funciona offline para funciones críticas.** Si se pierde la conexión durante el streaming, el audio se graba localmente y se procesa en batch al reconectar. La edición del Canvas y la exportación funcionan sin internet.