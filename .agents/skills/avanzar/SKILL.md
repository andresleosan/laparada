---
name: avanzar
description: >-
  Avanza paso a paso con la siguiente tarea pendiente hacia producción en La Parada.
  Activar siempre que el usuario escriba `/avanzar`, pida continuar con las tareas
  pendientes en una nueva sesión, o solicite planificar e implementar el siguiente paso
  de `docs/HOJA_DE_RUTA_PRODUCCION.md`.
---

# Skill `/avanzar` — Ciclo Completo de Planificación, Construcción Limpia, QA con Playwright y Cierre de Sesión

Cuando el usuario invoque `/avanzar` (o pida avanzar con las tareas pendientes en una nueva sesión), ejecuta estrictamente este protocolo de 5 fases:

---

## Fase 1: Lectura de Contexto y Selección de la Siguiente Tarea
1. Lee obligatoriamente estos tres archivos del repositorio antes de proponer o tocar código:
   - [`docs/HOJA_DE_RUTA_PRODUCCION.md`](../../../docs/HOJA_DE_RUTA_PRODUCCION.md): Identifica la **primera tarea marcada con `[ ]`** (empezando por la **Tarea 6** sobre el perfeccionamiento de Sarin Voz en POS si aún está pendiente).
   - [`AGENTS.md`](../../../AGENTS.md): Verifica las reglas críticas de negocio (aislamiento multi-tenant por `negocioId`, pagos 100 % offline sin mencionar pasarelas en línea, autoridad de precios en servidor y TypeScript estricto).
   - [`DESIGN.md`](../../../DESIGN.md): Verifica los tokens visuales (`#0A0A0A`, `#C9A84C`, `Syne`, `DM Sans`), accesibilidad (`aria-label`, `aria-pressed`, objetivos de `44×44 px`) y ergonomía de voz de Sarin.

---

## Fase 2: Ideación y Planificación Rigurosa (`/brainstorming` + `/writing-plans` + `/grill-me`)
1. **Ideación (`/brainstorming`):** Analiza la tarea activa buscando la solución más intuitiva, didáctica y ergonómica para el cajero/administrador (especialmente en el flujo manos libres de Sarin Voz y Cierre de Caja).
2. **Alineación (`/grill-me`):** Si existe alguna decisión de negocio ambigua, resuélvela con preguntas concretas; si los requisitos ya están claros en `docs/HOJA_DE_RUTA_PRODUCCION.md`, presenta el plan ejecutable directamente.
3. **Planificación (`/writing-plans`):** Estructura los archivos exactos a crear/editar, las validaciones de seguridad y los casos de prueba antes de escribir código, incorporando explícitamente todos los requisitos de [`DESIGN.md`](../../../DESIGN.md).

---

## Fase 3: Construcción Impecable, Segura y Limpia
Primero construye toda la funcionalidad aplicando simultáneamente estos estándares:
1. **Diseño y Experiencia (`/impeccable`, `/taste-skill`, `/redesign-skill`):**
   - Respeta la paleta oscura gastronómica, jerarquía tipográfica (`font-display` para montos y vueltas), micro-interacciones claras y estados de carga/error explícitos (`EmptyState` con reintento).
2. **Seguridad (`/security-best-practices`, `/frontend-security-coder`):**
   - Toda lectura o escritura debe incluir y validar `negocioId`.
   - Ningún cálculo financiero debe permitir montos negativos, NaN o cobros en efectivo inferiores al total del catálogo.
   - Mantén actualizadas las reglas en `firestore.rules` si se tocan colecciones.
3. **Higiene, Rendimiento y Anti-Slop (`/antislop`, `/web-performance-optimization`, `/ponytail`):**
   - Cero código muerto, cero `any` injustificados, cero dependencias innecesarias y cero advertencias de ESLint.
   - Normaliza saltos de línea (`LF`) en los archivos editados.

---

## Fase 4: Verificación Integral y Pruebas con `/superpowers` + MCP Playwright
Una vez finalizado el ciclo de construcción:
1. Ejecuta las pruebas unitarias, de fronteras y de linting en la terminal (usando `corepack pnpm` en Windows):
   ```powershell
   corepack pnpm test
   corepack pnpm run lint
   corepack pnpm run build
   ```
2. Con ayuda del enfoque de `/superpowers`, ejecuta las pruebas de interfaz e integración extremo a extremo (incluyendo verificación en navegador / MCP Playwright cuando esté disponible o levantando el servidor local) para confirmar que la funcionalidad opera sin errores de consola ni regresiones visuales.

---

## Fase 5: Actualización de Hoja de Ruta, Commit, Push y Aviso de Nueva Sesión
1. Marca la tarea completada como `[x]` en [`docs/HOJA_DE_RUTA_PRODUCCION.md`](../../../docs/HOJA_DE_RUTA_PRODUCCION.md).
2. Revisa `git -c safe.directory=E:/Proyectos/la-parada status`, realiza `git -c safe.directory=E:/Proyectos/la-parada add`, `git -c safe.directory=E:/Proyectos/la-parada commit` con un mensaje descriptivo y ejecuta `git -c safe.directory=E:/Proyectos/la-parada push` (usando `BypassSandbox: true` únicamente para el `git push` si requiere red).
3. Tras validar que todo quedó en verde y subido al repositorio, finaliza tu respuesta diciéndole explícitamente al usuario:
   > **"✅ Todo quedó implementado, validado y subido al repositorio. Ya podemos iniciar otra sesión y usar el comando `/avanzar`."**
