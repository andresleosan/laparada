# Tareas

WIP máximo: **1 tarea en progreso**. El orden es obligatorio salvo un incidente crítico nuevo.

## Decisión de alcance confirmada

LaParada no tendrá pagos en línea. Se retirarán MercadoPago, Stripe y cualquier otra pasarela,
incluidos SDK, webhooks, reintentos, secretos, interfaces y documentación. Solo se conservarán
medios offline. No se borrarán datos remotos históricos sin backup, rollback y autorización.

## Protocolo de ejecución

Cada tarea avanza por `pendiente` → `en progreso` → `validada localmente` → `desplegada`. Para pasar
a validada debe cumplir todos sus criterios de aceptación y adjuntar salida real de pruebas. Cada
despliegue exige confirmación explícita y checklist de producción.

## Plan secuencial

### PASO-01 — Retirar todas las plataformas de pago en línea

**Estado:** validada localmente el 2026-08-25; despliegue pendiente de PASO-10.

**Alcance:**

1. Inventariar y retirar MercadoPago, Stripe y cualquier pasarela del frontend, Functions,
   exports, schedulers, tipos, reglas, variables de entorno, dependencias, lockfile y documentación.
2. Retirar la pantalla y los indicadores de pasarelas; adaptar cualquier reporte que aún sea útil
   para mostrar exclusivamente medios offline.
3. Eliminar pruebas específicas de las integraciones retiradas y agregar una prueba/chequeo que
   impida reintroducir dependencias o secretos de pasarelas por accidente.
4. No borrar `transacciones_pago` ni otros datos remotos. Documentar primero si se conservan como
   historial offline, se archivan o se migran en una tarea posterior.

**Inventario inicial confirmado:**

- Functions: exports de `stripeWebhook`, `mercadopagoWebhook` y `retryFailedPayments`; fuentes y
  compilados de ambos webhooks, contrato de MercadoPago y scheduler de reintentos.
- Configuración: secretos de pasarelas, dependencia `stripe`, lockfile y pruebas HMAC/contrato que
  dejarán de tener propósito al retirar la integración.
- Frontend: `PagosPage`, pestañas de pasarelas en gastos/analítica, tipos de transacción, servicios
  de pagos/reintentos y generación de enlaces de pago por WhatsApp.
- Datos/reglas: `transacciones_pago`, sus subcolecciones y referencias de pasarela. Se inventariarán
  y clasificarán antes de decidir una migración; no se eliminarán durante el retiro local.

**Aceptación:**

- No hay imports, exports, rutas activas, jobs, SDK ni secretos de una plataforma de pago.
- El build y la navegación funcionan sin páginas o enlaces rotos.
- `pnpm audit --prod` refleja la eliminación de dependencias que ya no son necesarias.
- Vitest, ESLint, TypeScript, emuladores y builds pasan.

**Resultado local:** se retiraron exports, fuentes y compilados de Stripe/MercadoPago, scheduler de
reintentos, dependencia `stripe`, tipos/servicios/pantallas de pasarela, secretos y textos/enlaces
de cobro. La tienda ofrece solo efectivo y transferencia manual. Las colecciones históricas quedan
preservadas y denegadas por reglas. La prueba `tests/noOnlinePayments.test.ts` protege `src/` y
`functions/` contra la reintroducción de proveedores, secretos o contratos eliminados.

**Evidencia:** Vitest 32/32 (15 de reglas omitidas fuera de emuladores), Emulator Suite 15/15,
ESLint sin warnings, TypeScript frontend/Functions y ambos builds aprobados; smoke de tienda y
checkout sin proveedor externo; `pnpm audit --prod` con 3 moderadas y ninguna alta/crítica.

**Rollback:** revertir únicamente el commit de retiro; no hay mutación de datos remotos.

### PASO-02 — Formalizar stack y contrato offline

**Estado:** validada localmente el 2026-08-25; despliegue pendiente de PASO-10.

- Completar `STACK.md` con nivel del proyecto, Firebase/Cloudflare, costos, entornos y comandos.
- Registrar la decisión del operador: efectivo y transferencia manual, ambos sin API.
- Definir el esquema mínimo del pedido y estados operativos, sin conceptos de pasarela.
- Alinear tipos, textos y reportes con `BRIEF.md`.

