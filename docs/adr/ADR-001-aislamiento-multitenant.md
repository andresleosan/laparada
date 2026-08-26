# ADR-001 — Aislamiento multi-tenant por `negocioId`

- Estado: aceptada para el código local; despliegue y migración pendientes
- Fecha: 2026-08-25
- Responsables: operador de LaParada y Cronos

## Contexto

La aplicación conserva colecciones operativas de nivel superior en Firestore. Parte del código
histórico autorizaba por claims globales o consultaba colecciones sin acotar el negocio. Esto podía
mezclar información al habilitar un segundo tenant, especialmente para un superadmin que puede
cambiar el negocio activo.

Las colecciones afectadas son `productos`, `combos`, `categorias`, `ventas`, `domicilios`,
`inventario`, `entradas_inventario`, `gastos`, `cierres_caja`, `cajas`, `configuracion` y
`mensajes_whatsapp`. El backend del bot también usa `bot_queue`, `ordenes_pendientes` y `cache`.

## Decisión

Se mantienen colecciones de nivel superior y se exige un campo inmutable `negocioId` en cada
documento operativo. Toda consulta interna incluye `where('negocioId', '==', tenantActivo)` y toda
escritura normaliza o verifica ese tenant antes de persistir. Las reglas obtienen rol y pertenencia
desde `usuarios_negocio/{uid}`; los claims globales `admin`/`employee` dejan de conceder acceso.

El catálogo conserva lectura pública para la tienda, pero su escritura y sus imágenes quedan
limitadas al administrador del tenant. La configuración del bot vive en
`configuracion/{negocioId}`. Fotos de transferencia e imágenes de producto usan rutas físicas con
tenant; los comprobantes nuevos guardan una ruta privada y no un download token reutilizable. Las
Functions de WhatsApp derivan el tenant exclusivamente de `WHATSAPP_NEGOCIO_ID` y
filtran colas, órdenes, caché, mensajes y catálogo con ese valor.

Los documentos históricos sin `negocioId` quedan inaccesibles con las reglas nuevas hasta ser
clasificados y migrados. No se asignará un tenant por inferencia ambigua.

## Alternativas consideradas

1. Subcolecciones bajo `negocios/{negocioId}`. Ofrecen separación física más visible, pero obligan
   a reescribir rutas, índices, Functions y datos en una sola migración de alto riesgo.
2. Conservar claims globales. Es simple, pero no representa pertenencia por negocio y permite
   privilegios excesivos o inconsistentes.
3. Filtrar solo en la interfaz. Se descartó porque no constituye una frontera de seguridad.

## Consecuencias

- Todas las entidades y consultas operativas deben transportar un tenant explícito.
- Firestore necesita índices compuestos encabezados por `negocioId`.
- Los datos legados requieren backup, inventario y backfill antes del despliegue de reglas.
- El superadmin conserva acceso global en reglas, pero la interfaz siempre consulta un único tenant
  seleccionado para evitar mezclar resultados.
- El catálogo puede leerse sin autenticación; esa excepción no permite escritura ni acceso a datos
  operativos.

## Reversibilidad y rollback

El cambio de código puede revertirse al artefacto anterior. La migración de datos debe escribir un
manifiesto de documentos alterados y conservar un export restaurable. Ante un fallo se restauran
los documentos desde el export o se elimina únicamente el campo agregado según el manifiesto, y se
republican primero los lectores/escritores anteriores y luego las reglas anteriores. Nunca se hará
rollback mediante borrado masivo sin verificación del destino y autorización.

## Disparadores de revisión

Revisar esta decisión si se necesita mover o fusionar negocios, compartir catálogo entre tenants,
habilitar múltiples perfiles por usuario, superar límites prácticos de índices/consultas o adoptar
un almacén de datos distinto de Firestore.
