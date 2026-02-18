# Flujo del Sistema JudiScribe

Este documento describe el flujo completo del sistema, desde el login hasta la generación del acta.

## 1. Inicio de Sesión (Login)

### Frontend
```
usuario → /login
  ↓
LoginForm (con Suspense)
  ↓
useAuthStore.login()
  ↓
POST /api/auth/login
```

### Backend
```
POST /api/auth/login
  ↓
auth.py → authenticate_user()
  ↓
Verificar email + password
  ↓
Generar access_token + refresh_token
  ↓
Retornar TokenResponse
```

### Flujo de Datos
1. Usuario ingresa credenciales en `/login`
2. Frontend envía POST a `{BACKEND_URL}/api/auth/login`
3. Backend verifica credenciales en tabla `usuarios`
4. Backend genera JWT token con sub (user_id) + rol
5. Frontend guarda token en localStorage
6. Frontend redirige a `/` (dashboard)

## 2. Protección de Rutas

### Frontend
```
App carga
  ↓
RootLayout → AuthProvider
  ↓
AuthProvider.initialize()
  ↓
Carga token de localStorage
  ↓
GET /api/auth/me (con token)
  ↓
Guarda usuario en authStore
```

### AuthGuard
```
Página protegida renderiza
  ↓
AuthGuard verifica usuario
  ↓
¿Hay token? NO → redirect /login
  ↓
¿Hay usuario? NO → esperar carga
  ↓
¿Rol correcto? NO → redirect /
  ↓
SÍ → Renderizar contenido
```

## 3. Dashboard Principal

### Frontend (`/`)
```
AuthGuard verifica acceso
  ↓
DashboardPage carga
  ↓
GET /api/audiencias
  ↓
Mostrar lista + stats
```

### Acciones Disponibles
- **Nueva Audiencia** → `/audiencia/nueva`
- **Iniciar Demo** → `/audiencia/demo`
- **Abrir Audiencia** → `/audiencia/[id]`
- **Logout** → logout() + redirect `/login`

## 4. Nueva Audiencia

### Frontend (`/audiencia/nueva`)
```
Formulario de creación
  ↓
POST /api/audiencias
  {
    expediente, juzgado, tipo_audiencia,
    fecha, hora_inicio, sala, etc.
  }
  ↓
Retorna audiencia creada
  ↓
Redirect /audiencia/[id]
```

### Backend
```
POST /api/audiencias
  ↓
Crear registro en tabla audiencias
  ↓
estado = "pendiente"
  ↓
created_by = usuario actual
  ↓
Retornar audiencia
```

## 5. Transcripción en Tiempo Real

### Modo Demo (`/audiencia/demo`)
```
Página carga
  ↓
useDeepgramSocket.connect()
  ↓
WebSocket → Deepgram Nova-3
  ↓
useAudioCapture.start()
  ↓
Captura micrófono → envía a Deepgram
  ↓
Deepgram retorna transcripción
  ↓
TranscriptionCanvas muestra texto
```

### Modo Real (`/audiencia/[id]`)
```
Carga audiencia desde API
  ↓
GET /api/audiencias/{id}
  ↓
GET /api/audiencias/{id}/segmentos
  ↓
GET /api/audiencias/{id}/hablantes
  ↓
GET /api/audiencias/{id}/marcadores
  ↓
Conectar WebSocket a Deepgram
  ↓
Capturar audio → transcribir
  ↓
Guardar segmentos en BD
```

## 6. Canvas de Transcripción

### Componentes
```
TranscriptionCanvas (TipTap editor)
  ├── SpeakerNode (identificador de hablante)
  ├── BookmarkNode (marcadores)
  ├── LowConfidenceMark (texto de baja confianza)
  └── SegmentMark (vinculación a audio)
```

### Flujo de Segmentos
```
Deepgram envía transcripción
  ↓
canvasStore.agregarSegmento()
  ↓
POST /api/audiencias/{id}/segmentos
  {
    texto, timestamp_inicio, timestamp_fin,
    confianza, hablante_id, fuente
  }
  ↓
Editor TipTap inserta nodo
  ↓
Usuario puede editar (marca editado_por_usuario=true)
```

