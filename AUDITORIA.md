# Auditoría puntual — guardado de fotos

> **Decisión posterior de producto (2026-08-25):** LaParada no ofrecerá pagos en línea. Las
> referencias a MercadoPago, Stripe, sus secretos y sus costos describen el hallazgo histórico que
> motivó la revisión, pero ya no son instrucciones de configuración. PASO-01 retiró localmente esas
> integraciones; no deben crearse credenciales ni desplegarse Functions de pago.

**Fecha:** 2026-08-24
**Plataforma:** Codex CLI
**Proyecto Firebase:** `laparada-26`
**Alcance:** incidente de fotos, permisos relacionados y superficie de seguridad
directamente encontrada. No es una auditoría integral del producto.

## Diagnóstico

El error de navegador tenía dos causas independientes:

1. `storage.rules` no contemplaba `productos/**`; la ruta terminaba en la regla
   de denegación global.
2. Al diagnosticar el incidente, el bucket
   `laparada-26.firebasestorage.app` todavía no estaba aprovisionado. Las
   solicitudes `OPTIONS` y `GET` devolvían `404`; por eso el navegador mostraba
   el fallo como CORS. El operador ya creó el bucket en `US-EAST1`.

Los errores de categorías y productos provenían de un tercer desfase: las reglas
esperaban claims `admin/employee`, mientras el código usa perfiles
`usuarios_negocio` con roles `admin/cajero` y no existe código que emita esos
claims.

Además, el auto-sembrado de categorías se ejecutaba desde varios hooks en paralelo.
El patrón leer-antes-de-escribir con `addDoc` permitió ocho copias de cada una de
las diez categorías sugeridas. La interfaz del formulario dibujaba todos los
documentos recibidos, por eso los nombres aparecían repetidos.

## Corrección local

- Autorización de menú basada en perfil activo, tenant coincidente y negocio
  activo; el superadmin autenticado conserva acceso a La Parada.
- Lectura pública del menú y escritura aislada por `negocioId`.
- Storage usa la misma pertenencia multi-tenant mediante consultas de reglas a
  Firestore.
- La subida es cancelable a los 20 segundos y no persiste DataURL como fallback.
- Nombres de archivo sanitizados e ID de tenant validado sin alterar mayúsculas.
- Endpoint público `crearUsuarioPrueba` eliminado del fuente y los compilados.
- Auto-sembrado retirado de las rutas de lectura pública. La restauración explícita de categorías
  usa transacción con IDs determinísticos `default-{tenant}-{categoria}` y deduplicación defensiva
  por nombre normalizado.
- Colección `categorias` limpiada: respaldo de 80 documentos, migración a 10 IDs
  `default-*` y eliminación de 80 documentos antiguos con precondición de versión.
- El control heredado `Aplicar fondo` y su procesamiento masivo por color uniforme fueron retirados.
  La única edición disponible recorta una foto bajo demanda mediante la callable protegida y la
  compone sobre el fondo de mesa antes de que el operador confirme el guardado.

## Seguridad

### Crítica cerrada — credencial de prueba en historial Git

- **Estado:** cerrada. El operador confirmó el 2026-08-24 que no quedan usuarios
  de prueba en Firebase Authentication.
- **Evidencia:** la búsqueda histórica localiza la credencial retirada en el
  commit `1fff545`; la búsqueda en el árbol de código actual no la devuelve.
- **Exposición remota observada:** la URL documentada devuelve `404` y
  `firebase functions:list` no pudo listar porque la API de Cloud Functions del
  proyecto está deshabilitada.
- **Mitigación:** el endpoint, su exportación y sus compilados fueron retirados;
  no se conserva la credencial en el árbol actual.

### Cambio autorizado — retiro del PIN administrativo

- La interfaz ya no muestra ni solicita el PIN para eliminar productos, combos,
  gastos, ventas o insumos, ni para reiniciar la caja; cada acción conserva una
  confirmación explícita del navegador.
