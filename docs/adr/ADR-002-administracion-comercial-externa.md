# ADR-002 — Administración comercial desde ALS Dev Studio

- Estado: aceptada para el código local; despliegue pendiente
- Fecha: 2026-10-15
- Responsables: operador de La Parada

## Contexto

La gestión de altas, activaciones y suscripciones de negocios externos se centraliza en
[ALS Dev Studio](https://www.alsdevstudio.com/). El módulo de negocios de La Parada duplicaba
esa responsabilidad mediante registro público, aprobación, suspensión y selección global
de cuentas.

## Decisión

La Parada conserva la operación del negocio asociado al perfil autenticado. Se retiran el
panel global de negocios, el registro local y sus servicios de administración comercial.
El acceso comercial desde el login dirige a ALS Dev Studio. La URL histórica de registro
redirige al login y la del panel retirado usa la redirección habitual al inicio administrativo.

Las reglas de Firestore impiden crear o eliminar negocios y modificar su estado, plan o
identidad desde el cliente, incluido el superadministrador. La creación de perfiles de
personal sigue pasando por la Cloud Function autorizada; se retira la creación de perfiles
asociada al registro público. Los administradores conservan la edición de los datos
operativos permitidos de su propio negocio.

## Alternativas consideradas

- Ocultar el menú: dejaría disponibles las mutaciones de gestión comercial mediante el SDK.
- Eliminar el modelo multi-tenant: rompería perfiles, autorización y datos operativos existentes.

## Consecuencias

- Se conservan los documentos existentes, el aislamiento por `negocioId` y la validación del
  estado de la cuenta al iniciar sesión. El estado y plan se consumen como datos administrados
  externamente.
- Se elimina el cambio manual y persistido de tenant en La Parada. El superadministrador opera
  La Parada y los demás usuarios operan el negocio de su perfil. Esto sustituye únicamente la
  selección de tenant descrita en ADR-001; las demás garantías de aislamiento se mantienen.
- Los permisos operativos existentes del superadministrador y la gestión local de personal
  se conservan.
- El aprovisionamiento comercial requiere un backend autorizado con Firebase Admin SDK o un
  mecanismo equivalente. Este cambio no implementa ni verifica esa integración en ALS Dev Studio.
- No se migran ni borran datos y no se despliega a producción como parte de esta retirada.

## Reversibilidad

La retirada es reversible mediante el control de versiones. Restaurar el flujo anterior
requeriría restaurar también sus permisos de Firestore y coordinar la responsabilidad
comercial con ALS Dev Studio.
