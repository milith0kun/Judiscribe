# JudiScribe — Contexto del Proyecto

## Qué es
Sistema web de transcripción judicial en tiempo real para el Distrito Judicial de Cusco, Perú.
Audio → Deepgram Nova-3 → Canvas TipTap → Edición → Generación de Acta con Claude Sonnet 4.

## Stack
- **Backend**: FastAPI 0.115+, SQLAlchemy async + asyncpg, PostgreSQL 16, Redis 7, Celery, Alembic
- **Frontend**: Next.js 14, React 18, TypeScript, TipTap (ProseMirror), Zustand, Tailwind CSS, wavesurfer.js
- **IA**: Deepgram Nova-3 (streaming), faster-whisper large-v3 (batch), Pyannote 3.1 (diarización), Claude Sonnet 4 (actas)
- **Infra**: Docker Compose (6 servicios), nginx reverse proxy

## Comandos clave
```bash
# Levantar todo
cd judiscribe/backend && docker compose up -d

# Logs
docker compose logs -f backend
docker compose logs -f frontend

# Migraciones
docker compose exec backend alembic upgrade head
docker compose exec backend alembic revision --autogenerate -m "descripcion"

# Shell backend
docker compose exec backend python

# Reiniciar servicio individual
docker compose restart backend
docker compose restart frontend
```

## Estructura del proyecto
```
judiscribe/
├── backend/
│   ├── docker-compose.yml    # Orquestador principal
│   ├── .env                  # Variables (NO subir a git)
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic/              # Migraciones DB
│   └── app/
│       ├── main.py           # FastAPI app
│       ├── config.py         # Pydantic Settings
│       ├── database.py       # SQLAlchemy async
│       ├── api/              # REST endpoints
│       ├── ws/               # WebSocket handlers
│       ├── models/           # ORM (audiencia, segmento, usuario, hablante, marcador, frase_estandar)
│       ├── schemas/          # Pydantic request/response
│       ├── services/         # Lógica de negocio (deepgram_streaming, auth_service)
│       └── tasks/            # Celery (batch_process, generate_acta)
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── app/              # Next.js pages (dashboard, login, audiencia/[id], audiencia/nueva)
        ├── components/       # Canvas, panels, audio, speakers, markers, shortcuts
        ├── hooks/            # useDeepgramSocket, useAudioCapture
        ├── stores/           # Zustand (authStore, canvasStore)
        ├── extensions/       # TipTap: SpeakerNode, BookmarkNode, LowConfidenceMark, SegmentMark
        ├── lib/              # api.ts (axios)
        └── types/            # TypeScript interfaces
```

## Reglas absolutas
1. **No sobreescribir ediciones**: Si `editado_por_usuario=true`, ningún proceso automático toca ese segmento
2. **LLM no inventa**: Si hay vacíos → `[SEGMENTO INAUDIBLE]`
3. **Todo vinculado a audio**: Cada segmento tiene `timestamp_inicio`/`timestamp_fin`
4. **Digitador tiene control**: Cualquier propuesta automática se puede rechazar
5. **Privacidad**: Solo texto va a Claude, nunca audio

## Convenciones de código
- Backend: Python 3.11, type hints, async/await, f-strings
- Frontend: TypeScript estricto, componentes funcionales con hooks, "use client" para interactividad
- Nombres en español para entidades del dominio (audiencia, segmento, hablante, marcador)
- Nombres de variables del dominio en español, nombres técnicos en inglés
- Mensajes de commit: `tipo: descripción` (feat, fix, chore, docs)

## Referencia completa
Ver `Readme.md` en la raíz del Proyecto Tesis para la especificación técnica completa (32 secciones).