- El 2026-08-25 se retiraron además las Functions, servicios cliente, scripts,
  documentación, compilados y el hash versionado `admin-pin.json` que habían
  quedado como código legado.
- No se modificaron las reglas de Firestore: la sesión autenticada todavía debe
  tener el rol/pertenencia que permite la operación. El operador acepta la pérdida
  de la segunda barrera del PIN.

### Crítica corregida localmente — rol administrativo implícito

- Se eliminó el modo demo que aceptaba cualquier identidad guardada en
  `localStorage` cuando Firebase Auth no estaba disponible.
- Un usuario normal ahora necesita un documento `usuarios_negocio/<uid>` activo,
  con UID, email, rol y tenant válidos. La ausencia del perfil ya no crea un admin
  sintético de La Parada.
- La ruta de superadmin tiene un gate explícito adicional.
- El alta de personal usa `crearUsuarioPersonal`: exige Auth y App Check, valida perfil activo,
  rol administrativo, tenant, negocio activo, unicidad y revierte la identidad si falla el perfil.
  El navegador ya no crea otra identidad con su propio SDK, por lo que no reemplaza la sesión del
  administrador. El cajero no ve ni puede abrir la ruta de configuración.
- **Validación local:** sesión real del emulador de Auth, callable con `App Check=VALID` y
  `Auth=VALID`, alta de cajera y recarga de `/admin-settings` conservando la sesión y los dos
  perfiles. Suite de Auth/Firestore/Storage e integración: 28/28.
- **Pendiente:** publicar frontend, Function y reglas, y repetir el smoke en producción con
  autorización explícita. La versión actualmente alojada aún no recibe esta corrección.

### Alta corregida localmente — autenticidad del webhook activo

- WhatsApp verifica `x-hub-signature-256` sobre el cuerpo crudo y valida el número
  configurado antes de escribir.
- La entrada se guarda y encola atómicamente con ID determinístico; los duplicados no crean otro
  mensaje ni otro trabajo. El payload completo se valida antes de escribir y se limita a 100 eventos.
- El scheduler reclama cada trabajo con lease, persiste la respuesta calculada antes del envío y
  registra toda salida con la referencia de Meta. Los reintentos no repiten la lógica del pedido y
  se descartan al tercer fallo.
- La mutación del pedido y el resultado del `queueId` comparten una transacción. Un puntero interno
  por tenant/teléfono impide órdenes pendientes paralelas; la selección guarda IDs estables y la
  confirmación recalcula precio/disponibilidad desde el catálogo actual. La prueba integrada repite
  selección y confirmación concurrentemente sin sumar cantidades ni crear otro domicilio.
- El panel dejó de simular envíos con escrituras cliente: usa una callable con Auth, App Check,
  pertenencia multi-tenant, idempotencia y rate limit. Rules impide falsificar mensajes, colas o
  eventos de entrega desde el navegador.
- Los handlers, tracking, campañas y encuestas que simulaban WhatsApp sin proveedor real fueron
  retirados junto con sus compilados.
- MercadoPago, Stripe y sus webhooks, schedulers, contratos, dependencias y secretos fueron
  retirados. `transacciones_pago` y `sesiones_pago` se preservan como historial remoto, pero las
  reglas niegan lectura y escritura a todos los clientes.
- WhatsApp declara únicamente tres secretos separados para Secret Manager.
- **Validación local:** 4 pruebas unitarias de contrato y 8 casos integrados cubren duplicados,
  lote inválido sin escrituras parciales, estados fuera de orden, autorización, idempotencia, falla
  del proveedor, enlace inmutable del `queueId` y pedido completo con transferencia offline. Suite
  total de emuladores: 41/41.
- **Pruebas avanzadas:** dos mensajes legítimos y concurrentes terminan en una sola orden activa;
  dos ejecuciones concurrentes del mismo `queueId` aplican una sola mutación y crean un solo
  domicilio; el precio se cambia después de seleccionar y la confirmación usa el valor vigente.
  Entradas parcialmente numéricas se rechazan. Los tres schedulers tienen `maxInstances: 1`,
  timeout y memoria explícitos. No se ejecutó carga contra Meta porque el sandbox externo continúa
  sin configurar.
