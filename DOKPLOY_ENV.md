# Configuración de Variables de Entorno en Dokploy

⚠️ **IMPORTANTE**: Los archivos `.env produccion` NO deben estar en el repositorio Git por razones de seguridad. Todas las variables de entorno deben configurarse directamente en Dokploy.

## Backend - Variables de Entorno

En la configuración de la aplicación **backend** en Dokploy, agrega las siguientes variables de entorno:

```bash
# --- Base de datos ---
DATABASE_URL=postgresql+asyncpg://postgres:5eewwwv6avllprmd@judiscribe-base-de-datos-y6sd64:5432/postgres

# --- Redis ---
REDIS_URL=redis://default:pgavyzb9zn1xylr8@judiscribe-base-de-datos-qigub7:6379/0

# --- Deepgram ---
DEEPGRAM_API_KEY=<TU_CLAVE_DEEPGRAM>
DEEPGRAM_MODEL=nova-3

# --- Anthropic ---
ANTHROPIC_API_KEY=<TU_CLAVE_ANTHROPIC>
ANTHROPIC_MODEL=claude-3-5-haiku-20241022

# --- Hugging Face ---
HF_TOKEN=<TU_TOKEN_HF>

# --- JWT ---
JWT_SECRET_KEY=6549286318c3fd9415ef5d42b03f82725efab000c574842151493dd1fa41b4dc
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=7

# --- Audio ---
AUDIO_STORAGE_PATH=/app/audio_files
AUDIO_ENCRYPTION_KEY=change_this_to_a_32_byte_hex_key
AUDIO_RETENTION_DAYS=30

# --- General ---
ENVIRONMENT=production
CORS_ORIGINS=https://judiscribe-frontend-fbtgtl-3858ff-72-60-114-137.traefik.me
BACKEND_URL=https://judiscribe-backend-sw8ukw-7e16e3-72-60-114-137.traefik.me
```

## Frontend - Variables de Entorno

En la configuración de la aplicación **frontend** en Dokploy, agrega la siguiente variable:

```bash
NEXT_PUBLIC_API_URL=https://judiscribe-backend-sw8ukw-7e16e3-72-60-114-137.traefik.me
```

## Cómo Configurar en Dokploy

### Opción 1: Interfaz Web (Recomendado)

1. Accede a tu panel de Dokploy
2. Selecciona la aplicación (backend o frontend)
3. Ve a la pestaña "Environment"
4. Agrega cada variable en el formato `NOMBRE=valor`
5. Guarda los cambios
6. Redeploy la aplicación

### Opción 2: CLI de Dokploy

```bash
# Para el backend
dokploy env:set judiscribe-backend DATABASE_URL="postgresql+asyncpg://..."
dokploy env:set judiscribe-backend DEEPGRAM_API_KEY="..."
# ... etc

# Para el frontend
dokploy env:set judiscribe-frontend NEXT_PUBLIC_API_URL="https://..."
```

## Ejecutar Seed en Producción

Después de configurar las variables de entorno y desplegar el backend, necesitas crear los usuarios iniciales:

1. Accede al contenedor del backend en Dokploy
2. Ejecuta el script de seed:

```bash
python -m app.scripts.seed
```

Esto creará:
- Usuario admin: `admin@judiscribe.pe` / `JudiScribe2024!`
- Usuario digitador: `digitador@judiscribe.pe` / `Digitador2024!`

## Verificar Configuración

### Backend

Verifica que el backend esté corriendo correctamente:

```bash
curl https://judiscribe-backend-sw8ukw-7e16e3-72-60-114-137.traefik.me/docs
```

Deberías ver la documentación de la API (Swagger UI).

### Frontend

Accede al frontend en:
```
https://judiscribe-frontend-fbtgtl-3858ff-72-60-114-137.traefik.me
```

Deberías ser redirigido a la página de login.

### Test de Login

Prueba el login con curl:

```bash
curl -X POST https://judiscribe-backend-sw8ukw-7e16e3-72-60-114-137.traefik.me/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"digitador@judiscribe.pe","password":"Digitador2024!"}'
```

Deberías recibir un token JWT válido.

## Troubleshooting

### Error: "Database connection failed"
- Verifica que `DATABASE_URL` esté correctamente configurada
- Verifica que la base de datos PostgreSQL esté corriendo
- Revisa los logs del backend

### Error: "CORS policy"
- Verifica que `CORS_ORIGINS` en el backend incluya la URL del frontend
- Asegúrate de que las URLs sean exactamente iguales (con https://)

### Error: "Cannot connect to backend"
- Verifica que `NEXT_PUBLIC_API_URL` en el frontend apunte al backend correcto
- Verifica que el backend esté corriendo y accesible

### Error: "JWT token invalid"
- Verifica que `JWT_SECRET_KEY` sea la misma en todas las instancias del backend
- Los tokens no son válidos entre diferentes secrets

## Seguridad

⚠️ **NUNCA** commitees las siguientes claves al repositorio:
- `DEEPGRAM_API_KEY`
- `ANTHROPIC_API_KEY`
- `HF_TOKEN`
- `JWT_SECRET_KEY`
- Contraseñas de base de datos
- API keys de cualquier servicio

✅ **Buenas prácticas:**
- Usa secretos diferentes para desarrollo y producción
- Rotaciona las claves regularmente
- Usa variables de entorno en Dokploy
- Mantén respaldos seguros de las claves en un gestor de contraseñas

## Actualizar Variables

Si necesitas cambiar alguna variable:

1. Actualiza la variable en Dokploy
2. Redeploy la aplicación afectada
3. Si cambiaste `JWT_SECRET_KEY`, todos los usuarios deberán volver a iniciar sesión

---

**Última actualización:** Febrero 2026