### Regla Absoluta
**Si `editado_por_usuario = true` → NUNCA modificar automáticamente**

## 7. Gestión de Hablantes

### Frontend
```
PanelHablantes
  ↓
GET /api/audiencias/{id}/hablantes
  ↓
Mostrar lista de hablantes detectados
  ↓
Usuario asigna rol (Juez, Fiscal, etc.)
  ↓
PUT /api/audiencias/{id}/hablantes/{id}
```

### Backend
```
Tabla hablantes:
  - speaker_label (SPEAKER_00, SPEAKER_01)
  - alias (asignado por usuario)
  - rol (juez, fiscal, defensa, etc.)
  - audiencia_id
```

## 8. Marcadores Temporales

### Frontend
```
Usuario presiona Ctrl+M
  ↓
PanelMarcadores.crearMarcadorRapido()
  ↓
POST /api/audiencias/{id}/marcadores
  {
    timestamp: elapsedSeconds,
    tipo: "revision",
    nota: null
  }
  ↓
Click en marcador → saltar a timestamp
```

### Tipos de Marcadores
- `revision` - Punto a revisar
- `importante` - Momento importante
- `error` - Error detectado
- `pregunta` - Pregunta del juez

## 9. Frases Estándar

### Frontend
```
AtajosFrases
  ↓
GET /api/frases
  ↓
Usuario presiona F1-F10
  ↓
Inserta frase en cursor actual
```

### Backend
```
Tabla frases_estandar:
  - numero_atajo (0-9)
  - codigo (F01, F02, etc.)
  - texto (frase completa)
  - categoria (identificación, desarrollo, cierre)
  - usuario_id (NULL = sistema, UUID = usuario)
```

## 10. Generación de Acta

### Frontend
```
Usuario click "Generar Acta"
  ↓
POST /api/audiencias/{id}/generar-acta
  ↓
Backend procesa (Celery task)
  ↓
Poll GET /api/audiencias/{id}/acta/status
  ↓
Cuando ready → descargar
```

### Backend (Celery Task)
```
generate_acta.py
  ↓
1. Obtener todos los segmentos
  ↓
2. Ordenar por timestamp
  ↓
3. Agrupar por hablante
  ↓
4. Enviar a Claude Sonnet 4
   "Formatea esto como acta oficial del PJ Perú"
  ↓
5. Claude retorna texto estructurado
  ↓
6. Generar DOCX con python-docx
  ↓
7. Generar PDF con weasyprint
  ↓
8. Guardar en tabla actas
```

## 11. Procesamiento Batch (Post-Audiencia)

### Trigger
```
Usuario sube audio grabado
  ↓
POST /api/audiencias/{id}/procesar-audio
  {
    audio_file: File
  }
```

### Flujo Batch
```
batch_process.py (Celery)
  ↓
1. Guardar audio en AUDIO_STORAGE_PATH
  ↓
2. Diarización con Pyannote Audio 3.1
   → Detectar quién habla y cuándo
  ↓
3. Transcripción con faster-whisper large-v3
   → Transcribir cada segmento
  ↓
4. Crear registros en tabla segmentos
   editado_por_usuario = false
  ↓
5. Crear registros en tabla hablantes
  ↓
6. Actualizar estado audiencia → "transcrita"
```

## 12. Estados de Audiencia

```
pendiente → Usuario creó audiencia, no ha iniciado
  ↓
en_curso → Transcripción en tiempo real activa
  ↓
transcrita → Transcripción completada, sin editar
  ↓
en_revision → Usuario está revisando/editando
  ↓
finalizada → Acta generada y aprobada
```

## 13. Arquitectura de Datos

### Base de Datos (PostgreSQL)

