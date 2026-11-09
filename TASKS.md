# La Parada — Registro de Tareas de Producción & Matriz de Esfuerzo (TASKS.md)

Este documento sincroniza el progreso del proyecto con el comando `/avanzar` y establece el nivel óptimo de modelo y razonamiento para maximizar la eficiencia de tokens y precisión técnica.

---

## Matriz de 6 Niveles de Modelo y Esfuerzo (3.8 Flash + Argon)

Cada tarea pendiente debe estar clasificada con exactamente uno de estos 6 niveles:

1. **`3.8 Flash (Low)`**: Tareas mecánicas, de higiene, textos, normalización de saltos de línea (LF), documentación simple.
2. **`3.8 Flash (Medium)`**: Componentes modulares aislados, utilidades puras y sus pruebas unitarias en Vitest.
3. **`3.8 Flash (High)`**: Vistas interactivas completas, pantallas táctiles KDS/POS con estado rico y múltiples componentes.
4. **`Argon (Low)`**: Contratos de datos TypeScript (`src/types/`), sincronización tipada frontend-backend, optimización de bundles.
5. **`Argon (Medium)`**: Lógica de negocio crítica, cálculos financieros, inventario atómico, auditoría, reglas de seguridad Firestore.
6. **`Argon (High)`**: Arquitectura core profunda, subsistemas nuevos completos, boundaries de sincronización offline masivos.

---

## Tareas Completadas Recientes

- [x] **Tarea 24 — Módulo de Descuentos Comerciales, Cortesías de la Casa (100%) y Auditoría:** `Argon (Medium)`
- [x] **Tarea 25 — Módulo de Anulación y Cancelación Controlada de Ventas con Auditoría:** `Argon (Medium)`
- [x] **Tarea 26 — Rediseño Ergonómico del Menú y Navegación de La Parada POS (Patrón Toast POS / Square Rail):** `3.8 Flash (High)`
- [x] **Tarea 27 — Módulo de Traslado y Reasignación de Mesas (Cambio de Mesa) y Unión / Fusión de Cuentas en Salón (`/mesas`):** `Argon (Medium)`
- [x] **Tarea 28 — Kardex Contable de Inventario, Registro Detallado de Movimientos (Entradas, Salidas, Ajustes de Merma) y Exportación a Excel (CSV) en `/inventario`:** `Argon (Medium)`
- [x] **Tarea 29 — Centro de Analítica Financiera, Estado de Resultados (P&L: Ingresos, Costo de Insumos CMV, Mermas y Gastos Operativos), Margen de Utilidad Neta y Exportación Contable en `/reportes`:** `Argon (Medium)`
- [x] **Tarea 30 — Módulo de Proveedores y Cuentas por Pagar (Compras a Crédito / Plazos), Registro de Facturas de Compra y Programación de Pagos en `/proveedores`:** `Argon (Medium)`
- [x] **Tarea 31 — Módulo de Control de Turnos de Personal, Distribución de Propinas del Equipo, Registro de Vales/Adelantos y Liquidación de Nómina Operativa en `/personal`:** `Argon (Medium)`
- [x] **Tarea 32 — Centro de Fidelización VIP, Tarjeta Digital de Sellos/Recompensas por Visita, Detección de Clientes en Riesgo de Inactividad y Campañas Directas por WhatsApp en `/clientes` y `/pos`:** `3.8 Flash (High)`
- [x] **Tarea 33 — Modo Kiosco de Autoservicio / Terminal Táctil para Clientes (`/kiosco`), Personalización de Pedido, Emisión de Ticket de Turno para Pago en Caja y Pantalla de Llamador de Pedidos en Salón (`/turnos`):** `3.8 Flash (High)`

---

## Próximas Tareas Pendientes (`[ ]`)

- [x] **Tarea 34 — Centro de Auditoría y Bitácora de Seguridad Operativa (Log Inmutable de Anulaciones de Venta, Cortesías/Descuentos, Ajustes de Merma en Inventario, Cancelaciones de Comandas y Accesos de Personal) con Filtros Forenses y Exportación Contable en `/auditoria`:** `Argon (Medium)`
- [x] **Tarea 35 — Módulo de Gestión de Meseros y Asignación de Comandas en Salón (Desempeño Operativo, Ticket Promedio por Mesero, Comisiones/Incentivos y Liquidación de Propinas por Mesero) en `/meseros` y `/mesas`:** `Argon (Medium)`
- [x] **Tarea 36 — Módulo de Promociones Automatizadas, Happy Hour (Descuentos Dinámicos por Franja Horaria y Día de la Semana: 2x1, % OFF en Categorías) y Cupones Digitales con Código QR para Mostrador POS y Storefront Web en `/promociones` y `/pos`:** `3.8 Flash (High)`
- [x] **Tarea 37 — Centro de Notificaciones Operativas en Tiempo Real, Bandeja de Alertas Gastronómicas y Campana Flotante en Cabecera (Alertas Web Audio Diferenciadas por Urgencia, Filtro por Módulos: Pedidos Web/Kiosco, Comandas Demoradas en Cocina, Stock Mínimo en Bodega y Llamados de Meseros en Salón) en `/notificaciones` y Header:** `3.8 Flash (High)`
- [x] **Tarea 38 — Módulo de Configuración Fiscal, Impoconsumo (INC 8% / IVA), Rangos Consecutivos DIAN de Documento Equivalente POS, Comprobante Z Diario de Corte y Alerta de Vencimiento de Resolución en `/facturacion` y `/pos`:** `Argon (Medium)`
- [x] **Tarea 39 — Módulo de Conciliación Contable, Libro Fiscal de Operaciones Diarias (Art. 616 del E.T.), Consolidado Tributario para Declaración de Impoconsumo (Formulario 310 / IVA) y Exportación Parametrizada para Software Contable (Siigo, World Office, Helisa) en `/contabilidad` y `/reportes`:** `Argon (Medium)`

---

## Próximas Tareas Pendientes (`[ ]`)

- [ ] **Tarea 40 — Centro de Satisfacción del Cliente y Calificación Post-Venta (NPS 1-5 Estrellas, Encuesta Móvil a 1 Toque para Comensal en Mesa y Domicilio, Evaluación de Calidad de Comida y Servicio, Alerta de Quejas al Administrador y Redirección a Google Reviews para 5 Estrellas) en `/satisfaccion` y `/clientes`:** `3.8 Flash (High)`

