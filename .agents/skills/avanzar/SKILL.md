---
name: avanzar
description: >-
  Avanza paso a paso con la siguiente tarea pendiente hacia producción en La Parada.
  Activar siempre que el usuario escriba `/avanzar`, pida continuar con las tareas
  pendientes en una nueva sesión, o solicite planificar e implementar el siguiente paso
  de `docs/HOJA_DE_RUTA_PRODUCCION.md` o `TASKS.md`.
---

# Skill `/avanzar` — Ciclo Completo de Planificación, Construcción Limpia, QA con Playwright y Cierre de Sesión

Cuando el usuario invoque `/avanzar` (o pida avanzar con las tareas pendientes en una nueva sesión), ejecuta estrictamente este protocolo de 5 fases integrando la **Matriz de 6 Niveles de Modelo y Esfuerzo**:

---

## Matriz de 6 Niveles de Modelo y Esfuerzo (3.8 Flash + Argon)

Para maximizar la eficiencia de tokens y la precisión arquitectónica, cada tarea registrada en `TASKS.md` / `docs/HOJA_DE_RUTA_PRODUCCION.md` y cada cierre de sesión de `/avanzar` debe clasificar la próxima tarea pendiente eligiendo **exactamente uno de estos 6 niveles**:

| # | Nivel | Complejidad & Alcance Típico | Ejemplos en La Parada | Criterio de Selección |
|---|---|---|---|---|
| **1** | **`3.8 Flash (Low)`** | Ajustes cosméticos, textos, typos, normalización de saltos de línea (LF), documentación básica. | Corrección de textos de ayuda, añadir un icono existente, actualizar comentarios. | Tareas 100% mecánicas sin lógica condicional nueva. |
| **2** | **`3.8 Flash (Medium)`** | Componentes UI modulares aislados, formularios sencillos, utilidades puras y sus pruebas unitarias. | Nuevo modal de confirmación, card visual, utilitario de formateo puro con Vitest. | Patrones ya consolidados en el proyecto sin impacto estructural. |
| **3** | **`3.8 Flash (High)`** | Vistas frontend interactivas con estado local/contexto rico, dashboards táctiles y múltiples componentes. | Rediseño de terminal POS, KDS de cocina con temporizadores y sonidos, integración de modales múltiples. | Lógica de presentación y UX táctil avanzada sin mutaciones de base de datos complejas. |
| **4** | **`Argon (Low)`** | Contratos de datos, sincronización tipada frontend-backend, scripts de optimización y build. | Refactorización de interfaces en `src/types/`, contratos de Cloud Functions, bundle tuning en Vite. | Requiere alta precisión sintáctica y cero discrepancias tipadas. |
| **5** | **`Argon (Medium)`** | Lógica de negocio crítica, cálculos financieros, inventario atómico, auditoría y reglas de seguridad. | Módulos de caja y arqueo, reversión de stock en recetas de escandallo, descuentos, `firestore.rules`. | Cero tolerancia a errores en dinero, inventario, permisos o aislamiento tenant. |
| **6** | **`Argon (High)`** | Arquitectura core, subsistemas nuevos completos, boundaries de sincronización offline o refactors masivos. | Sincronización offline con resolución de conflictos, pasarela de autenticación SaaS multi-tenant, migración estructural. | Máxima demanda cognitiva, decisiones de diseño que impactan todo el repositorio. |

---

## Fase 1: Verificación de Sincronía con GitHub y Selección de la Siguiente Tarea
1. **Verificación Automática de Commit (`HEAD === origin/main`):** Antes de leer tareas o tocar código, verifica sin intervención manual que el área de trabajo local esté exactamente en el mismo commit que `https://github.com/andresleosan/laparada` (`origin/main`):
   ```powershell
   git fetch origin main
   $localSha = (git rev-parse HEAD).Trim()
   $remoteSha = (git rev-parse origin/main).Trim()
   if ($localSha -ne $remoteSha) { git pull --ff-only origin main }
   ```
   - Si existen commits locales pendientes de subir de una sesión previa, realiza `git push origin main` o alinea la rama antes de iniciar.
