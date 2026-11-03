# Hoja de Ruta hacia Producción — La Parada (`laparada-26`)

Este archivo es la **fuente de verdad persistente entre sesiones** para el comando `/avanzar`. Cada vez que una tarea se completa, valida, prueba y sube al repositorio (`git commit` + `git push`), se marca con `[x]` aquí.

---

## Tareas Completadas (`[x]`)

- [x] **Paso 1 — Desbloqueo de edición de datos del negocio (`laparada`) y enlace configurable de WhatsApp:**
  - Persistido `negocios/laparada` desde `/admin-settings` ([negociosService.ts](../src/services/negociosService.ts), [firestore.rules](../firestore.rules)).
  - Enlace de WhatsApp en [LandingTiendaPage.tsx](../src/pages/LandingTiendaPage.tsx) configurable vía `VITE_WHATSAPP_PHONE` para la nueva SIM Card exclusiva de La Parada.
- [x] **Paso 2 — Contrato unificado de Combos (`precioEspecial`) e `ItemVenta` en WhatsApp + Mejora de `ComboForm`:**
  - Corregido `precioCombo` → `precioEspecial` en [menuGenerationService.ts](../firebase-functions/src/bot/menuGenerationService.ts) y [orderProcessingService.ts](../firebase-functions/src/bot/orderProcessingService.ts).
  - Estandarizados los ítems de WhatsApp con `tipo`, `referenciaId` y `precioUnitario` ([buildWhatsAppSaleItem](../firebase-functions/src/bot/orderProcessingService.ts)).
  - Selector de productos reales del catálogo y cálculo de `precioTotal` en [ComboForm.tsx](../src/components/productos/ComboForm.tsx).
- [x] **Paso 3 — Índices de Firestore, Reglas de Inventario y Alerta Sonora Web Audio API:**
  - Agregado índice compuesto `(negocioId, clienteTelefono)` para `domicilios` en [firestore.indexes.json](../firestore.indexes.json).
  - Restringido `allow create` de `inventario` y `entradas_inventario` a `canAdminCreateTenantDocument()` en [firestore.rules](../firestore.rules).
  - Sintetizador de alerta sonora `playNewOrderChime()` en [DomiciliosPage.tsx](../src/pages/DomiciliosPage.tsx).
- [x] **Paso 4 — Motor `deepseekEngine.ts` + Tools de Pedidos en Cloud Functions (Arquitectura Sarin Bot):**
  - Creado [deepseekEngine.ts](../firebase-functions/src/ai/deepseekEngine.ts) y [aiOrderOrchestrator.ts](../firebase-functions/src/bot/aiOrderOrchestrator.ts) con las 4 herramientas verificadas contra Firestore (`consultar_menu`, `modificar_carrito`, `confirmar_pedido`, `consultar_estado_o_escalar`).
- [x] **Paso 5 — Despertador inmediato en `whatsappWebhook`, Relevo Humano/Bot (`handoff`) y Base de Sarin Voz en POS:**
  - Ejecución en caliente con `kickWhatsAppQueueProcessor` en [whatsappWebhook.ts](../firebase-functions/src/webhooks/whatsappWebhook.ts) y pausa automática de 2 h cuando responde un humano.
  - Base del Copiloto de Voz Manos Libres Sarin en [SarinVoiceAssistant.tsx](../src/components/pos/SarinVoiceAssistant.tsx) y [sarinVoicePos.ts](../src/utils/sarinVoicePos.ts).
- [x] **Tarea 6 — Perfeccionamiento Integral del Copiloto de Voz Sarin (UX Didáctica, Consultas de Caja/Turno y Domicilios por Voz):**
  - Consultas operativas en tiempo real por voz (`consultar_ventas_hoy`, `consultar_caja`, `consultar_domicilios`) conectadas a Firestore con aislamiento por `negocioId` ([ventasService.ts](../src/services/ventasService.ts), [sarinVoicePos.ts](../src/utils/sarinVoicePos.ts)).
  - Micro-tono auditivo de confirmación (`playSarinWakeBeep`), modo de entrenamiento didáctico interactivo con ejecución a 1 clic y registro de los últimos 3 comandos de voz con acciones de **Deshacer** y **Repetir** ([SarinVoiceAssistant.tsx](../src/components/pos/SarinVoiceAssistant.tsx), [POSPage.tsx](../src/pages/POSPage.tsx)).
  - Validado E2E en navegador Chromium verificando cálculo de cambio exacto (`$ 500`), persistencia de venta y consultas operativas en `/pos`.

