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
- [x] **Tarea 40 — Centro de Satisfacción del Cliente y Calificación Post-Venta (NPS 1-5 Estrellas, Encuesta Móvil a 1 Toque para Comensal en Mesa y Domicilio, Evaluación de Calidad de Comida y Servicio, Alerta de Quejas al Administrador y Redirección a Google Reviews para 5 Estrellas) en `/satisfaccion` y `/clientes`:** `3.8 Flash (High)`
- [x] **Tarea 41 — Menú Digital Interactivo en Mesa con Código QR por Mesa (`/mesa/:slug/:numeroMesa`), Llamado de Mesero / Asistencia en Salón, Solicitud de Pre-Cuenta desde el Móvil del Comensal y Autopedido Directo (Self-Ordering Opcional a la Comanda de Mesa) en `/mesas` y Storefront:** `3.8 Flash (High)`

---

## Próximas Tareas Pendientes (`[ ]`)

- [x] **Tarea 42 — Módulo de Lista de Espera Inteligente y Walk-ins en Salón (Gestión de Comensales en Puerta, Estimación Dinámica de Tiempo de Espera según Ocupación de Mesas, Asignación Directa al Desocupar y Llamado Automatizado por WhatsApp "Tu Mesa Está Lista") en `/espera` y `/mesas`:** `3.8 Flash (High)`
- [x] **Tarea 43 — Reportes Históricos y Analítica de Tandas de Vitrina + Rentabilidad por Producto (Historial de Tandas Cerradas, Tasa de Merma, Top Productos de Vitrina y Exportación CSV) en `/tandas` y `/reportes`:** `3.8 Flash (High)`

---

## Próximas Tareas Pendientes (`[ ]`)