- **Preflight externo:** Firebase está autenticado en `laparada-26`; Blaze/prueba gratuita y el
  presupuesto USD 1 con alertas 50/90/100 % fueron verificados. No existen servicios Cloud Run y
  Secret Manager API sigue deshabilitada. Firestore mostró solo `categorias` y `productos`, con
  `negocioId: laparada` en las muestras revisadas.
- **Pendiente:** alta/verificación de Meta for Developers, secretos de WhatsApp, sandbox, activación
  de APIs y despliegue con
  confirmación explícita del operador. Sin ese smoke no se afirma conectividad real con Meta.

### Alta corregida localmente — aislamiento multi-tenant

- Las entidades operativas activas exigen `negocioId`; servicios, Functions, reglas e índices
  filtran por el negocio activo y verifican pertenencia antes de mutaciones por ID.
- Los claims globales heredados dejaron de autorizar. Firestore y Storage usan el perfil activo
  `usuarios_negocio/<uid>` y el estado del negocio; los comprobantes de transferencia están en una
  ruta privada por tenant y ya no se exponen mediante URL permanente.
- El superadministrador selecciona explícitamente el negocio sobre el que opera y la selección
  persiste en la sesión. Un smoke local con dos negocios confirmó que ni la recarga ni el cambio de
  contexto mezclan productos.
- **Validación local:** 33/33 pruebas con emuladores cubren aislamiento de lecturas, escrituras,
  consultas, roles, eventos anidados y Storage. Al cerrar PASO-06 había 33 índices tenant-first;
  PASO-07 retiró tres índices de WhatsApp sin consumidores y deja 31, todos con `negocioId`
  primero.
- **Pendiente externo:** ejecutar el procedimiento reversible de `MIGRACION_MULTI_TENANT.md` y
  publicar reglas, índices, Functions y frontend. Requiere backup verificado y autorización
  explícita. El preflight posterior de PASO-07 fue de solo lectura y no aplicó la migración ni
  modificó documentos.

### Alta corregida localmente — abuso del alta pública de domicilios

- La tienda dejó de escribir `domicilios` con el SDK cliente y usa `crearPedidoPublico`.
- La callable exige App Check, tokens de uso limitado, payload estricto, idempotencia, recálculo de
  catálogo, aislamiento de tenant, límites de items/total e IP/app rate limit.
- Las reglas niegan escritura directa a clientes públicos; el POS conserva create solo para un
  perfil `admin`/`cajero` activo y perteneciente al mismo tenant.
- **Validación local:** el checkout real de navegador atravesó la callable con App Check `VALID` y
  creó un único pedido de $18.000 recalculado desde catálogo; la landing no efectuó escrituras
  directas ni auto-sembrado de categorías.
- **Pendiente externo:** registrar reCAPTCHA Enterprise/App Check, desplegar por componentes y
  ejecutar el smoke descrito en `APP_CHECK_SETUP.md`. La corrección aún no está activa en producción.

### Dependencias

Los siguientes hallazgos corresponden a la auditoria previa a la remediacion descrita en el estado
actual de abajo:

- Producción: 3 vulnerabilidades moderadas (`uuid` transitivo de Firebase Admin
  y dos avisos de React Router 6).
- Desarrollo: además aparecen 3 avisos altos de `minimatch` en la cadena antigua
  de ESLint y un aviso moderado de OpenTelemetry en Firebase CLI.
- No se detectaron vulnerabilidades críticas. Las actualizaciones mayores se
  separan de este incidente para no introducir una migración de React Router sin
  pruebas funcionales.

### Estado actual de dependencias (2026-08-25)

