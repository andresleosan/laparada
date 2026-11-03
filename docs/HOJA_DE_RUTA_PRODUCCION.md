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

---

## Tareas Pendientes por Ejecutar con `/avanzar` (`[ ]`)

### [ ] Tarea 6 — Perfeccionamiento Integral del Copiloto de Voz Sarin (UX Didáctica, Consultas de Caja/Turno y Domicilios por Voz)
- **Objetivo:** Llevar la idea del usuario (*"que Sarin me escuche sin necesidad de manipular la app... registra un panceroti ranchero pagado en efectivo con 5000 pesos... que sea inteligente y didáctico dentro de la app"*) a su máxima expresión siguiendo [DESIGN.md](../DESIGN.md):
  1. **Consultas operativas en tiempo real por voz:**
     - Permitir que el cajero pregunte sin tocar la pantalla: *"Sarin cuánto llevamos vendido hoy"*, *"Sarin cuánto hay en caja"*, *"Sarin cuántos domicilios hay pendientes"* y reciba respuesta hablada y visual con datos reales del tenant activo.
  2. **Modo Entrenamiento Didáctico Interactivo + Sonido de Confirmación (`beep` de escucha al oír `"Sarin"`):**
     - Emitir un micro-tono auditivo suave (Web Audio API) cuando Sarin detecta su nombre y procesa un comando, más historial de los últimos 3 comandos de voz ejecutados con opción de deshacer o repetir.
  3. **Validación E2E con MCP Playwright:**
     - Verificar en el navegador el flujo de voz/comando en `/pos`, comprobando que el registro de *"Sarin registra un panceroti ranchero pagado en efectivo con 5000 pesos"* muestra el cambio exacto y persiste la venta.

### [ ] Tarea 7 — Conectar Cierre de Caja en la Interfaz y Limpieza de Código Huérfano / Compilados
- **Objetivo:**
  1. Conectar [`crearCierreCaja`](../src/services/cierreCajaService.ts) y el historial de cierres (`getCierreCajaHoy`, `getUltimosCierres`) en [DashboardPage.tsx](../src/pages/DashboardPage.tsx) y/o [ReportesPage.tsx](../src/pages/ReportesPage.tsx) con diseño acorde a [DESIGN.md](../DESIGN.md).
  2. Eliminar los servicios backend desconectados y sin aislamiento multi-tenant:
     - `firebase-functions/src/ai/claudeService.ts`
     - `firebase-functions/src/loyalty/loyaltyService.ts`
     - `firebase-functions/src/analytics/*`
     - `src/pages/Phase10DashboardPage.tsx`
  3. Limpiar los archivos `.js` y `.d.ts` compilados mezclados en `firebase-functions/` y asegurar que `pnpm build:all`, `pnpm test` y `pnpm check:bundle` pasen sin advertencias.

### [ ] Tarea 8 — Configuración de Secretos en Google Cloud Secret Manager y Habilitación de Anonymous Auth
- **Objetivo:**
  1. Configurar en el proyecto `laparada-26` los secretos de Cloud Functions (`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `DEEPSEEK_API_KEY`) y parámetros de la nueva SIM Card de WhatsApp Business (`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_NEGOCIO_ID=laparada`).
  2. Habilitar el proveedor **Anonymous** en Firebase Authentication para el widget de Chat en Vivo (`LiveChatWidget.tsx`).

### [ ] Tarea 9 — Despliegue Completo a Producción (`laparada-26`) y Pruebas E2E con MCP Playwright
- **Objetivo:**
  1. Desplegar reglas e índices: `firebase deploy --only firestore:rules,firestore:indexes,storage`.
  2. Desplegar todas las Cloud Functions: `firebase deploy --only functions`.
  3. Desplegar el frontend y ejecutar verificación E2E con MCP Playwright comprobando:
     - Pedido público en tienda web (`crearPedidoPublico`).
     - Creación de personal (`crearUsuarioPersonal`).
     - Registro de venta por voz con Sarin en `/pos` y cierre de caja.
     - Flujo de pedido por WhatsApp con el motor DeepSeek.
