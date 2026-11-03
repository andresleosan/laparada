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
- [x] **Tarea 7 — Conectar Cierre de Caja en la Interfaz y Limpieza de Código Huérfano / Compilados:**
  - Conectado [`crearCierreCaja`](../src/services/cierreCajaService.ts) y [`useCierreCaja`](../src/hooks/useCierreCaja.ts) en [DashboardPage.tsx](../src/pages/DashboardPage.tsx) con tarjeta dedicada de Cierre de Caja del Día, verificación de turno cerrado y modal de confirmación con balance en tiempo real y notas de turno.
  - Sección **Historial de Cierres de Caja** conectada en [ReportesPage.tsx](../src/pages/ReportesPage.tsx) mostrando detalle cronológico inmutable (ingresos, POS, WhatsApp/Web, gastos y utilidad neta).
  - Eliminados los servicios obsoletos sin aislamiento multi-tenant (`claudeService.ts`, `loyaltyService.ts`, `firebase-functions/src/analytics/*`, `Phase10DashboardPage.tsx`).
  - Corregido `tsconfig.json` de Cloud Functions (`outDir: "lib"`, `"rootDir": "src"`), eliminado el desorden de compilados `.js`/`.d.ts` en la raíz de `firebase-functions/`, agregado `firebase-functions/lib/` a `.gitignore`, y verificado que `pnpm build:all`, `pnpm test` (212 pruebas unitarias) y `pnpm check:bundle` pasen al 100% sin advertencias.
- [x] **Tarea 8 — Plataforma SaaS Multi-Tenant: Planes por Días/Cuota de IA, Panel SuperAdmin (`/super-admin/negocios` en `SISTEMA`) y Registro de Locales (`/registro-negocio`):**
  - Modelados e implementados los 4 planes offline en [negocio.ts](../src/types/negocio.ts) y [negociosService.ts](../src/services/negociosService.ts) (**Prueba 3 días \$ 5.000 COP · 300 IA**, **Semanal 7 días \$ 19.900 COP · 700 IA**, **Quincenal 15 días \$ 34.900 COP · 1.500 IA**, **Mensual 30 días \$ 59.900 COP · 3.000 IA** y **Enterprise Insignia** para La Parada).
  - Validadas reglas de seguridad en [firestore.rules](../firestore.rules) permitiendo alta pública en estado pendiente, administración por SuperAdmin andres.san1404@gmail.com y aislamiento multi-tenant.
  - Conectada validación de vigencia de suscripción (`suscripcionVenceEn`) y límite de respuestas en [aiOrderOrchestrator.ts](../firebase-functions/src/bot/aiOrderOrchestrator.ts), con incremento atómico de `respuestasIAUsadas` por cada turno ejecutado por Sarin IA.
  - Centro de Control SuperAdmin en [SuperAdminNegociosPage.tsx](../src/pages/SuperAdminNegociosPage.tsx) (`/super-admin/negocios`) con 4 KPIs de plataforma, filtros, búsqueda, aprobación con selección de plan, renovación rápida con 1 clic (`+3d`, `+7d`, `+15d`, `+30d`), barra de consumo de IA y acción de operar cualquier local.
  - Selector de local activo en [Header.tsx](../src/components/layout/Header.tsx) y [NegocioContext.tsx](../src/context/NegocioContext.tsx) para inspeccionar y conmutar el negocio en operación en tiempo real.
  - Formulario de alta de restaurantes y puestos en [RegistroNegocioPage.tsx](../src/pages/RegistroNegocioPage.tsx) (`/registro-negocio`) con selector visual de los 4 planes SaaS, validación y pantalla de confirmación.
  - Widget de suscripción y saldo de IA en [SuscripcionWidget.tsx](../src/components/dashboard/SuscripcionWidget.tsx) integrado en [DashboardPage.tsx](../src/pages/DashboardPage.tsx) con enlace directo a renovación por WhatsApp.
  - 220 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), compilación frontend y Cloud Functions exitosa (`pnpm build:all`).
- [x] **Tarea 9 — Enlace Único por Negocio (`/tienda/:slug`), Generador de Código QR Descargable y Marketplace en Landing:**
  - Enrutamiento público multi-tenant en [App.tsx](../src/App.tsx) y [LandingTiendaPage.tsx](../src/pages/LandingTiendaPage.tsx) (`/tienda/:slug`), permitiendo que cada local activo sirva su catálogo aislado, combos, categorías, teléfono de WhatsApp y atención por chat con su `negocioId`, mientras `/` mantiene la experiencia insignia de La Parada.
  - Resolución resiliente de negocios por slug público o identificador canónico (`getNegocioPorSlug`) y listado público de comercios activos (`getNegociosActivosPublicos`) en [negociosService.ts](../src/services/negociosService.ts), respaldado por reglas de lectura pública para negocios con `estado == 'activo'` en [firestore.rules](../firestore.rules).
  - Tarjeta de enlace público y generador de afiche imprimible en [NegocioQRCard.tsx](../src/components/admin/NegocioQRCard.tsx) integrado en la pestaña **Datos del Negocio** de [AdminSettingsPage.tsx](../src/pages/AdminSettingsPage.tsx), con copiado a un clic, previsualización de QR en vivo y exportación en Canvas de afiche PNG en alta resolución (1200×1600 px) para mesas y mostradores ([qrPosterGenerator.ts](../src/utils/qrPosterGenerator.ts)).
  - Sección **Directorio Gastronómico de Locales Aliados** ([MarketplaceLocalesSection.tsx](../src/components/storefront/MarketplaceLocalesSection.tsx)) con buscador reactivo, filtros por ciudad y accesos directos al storefront de cada negocio.
  - Sección comercial **Vitrina de Planes SaaS** ([VitrinaPlanesSaaSSection.tsx](../src/components/storefront/VitrinaPlanesSaaSSection.tsx)) detallando los 4 planes offline con cuota de Sarin IA y enlace directo al registro de negocios.
  - Manejo integral de estados vacíos (`EmptyState`) en `/tienda/:slug` cuando el local no existe o no se encuentra activo, con opciones de retorno guiadas.
  - 234 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

## Tareas Pendientes por Ejecutar con `/avanzar` (`[ ]`)

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