---

## Tareas Pendientes por Ejecutar con `/avanzar` (`[ ]`)

### [ ] Tarea 7 — Conectar Cierre de Caja en la Interfaz y Limpieza de Código Huérfano / Compilados
- **Objetivo:**
  1. Conectar [`crearCierreCaja`](../src/services/cierreCajaService.ts) y el historial de cierres (`getCierreCajaHoy`, `getUltimosCierres`) en [DashboardPage.tsx](../src/pages/DashboardPage.tsx) y/o [ReportesPage.tsx](../src/pages/ReportesPage.tsx) con diseño acorde a [DESIGN.md](../DESIGN.md).
  2. Eliminar los servicios backend desconectados y sin aislamiento multi-tenant:
     - `firebase-functions/src/ai/claudeService.ts`
     - `firebase-functions/src/loyalty/loyaltyService.ts`
     - `firebase-functions/src/analytics/*`
     - `src/pages/Phase10DashboardPage.tsx`
  3. Limpiar los archivos `.js` y `.d.ts` compilados mezclados en `firebase-functions/` y asegurar que `pnpm build:all`, `pnpm test` y `pnpm check:bundle` pasen sin advertencias.

### [ ] Tarea 8 — Plataforma SaaS Multi-Tenant: Planes por Días/Cuota de IA, Panel SuperAdmin (`/super-admin/negocios` en `SISTEMA`) y Registro de Locales (`/registro-negocio`)
- **Objetivo:**
  1. **Planes de Suscripción Offline y Control de Cuota de IA (`src/types/negocio.ts`, `src/services/negociosService.ts`, `firestore.rules`):**
     - Soportar los 4 planes comerciales activables por el SuperAdmin (`andres.san1404@gmail.com`):
       - **Prueba 3 días (`prueba_3d`):** `$ 5.000 COP` · `3 días de acceso` y `300 respuestas de IA`. Agenda, reservas por conversación, enlace del negocio y QR.
       - **Semanal (`semanal_7d`):** `$ 19.900 COP` · `7 días de acceso` y `700 respuestas de IA`. Agenda, reservas por conversación, enlace del negocio y QR.
       - **Quincenal (`quincenal_15d`):** `$ 34.900 COP` · `15 días de acceso` y `1.500 respuestas de IA`. Agenda, reservas por conversación, enlace del negocio y QR.
       - **Mensual (`mensual_30d`):** `$ 59.900 COP` · `30 días de acceso` y `3.000 respuestas de IA`. Agenda, reservas por conversación, enlace del negocio y QR.
     - Validar vigencia (`suscripcionVenceEn`) y saldo de respuestas (`respuestasIAUsadas < cuotaRespuestasIA`) en `firebase-functions/src/bot/aiOrderOrchestrator.ts`, incrementando atómicamente el contador en cada respuesta generada por Sarin IA.
  2. **Centro de Control SuperAdmin (`/super-admin/negocios` en sección `SISTEMA`) y Selector de Tienda (`Header.tsx`):**
     - Restaurar y modernizar `SuperAdminNegociosPage.tsx` dentro del menú `SISTEMA` (visible solo para `esSuperAdmin`) con métricas de negocios activos/pendientes/por vencer, activación o renovación de plan con 1 clic (`+3d`, `+7d`, `+15d`, `+30d`), barra de consumo de IA por local y selector en `Header.tsx` para inspeccionar/operar cualquier negocio.
  3. **Solicitud de Alta de Nuevos Negocios (`/registro-negocio`) y Widget de Suscripción para Administradores:**
     - Restaurar `RegistroNegocioPage.tsx` permitiendo elegir el plan deseado (empezando por la Prueba de 3 días por `$ 5.000`) y mostrar en el Dashboard de cada administrador de tienda sus días restantes, respuestas de IA disponibles y botón de renovación por WhatsApp.

