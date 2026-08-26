# STACK — LaParada

Fecha de verificación: 2026-08-25  
Estado: arquitectura observada y contrato objetivo para la estabilización.  
Nivel Cronos: **Nivel 3**, porque combina aplicación pública, panel administrativo, datos
multi-tenant, Functions programadas e integraciones externas con impacto operativo.

## Arquitectura vigente

| Capa | Tecnología | Fuente verificable |
| --- | --- | --- |
| Frontend | React 18, TypeScript, Vite 8, React Router 6, Tailwind CSS 3 | `package.json`, `vite.config.ts`, `tsconfig.json` |
| Backend | Firebase Cloud Functions v2, TypeScript CommonJS, Node 20 | `functions/package.json`, `functions/tsconfig.json`, `functions/src/index.ts` |
| Datos | Cloud Firestore y Cloud Storage | `firebase.json`, `firestore.rules`, `storage.rules` |
| Identidad | Firebase Authentication y perfiles `usuarios_negocio` | `src/context/AuthContext.tsx`, reglas |
| Pruebas | Vitest, Firebase Emulator Suite y ESLint | `package.json`, `tests/` |
| Paquetes | workspace pnpm | `pnpm-workspace.yaml`, `pnpm-lock.yaml` |
| Frontend publicado | Cloudflare Pages, dominio observado `laparada.pages.dev` | `AUDITORIA.md` |
| Proyecto Firebase | `laparada-26` | `.firebaserc` |

El frontend público consulta el catálogo con el SDK web de Firebase. Las operaciones internas usan
servicios cliente y reglas, siempre con el `negocioId` seleccionado. El pedido público entra
exclusivamente por `crearPedidoPublico` y el alta de personal por `crearUsuarioPersonal`; ambas
callables exigen App Check. El contrato multi-tenant ya está implementado y validado localmente;
los datos históricos remotos aún requieren el backfill reversible de `MIGRACION_MULTI_TENANT.md`.

### Aislamiento multi-tenant

- Las colecciones superiores se conservan, pero cada documento operativo exige `negocioId`
  inmutable y toda consulta interna filtra primero por ese campo.
- Firestore y Storage derivan rol/tenant del perfil activo `usuarios_negocio/<uid>`; los claims
  globales heredados no conceden acceso.
- El catálogo conserva lectura pública, con escritura administrativa aislada. Los comprobantes de
  transferencia usan `transferencias/{negocioId}/...` y solo se leen con sesión del mismo tenant.
- `firestore.indexes.json` contiene 31 índices compuestos tenant-first para las consultas activas;
  se retiraron tres índices de estados de WhatsApp que dejaron de ser consultados por el cliente.
- `_ordenes_whatsapp_activas` mantiene un puntero interno por tenant/teléfono para serializar la
  orden conversacional. No requiere índice compuesto y está cerrada a todos los clientes.
- El superadministrador tiene acceso global en reglas, pero la interfaz siempre opera sobre el
  negocio seleccionado. La decisión completa está en `docs/adr/ADR-001-aislamiento-multitenant.md`.

## Contrato de pedido offline

Decisión registrada el 2026-08-25: se mantienen **efectivo** y **transferencia manual**. La
transferencia es una coordinación entre cliente y negocio; la aplicación no crea cobros, no abre
enlaces externos y no confirma automáticamente que el dinero llegó.

### Conceptos separados

- `MetodoPago`: `efectivo | transferencia`.
- `TipoEntrega`: `mostrador | domicilio`.
- `EstadoDomicilio`: `pendiente | en_preparacion | en_camino | entregado`.

`domicilio` deja de ser un método de pago. Los documentos históricos que lo usen en
`metodoPago` se consideran legado de solo lectura hasta una migración autorizada; los pedidos
nuevos no deben escribir ese valor.

### Entrada pública mínima para PASO-03

El cliente podrá enviar únicamente:

- `negocioId` o identificador público equivalente;
- `idempotencyKey` opaca y única por intento de pedido;
- items con `tipo`, `referenciaId` y `cantidad`;
- `clienteNombre`, `clienteTelefono`, `direccion`, `barrio` y `notas` opcionales según límites;
- `metodoPago` dentro de los dos valores offline.
- `jornada` solicitada y, para efectivo, `pagaCon` opcional como dato logístico de cambio.

El backend deberá obtener del catálogo `nombre`, disponibilidad y precio; recalcular items,
subtotal, costo de domicilio, descuentos autorizados y total; fijar `origen`, `estado`, jornada y
timestamps. Debe ignorar cualquier precio, total, estado o snapshot enviado por el navegador.

### Persistencia objetivo

Un domicilio válido conserva como mínimo `negocioId`, datos de entrega normalizados, items con
snapshots calculados en servidor, total en COP entero, `metodoPago`, `origen`, `estado`,
`idempotencyKey`, `creadoEn` y `actualizadoEn`. No almacena datos de tarjeta, sesión de cobro,
referencia de pasarela ni respuesta de proveedor financiero.

Las colecciones históricas `transacciones_pago` y `sesiones_pago` permanecen preservadas pero
denegadas a todos los clientes por reglas. Eliminarlas o migrarlas exige inventario remoto, backup
verificado, rollback y autorización explícita.

## Integraciones externas

- **WhatsApp Business Cloud API:** única integración operativa exportada por Functions. El webhook,
  cola, bot y callable manual están consolidados localmente; usan tres secretos independientes en
  Secret Manager y parámetros no secretos para número, versión y tenant. Falta el smoke con sandbox
  real para cerrar PASO-07.
