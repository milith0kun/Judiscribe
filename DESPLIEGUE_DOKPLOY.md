# Guía Rápida de Despliegue en Dokploy

## ✅ Checklist Pre-Despliegue

- [x] Código subido a GitHub
- [x] Archivos sensibles en `.gitignore`
- [ ] Variables de entorno configuradas en Dokploy
- [ ] Base de datos PostgreSQL creada en Dokploy
- [ ] Redis creado en Dokploy
- [ ] Backend deployado (seed automático se ejecutará al iniciar)
- [ ] Frontend deployado

---

## 🚀 Paso a Paso

### 1. Crear Base de Datos en Dokploy

**PostgreSQL:**
1. En Dokploy → Databases → New Database
2. Tipo: PostgreSQL 16
3. Nombre: `judiscribe-base-de-datos`
4. Guardar credenciales generadas
5. Esperar a que esté "Running" (estado verde)

**Redis:**
1. En Dokploy → Databases → New Database
2. Tipo: Redis 7
3. Nombre: `judiscribe-redis`
4. Guardar credenciales generadas
5. Esperar a que esté "Running"

### 2. Configurar Variables de Entorno - Backend

En Dokploy → Applications → judiscribe-backend → Environment

**COPIAR Y PEGAR ESTO:**

```bash
DATABASE_URL=postgresql+asyncpg://postgres:[TU_PASSWORD]@[TU_HOST]:5432/postgres
REDIS_URL=redis://default:[TU_PASSWORD]@[TU_HOST]:6379/0
DEEPGRAM_API_KEY=[TU_DEEPGRAM_API_KEY]
DEEPGRAM_MODEL=nova-3
ANTHROPIC_API_KEY=[TU_ANTHROPIC_API_KEY]
ANTHROPIC_MODEL=claude-3-5-haiku-20241022
HF_TOKEN=[TU_HUGGINGFACE_TOKEN]
JWT_SECRET_KEY=[GENERAR_CON_openssl_rand_-hex_32]
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=7
AUDIO_STORAGE_PATH=/app/audio_files
AUDIO_ENCRYPTION_KEY=change_this_to_a_32_byte_hex_key
AUDIO_RETENTION_DAYS=30
ENVIRONMENT=production
CORS_ORIGINS=[URL_DE_TU_FRONTEND]
BACKEND_URL=[URL_DE_TU_BACKEND]
```

