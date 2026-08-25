# Tareas

## INC-001 — Fotos de productos y permisos de categorías

**Estado:** reglas desplegadas; corrección de categorías en revisión; datos limpiados.

**Alcance confirmado:** reglas publicadas en `laparada-26`, cambios previos integrados en
`master` y publicación anterior del frontend mediante Cloudflare Pages. La limpieza de
duplicados de `categorias` fue autorizada y respaldada; la nueva versión del frontend
queda pendiente de confirmación explícita para publicar.

### Implementado

- Reglas de `productos`, `combos` y `categorias` alineadas con `negocioId` y los
  roles `admin/cajero` existentes.
- Fotos en `productos/{negocioId}/{nombre}/{uuid}.jpg`, con validación de tenant,
  MIME y tamaño menor de 2 MiB.
- Eliminado el fallback silencioso a DataURL en documentos de Firestore.
- Retirado `crearUsuarioPrueba` del código fuente, exportaciones y compilados.
- Pruebas locales de reglas con emuladores de Firestore y Storage.
- Cerrada la lectura de domicilios para cualquier usuario autenticado sin rol.
- Inicialización de categorías por defecto protegida con transacción e IDs
  determinísticos para evitar carreras entre listeners/componentes.
- Deduplicación defensiva por nombre normalizado en el servicio de categorías.
- Firestore limpiado: 80 documentos antiguos respaldados y reemplazados por 10
  categorías únicas del negocio `laparada`.
- Control de producto renombrado a `Aplicar fondo`: al marcarlo, recorta el fondo
  exterior de cada imagen de la categoría y la compone sobre un color uniforme
  configurable (blanco por defecto), reportando errores visibles.

### Evidencia

- `firebase emulators:exec ... vitest run tests/firebase.rules.test.ts`:
  1 archivo, 13 pruebas aprobadas.
- `pnpm test`: 14 pruebas aprobadas y la suite de reglas omitida correctamente
  fuera de emuladores.
- `pnpm run build`: TypeScript y Vite aprobados.
- `pnpm --filter la-parada-functions build`: TypeScript aprobado.
- Pruebas de categorías: 3 casos aprobados; suite completa: 17 aprobadas y 13
  omitidas por depender del emulador.
- ESLint y `tsc --noEmit` aprobados tras la corrección de categorías.
- Build Vite aprobado con bundle `index-BECAuUeY.js`.
- Verificación de datos posterior: 10 documentos, 10 nombres únicos, tenant
  `laparada` e IDs estables `default-laparada-*`.
- Respaldo local ignorado por Git: `categorias.bak-20260824.json` (80 documentos,
  67 KB) y `categorias.bak-20260824-v2.json` (10 documentos).
- `pnpm audit --prod`: 3 vulnerabilidades moderadas conocidas; ver
  `AUDITORIA.md`.
- Verificación previa al despliegue: bucket
  `laparada-26.firebasestorage.app` creado en `US-EAST1` y 13/13 pruebas de
  reglas aprobadas nuevamente.
- Verificación tras el cambio `Aplicar fondo`: `vitest` 17 aprobadas y 13 omitidas,
  ESLint y `tsc --noEmit` aprobados, `vite build` aprobado con bundle
  `index-CqdJQBev.js` y `git diff --check` sin errores.
- Despliegue de reglas completado el 2026-08-24 21:01 COT:
  - Storage: ruleset `46605024-dd35-4a81-af2f-a56dacb21e6e`.
  - Firestore: ruleset `cc1c475c-6108-4259-be50-7aa24a2cb33b`.
- Preflight de la ruta exacta de subida desde `https://laparada.pages.dev`:
  HTTP 200, `Access-Control-Allow-Origin: *` y método `POST` permitido.
- Gate previo a la Preview de Vercel:
  - 14 pruebas unitarias aprobadas y suite de reglas omitida fuera del emulador.
  - 13/13 pruebas de reglas aprobadas con emuladores.
  - ESLint, TypeScript, build de Vite y build de Functions aprobados.
  - Auditoría de producción: 3 vulnerabilidades moderadas conocidas, sin
    hallazgos críticos.

### Condiciones de despliegue

1. Completada: bucket creado por el operador en `US-EAST1` y plan Blaze activo.
2. Pendiente no bloqueante: confirmar que existe una alerta de presupuesto; no
   se pudo consultar porque
   la API de presupuestos no está habilitada para las credenciales locales.
3. Completada: confirmación explícita y despliegue exclusivo de reglas.
4. Pendiente: confirmación explícita para publicar el nuevo frontend y probar en
   producción con una sesión real y una imagen JPEG/PNG/WebP menor de 2 MiB.

**Cierre de seguridad informado por el operador:** no quedan usuarios de prueba
en Firebase Authentication.
