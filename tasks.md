# Tareas

## INC-001 — Fotos de productos y permisos de categorías

**Estado:** reglas desplegadas; frontend integrado en `master` para producción.

**Alcance confirmado:** reglas publicadas en `laparada-26`, cambios integrados en
`master` y publicación del frontend autorizada mediante Cloudflare Pages. No
publicar Functions, índices ni datos; eliminar la rama temporal al terminar.

### Implementado

- Reglas de `productos`, `combos` y `categorias` alineadas con `negocioId` y los
  roles `admin/cajero` existentes.
- Fotos en `productos/{negocioId}/{nombre}/{uuid}.jpg`, con validación de tenant,
  MIME y tamaño menor de 2 MiB.
- Eliminado el fallback silencioso a DataURL en documentos de Firestore.
- Retirado `crearUsuarioPrueba` del código fuente, exportaciones y compilados.
- Pruebas locales de reglas con emuladores de Firestore y Storage.
- Cerrada la lectura de domicilios para cualquier usuario autenticado sin rol.

### Evidencia

- `firebase emulators:exec ... vitest run tests/firebase.rules.test.ts`:
  1 archivo, 13 pruebas aprobadas.
- `pnpm test`: 14 pruebas aprobadas y la suite de reglas omitida correctamente
  fuera de emuladores.
- `pnpm run build`: TypeScript y Vite aprobados.
- `pnpm --filter la-parada-functions build`: TypeScript aprobado.
- `pnpm audit --prod`: 3 vulnerabilidades moderadas conocidas; ver
  `AUDITORIA.md`.
- Verificación previa al despliegue: bucket
  `laparada-26.firebasestorage.app` creado en `US-EAST1` y 13/13 pruebas de
  reglas aprobadas nuevamente.
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
4. Pendiente: probar en producción con una sesión real y una imagen JPEG/PNG/WebP
   menor de 2 MiB.

**Cierre de seguridad informado por el operador:** no quedan usuarios de prueba
en Firebase Authentication.
