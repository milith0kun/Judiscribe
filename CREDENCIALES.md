# Credenciales de Acceso - JudiScribe

## Usuarios por Defecto

El sistema viene con dos usuarios de prueba preconfigurados:

### 1. Digitador (Transcriptor)
- **Email:** `digitador@judiscribe.pe`
- **Contraseña:** `Digitador2024!`
- **Rol:** Transcriptor
- **Permisos:** Crear y transcribir audiencias, generar actas

### 2. Administrador
- **Email:** `admin@judiscribe.pe`
- **Contraseña:** `JudiScribe2024!`
- **Rol:** Administrador
- **Permisos:** Todos los permisos del sistema + gestión de usuarios

## Acceso Rápido

En la pantalla de login encontrarás botones de "Acceso rápido" que auto-completan las credenciales. Solo necesitas hacer clic en el usuario que deseas usar y luego presionar "Iniciar Sesión".

## Primer Acceso

1. Abre la aplicación en tu navegador: `http://localhost:3000`
2. Serás redirigido automáticamente a `/login`
3. Usa las credenciales del digitador o haz clic en el botón de acceso rápido
4. Presiona "Iniciar Sesión"
5. Serás redirigido al dashboard

## Crear Usuarios Nuevos

Solo los administradores pueden crear nuevos usuarios. Para hacerlo:

1. Inicia sesión como administrador
2. Accede a la sección de gestión de usuarios (próximamente)
3. Crea el nuevo usuario con su rol correspondiente

## Cambiar Contraseñas

**⚠️ Importante:** Las contraseñas por defecto son para ambiente de desarrollo. En producción, cámbialas inmediatamente.

Para cambiar las contraseñas por defecto, ejecuta este script SQL en la base de datos:

```sql
UPDATE usuarios 
SET password_hash = '$2b$12$TU_NUEVO_HASH_AQUI' 
WHERE email = 'digitador@judiscribe.pe';
```

O usa la función de cambio de contraseña desde la interfaz (próximamente).

## Troubleshooting

### "Credenciales incorrectas"
- Verifica que estés usando el email y contraseña correctos
- Asegúrate de que la contraseña respete mayúsculas/minúsculas
- Verifica que el backend esté corriendo (`docker compose ps`)

### "No puedo acceder al dashboard"
- Verifica que hayas iniciado sesión correctamente
- Limpia las cookies del navegador y vuelve a intentar
- Verifica la consola del navegador para ver errores

### "El token ha expirado"
- Los tokens expiran después de 24 horas
- Simplemente vuelve a iniciar sesión

## Seguridad

### Recomendaciones para Producción

1. **Cambia todas las contraseñas por defecto**
2. **Usa contraseñas fuertes:** mínimo 12 caracteres, combinando mayúsculas, minúsculas, números y símbolos
3. **Habilita HTTPS:** modifica `secure: true` en el archivo de cookies
4. **Configura variables de entorno:** no uses las claves por defecto en producción
5. **Implementa rate limiting:** para prevenir ataques de fuerza bruta
6. **Activa logs de auditoría:** para rastrear accesos y cambios

---

**Última actualización:** Febrero 2026
