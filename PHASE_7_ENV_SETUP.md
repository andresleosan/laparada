# Phase 7 — Integraciones y entorno de Cloud Functions

> **Alcance actualizado (2026-08-25):** LaParada usa medios de pago offline. No configurar
> credenciales, webhooks ni SDK de plataformas de pago.

## Parámetros no secretos

Configurar para el proyecto Firebase correspondiente:

```dotenv
WHATSAPP_PHONE_NUMBER_ID=<id numérico asignado por Meta>
WHATSAPP_API_VERSION=v26.0
WHATSAPP_NEGOCIO_ID=laparada
```

`WHATSAPP_API_VERSION` es obligatorio para evitar que el código quede atado a una versión retirada.
El ejemplo `v26.0` coincide con la versión general vigente observada en Meta el 2026-08-25; confirmar
la versión habilitada para la app antes de cada despliegue. El endpoint construido por el backend es
`https://graph.facebook.com/<version>/<phone-number-id>/messages`.

## Secretos

Estos valores se deben crear en Secret Manager y nunca en archivos versionados:

- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`

Para emuladores, Firebase admite un archivo local `.secret.local`; este repositorio lo ignora.
No ejecutar la creación de secretos, habilitar APIs ni desplegar sin confirmación explícita del
operador, porque puede generar costo.

## Contrato del webhook de WhatsApp

- GET exige `hub.mode=subscribe`, el verify token exacto y un challenge de texto.
- POST exige el header `x-hub-signature-256: sha256=<digest>` calculado sobre el cuerpo crudo
  con `WHATSAPP_APP_SECRET`.
- El `phone_number_id` del payload debe coincidir con el configurado.
- El payload completo se valida antes de escribir y admite como máximo 100 eventos por solicitud.
- Mensajes y eventos repetidos usan IDs determinísticos para no duplicar datos.
- Cada entrada se guarda junto con un trabajo `bot_queue` en la misma transacción.
- El navegador no puede crear mensajes, colas ni eventos de proveedor; solo puede leer los de su
  tenant y marcar como leída una entrada entregada.

## Flujo desplegable

1. `whatsappWebhook` autentica la entrada, la persiste y la encola.
2. `procesarMensajesBot` reclama un trabajo con lease. Las mutaciones del pedido y el resultado
   (`accionPendiente`/`respuestaPendiente`) se confirman en la misma transacción de Firestore antes
   de contactar a Meta; repetir el mismo `queueId` reutiliza ese resultado.
3. La salida se persiste con `negocioId`, `mensajeEntradaId`, `queueId` y
   `referenciaWhatsapp`. Un reintento reutiliza el resultado y no vuelve a ejecutar la lógica del
   pedido.
4. `enviarMensajeWhatsAppManual` es la única vía del panel: exige Auth, App Check, perfil activo del
   mismo tenant, idempotencia y un límite de 30 intentos por operador cada cinco minutos.

## Contrato transaccional de órdenes

- `_ordenes_whatsapp_activas/{hashTenantTelefono}` es un puntero interno y determinístico que evita
  dos órdenes pendientes simultáneas para el mismo teléfono y tenant. Firestore Rules niega todo
  acceso de clientes a esa colección.
- Cada item pendiente guarda el ID estable del documento de `productos` o `combos`, su tipo y una
  instantánea acotada para el resumen. Al confirmar, el backend vuelve a leer por ID y recalcula con
  precio/disponibilidad actuales; nunca confía en la posición del menú ni en el total del mensaje.
- No se requiere backfill: existe lectura compatible de órdenes pendientes heredadas y estas
  expiran a los 30 minutos. Las nuevas mutaciones rechazan un formato heredado ambiguo y solicitan
  reconstruir la orden.
5. Los estados `sent`, `delivered`, `read` y `failed` avanzan de forma idempotente y auditable en
   `eventos_entrega`; un evento atrasado no retrocede un mensaje leído.

## Degradación y respuestas

- Firma inválida: `401`, sin escrituras.
- Payload/contrato inválido: `400` o `409`, sin escrituras.
- Secretos ausentes: `503`, sin fallback de prueba.
- Error interno: `500`; revisar logs sin imprimir secretos ni cuerpos completos.

Antes de producción se requieren pruebas con las herramientas de Meta y un smoke test que confirme
una sola actualización ante la repetición del mismo evento.

## Gate de sandbox pendiente

Preflight externo de solo lectura ejecutado el 2026-08-25 con autorización del operador:

- Firebase `laparada-26` está en Blaze/prueba gratuita, con consumo neto observado de USD 0 y un
  presupuesto mensual de USD 1 que alerta al 50 %, 90 % y 100 %; no tiene límite duro.
- Las cuatro Functions del flujo automático quedan acotadas: webhook `maxInstances: 10` y los tres
  schedulers `maxInstances: 1`, con timeout y memoria explícitos.
- Cloud Run no tiene servicios desplegados. Firestore solo mostró `categorias` y `productos`; las
  muestras revisadas ya tienen `negocioId: laparada`.
- Secret Manager API todavía está deshabilitada y no existen secretos remotos.
- La cuenta de Facebook autenticada aún debe crear su cuenta de Meta for Developers, aceptar sus
  condiciones y completar la verificación. No se aceptaron condiciones ni se activaron APIs.

Pendiente, en este orden:

1. completar manualmente el alta/verificación de Meta for Developers;
2. crear una app de negocio y agregar WhatsApp Sandbox;
3. habilitar Secret Manager y configurar los tres secretos y tres parámetros sin imprimir valores;
4. desplegar primero reglas/índices y luego las cuatro Functions de WhatsApp;
5. registrar la URL HTTPS de `whatsappWebhook` y completar el challenge de Meta;
6. enviar desde el número de prueba un `hola`, repetir el mismo webhook y esperar el scheduler;
7. verificar exactamente una entrada, una cola procesada y una salida con referencia de Meta;
8. enviar estados fuera de orden y confirmar que no retroceden el estado final;
9. probar una falla controlada y comprobar reintento, máximo de tres intentos y ausencia de
   contenido o secretos sensibles en logs.

Para este bot, la respuesta a un mensaje entrante se envía como texto sin plantilla dentro de la
ventana de servicio al cliente; Meta documenta ese tipo como no facturable. Las plantillas fuera de
esa ventana sí pueden cobrar por mensaje según categoría y país. Fuente vigente consultada:
https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/

**Rollback:** desactivar el bot en `configuracion/{negocioId}`, retirar la suscripción del webhook
en Meta y redeplegar la revisión anterior de Functions. Los mensajes y punteros internos ya
auditados se conservan; la revisión anterior los ignora y no se borran automáticamente.