La remediacion local actualizo `react-router-dom` 7.18.2, `@typescript-eslint` 8.68.0,
`firebase-admin` 13.10.0 y `firebase-functions` 7.3.2. Los transitivos vulnerables se fijan
de forma acotada en `pnpm-workspace.yaml` (`uuid` >=11.1.1 y `@opentelemetry/core` >=2.8.0).
Las auditorias `pnpm audit` y `pnpm audit --prod` terminaron sin vulnerabilidades conocidas;
build, lint, suite unitaria y 41 pruebas con emuladores pasaron.

## Costo

Cloud Storage exige el plan Blaze, pero el bucket `*.firebasestorage.app` incluye
actualmente hasta 5 GB-mes almacenados, 100 GB/mes descargados, 5.000 subidas/mes
y 50.000 descargas/mes sin cargo. Para el volumen esperado de un restaurante
pequeño, la estimación inicial es **USD 0–1/mes**; el costo puede subir con tráfico
público o abuso.

Blaze quedó verificado como activo mediante `gcloud billing projects describe`.

Se verificó un presupuesto mensual de **USD 1** para `laparada-26`, con avisos al 50 %, 90 % y
100 %. El consumo neto observado fue USD 0. La alerta no constituye un límite duro; queda como
hallazgo bajo evaluar un spend cap para Cloud Run Functions antes del despliegue final.

La implementación local activa declara tres secretos de WhatsApp para Secret Manager; la API aún
no está habilitada y no se crearon secretos remotos. No declara
secretos de pago. Para el volumen inicial se estima **USD 0–1/mes** entre Secret Manager y
Functions si permanece dentro de las cuotas, pero despliegues, contenedores, egress o abuso pueden
generar cargos. La alerta y los límites de instancias ya se verificaron; evaluar un spend cap para
Functions de 2.ª generación antes del despliegue final. Fuente de referencia:
[Secret Manager](https://cloud.google.com/secret-manager/pricing) y
[Firebase Functions](https://firebase.google.com/docs/functions/faq-and-troubleshooting#pricing).

## Estado de activación

1. Plan Blaze verificado como activo.
2. Bucket `laparada-26.firebasestorage.app` creado por el operador en
   `US-EAST1`.
3. Despliegue exclusivo de reglas autorizado y completado el 2026-08-24 a las
   21:01 COT.
4. Pendiente después del siguiente despliegue: validar desde
   `https://laparada.pages.dev`: crear categoría, subir JPEG,
   crear producto, recargar y comprobar la URL de descarga.

No se agregó una configuración CORS manual: el error inicial provenía del
bucket inexistente y no de encabezados configurables en el frontend.

### Evidencia de producción

- Firebase compiló y liberó `storage.rules` en el ruleset
  `46605024-dd35-4a81-af2f-a56dacb21e6e`.
- Firebase compiló y liberó `firestore.rules` en el ruleset
  `cc1c475c-6108-4259-be50-7aa24a2cb33b`.
- El preflight `OPTIONS` sobre una ruta `productos/laparada/*.jpg`, con origen
  `https://laparada.pages.dev`, respondió HTTP 200, permitió `POST` y devolvió
  `Access-Control-Allow-Origin: *`.
- El despliegue de Firebase no incluyó frontend, Functions, índices ni datos.
  El frontend se integra en `master` y su publicación mediante Cloudflare Pages
  fue autorizada por separado por el operador.
- La limpieza de categorías se ejecutó por API autenticada con respaldo local
  previo y verificación posterior de 10 documentos únicos.

## Reversión

- Código y reglas: redeplegar la revisión Git anterior o revertir el commit de la
  corrección de categorías antes de publicarlo.
- Frontend: revertir en `master` el commit funcional `d2a64d0` y volver a hacer
  push; la revisión anterior es `659ed85`.
- Datos: restaurar `categorias.bak-20260824.json` mediante una operación autenticada
  de escritura por ID si fuera necesario. `categorias.bak-20260824-v2.json` conserva
  además el estado intermedio de 10 categorías limpias. Ambos archivos contienen
  datos no versionados.
- Región del bucket: no se puede cambiar in situ; una elección incorrecta exige
  crear otro bucket y migrar objetos, por lo que se mantiene como decisión del
  operador.