### [ ] Tarea 9 — Enlace Único por Negocio (`/tienda/:slug`), Generador de Código QR Descargable y Marketplace en Landing
- **Objetivo:**
  1. **Rutas Públicas por Negocio (`/tienda/:slug`):**
     - Permitir que cada local activo tenga su propio storefront público en `/tienda/:slug` cargando exclusivamente sus productos, combos, categorías, teléfono de WhatsApp y chat de su `negocioId`, mientras `/` mantiene la experiencia insignia de **La Parada**.
  2. **Tarjeta de Enlace del Negocio + Generador de Código QR en `/admin-settings`:**
     - En la pestaña **Datos del Negocio** de [AdminSettingsPage.tsx](../src/pages/AdminSettingsPage.tsx), mostrar el enlace público del local (`/tienda/:slug`), botón de copiado rápido y un **Código QR vectorial (SVG/Canvas) descargable como afiche PNG** listo para imprimir y colocar en mesas o mostrador.
  3. **Marketplace de Locales Registrados y Vitrina de Planes SaaS en `LandingTiendaPage.tsx`:**
     - Agregar en la landing una sección **Marketplace de Locales y Puestos Aliados** (tarjetas de negocios activos con buscador, ciudad, estado y acceso directo a `/tienda/:slug`) y una sección comercial con los 4 planes (**Prueba 3 días \$ 5.000**, **Semanal \$ 19.900**, **Quincenal \$ 34.900**, **Mensual \$ 59.900**) conectada a `/registro-negocio`.

### [ ] Tarea 10 — Módulo de Agenda y Reservas por Conversación con Sarin IA (`/reservas`)
- **Objetivo:**
  1. **Colección Multi-Tenant `reservas` y Reglas de Seguridad:**
     - Crear el contrato `ReservaNegocio` (`id`, `negocioId`, `clienteNombre`, `clienteTelefono`, `fechaHoraReserva`, `personas`, `notas`, `estado: 'pendiente' | 'confirmada' | 'completada' | 'cancelada'`, `origen: 'whatsapp' | 'web' | 'pos'`) con sus reglas en [firestore.rules](../firestore.rules) e índice compuesto en [firestore.indexes.json](../firestore.indexes.json).
  2. **Herramienta `agendar_reserva` en Sarin IA (`deepseekEngine.ts` y `aiOrderOrchestrator.ts`):**
     - Permitir que Sarin tome y confirme reservas de mesas o pedidos programados por conversación de WhatsApp, guardándolos verificados en `reservas`.
  3. **Vista de Agenda y Reservas (`/reservas` en grupo `Operación`):**
     - Interfaz administrativa para visualizar la agenda del día y próximas reservas, crear reservas manuales y cambiar su estado con 1 toque.

### [ ] Tarea 11 — Configuración de Secretos en Google Cloud Secret Manager y Habilitación de Anonymous Auth
- **Objetivo:**
  1. Configurar en el proyecto `laparada-26` los secretos de Cloud Functions (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `DEEPSEEK_API_KEY`) y parámetros de la nueva SIM Card de WhatsApp Business (`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_NEGOCIO_ID=laparada`).
  2. Habilitar el proveedor **Anonymous** en Firebase Authentication para el widget de Chat en Vivo (`LiveChatWidget.tsx`).

### [ ] Tarea 12 — Despliegue Completo a Producción (`laparada-26`) y Pruebas E2E con MCP Playwright
- **Objetivo:**
  1. Desplegar reglas e índices: `firebase deploy --only firestore:rules,firestore:indexes,storage`.
  2. Desplegar todas las Cloud Functions: `firebase deploy --only functions`.
  3. Desplegar el frontend y ejecutar verificación E2E con MCP Playwright comprobando:
     - Pedido público en tienda web (`crearPedidoPublico`) y navegación por `/tienda/:slug` desde el Marketplace.
     - Gestión SaaS en `/super-admin/negocios` (activación de plan y cuota de IA) + descarga de QR en `/admin-settings`.
     - Registro de venta por voz con Sarin en `/pos`, agenda de reservas (`/reservas`) y cierre de caja.
     - Flujo de pedido y reserva por WhatsApp con el motor DeepSeek.