**⚠️ IMPORTANTE:** Reemplaza:
- `[TU_PASSWORD]` con las contraseñas de PostgreSQL y Redis de Dokploy
- `[TU_HOST]` con los hosts internos de Dokploy
- `[TU_DEEPGRAM_API_KEY]` con tu API key de Deepgram (obtener en https://console.deepgram.com)
- `[TU_ANTHROPIC_API_KEY]` con tu API key de Anthropic (obtener en https://console.anthropic.com)
- `[TU_HUGGINGFACE_TOKEN]` con tu token de Hugging Face (obtener en https://huggingface.co/settings/tokens)
- `[GENERAR_CON_openssl_rand_-hex_32]` con un secret generado: `openssl rand -hex 32`
- `[URL_DE_TU_FRONTEND]` con la URL completa del frontend (ej: `https://judiscribe-frontend-xxx.traefik.me`)
- `[URL_DE_TU_BACKEND]` con la URL completa del backend (ej: `https://judiscribe-backend-xxx.traefik.me`)

**📝 NOTA:** Los valores reales de las API keys están en el archivo `.env produccion` que NO se sube a GitHub por seguridad.

### 3. Configurar Variables de Entorno - Frontend

En Dokploy → Applications → judiscribe-frontend → Environment

```bash
NEXT_PUBLIC_API_URL=[URL_DE_TU_BACKEND]
```

**Ejemplo:**
```bash
NEXT_PUBLIC_API_URL=https://judiscribe-backend-sw8ukw-7e16e3-72-60-114-137.traefik.me
```

### 4. Redeploy las Aplicaciones

1. **Backend primero:**
   - Dokploy → Applications → judiscribe-backend
   - Click en "Redeploy"
   - Esperar a que termine (ver logs en tiempo real)
   - Verificar que el estado sea "Running" (verde)

2. **Frontend después:**
   - Dokploy → Applications → judiscribe-frontend
   - Click en "Redeploy"
   - Esperar a que termine
   - Verificar que el estado sea "Running"

### 5. ✨ Seed Automático

**¡No necesitas hacer nada!** El backend puebla automáticamente la base de datos al iniciar.

Cuando el backend arranca en Dokploy:
- ✅ Detecta si la base de datos está vacía
- ✅ Crea automáticamente los usuarios (admin + digitador)
- ✅ Crea las 10 frases estándar del sistema
- ✅ Registra todo en los logs

**Ver los logs en Dokploy:**
1. Dokploy → Applications → judiscribe-backend
2. Click en "Logs"
3. Busca líneas como:
   ```
   📦 Base de datos vacía. Iniciando seed automático...
   ✅ Usuario admin creado
   ✅ Usuario digitador creado
   🎉 Seed automático completado
   ```

**Verificación manual (opcional):**

Si quieres verificar manualmente, abre el terminal del backend:
```bash
python -m app.scripts.verificar_bd
```

### 6. Verificar el Deployment

**Test 1: Backend API**
```bash
curl https://[TU_BACKEND_URL]/docs
```
✅ Deberías ver la documentación Swagger UI

**Test 2: Login**
```bash
curl -X POST https://[TU_BACKEND_URL]/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"digitador@judiscribe.pe","password":"Digitador2024!"}'
```
✅ Deberías recibir un JSON con `access_token`

**Test 3: Frontend**

Abre en el navegador: `https://[TU_FRONTEND_URL]`

✅ Deberías ver la página de login

**Test 4: Login Completo**

1. Ve a la página de login
2. Click en "Digitador de Prueba"
3. Click en "Iniciar Sesión"
4. ✅ Deberías entrar al dashboard

---

## 🔧 Troubleshooting

### Error: "Database connection failed"

**Causa:** `DATABASE_URL` incorrecta

**Solución:**
1. Ve a Dokploy → Databases → judiscribe-base-de-datos
2. Copia la "Internal Connection String"
3. Modifica para usar `postgresql+asyncpg://` en lugar de `postgresql://`
4. Actualiza `DATABASE_URL` en backend → Environment
5. Redeploy backend

### Error: "CORS policy blocked"

**Causa:** `CORS_ORIGINS` no incluye la URL del frontend

**Solución:**
1. Copia la URL exacta del frontend desde Dokploy
2. Actualiza `CORS_ORIGINS` en backend → Environment
3. Asegúrate de incluir `https://` y sin `/` al final
4. Redeploy backend

### Error: "Cannot connect to backend"

**Causa:** `NEXT_PUBLIC_API_URL` incorrecta en frontend

**Solución:**
1. Copia la URL exacta del backend desde Dokploy
2. Actualiza `NEXT_PUBLIC_API_URL` en frontend → Environment
3. Redeploy frontend

### Error: "useSearchParams needs Suspense boundary"

**Causa:** Ya está corregido en el código actual

**Solución:** Si aún ocurre, verifica que tengas la última versión del código:
```bash
git pull origin main
# Redeploy en Dokploy
```

### Error: "No users in database"

**Causa:** Seed no se ha ejecutado

**Solución:**
```bash
# En el terminal del backend en Dokploy
python -m app.scripts.seed
```

### Error: Build fallido en Dokploy

**Revisar logs:**
1. Dokploy → Applications → judiscribe-frontend (o backend)
2. Click en "Logs"
3. Buscar líneas con "ERROR" o "failed"

**Causa común:** Variables de entorno faltantes

**Solución:** Asegúrate de que TODAS las variables requeridas estén configuradas

---

## 📋 Comandos Útiles en Producción

**Dentro del contenedor del backend:**

```bash
# Verificar estado de la base de datos
python -m app.scripts.verificar_bd

# Ejecutar seed (crear usuarios)
python -m app.scripts.seed

# Ver usuarios existentes
python -c "
import asyncio
from app.database import async_session
from app.models.usuario import Usuario
from sqlalchemy import select

async def main():
    async with async_session() as db:
        result = await db.execute(select(Usuario.email, Usuario.rol))
        for email, rol in result:
            print(f'{email} - {rol}')

asyncio.run(main())
"

# Ver logs de la aplicación
tail -f /var/log/app.log  # si existe
```

---

## 🎯 URLs de Referencia

Después del deployment, guarda estas URLs:

- **Frontend:** `https://judiscribe-frontend-[ID].traefik.me`
- **Backend:** `https://judiscribe-backend-[ID].traefik.me`
- **API Docs:** `https://judiscribe-backend-[ID].traefik.me/docs`
- **PostgreSQL (interno):** `judiscribe-base-de-datos-[ID]:5432`
- **Redis (interno):** `judiscribe-redis-[ID]:6379`

---

## ✅ Checklist Post-Despliegue

- [ ] Backend responde en `/docs`
- [ ] Login con curl retorna token
- [ ] Frontend carga la página de login
- [ ] Login desde UI funciona
- [ ] Dashboard muestra información
- [ ] Usuarios creados verificados
- [ ] Frases estándar cargadas

---

**Si todo está ✅, el sistema está listo para usar!**

Ver [FLUJO_SISTEMA.md](FLUJO_SISTEMA.md) para entender cómo funciona el sistema completo.

Ver [CREDENCIALES.md](CREDENCIALES.md) para usuarios y contraseñas.

---

**Última actualización:** Febrero 2026