**Aceptación:** `BRIEF.md`, `STACK.md` y el modelo de pedido no se contradicen; la decisión queda
registrada y no requiere credenciales de pago.

**Resultado y evidencia:** `STACK.md` registra arquitectura, entornos, comandos, costo y gates. El
modelo separa `TipoEntrega` (`mostrador | domicilio`) de `MetodoPago`
(`efectivo | transferencia`), y el POS/checkout ya no escriben `domicilio` como pago. ESLint,
Vitest, TypeScript y builds aprobaron después del cambio; `git diff --check` no reportó errores de
contenido.

### PASO-03 — Crear el backend seguro para pedidos públicos

**Estado:** validada localmente el 2026-08-25; configuración externa y despliegue pendientes.

- Crear un endpoint/callable que acepte solo IDs de producto, cantidades, datos mínimos de entrega
  y medio offline permitido.
- Consultar catálogo vigente y recalcular subtotales, descuentos, domicilio y total en backend.
- Añadir idempotency key, límites de tamaño/cantidad, validación de tenant, App Check y control de
  abuso compatible con clientes públicos.
- Guardar un pedido válido de forma atómica y devolver una referencia pública no sensible.

**Aceptación:** precios y totales enviados por el cliente se ignoran; duplicados no crean dos
pedidos; payloads manipulados, otro tenant y abuso son rechazados; pruebas unitarias y de integración
del endpoint pasan.

**Resultado:** `crearPedidoPublico` es una callable v2 con App Check obligatorio, tokens de uso
limitado, máximo de instancias, payload estricto, recálculo desde catálogo, transacción idempotente y
rate limit. El navegador envía solo referencias/cantidades y datos de entrega; recibe un código
público y el total calculado. Los controles internos son inaccesibles mediante reglas.

**Evidencia:** 9 pruebas unitarias de contrato/recálculo incluidas en una suite local de 43/43;
20/20 pruebas con emuladores, incluidas 4 de integración del backend; ESLint, TypeScript y builds
aprobados. Falta registrar reCAPTCHA Enterprise/App Check y probar la callable desplegada; esa acción
externa no fue ejecutada.

### PASO-04 — Cerrar la escritura pública directa de `domicilios`

**Estado:** validada localmente el 2026-08-25; configuración externa y despliegue pendientes de
PASO-10.

- Cambiar `allow create: if true` por denegación al cliente o una regla mínima compatible con el
  backend elegido.
- Actualizar el checkout para usar exclusivamente PASO-03.
- Añadir pruebas negativas de lectura, creación, actualización y borrado desde clientes públicos y
  usuarios de otro tenant.

**Aceptación:** el checkout E2E funciona mediante backend y ninguna escritura pública directa llega
a Firestore; toda la suite de emuladores pasa.

**Resultado local:** el checkout usa exclusivamente `crearPedidoPublico`; las reglas niegan
create/read/update/delete a clientes públicos y perfiles sin pertenencia operativa, mientras el POS
conserva create para perfiles `admin`/`cajero` activos del mismo negocio. La landing dejó de auto-sembrar categorías durante lecturas
públicas y sólo muestra los dos medios offline del contrato. Las pruebas de frontera impiden
reintroducir `addDoc`, escritura directa a `domicilios` o auto-sembrado público.

**Evidencia:** Vitest 43/43 (22 de emuladores omitidas fuera de ellos), reglas e integración 22/22
en emuladores, ESLint, TypeScript y builds aprobados. En navegador, el pedido local creó
`LP-BPZTNAIX` por la callable con App Check `VALID`; `verify:e2e` confirmó exactamente un documento,
total recalculado de $18.000, origen `web` y pago `efectivo`. La recarga posterior no produjo errores
de permisos. `APP_CHECK_SETUP.md` documenta registro externo, smoke y reversión. No se habilitó API,
no se registró reCAPTCHA Enterprise y no se desplegó nada.

### PASO-05 — Completar autenticación y alta de personal

**Estado:** validada localmente el 2026-08-25; despliegue pendiente de PASO-10.

