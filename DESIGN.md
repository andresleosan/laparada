# La Parada — Sistema de Diseño, Experiencia de Usuario y Estándares de Interfaz (`DESIGN.md`)

Este documento define las reglas visuales, ergonómicas, de accesibilidad, voz (Sarin Copiloto) y rendimiento para todas las interfaces de **La Parada** (Storefront Público, Punto de Venta POS, Panel Administrativo y Bandeja de WhatsApp).

---

## 1. Identidad Visual y Dirección Estética (`/impeccable`, `/taste-skill`, `/redesign-skill`)

- **Personalidad de Marca:** Gastronomía nocturna artesanal de alta rotación en Cúcuta. Cálida, apetitosa, directa y sin fricción operativa.
- **Paleta de Colores Oficial (`tailwind.config.ts`):**
  - **Superficies Base:**
    - `bg-base-dark` (`#0A0A0A`) y `bg-base-darker` (`#050505`) para fondos principales.
    - `bg-neutral-900` (`#121212`) y `bg-neutral-950` con bordes `border-neutral-800` (`#242424`) para tarjetas operativas.
    - Gradiente gastronómico `.bg-restaurant-theme` (`#0d0907` con acentos radiales cálidos ámbar/rojo) en el storefront.
  - **Acentos de Marca y Jerarquía:**
    - **Oro / Ámbar (`gold-400` `#C9A84C`, `amber-400` / `amber-500`):** Precios, totales de cobro, acciones primarias y destacados.
    - **Esmeralda (`emerald-400` / `emerald-500`):** Estados activos en vivo (WhatsApp directo, micrófono activo de Sarin, pedidos entregados).
  - **Semántica de Estados (`status`):**
    - Pendiente: `#EAB308` (`yellow-500`)
    - En preparación / Cocina: `#EA580C` (`orange-600`)
    - En camino / Domicilio: `#0EA5E9` (`sky-500`)
    - Entregado / Confirmado: `#22C55E` (`green-500`)
    - Error / Alerta de Caja: `#EF4444` (`red-500`)

---

## 2. Tipografía y Legibilidad Operativa

- **Títulos y Montos (`font-display`):** `Syne` (`font-black` / `font-bold`). Uso obligatorio en encabezados de vista, totales del ticket POS y montos de cambio/vueltas.
- **Cuerpo y Controles (`font-body`):** `DM Sans` / `Inter`. Lectura clara en tickets, tablas de inventario y chats.
- **Formato de Moneda:** Todo valor monetario en pesos colombianos debe formatearse con `formatCOP(valor)` (sin decimales, con separador de miles `es-CO`).

---

## 3. Ergonomía en Punto de Venta y Copiloto de Voz Sarin

1. **Operación Manos Libres (`SarinVoiceAssistant`):**
   - El cajero o cocinero debe poder operar el POS mediante voz sin tocar la pantalla una vez activado el modo **Manos Libres**, usando la palabra de activación **"Sarin"**.
   - Toda acción por voz debe ofrecer **doble confirmación didáctica**:
     - **Auditiva:** Síntesis de voz clara (`es-CO`) indicando producto, total cobrado y cambio exacto a devolver.
     - **Visual:** Tarjeta de alto contraste con la frase escuchada, el resultado ejecutado y el recuadro de **Cambio a devolver** en tipografía `font-display`.
   - **Protección de Caja:** Si el monto hablado por el cajero es menor al precio oficial del catálogo, Sarin jamás registra una venta deficitaria: agrega el ítem al ticket y alerta verbal y visualmente cuánto dinero falta.
2. **Objetivos Táctiles (Touch Targets):**
   - Botones de acción frecuente (`+`, `-`, eliminar foto, cambiar estado de domicilio, activar micrófono) deben tener un área mínima de `44px × 44px` (`h-11 w-11` o equivalente) para operación rápida en pantallas táctiles o móviles.

---

## 4. Accesibilidad, Seguridad Frontend y Anti-Slop (`/frontend-security-coder`, `/antislop`, `/web-performance-optimization`)

- **Accesibilidad Semántica:**
  - Todo botón con solo ícono requiere `aria-label` descriptivo con el nombre de la entidad (ej. `Quitar foto de Combo familiar`).
  - Filtros de categorías y pestañas de estado deben usar `type="button"` y `aria-pressed`.
  - Modales deben gestionar el foco (`dialogFocus.ts`) y cerrarse con `Escape`.
- **Cero Slop Visual y de Código (`/antislop`, `/ponytail`):**
  - Prohibido sustituir errores de red por listas vacías silenciosas: mostrar siempre `EmptyState` con opción de **Reintentar**.
  - Prohibido usar precios enviados desde el cliente como fuente de verdad o incluir pasarelas de pago en línea (modelo 100 % offline).
- **Rendimiento Web (`/web-performance-optimization`):**
  - Carga diferida (`React.lazy` + `Suspense`) para rutas administrativas y widgets secundarios (`LiveChatWidget`).
  - Presupuesto de bundle verificado con `pnpm check:bundle`.