2. Lee obligatoriamente estos archivos antes de proponer o tocar código:
   - [`TASKS.md`](../../../TASKS.md) / [`docs/HOJA_DE_RUTA_PRODUCCION.md`](../../../docs/HOJA_DE_RUTA_PRODUCCION.md): Identifica la **primera tarea marcada con `[ ]`** y verifica el nivel de modelo y esfuerzo asignado.
   - [`AGENTS.md`](../../../AGENTS.md): Verifica las reglas críticas de negocio (aislamiento multi-tenant por `negocioId`, pagos 100 % offline sin pasarelas en línea, autoridad de precios en servidor y TypeScript estricto).
   - [`DESIGN.md`](../../../DESIGN.md): Verifica los tokens visuales (`#0A0A0A`, `#C9A84C`, `font-display`), accesibilidad (`aria-label`, `aria-pressed`, objetivos de `44×44 px`) y ergonomía táctil.

---

## Fase 2: Ideación y Planificación Rigurosa (`/brainstorming` + `/writing-plans` + `/grill-me`)
1. **Ideación (`/brainstorming`):** Analiza la tarea activa buscando la solución más intuitiva, didáctica y ergonómica para el cajero/administrador.
2. **Alineación (`/grill-me`):** Si existe alguna decisión de negocio ambigua, resuélvela con preguntas concretas; si los requisitos ya están claros, presenta el plan ejecutable directamente.
3. **Planificación (`/writing-plans`):** Estructura los archivos exactos a crear/editar, las validaciones de seguridad y los casos de prueba antes de escribir código.

---

## Fase 3: Construcción Impecable, Segura y Limpia
1. **Diseño y Experiencia:** Paleta oscura gastronómica, jerarquía tipográfica, micro-interacciones claras y estados vacíos explícitos.
2. **Seguridad Multi-Tenant:** Toda lectura/escritura debe validar `negocioId`. Ningún cálculo financiero debe admitir montos negativos o inconsistentes.
3. **Higiene y Rendimiento:** Cero código muerto, cero `any` injustificados, cero dependencias redundantes, cero advertencias de ESLint y saltos de línea normalizados (`LF`).

---

## Fase 4: Verificación Integral y Pruebas
1. Ejecuta las suites de pruebas y compilación en la terminal:
   ```powershell
   corepack pnpm test
   corepack pnpm run lint
   corepack pnpm run build:all
   corepack pnpm check:bundle
   ```
2. Valida la integración funcional para asegurar que no hay regresiones visuales ni de consola.

---

## Fase 5: Actualización de Hoja de Ruta, Clasificación de la Próxima Tarea, Commit y Cierre
1. Marca la tarea actual completada como `[x]` en [`TASKS.md`](../../../TASKS.md) y [`docs/HOJA_DE_RUTA_PRODUCCION.md`](../../../docs/HOJA_DE_RUTA_PRODUCCION.md).
2. **Clasificación Obligatoria de la Siguiente Tarea:** Analiza la siguiente tarea pendiente `[ ]` en la lista y asígnale **exactamente uno de los 6 niveles de la Matriz (3.8 Flash + Argon)** según su complejidad técnica, impacto arquitectónico y riesgo financiero/seguridad.
3. Revisa `git status`, realiza `git add .`, `git commit` descriptivo, ejecuta `git push origin main` y **verifica automáticamente que el commit local y el remoto en `https://github.com/andresleosan/laparada` sean idénticos**:
   ```powershell
   $localSha = (git rev-parse --short HEAD).Trim()
   $remoteSha = ((git ls-remote origin refs/heads/main) -split '\s+')[0].Substring(0, $localSha.Length)
   if ($localSha -ne $remoteSha) { throw "Desincronización detectada entre HEAD ($localSha) y origin/main ($remoteSha)" }
   ```
4. **Mensaje de Cierre Obligatorio:** Finaliza tu respuesta indicando explícitamente:
   > **"✅ Todo quedó implementado, validado y subido al repositorio. Ya podemos iniciar otra sesión y usar el comando `/avanzar`."**
   > 🔗 **Sincronía GitHub verificada (`HEAD === origin/main`):** `<commit-sha>` en `https://github.com/andresleosan/laparada`
   > 
   > 🎯 **Recomendación de Modelo para la Siguiente Sesión:** `[Uno de los 6 niveles de la Matriz]`
   > 💡 **Motivo:** [Explicación concisa del porqué ese nivel optimiza tokens y garantiza precisión para esa tarea específica].