- Hacer smoke con una sesión Firebase real para el gate administrativo ya corregido.
- Mover el alta de personal a backend para no reemplazar la sesión del administrador.
- Validar rol permitido, usuario activo, tenant y unicidad; registrar errores sin datos sensibles.
- Probar usuario sin perfil, desactivado, cajero, admin, superadmin y cruce de tenant.

**Aceptación:** un administrador crea personal sin perder su sesión y ninguna identidad inválida
obtiene acceso administrativo.

**Resultado local:** el alta salió del SDK Auth del navegador y ahora usa la callable v2
`crearUsuarioPersonal`, protegida por Firebase Auth, App Check con token de uso limitado, payload
estricto y autorización por perfil administrativo activo del mismo tenant (o superadmin). El backend
crea la identidad con Admin SDK, persiste el perfil de forma transaccional y elimina la identidad si
falla la persistencia. El rol `cajero` no ve ni puede abrir la configuración de equipo. La
autorización usa perfiles `usuarios_negocio`; los claims globales legados fueron retirados.

**Evidencia:** Vitest **52 aprobadas y 28 omitidas** fuera de emuladores; suite de Auth/Firestore/
Storage e integración backend **28/28**; ESLint, TypeScript, build web, build Functions y
`git diff --check` aprobados. El smoke local inició una sesión Firebase Auth real en emulador,
ejecutó la callable con `App Check=VALID` y `Auth=VALID`, creó una cajera, recargó
`/admin-settings` y confirmó que el administrador seguía autenticado y ambos perfiles persistían.
No se desplegó ni se modificaron identidades remotas.

### PASO-06 — Completar el aislamiento multi-tenant

**Estado:** validada localmente el 2026-08-25; migración y despliegue pendientes de PASO-10.

- Inventariar colecciones, consultas y escrituras sin `negocioId` obligatorio.
- Diseñar migración reversible, backup y verificación antes de tocar datos.
- Corregir esquema, servicios, reglas e índices colección por colección.
- Probar aislamiento completo con dos tenants.

**Aceptación:** no existe lectura ni escritura cruzada en pruebas; cualquier migración de producción
tiene backup restaurable, rollback documentado y autorización explícita.

**Resultado local:** todas las entidades operativas activas exigen `negocioId`; servicios, Functions,
reglas e índices filtran por el negocio seleccionado. Firestore deriva rol y pertenencia desde
`usuarios_negocio/<uid>` y Storage guarda los comprobantes de transferencia en rutas privadas por
tenant. El superadministrador puede seleccionar un negocio activo y la selección persiste durante
la sesión sin mezclar datos. `docs/adr/ADR-001-aislamiento-multitenant.md` fija la decisión y
`MIGRACION_MULTI_TENANT.md` documenta inventario, backup, backfill, verificación y rollback. No se
leyeron ni modificaron datos remotos.

**Evidencia:** Vitest **58 aprobadas y 33 omitidas** fuera de emuladores; suite de Auth/Firestore/
Storage e integración backend **33/33**; ESLint, TypeScript, build web, build Functions y
`git diff --check` aprobados. Las pruebas cubren dos tenants, consultas filtradas, denegación de
lecturas/escrituras cruzadas, privilegios `admin`/`cajero`, eventos anidados y Storage privado. El
smoke de navegador cambió La Parada → Negocio B → recarga → La Parada, mostrando únicamente el
producto del tenant activo; también confirmó que el login ya no rebota por la carga transitoria del
perfil. Al cerrar este paso, los **33 índices compuestos** comenzaban por `negocioId`; PASO-07
retiró tres índices de WhatsApp que ya no tenían consumidores, por lo que el manifiesto actual
conserva 31, todos tenant-first. No se desplegaron reglas, índices, Functions, frontend ni
migraciones.

### PASO-07 — Completar WhatsApp de extremo a extremo

**Estado:** bloqueada por dependencia externa; implementación y validación local completas, smoke sandbox externo pendiente. El operador confirmó continuar en paralelo con la cobertura/CI local de PASO-08 mientras no tenga WhatsApp configurado.

- Retirar handlers y simulaciones heredadas; mantener un solo flujo backend.
- Encolar cada entrada autenticada y persistir `referenciaWhatsapp`/`negocioId` en cada salida.
- Integrar confirmaciones de pedidos offline sin enviar enlaces de pago.
- Probar firma, duplicados, mensajes fuera de orden, reintentos y fallas del proveedor.

