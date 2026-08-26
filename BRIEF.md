# BRIEF — LaParada

Fecha de decisión de alcance: 2026-08-25  
Estado: base operativa para ejecutar el backlog con Cronos.

## Propósito

LaParada debe permitir que un cliente consulte el menú, arme un pedido y solicite un domicilio,
mientras el equipo del negocio administra catálogo, pedidos, operación e inventario con acceso
autorizado y aislamiento por negocio.

## Usuarios principales

- **Cliente:** necesita pedir con pocos pasos, conocer el total y escoger un medio de pago offline.
- **Operador/cajero:** necesita recibir pedidos válidos, actualizar su estado y operar sin cambiar
  accidentalmente su sesión.
- **Administrador:** necesita gestionar catálogo, personal y configuración con permisos verificables.

## Decisión de alcance: pagos

No se ofrecerán pagos en línea ni integraciones con pasarelas. Se retirarán MercadoPago, Stripe y
cualquier SDK, webhook, reintento automático, secreto, pantalla o modelo exclusivo de una plataforma
de pago.

El flujo conservará únicamente medios offline:

- efectivo al recibir;
- transferencia manual, mantenida por decisión de alcance del 2026-08-25, sin API ni confirmación
  automática.

La aplicación no almacenará datos de tarjetas ni declarará un pedido como pagado por una respuesta
de una pasarela. Los datos históricos de pagos no se borrarán sin backup verificado, plan de
reversión y autorización explícita.

## Flujo principal del MVP

1. El cliente consulta productos disponibles.
2. Arma el carrito y entrega los datos mínimos del domicilio.
3. El backend valida productos, disponibilidad y precios; el cliente no define el total confiable.
4. Se crea un pedido idempotente con medio de pago offline.
5. El negocio recibe y gestiona el pedido desde una sesión autorizada.
6. El cliente recibe confirmación y, cuando aplique, seguimiento por WhatsApp.

## Preguntas de priorización

- **¿Quién sufre más sin estas correcciones?** El cliente que no logra completar un pedido confiable
  y el operador que recibe pedidos inválidos o queda expuesto a accesos indebidos.
- **¿Qué pasa si no se resuelve en tres meses?** Persisten el abuso del endpoint público, el riesgo
  multi-tenant, los flujos administrativos frágiles y código de pagos que no aporta al alcance real.
- **¿Qué métrica de negocio mueve?** Pedidos válidos completados, tasa de rechazo por datos inválidos,
  tiempo de atención y número de incidentes de autorización; no se priorizarán mejoras solo visuales.

## Backlog RICE simplificado

Puntaje = `(alcance + impacto + confianza + esfuerzo) / 4`; 5 en esfuerzo significa poco trabajo.

| Orden | Capacidad | A | I | C | E | Puntaje |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 1 | Retirar pagos en línea y dejar un contrato offline único | 3 | 5 | 5 | 4 | 4,25 |
| 2 | Crear pedidos públicos mediante backend seguro | 5 | 5 | 5 | 2 | 4,25 |
| 3 | Completar autenticación y alta segura de personal | 3 | 5 | 5 | 3 | 4,00 |
| 4 | Formalizar documentación, pruebas y CI | 4 | 4 | 5 | 3 | 4,00 |
| 5 | Completar aislamiento multi-tenant | 4 | 5 | 4 | 2 | 3,75 |
| 6 | Completar operación real de WhatsApp | 3 | 4 | 4 | 2 | 3,25 |
| 7 | Resolver dependencias y rendimiento | 4 | 3 | 4 | 2 | 3,25 |

## Roadmap

### MVP (v1) — estabilización y lanzamiento

Estimación no comprometida: **4–6 semanas de desarrollo**, condicionada por credenciales,
configuración externa, disponibilidad del operador para validar y alcance real de la migración de
datos.

- Retiro total del código de pagos en línea.
- Checkout público seguro con precios recalculados en backend y control antiabuso.
- Autorización administrativa sin fallbacks y alta segura de personal.
- Pruebas críticas, CI y smoke de producción.
- Documentación mínima de stack, operación, costos y rollback.

### v2 — operación robusta

- Aislamiento multi-tenant completo con migración reversible.
- WhatsApp conectado de extremo a extremo.
- Observabilidad de pedidos, errores y costos.

### v3 — optimización

- Reducción del bundle y presupuestos de rendimiento.
- Analítica de conversión y operación basada en datos reales.
- Mejoras de experiencia validadas con métricas.

## Fuera de alcance

- MercadoPago, Stripe u otra plataforma de pago en línea.
- Suscripciones, cobro automático, tarjetas y reintentos de pasarela.
- Borrado de datos de producción sin el protocolo de migración de Cronos.
- Nuevas funcionalidades de crecimiento antes de cerrar seguridad, QA y operación básica.
