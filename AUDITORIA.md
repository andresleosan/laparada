# Auditoría puntual — guardado de fotos

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
- Auto-sembrado de categorías convertido a transacción con IDs determinísticos
  `default-{tenant}-{categoria}` y deduplicación defensiva por nombre normalizado.
- Colección `categorias` limpiada: respaldo de 80 documentos, migración a 10 IDs
  `default-*` y eliminación de 80 documentos antiguos con precondición de versión.
- El control `Aplicar fondo` procesa cada imagen de la categoría por separado:
  elimina el fondo exterior conectado a los bordes y compone el recorte sobre un
  color uniforme elegido por el operador, sin reemplazar todas las fotos por una sola.

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

### Alta — migración multi-tenant incompleta

Las colecciones operativas históricas (`ventas`, `inventario`, `gastos`, cajas,
pagos y WhatsApp) aún dependen de claims globales y varios servicios no escriben
`negocioId`. Este incidente deja seguro el menú/fotos, pero no convierte por sí
solo todo el sistema en multi-tenant. Se requiere una tarea separada de esquema,
backfill con rollback y pruebas por colección antes de habilitar operadores de
negocios distintos.

### Alta — abuso del alta pública de domicilios

La creación de `domicilios` sigue siendo pública y no tiene App Check, límites
de campos ni rate limiting en reglas/backend. Se cerró la lectura/actualización
indiscriminada para cualquier usuario autenticado, pero el riesgo de spam debe
tratarse antes de una expansión pública.

### Dependencias

- Producción: 3 vulnerabilidades moderadas (`uuid` transitivo de Firebase Admin
  y dos avisos de React Router 6).
- Desarrollo: además aparecen 3 avisos altos de `minimatch` en la cadena antigua
  de ESLint y un aviso moderado de OpenTelemetry en Firebase CLI.
- No se detectaron vulnerabilidades críticas. Las actualizaciones mayores se
  separan de este incidente para no introducir una migración de React Router sin
  pruebas funcionales.

## Costo

Cloud Storage exige el plan Blaze, pero el bucket `*.firebasestorage.app` incluye
actualmente hasta 5 GB-mes almacenados, 100 GB/mes descargados, 5.000 subidas/mes
y 50.000 descargas/mes sin cargo. Para el volumen esperado de un restaurante
pequeño, la estimación inicial es **USD 0–1/mes**; el costo puede subir con tráfico
público o abuso.

Blaze quedó verificado como activo mediante `gcloud billing projects describe`.

**Hallazgo de costo (medio):** no se pudo verificar una alerta de facturación:
la API de presupuestos no está habilitada para las credenciales locales. Si aún
no existe, crear un presupuesto mensual bajo (por ejemplo USD 5) con avisos al
50 %, 80 % y 100 %. Una alerta informa, pero no garantiza un tope de gasto para
Cloud Storage.

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