**Aceptación:** una entrada real de sandbox produce una respuesta enlazada y auditable; no existe
ningún texto o enlace de cobro en línea.

**Resultado local:** existe un solo webhook firmado y un solo canal de salida backend. Cada entrada
se valida antes de escribir, se persiste y encola atómicamente con IDs determinísticos. El scheduler
reclama trabajos con lease, conserva la respuesta calculada antes de contactar al proveedor y exige
una `referenciaWhatsapp` en toda salida exitosa; fallas y estados fuera de orden quedan auditados sin
retroceder el estado. El panel usa `enviarMensajeWhatsAppManual` con Auth, App Check, tenant,
idempotencia y rate limit, mientras Rules impide que el navegador falsifique mensajes/colas/eventos.
El pedido conversacional recalcula catálogo y solo crea un domicilio después de elegir `efectivo` o
`transferencia` y proporcionar dirección. Se retiraron handlers, tracking, campañas, encuestas y
servicios cliente que simulaban envíos. Los items ahora conservan IDs estables del catálogo y cada
mutación de la orden persiste su respuesta en la misma transacción del `queueId`; reintentos
secuenciales o concurrentes no duplican cantidades ni domicilios.

**Evidencia local:** con Node `20.20.2`, Vitest dejó **67 aprobadas y 41 omitidas** fuera de
emuladores; la suite ampliada de Auth/Firestore/Storage e integraciones aprobó **41/41**. Los 12
casos unitarios/integrados de WhatsApp cubren contrato,
ausencia de cobro online, duplicados, lote inválido sin escritura, estados fuera de orden,
autorización cruzada, idempotencia, falla del proveedor y pedido completo por transferencia manual.
ESLint, TypeScript, build web y build Functions aprobaron con Node 20. El smoke público real cargó
catálogo, agregó un producto y llegó al formulario de entrega mostrando solo efectivo,
Nequi/Daviplata y datáfono, sin errores de consola originados por la app. La UI conserva 200 mensajes
recientes por tenant, deduplica el listener y separa la bandeja sin leer del historial.

**Preflight externo:** autorización recibida; Firebase `laparada-26` quedó verificado en Blaze/prueba
gratuita, con presupuesto USD 1 y alertas 50/90/100 %, consumo neto USD 0, Firestore tenant-first y
sin Functions/Cloud Run previas. Los schedulers ahora tienen `maxInstances: 1`.

**Pendiente para aceptación:** la cuenta autenticada todavía debe crear/verificar su cuenta de Meta
for Developers y aceptar sus condiciones. Después se configurará el sandbox, Secret Manager y el
smoke real siguiendo `PHASE_7_ENV_SETUP.md`. No se aceptaron condiciones, habilitaron APIs,
configuraron secretos ni desplegaron recursos. El smoke externo de PASO-07 sigue bloqueado; por
confirmación del operador, PASO-08 avanza en paralelo solo en su cobertura y validación local.

### PASO-08 — Crear cobertura crítica y CI

**Estado:** en progreso; cobertura y validación local ejecutadas, pendiente de primera ejecución remota limpia en GitHub. La ejecución local continúa mientras PASO-07 espera el sandbox externo.

**Avance 2026-08-25:** se añadió `.github/workflows/ci.yml` para ejecutar con Node 22.13 (el
runtime objetivo de Functions sigue siendo Node 20) y
permisos de solo lectura el lint, TypeScript, builds de frontend/Functions, pruebas unitarias y de
frontera, suite de reglas con emuladores y `pnpm audit --prod --audit-level high`. No despliega ni
usa secretos. La ejecución local equivalente aprobó 67 pruebas y 41 omitidas fuera de emuladores,
41/41 con emuladores, lint, ambos builds y auditoría (3 moderadas, ninguna alta/crítica).
El workflow queda pendiente de su primera ejecución remota en GitHub.

**Validación local adicional 2026-08-27:** con JDK 21 y Firebase Tools 15.28.1, la suite completa
de emuladores terminó con **4 archivos y 41 pruebas aprobadas**. También aprobaron Vitest local
(67 aprobadas y 41 omitidas), ESLint, TypeScript frontend/Functions, build web, presupuesto de
bundle, chequeo de secretos y `git diff --check`. `pnpm audit --prod` no pudo revalidarse en esta
sesión porque el registro npm devolvió `EACCES`; la evidencia previa documentada sigue indicando
cero vulnerabilidades altas/críticas. El runner remoto aún requiere ejecutar el commit local
`9bc5d35`, que agrega Java 21 al workflow.

