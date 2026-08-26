# Mejoras priorizadas de LaParada

Fecha de revisión: 2026-08-25  
Horizonte: estabilización del pedido offline antes del siguiente despliegue.

## Dirección de producto

LaParada se enfocará en pedidos con pago offline. MercadoPago, Stripe y cualquier plataforma de
pago en línea quedan fuera del producto y deben retirarse de código, configuración y experiencia.
El alcance completo y su justificación viven en `BRIEF.md`; la secuencia ejecutable y sus gates
viven en `tasks.md`.

## Prioridades

1. Retirar completamente pagos en línea sin borrar datos remotos.
2. Sustituir la escritura pública directa de domicilios por un backend que recalcule el pedido.
3. Completar autenticación, alta de personal y aislamiento multi-tenant.
4. Conectar WhatsApp de extremo a extremo sin enlaces de cobro.
5. Automatizar QA/CI y después abordar dependencias, rendimiento y accesibilidad.
6. Desplegar por componentes únicamente con autorización y evidencia.

## Resultado esperado del MVP

- Tienda y checkout funcionales con efectivo y transferencia manual, ambos offline.
- El backend es la autoridad de precios, disponibilidad y total.
- Ningún SDK, secreto, webhook, job o pantalla depende de una pasarela.
- Acceso administrativo y datos aislados por tenant.
- Pruebas repetibles para tienda, pedidos, reglas, autenticación y operación.

## Condiciones externas

- No crear ni configurar secretos de MercadoPago, Stripe u otras pasarelas.
- Mantener únicamente secretos independientes de WhatsApp e IA cuando una Function realmente los
  use.
- Confirmar costos, alerta de presupuesto y autorización antes de habilitar APIs o desplegar.
- Respaldar y documentar rollback antes de cualquier migración de datos; el retiro local de código
  de pagos no autoriza borrar el historial existente.