- [x] **Tarea 44 — Centro de Control de Costos, Ingeniería de Menú (Matriz BCG Gastronómica: Platos Estrella, Caballos de Batalla, Rompecabezas y Perros) y Simulador de Precios Sugeridos según Food Cost Objetivo en `/ingenieria-menu` y `/productos`:** `3.8 Flash (High)`
- [x] **Tarea 45 — Módulo de Órdenes de Compra Inteligentes a Proveedores y Conteo Físico Rápido de Bodega (Sugerencia Automática por Quiebre de Stock Mínimo, Envío Directo por WhatsApp y Recepción en 1 Clic al Kardex con Actualización de Costo Unitario) en `/proveedores` y `/inventario`:** `Argon (Medium)`
- [x] **Tarea 46 — Centro de Metas Comerciales, Presupuesto Operativo Mensual, Punto de Equilibrio (Break-Even Point) en Tiempo Real y Alertas de Desviación de Gastos en `/reportes` y `/dashboard`:** `3.8 Flash (High)`
- [x] **Tarea 47 — Sincronización y Despliegue Integral a Producción (`laparada-26`: Reglas Firestore, Índices Compuestos, Storage Rules, Cloud Functions y Frontend Cloudflare Pages) + Suite E2E Expandida con Playwright:** `Argon (Medium)`
- [x] **Tarea 48 — Auditoría y Endurecimiento de Seguridad Multi-Tenant, Reglas de Menú QR en Salón (`firestore.rules`) y Tipado Estricto TypeScript:** `Argon (Medium)`
- [x] **Tarea 49 — Centro de Despacho Logístico de Domicilios, Tarifario de Zonas/Barrios de Cobertura, Asignación de Repartidores, Semáforo SLA en Vivo y Exportación Contable en `/domicilios` y `/pos`:** `Argon (Medium)`
- [x] **Tarea 50 — Sincronización y Despliegue a Producción (`laparada-26`: Reglas Firestore de Salón QR y Zonas de Domicilio, Cloud Functions y Frontend Cloudflare Pages) + Pruebas E2E de Despacho Logístico con Playwright:** `Argon (Medium)`
- [x] **Tarea 51 — Módulo de Combos Personalizables y "Arma tu Combo" con Grupos de Elección (Selección de Bebida, Acompañamiento y Salsas con Recálculo Automático de Escandallo e Inventario) en `/productos`, `/pos` y Storefront:** `3.8 Flash (High)`
- [x] **Tarea 52 — Sincronización y Despliegue a Producción (`laparada-26`: Frontend Cloudflare Pages con Combos Personalizables y Escandallo Dinámico) + Pruebas E2E de "Arma tu Combo" con Playwright:** `Argon (Medium)`
- [x] **Tarea 53 — Módulo de Libro de Reservas con Mapa de Mesas, Anticipos Offline por Transferencia y Confirmación Recordatoria por WhatsApp + Integración de Combos Personalizables en Kiosco (`/reservas`, `/mesas` y `/kiosco`):** `3.8 Flash (High)`
- [x] **Tarea 54 — Sincronización y Despliegue a Producción (`laparada-26`: Frontend Cloudflare Pages con Libro de Reservas, Mapa de Mesas, Anticipos Offline y Combos Personalizables en Kiosco) + Pruebas E2E con Playwright:** `Argon (Medium)`
- [x] **Tarea 55 — Módulo de Gestión de Producción de Cocina, Sub-Recetas / Preparaciones Base (Salsas de la Casa, Carnes Marinadas, Masas de Tequeños/Pancerotis) con Conversión Automática de Insumos Primarios a Lotes Preparados en Bodega y Kardex en `/inventario` y `/productos`:** `Argon (Medium)`
- [x] **Tarea 56 — Sincronización y Despliegue a Producción (`laparada-26`: Frontend Cloudflare Pages con Producción de Lotes y Sub-Recetas en Bodega) + Pruebas E2E con Playwright:** `Argon (Medium)`
- [x] **Tarea 57 — Módulo de Control de Mermas Operativas, Desperdicios de Cocina y Devoluciones de Producto con Impacto en P&L, Auditoría Forense y Alerta de Umbral de Merma en `/inventario`, `/cocina` y `/reportes`:** `Argon (Medium)`
- [x] **Tarea 58 — Sincronización y Despliegue a Producción (`laparada-26`: Frontend Cloudflare Pages con Control de Mermas Operativas, Desperdicios de Cocina, Devoluciones por Escandallo y Alerta de Umbral en P&L) + Pruebas E2E con Playwright:** `Argon (Medium)`
- [x] **Tarea 59 — Módulo de Cotizaciones Comerciales, Eventos Corporativos y Catering (Armador de Propuestas para Empresas y Fiestas, Simulador de Costo de Insumos y Margen del Evento, Registro de Anticipo Offline por Transferencia, Conversión Atómica a Venta/Comanda de Cocina en 1 Clic y Exportación/Envío Formal por WhatsApp) en `/cotizaciones` y `/pos`:** `Argon (Medium)`
- [x] **Tarea 60 — Sincronización y Despliegue a Producción (`laparada-26`: Reglas Firestore e Índices Compuestos de `/cotizaciones`, Frontend Cloudflare Pages con Cotizaciones Comerciales/Catering y Asistente Público de Cotización de Eventos en Storefront) + Pruebas E2E con Playwright:** `Argon (Medium)`
- [x] **Tarea 61 — Módulo de Cuentas Corrientes de Clientes, Fiado Controlado y Cartera por Cobrar (Cupo de Crédito Offline por Cliente/Empresa, Registro de Consumos a Crédito en POS y Mesas, Abonos Parciales/Totales en Efectivo o Transferencia, Estado de Cuenta y Recordatorio de Cobro por WhatsApp + Reporte de Cartera Vencida) en `/cartera`, `/clientes` y `/pos`:** `Argon (Medium)`
- [x] **Tarea 62 — Sincronización y Despliegue a Producción (`laparada-26`: Reglas Firestore e Índices Compuestos de `/cuentas_corrientes` y `/movimientos_cartera`, Frontend Cloudflare Pages con Cuentas Corrientes, Fiado Controlado y Cartera por Cobrar) + Pruebas E2E con Playwright:** `Argon (Medium)`
- [x] **Tarea 63 — Módulo de Bonos de Regalo Digitales, Tarjetas Prepago y Vales de Consumo Offline (Emisión con Código QR Único, Carga de Saldo en Efectivo o Transferencia, Redención Parcial o Total en POS y Mesas, Control de Vigencia y Auditoría de Saldos) en `/bonos`, `/pos` y `/mesas`:** `Argon (Medium)`
- [x] **Tarea 64 — Sincronización y Despliegue a Producción (`laparada-26`: Reglas Firestore e Índices Compuestos de `/bonos_prepago` y `/movimientos_bonos`, Frontend Cloudflare Pages con Bonos de Regalo Digitales, Tarjetas Prepago y Vales Offline + Asistente Público de Bonos de Regalo en Storefront) + Pruebas E2E con Playwright:** `Argon (Medium)`
- [x] **Tarea 65 — Módulo de Movimientos de Caja en Turno, Sangrías / Retiros a Caja Fuerte, Caja Menor, Ingresos de Sencillo y Corte X (Arqueo Parcial de Relevo) con Impacto Exacto en Efectivo Esperado y Auditoría Forense en `/caja`, `/pos` y `/dashboard`:** `Argon (Medium)`
- [x] **Tarea 66 — Sincronización y Despliegue a Producción (`laparada-26`: Reglas Firestore e Índices Compuestos de `/movimientos_caja` y `/cortes_x`, Frontend Cloudflare Pages con Movimientos de Caja en Turno, Sangrías, Caja Menor y Corte X) + Pruebas E2E con Playwright:** `Argon (Medium)`
- [x] **Tarea 67 — Módulo de Gastos Operativos Detallados, Control de Caja Menor por Categorías (Servicios Públicos, Arriendo, Aseo, Mantenimiento, Transporte) y Conciliación en Estado de Resultados (P&L) y Cierre de Turno en `/gastos`, `/caja` y `/reportes`:** `Argon (Medium)`
- [x] **Tarea 68 — Sincronización y Despliegue a Producción (`laparada-26`: Reglas Firestore endurecidas de `/gastos`, Frontend Cloudflare Pages con Gastos Operativos Detallados, Control de Caja Menor por Categorías y Conciliación en P&L y Cierre de Turno) + Pruebas E2E con Playwright:** `Argon (Medium)`
- [x] **Tarea 69 — Módulo de Horarios de Atención por Día, Control de Disponibilidad Operativa (Abierto / Cerrado / Pausa Temporal en Cocina) y Validación Automática en Storefront, Kiosco y WhatsApp Bot (`/admin-settings`, Storefront y Cloud Functions):** `Argon (Medium)`
- [x] **Tarea 70 — Sincronización y Despliegue a Producción (`laparada-26`: Reglas Firestore de `/negocios` con `configHorarios`, Cloud Functions con validación de horarios en `crearPedidoPublico` y WhatsApp Bot, y Frontend Cloudflare Pages con Horarios y Pausa de Cocina) + Pruebas E2E con Playwright:** `Argon (Medium)`
- [x] **Tarea 71 — Módulo de Base de Sencillo en Ruta, Liquidación Formal de Domiciliarios y Conciliación con Caja en Turno (Entrega de Base Inicial al Repartidor, Rendición de Efectivo/Transferencias por Carrera y Acta de Liquidación) en `/repartidor`, `/domicilios` y `/caja`:** `Argon (Medium)`
- [x] **Tarea 72 — Sincronización y Despliegue a Producción (`laparada-26`: Reglas Firestore e Índices Compuestos de `/liquidaciones_domiciliarios`, y Frontend Cloudflare Pages con Base de Sencillo en Ruta, Liquidación Formal de Domiciliarios y Conciliación con Caja en Turno) + Pruebas E2E con Playwright:** `Argon (Medium)`
- [x] **Tarea 73 — Módulo de Comandas por Estación de Cocina (Fritura, Plancha, Bebidas / Barra) y Tiempos Objetivo de Preparación por Producto en `/cocina`, `/productos` y `/pos`:** `3.8 Flash (High)`
- [x] **Tarea 74 — Sincronización y Despliegue a Producción (`laparada-26`: Frontend Cloudflare Pages con Comandas por Estación de Cocina y Tiempos Objetivo de Preparación por Producto en `/cocina`, `/productos` y `/pos`) + Pruebas E2E con Playwright:** `Argon (Medium)`
- [x] **Tarea 75 — Módulo de Empaques, Bolsas y Desechables por Canal (Costo Automático de Empaque en Domicilios/Para Llevar, Deducción Atómica de Bodega por Pedido y Conciliación en Escandallo/P&L) en `/productos`, `/inventario`, `/pos` y `/reportes`:** `Argon (Medium)`
- [x] **Tarea 76 — Sincronización y Despliegue a Producción (`laparada-26`: Frontend Cloudflare Pages con Empaques, Bolsas y Desechables por Canal, Deducción Atómica y Conciliación en P&L) + Pruebas E2E con Playwright:** `Argon (Medium)`
- [x] **Tarea 77 — Módulo de Alérgenos, Restricciones Alimentarias e Información Nutricional por Producto (Declaración de Alérgenos y Etiquetas Vegetariano/Sin Gluten en `/productos`, Filtros y Badges en Storefront, Kiosco y Menú QR, y Advertencia Destacada de Alergias del Comensal en Comanda POS/Mesas y KDS):** `3.8 Flash (High)`
- [x] **Tarea 78 — Sincronización y Despliegue a Producción (`laparada-26`: Frontend Cloudflare Pages con Alérgenos, Restricciones Alimentarias y Advertencias de Alergia en Comanda) + Pruebas E2E con Playwright:** `Argon (Medium)`
- [x] **Tarea 79 — Módulo de Control de Lotes, Fechas de Vencimiento (PEPS / FIFO) y Semáforo Sanitario de Insumos en Bodega (Registro de Lote y Caducidad en Entradas de Inventario, Consumo Automático PEPS por Escandallo, Alerta de Próximos a Vencer 7d/3d/Vencidos, Baja Rápida a Merma Operativa y Exportación de Trazabilidad Sanitaria) en `/inventario`, `/notificaciones` y `/dashboard`:** `Argon (Medium)`
- [ ] **Tarea 80 — Sincronización y Despliegue a Producción (`laparada-26`: Reglas Firestore e Índices Compuestos de `/lotes_inventario`, Frontend Cloudflare Pages con Control de Lotes, Fechas de Vencimiento PEPS/FIFO y Semáforo Sanitario) + Pruebas E2E con Playwright:** `Argon (Medium)`