- Cubrir Functions, reglas, servicios, componentes y E2E de tienda, pedido, autenticación y operación.
- Definir el modelo de amenaza del cliente interno y mover a backend las escrituras financieras que
  no deban confiar en valores enviados por POS/caja/inventario; probar manipulación de payloads.
- Ejecutar en CI: lint, tipos, unitarias, emuladores, builds, auditoría y chequeos de secretos.
- Fijar evidencias y criterios para bloquear merges.

**Aceptación:** una ejecución limpia de CI cubre los flujos críticos y falla ante regresiones de
seguridad o ante la reintroducción de plataformas de pago.

### PASO-09 — Dependencias, rendimiento y accesibilidad

**Estado:** en progreso; optimización local y remediación de dependencias validadas, pendiente de
despliegue autorizado y re-medición en producción; depende de PASO-08.

**Baseline y optimización 2026-08-25:** la producción actual, con perfil móvil 390x844 DPR 3,
Slow 4G y CPU x4, registró LCP 6,63 s, INP 171 ms y CLS 0,14. El `dist/` anterior medido con el
mismo perfil registró LCP 7,11 s, INP 162 ms y CLS 0,14. Después de separar la aplicación
administrativa de la ruta pública, retirar la cadena bloqueante de fuentes, optimizar logo/favicon,
reservar el layout y sacar la imagen tardía del primer viewport móvil, tres cargas locales finales
dieron LCP 2,97/1,81/1,87 s (mediana 1,87 s) y CLS 0,00; las trazas con vendor split dieron
1,85/1,82/1,94 s (mediana 1,85 s), CLS 0,00 e INP observado 88 ms. Lighthouse móvil pasó de 83 a 100 en accesibilidad y mantuvo 100 en buenas prácticas tras
corregir nombres accesibles, contraste, foco, jerarquía de encabezados y movimiento reducido.
El entrypoint quedó en 70,63 kB, el chunk mayor en 405,53 kB frente al presupuesto de 635 kB y la
carga pública eliminó el salto de ruta inicial; Vite ya no emite warning de chunks mayores de 500 kB.
No hubo despliegue.

- Resolver o aceptar explícitamente cada vulnerabilidad restante.
- Actualizar `react-router-dom` a 7.18.2, `@typescript-eslint` a 8.68.0, `firebase-admin` a
  13.10.0 y `firebase-functions` a 7.3.2, manteniendo Functions en Node 20.
- Fijar `uuid` >=11.1.1 solo en las cadenas transitivas afectadas y `@opentelemetry/core` >=2.8.0
  solo para Pub/Sub de la CLI; los overrides quedan declarados en `pnpm-workspace.yaml`.
- Dividir el bundle por ruta y fijar presupuestos de tamaño/Core Web Vitals.
- Auditar teclado, foco, contraste, mensajes de error y vistas móviles.

**Aceptación:** cero vulnerabilidades críticas/altas aceptadas sin justificación, presupuesto de
bundle aprobado y pruebas de accesibilidad/rendimiento repetibles.

### PASO-10 — Preproducción, despliegue y cierre

**Estado:** pendiente; depende de todos los pasos anteriores.

- Confirmar alerta de presupuesto, secretos exclusivos de WhatsApp/IA y Node 20 para Functions.
- Ejecutar checklist de despliegue, backup cuando corresponda y smoke de preview.
- Solicitar autorización explícita para cada despliegue; publicar por componentes y verificar.
- Ejecutar smoke de producción: tienda, pedido offline, administración, imágenes y WhatsApp.
- Cerrar `INC-001` y realizar análisis final de brechas de capacidad.

**Aceptación:** todas las tareas previas están desplegadas con evidencia, no hay bloqueos críticos y
existe rollback probado/documentado.

## Trabajo ya validado localmente

- `SEG-001`: autenticidad de WhatsApp, límites de payload y secretos separados; pagos en línea
  retirados en PASO-01.