```
usuarios
  ├── id (UUID, PK)
  ├── email (unique)
  ├── password_hash
  ├── nombre
  ├── rol (admin, transcriptor, supervisor)
  └── activo

audiencias
  ├── id (UUID, PK)
  ├── expediente
  ├── juzgado
  ├── tipo_audiencia
  ├── estado
  ├── audio_path
  ├── created_by (FK → usuarios)
  └── timestamps

segmentos
  ├── id (UUID, PK)
  ├── audiencia_id (FK)
  ├── texto
  ├── timestamp_inicio
  ├── timestamp_fin
  ├── confianza (0-1)
  ├── hablante_id (FK)
  ├── editado_por_usuario (boolean)
  └── fuente (deepgram_streaming, faster_whisper, manual)

hablantes
  ├── id (UUID, PK)
  ├── audiencia_id (FK)
  ├── speaker_label (SPEAKER_00, etc.)
  ├── alias (nombre asignado)
  └── rol (juez, fiscal, defensa, etc.)

marcadores
  ├── id (UUID, PK)
  ├── audiencia_id (FK)
  ├── timestamp
  ├── tipo
  └── nota

frases_estandar
  ├── id (UUID, PK)
  ├── numero_atajo (0-9)
  ├── codigo (F01, etc.)
  ├── texto
  ├── categoria
  └── usuario_id (NULL o FK)
```

### Caché (Redis)

```
session:{user_id} → Datos de sesión
transcription:{audiencia_id} → Buffer de transcripción en curso
websocket:{connection_id} → Estado de conexiones WS
```

## 14. APIs y Endpoints

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/refresh` - Renovar token
- `GET /api/auth/me` - Datos usuario actual
- `POST /api/auth/register` - Crear usuario (admin only)

### Audiencias
- `GET /api/audiencias` - Listar audiencias
- `POST /api/audiencias` - Crear audiencia
- `GET /api/audiencias/{id}` - Obtener audiencia
- `PUT /api/audiencias/{id}` - Actualizar audiencia
- `DELETE /api/audiencias/{id}` - Eliminar audiencia

### Segmentos
- `GET /api/audiencias/{id}/segmentos` - Listar segmentos
- `POST /api/audiencias/{id}/segmentos` - Crear segmento
- `PUT /api/audiencias/{id}/segmentos/{seg_id}` - Actualizar segmento
- `DELETE /api/audiencias/{id}/segmentos/{seg_id}` - Eliminar segmento

### Hablantes
- `GET /api/audiencias/{id}/hablantes` - Listar hablantes
- `POST /api/audiencias/{id}/hablantes` - Crear hablante
- `PUT /api/audiencias/{id}/hablantes/{hab_id}` - Actualizar hablante

### Marcadores
- `GET /api/audiencias/{id}/marcadores` - Listar marcadores
- `POST /api/audiencias/{id}/marcadores` - Crear marcador
- `DELETE /api/audiencias/{id}/marcadores/{mar_id}` - Eliminar marcador

### Frases
- `GET /api/frases` - Listar frases (sistema + usuario)
- `POST /api/frases` - Crear frase personalizada
- `PUT /api/frases/{id}` - Actualizar frase
- `DELETE /api/frases/{id}` - Eliminar frase

### Generación
- `POST /api/audiencias/{id}/generar-acta` - Generar acta
- `GET /api/audiencias/{id}/acta/status` - Estado de generación
- `GET /api/audiencias/{id}/acta/download` - Descargar acta

## 15. Configuración en Dokploy

### Variables de Entorno Críticas

**Backend:**
- `DATABASE_URL` - Conexión a PostgreSQL
- `REDIS_URL` - Conexión a Redis
- `DEEPGRAM_API_KEY` - API key de Deepgram
- `ANTHROPIC_API_KEY` - API key de Anthropic
- `JWT_SECRET_KEY` - Clave secreta para tokens
- `CORS_ORIGINS` - URL del frontend

**Frontend:**
- `NEXT_PUBLIC_API_URL` - URL del backend

### Paso 1: Configurar Variables

En Dokploy → Backend → Environment → Agregar todas las variables

### Paso 2: Redeploy

Redeploy backend y frontend con las nuevas variables

### Paso 3: Ejecutar Seed

```bash
# Dentro del contenedor del backend en Dokploy
python -m app.scripts.seed
```

O usar el script de configuración:

```bash
bash app/scripts/setup_produccion.sh
```

### Paso 4: Verificar

```bash
# Verificar usuarios en BD
python -m app.scripts.verificar_bd
```

---

**Última actualización:** Febrero 2026
