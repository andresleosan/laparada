# Migración multi-tenant de Firestore y Storage

Estado: plan preparado; **no ejecutado**. Requiere backup verificado y autorización explícita del
operador antes de modificar datos, índices o reglas de producción.

## Contrato de destino

- Cada documento operativo lleva `negocioId` válido e inmutable.
- Para el inventario histórico inequívoco de LaParada, el valor esperado es `laparada`.
- `configuracion` usa el ID documental igual al tenant: `configuracion/{negocioId}`.
- Imágenes: `productos/{negocioId}/...`; comprobantes: `transferencias/{negocioId}/...`.
- Un documento ambiguo no se migra automáticamente: se registra para decisión manual.
- No se borran `transacciones_pago` ni `sesiones_pago`; permanecen archivadas y cerradas por reglas.

## Preflight obligatorio

1. Confirmar proyecto, cuenta, región, cuota y alerta de presupuesto.
2. Congelar temporalmente escrituras o desplegar primero escritores duales compatibles.
3. Inventariar por colección: total, documentos con tenant, sin tenant, tenant inválido y tenants
   distintos. Guardar conteos y IDs en un manifiesto fechado fuera del repositorio.
4. Crear un export administrado de Firestore en un bucket aprobado y verificar que la operación
   terminó correctamente. Registrar URI, hora, project ID y conteos.
5. Descargar o inventariar metadata de Storage; verificar que exista una copia recuperable de los
   objetos que vayan a moverse. Las URLs históricas con token se tratan como datos sensibles.
6. Probar el script de backfill contra emuladores usando una copia anonimizada y ejecutar un modo
   `--dry-run` que no escriba.

## Secuencia de publicación

1. Publicar índices nuevos y esperar a que todos estén en estado `READY`.
2. Abrir una ventana de mantenimiento y congelar escrituras operativas. Ejecutar el inventario otra
   vez; no continuar si sus conteos no coinciden con el manifiesto previo.
3. Con autorización explícita, aplicar el backfill en lotes pequeños con precondición de versión.
   Registrar antes/después de cada documento en el manifiesto. Solo asignar `laparada` cuando la
   procedencia sea inequívoca.
4. Copiar objetos legados de Storage a la ruta con tenant, verificar hash/tamaño/MIME y actualizar
   referencias de `fotoTransferenciaUrl` a `fotoTransferenciaPath`. Conservar los objetos originales
   hasta completar la ventana de rollback; después, revocar los download tokens legados mediante
   rotación de metadata antes de considerar retirar las copias antiguas.
5. Publicar en la misma ventana Functions y frontend que siempre escriben/leen con tenant; publicar
   las reglas multi-tenant inmediatamente después y ejecutar la verificación de dos tenants antes de
   reabrir escrituras.
6. Tras la ventana acordada, decidir por separado si se archivan objetos antiguos. Cualquier borrado
   exige una nueva autorización; no forma parte de este plan local.

## Verificación posterior

- Los conteos por colección coinciden con el inventario, sin documentos operativos sin tenant.
- Admin y cajero del tenant A no leen ni escriben documentos del tenant B.
- El cajero opera ventas, domicilios y caja propia, pero no administra catálogo, personal ni cierres.
- El superadmin cambia entre A y B y cada consulta devuelve solo el tenant seleccionado.
- Tienda pública lee catálogo, pero no lee pedidos, mensajes, ventas ni configuración.
- Las Functions de WhatsApp solo procesan documentos cuyo `negocioId` coincide con
  `WHATSAPP_NEGOCIO_ID`.
- Los smoke de tienda, POS, reportes, inventario, caja, personal y WhatsApp no presentan errores de
  índice o permisos.

## Rollback

1. Detener el backfill y conservar manifiesto/logs.
2. Republicar los artefactos de frontend/Functions compatibles con el estado anterior.
3. Republicar las reglas anteriores solo durante la recuperación controlada.
4. Restaurar Firestore desde el export o revertir exclusivamente los documentos listados en el
   manifiesto, con precondiciones de versión.
5. Restaurar referencias de Storage y verificar objetos antes de retirar copias nuevas.
6. Repetir conteos y smoke. Documentar causa, alcance y resultado antes de reintentar.

## Gate de autorización

La preparación local de código y pruebas no autoriza ninguno de estos pasos remotos. Antes de
ejecutarlos, Cronos debe presentar proyecto exacto, backup verificado, comandos, alcance, costo,
ventana y rollback, y obtener confirmación explícita del operador.