- `SEG-002`: PIN administrativo legado retirado.
- `AUTH-001`: fallback administrativo y modo demo retirados; alta de personal movida a backend y
  smoke de sesión real aprobado localmente. Falta despliegue y smoke de producción en PASO-10.

## Evidencia de la revisión 2026-08-25

- Vitest local actual: **67 aprobadas y 41 omitidas**; las omitidas son suites que exigen
  emuladores.
- Auth/Firestore/Storage Emulator Suite e integración backend: **41/41 aprobadas**, incluida la
  autorización de alta de personal, denegación de pagos archivados, controles internos, escritura
  pública de domicilios, aislamiento integral entre dos negocios y el flujo local de WhatsApp.
- Pruebas específicas nuevas: firma HMAC de Meta, ausencia de integraciones de pago en línea y
  casos de identidad/perfil administrativo.
- ESLint: aprobado sin warnings.
- TypeScript frontend y Functions: aprobados.
- Build Vite inicial: aprobado; bundle principal `index-DAGdXJRX.js` de 600,98 kB, con warning de tamaño.
- Optimización web local: LCP móvil mediano 1,85 s, CLS 0,00, INP observado 88 ms,
  Lighthouse accesibilidad 100 y buenas prácticas 100; perfil Slow 4G/CPU x4/390x844 DPR 3.
- Bundle posterior: entry `index-9cJmubtZ.js` de 70,63 kB, vendor Firebase de 399,41 kB y
  chunk mayor `AnalyticsPage-DdkRzztH.js` de 405,53 kB; `pnpm run check:bundle` aprobado contra
  635 kB. Logo visible reducido de 186.626 a 3.552 bytes y favicon de 186.626 a 2.453 bytes.
- Build de Functions: aprobado con TypeScript y dependencia directa de tipos de Express.
- Auditoría previa (histórica): 3 altas de herramientas de desarrollo y 4 moderadas; se resolvió
  mediante las actualizaciones y overrides documentados arriba.
- Auditoría final `pnpm audit` y `pnpm audit --prod`: sin vulnerabilidades conocidas (código 0).
- Tests de emuladores tras el upgrade de Functions/Admin: 4 archivos y 41 pruebas aprobadas.
- `git diff --check`: aprobado; solo se observaron avisos informativos LF/CRLF de Git en Windows.
- Auditoría de producción: 3 vulnerabilidades moderadas conocidas; auditoría completa:
  3 altas de desarrollo y 4 moderadas. No hay vulnerabilidades críticas reportadas.
- No se desplegó frontend, Functions, reglas ni datos; no se crearon secretos ni se habilitaron APIs.

---

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
- PIN administrativo retirado de la interfaz y de las acciones de borrado/reinicio:
  ahora solicitan confirmación explícita del navegador y siguen dependiendo de las
  reglas de Firebase y del rol autenticado.

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
- Verificación tras retirar PIN: `vitest` 17 aprobadas y 13 omitidas, ESLint,
  `tsc --noEmit`, `vite build` (bundle `index-O63uye7n.js`) y `git diff --check`
  aprobados.
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

### Evidencia CI 2026-08-25

- La ejecución remota del commit `d64fcea` identificó que `pnpm@11.21.0` requiere
  Node `>=22.13`; el runner estaba usando Node `20.20.2` y fallaba al cargar
  `node:sqlite` durante `pnpm install`.
- Se corrigió `.github/workflows/ci.yml` a Node `22.13.0` y se añadió `.nvmrc`
  para mantener la misma versión en los entornos de build.
- Validación local posterior: instalación congelada, lint, Vitest (67 aprobadas,
  41 omitidas), build web y build de Functions aprobados. La suite de emuladores
  se ejecutó con acceso ampliado y emitió solo advertencias conocidas del emulador.
- En GitHub, `e62d108` ya pasó instalación, lint, tipos, builds, bundle y Vitest;
  la única falla restante fue el paso de emuladores. Se añadió una anotación de
  diagnóstico al workflow para exponer el resumen del fallo sin ignorarlo.
- El diagnóstico de `fdd9c6b` confirmó que `firebase-tools@15.28.1` exige Java
  21 o superior en el runner. El workflow ahora instala Temurin 21 antes de los
  emuladores.
