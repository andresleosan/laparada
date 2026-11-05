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

---

## Próximas Tareas Pendientes (`[ ]`)

- [ ] **Tarea 28 — Kardex Contable de Inventario, Registro Detallado de Movimientos (Entradas, Salidas, Ajustes de Merma) y Exportación a Excel (CSV) en `/inventario`:** `Argon (Medium)`