- Los items de WhatsApp se resuelven desde el número visible del menú hacia IDs estables de
  `productos`/`combos`; el total se recalcula desde el catálogo vigente dentro de la confirmación.
- **Código IA heredado:** existe un cliente Anthropic no exportado en `functions/src/ai`. No se debe
  crear `CLAUDE_API_KEY` ni asumirlo activo hasta inventariarlo y decidir su destino.
- **Pagos en línea:** ninguno. No deben existir SDK, webhook, scheduler, secreto, enlace ni UI de
  MercadoPago, Stripe, PayPal u otra plataforma.

## Entornos y configuración

- **Local frontend:** variables públicas `VITE_FIREBASE_*` en `.env.local`; no versionar secretos.
- **App Check:** el frontend espera `VITE_FIREBASE_APP_CHECK_SITE_KEY` para reCAPTCHA Enterprise.
  La Function exige App Check y consume tokens de uso limitado; sin registrar la app y sus dominios
  el checkout falla de forma cerrada.
- **Emuladores:** Auth `9099`, Firestore `8080`, Functions `5001` y Storage `9199`. Las suites usan
  proyectos aislados `demo-*`; `test:rules` cubre Auth/Firestore/Storage y los scripts E2E locales
  cubren las callables sin tocar recursos remotos.
- **Functions:** runtime objetivo Node 20. El 2026-08-25 se validaron con Node `20.20.2` el build de
  Functions, TypeScript, ESLint, Vitest y las 41 pruebas de emuladores; la instalación global sigue
  en Node 24, por lo que los comandos de deploy deben invocar explícitamente Node 20.
- **Producción:** Firebase `laparada-26` y frontend observado en Cloudflare Pages. No existe en el
  repositorio una configuración declarativa de Pages; el procedimiento de publicación debe
  documentarse en PASO-10.

## Comandos de verificación

```powershell
corepack pnpm install
corepack pnpm lint
corepack pnpm test
corepack pnpm test:rules
corepack pnpm run build
corepack pnpm run build:functions
corepack pnpm audit --prod
```

`corepack pnpm run dev` inicia Vite. Los comandos `deploy` existen, pero no se ejecutan sin
checklist y autorización explícita del operador.

## Costo

| Servicio | Estado | Orden de magnitud inicial | Control requerido |
| --- | --- | --- | --- |
| Firebase Blaze: Firestore, Storage, Functions, Cloud Build/Run y Secret Manager | Blaze/prueba gratuita verificado; consumo neto observado USD 0 | USD 0–5/mes con volumen pequeño y dentro/cerca de cuotas; puede crecer por tráfico, imágenes, jobs o abuso | Presupuesto USD 1 verificado con alertas 50/90/100 %; sin límite duro. Webhook `maxInstances: 10`, schedulers `maxInstances: 1` |
| Cloudflare Pages estático | Publicación observada; plan no verificable desde el repo | USD 0/mes si continúa en el plan gratuito y sin Pages Functions | Confirmar cuenta, plan y propietario |
| WhatsApp Business Cloud API | Código local; alta de Meta for Developers y sandbox pendientes | USD 0 para las respuestas de texto sin plantilla dentro de la ventana de servicio que usa este bot; plantillas fuera de la ventana varían por categoría/país | Mantener el flujo reactivo sin plantillas para el smoke; presupuestar cualquier plantilla antes de activarla |
| Anthropic | Cliente heredado no exportado | USD 0 mientras permanezca inactivo y sin secreto | Retirar o presupuestar explícitamente antes de activarlo |
| Plataformas de pago | Retiradas | USD 0 | No crear cuentas, credenciales ni recursos |

Firebase Blaze conserva cuotas sin costo y cobra el exceso por uso; sus alertas de presupuesto no
son por sí solas un tope de gasto. Cloudflare documenta que las solicitudes de activos estáticos de
Pages son gratuitas y sin límite en planes Free/Paid, mientras Pages Functions comparte cuota con
Workers. Fuentes oficiales consultadas el 2026-08-25:

- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- https://firebase.google.com/pricing
- https://cloud.google.com/billing/docs/how-to/budgets
- https://developers.cloudflare.com/pages/functions/pricing/
- https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/

**Hallazgo de costo bajo:** el presupuesto de USD 1 informa al 50/90/100 %, pero no es un límite
duro. La concurrencia ya está acotada en código. Evaluar un spend cap para Cloud Run Functions antes
de PASO-10 si la cuenta lo permite; no bloquea el sandbox autorizado.

Los documentos de rate limit incluyen `expiraEn`; habilitar una política TTL para esa colección es
una acción externa pendiente del checklist de despliegue y sus borrados pueden generar operaciones
facturables.

Los índices tenant-first agregan almacenamiento y fan-out de escritura de bajo orden para el volumen
actual; no incorporan un proveedor ni costo fijo nuevo. El costo real deberá observarse después del
despliegue y del backfill autorizado.

WhatsApp añade consumo de Functions y Firestore cuando se active. El envío manual está limitado a
30 intentos por operador cada cinco minutos, el webhook a 100 eventos por solicitud y los schedulers
a una instancia. El flujo reactivo del bot usa texto sin plantilla dentro de la ventana de servicio,
que Meta documenta sin cargo; cualquier plantilla futura requiere una estimación separada.

## Gates de despliegue

Antes de producción: cero hallazgos críticos abiertos; todas las suites en verde con Node 20;
backup y rollback para cualquier migración; alerta de presupuesto revisada; secretos mínimos; y
autorización explícita separada para frontend, Functions, reglas o datos.
