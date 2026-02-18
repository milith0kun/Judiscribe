# Frontend - JudiScribe

## Scripts Disponibles

### Desarrollo
```bash
npm run dev          # Iniciar servidor de desarrollo
```

### Build y Producción
```bash
npm run build        # Compilar para producción
npm run start        # Iniciar servidor de producción
```

### Calidad de Código
```bash
npm run lint         # Ejecutar ESLint (solo reportar)
npm run lint:fix     # Ejecutar ESLint y corregir automáticamente
npm run typecheck    # Verificar tipos de TypeScript
npm run check        # Ejecutar typecheck + lint
npm run validate     # Ejecutar check + build (validación completa)
```

## Configuración de Linters

### ESLint
El proyecto usa ESLint con la configuración de Next.js para TypeScript:
- Archivo de configuración: [.eslintrc.json](.eslintrc.json)
- Reglas personalizadas:
  - `@typescript-eslint/no-unused-vars`: warn
  - `@typescript-eslint/no-explicit-any`: warn
  - `react-hooks/exhaustive-deps`: warn
  - `no-console`: off (permitido en desarrollo)

### TypeScript
Configuración estricta de TypeScript habilitada en [tsconfig.json](tsconfig.json):
- `strict: true` - Verificación estricta de tipos
- `noEmit: true` - TypeScript solo para validación, Next.js maneja la compilación

## Workflow Recomendado

### Antes de hacer commit:
```bash
npm run check        # Verifica tipos y linting
```

### Antes de hacer push:
```bash
npm run validate     # Validación completa incluyendo build
```

### Durante desarrollo:
- El editor mostrará errores de TypeScript en tiempo real
- Ejecuta `npm run lint:fix` periódicamente para corregir problemas menores automáticamente

## Problemas Comunes

### Warnings de ESLint
Los warnings no bloquean el build, pero deben corregirse antes de producción:
- **Variables no usadas**: Eliminar o agregar prefijo `_` (ej: `_unused`)
- **Dependencias de useEffect**: Agregar dependencias faltantes o usar `useCallback`
- **Tipo `any`**: Reemplazar con tipos específicos

### Errores de TypeScript
Los errores de tipo bloquean el build y deben corregirse:
- Verificar que las props coincidan con las interfaces
- Asegurar que los tipos de retorno sean correctos
- Revisar importaciones y exports

## Extensiones de VSCode Recomendadas

- **ESLint** - Muestra errores de linting en tiempo real
- **TypeScript Vue Plugin (Volar)** - Mejor soporte para TypeScript
- **Prettier** - Formateador de código (opcional)
- **Tailwind CSS IntelliSense** - Autocompletado para clases de Tailwind

## CI/CD

El pipeline de deployment ejecuta automáticamente:
1. `npm install`
2. `npm run build` (incluye typecheck y linting)

Si el build falla, el deployment se detiene.
