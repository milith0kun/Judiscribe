# 🔧 Solución: No Puedo Iniciar Sesión en Dokploy

## 🎯 Problema
No puedes iniciar sesión porque **la base de datos de producción en Dokploy está vacía** (sin usuarios).

## ✅ Solución Paso a Paso

### Paso 1: Acceder al Backend en Dokploy

1. Ve a **Dokploy** → **Applications** → **judiscribe-backend**
2. Busca la pestaña **"Terminal"** o **"Console"**
3. Haz click para abrir el terminal del contenedor

### Paso 2: Verificar Estado de la Base de Datos

En el terminal del contenedor del backend, ejecuta:

```bash
python -m app.scripts.verificar_bd
```

**Deberías ver algo así:**

```
============================================================
Estado de la Base de Datos
============================================================

📊 Estadísticas:
   • Usuarios: 0
   • Frases estándar: 0
   • Audiencias: 0

⚠️  No hay usuarios en el sistema
```

Si ves `Usuarios: 0`, **necesitas ejecutar el seed**.

### Paso 3: Ejecutar el Seed

Ejecuta en el mismo terminal:

```bash
python -m app.scripts.seed
```

**Deberías ver:**

```
✅ Seed completed!
   • Created 2 users (admin, digitador)
   • Created 10 standard phrases (F01-F10)
```

### Paso 4: Verificar Nuevamente

```bash
python -m app.scripts.verificar_bd
```

**Ahora deberías ver:**

```
============================================================
Estado de la Base de Datos
============================================================

📊 Estadísticas:
   • Usuarios: 2
   • Frases estándar: 10
   • Audiencias: 0

👥 Usuarios en el sistema:
   • digitador@judiscribe.pe (Digitador de Audiencias) - transcriptor
   • admin@judiscribe.pe (Administrador del Sistema) - admin

✅ Sistema listo para usar
```

### Paso 5: Probar el Login

1. Ve a tu frontend en Dokploy: `https://judiscribe-frontend-[ID].traefik.me`
2. Haz click en **"Digitador de Prueba"**
3. Haz click en **"Iniciar Sesión"**
4. ✅ **Deberías entrar al dashboard**

---

## 🔍 Troubleshooting

### Error: "python: command not found"

El contenedor podría estar usando `python3`:

```bash
python3 -m app.scripts.seed
```

### Error: "No module named 'app'"

Asegúrate de estar en el directorio correcto:

```bash
cd /app
python -m app.scripts.seed
```

### Error: "Database connection failed"

Verifica que las **variables de entorno** estén configuradas en Dokploy.

#### Verificar Variables de Entorno en Dokploy:

1. Dokploy → Applications → judiscribe-backend → **Environment**
2. Asegúrate de que exista `DATABASE_URL`
3. Debe verse algo así:
   ```
   DATABASE_URL=postgresql+asyncpg://postgres:PASSWORD@judiscribe-base-de-datos-ID:5432/postgres
   ```

Si no existe o está mal, necesitas configurarla. Ver [DESPLIEGUE_DOKPLOY.md](DESPLIEGUE_DOKPLOY.md) sección 2.

### Error: "CORS policy blocked"

El frontend no puede conectarse al backend debido a CORS.

**Solución:**

1. Dokploy → Applications → judiscribe-backend → Environment
2. Verifica que exista `CORS_ORIGINS` con la URL de tu frontend:
   ```
   CORS_ORIGINS=https://judiscribe-frontend-[ID].traefik.me
   ```
3. **Redeploy el backend** después de cambiar

### Error: "Cannot connect to API"

El frontend no encuentra el backend.

**Solución:**

1. Dokploy → Applications → judiscribe-frontend → Environment
2. Verifica que exista `NEXT_PUBLIC_API_URL`:
   ```
   NEXT_PUBLIC_API_URL=https://judiscribe-backend-[ID].traefik.me
   ```
3. **Redeploy el frontend** después de cambiar

### Login dice "Credenciales inválidas"

Posibles causas:

**A) Base de datos vacía** → Ejecutar seed (Paso 2-3 arriba)

**B) Contraseña incorrecta** → Usar las credenciales exactas:
   - Email: `digitador@judiscribe.pe`
   - Contraseña: `Digitador2024!` (con mayúscula D y signo !)

**C) JWT_SECRET_KEY diferente** → Verificar en Environment del backend

---

## 📋 Checklist de Verificación

Marca cada uno cuando lo hayas verificado:

- [ ] Base de datos PostgreSQL está "Running" (verde) en Dokploy
- [ ] Redis está "Running" (verde) en Dokploy
- [ ] Backend está "Running" (verde) en Dokploy
- [ ] Frontend está "Running" (verde) en Dokploy
- [ ] `DATABASE_URL` configurada en backend → Environment
- [ ] `REDIS_URL` configurada en backend → Environment
- [ ] `DEEPGRAM_API_KEY` configurada en backend → Environment
- [ ] `ANTHROPIC_API_KEY` configurada en backend → Environment
- [ ] `JWT_SECRET_KEY` configurada en backend → Environment
- [ ] `CORS_ORIGINS` configurada en backend → Environment
- [ ] `NEXT_PUBLIC_API_URL` configurada en frontend → Environment
- [ ] Seed ejecutado en el backend (`python -m app.scripts.seed`)
- [ ] Base de datos tiene 2 usuarios (verificado con `verificar_bd`)
- [ ] Puedo acceder a `/docs` del backend desde el navegador
- [ ] El frontend carga la página de login

---

## 🧪 Pruebas Manual Paso a Paso

### 1. Verificar Backend API

Abre en el navegador:
```
https://judiscribe-backend-[TU_ID].traefik.me/docs
```

✅ **Esperado:** Ver la documentación Swagger UI con todos los endpoints

❌ **Si falla:** El backend no está funcionando. Revisa los logs en Dokploy.

### 2. Probar Login con cURL

```bash
curl -X POST https://judiscribe-backend-[TU_ID].traefik.me/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"digitador@judiscribe.pe","password":"Digitador2024!"}'
```

✅ **Esperado:** Recibir JSON con `access_token`:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer"
}
```

❌ **Si recibes `{"detail":"Invalid credentials"}`:** 
   - La base de datos no tiene usuarios → Ejecutar seed

❌ **Si recibes error de conexión:**
   - Las variables de entorno están mal configuradas

### 3. Verificar Frontend

Abre en el navegador:
```
https://judiscribe-frontend-[TU_ID].traefik.me/login
```

✅ **Esperado:** Ver la página de login con los botones de acceso rápido

❌ **Si no carga:** 
   - Revisa los logs del frontend en Dokploy
   - Verifica que `NEXT_PUBLIC_API_URL` esté configurada

---

## 🚨 Último Recurso: Recrear Todo

Si nada funciona, puedes recrear el deployment desde cero:

### 1. Eliminar Aplicaciones (pero NO las bases de datos)

1. Dokploy → Applications → judiscribe-backend → **Delete**
2. Dokploy → Applications → judiscribe-frontend → **Delete**

### 2. Recrear Aplicaciones

Sigue la guía completa en [DESPLIEGUE_DOKPLOY.md](DESPLIEGUE_DOKPLOY.md)

**IMPORTANTE:** NO elimines las bases de datos (PostgreSQL y Redis) a menos que quieras empezar completamente desde cero.

---

## 📞 Información de Contacto

Si después de seguir todos estos pasos aún no funciona, necesitas:

1. **Revisar los logs completos** en Dokploy
2. **Verificar las URLs** generadas por Dokploy
3. **Asegurarte de que todos los servicios estén "Running"**

---

**Última actualización:** 18 de febrero de 2026
