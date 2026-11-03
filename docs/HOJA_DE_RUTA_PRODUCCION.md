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
- [x] **Tarea 10 — Módulo de Agenda y Reservas por Conversación con Sarin IA (`/reservas`):**
  - Contrato multi-tenant `ReservaNegocio` e input `NuevaReservaInput` en [reserva.ts](../src/types/reserva.ts) y [types/index.ts](../src/types/index.ts).
  - Reglas de seguridad en [firestore.rules](../firestore.rules) restringiendo lectura/creación/actualización por `negocioId` y eliminación a administradores, junto con 3 índices compuestos en [firestore.indexes.json](../firestore.indexes.json).
  - Herramienta `agendar_reserva` en [deepseekEngine.ts](../firebase-functions/src/ai/deepseekEngine.ts) y ejecutor contra Firestore en [aiOrderOrchestrator.ts](../firebase-functions/src/bot/aiOrderOrchestrator.ts) con persistencia multi-tenant y pruebas unitarias en [whatsappBot.test.ts](../firebase-functions/test/whatsappBot.test.ts).
  - Servicio [reservasService.ts](../src/services/reservasService.ts) y hook reactivo en tiempo real [useReservas.ts](../src/hooks/useReservas.ts) con 12 pruebas unitarias.
  - Vista completa de Agenda y Reservas en [ReservasPage.tsx](../src/pages/ReservasPage.tsx) (`/reservas` en grupo `Operación`), modal accesible [NuevaReservaModal.tsx](../src/components/reservas/NuevaReservaModal.tsx) y tarjetas con acciones de 1 toque [ReservaCard.tsx](../src/components/reservas/ReservaCard.tsx), 4 KPIs de comensales y filtros de fecha/estado.
  - 253 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa de frontend y functions (`pnpm build:all`).

- [x] **Tarea 11 — Resumen Ejecutivo Diario de Productividad/Ventas y Notificaciones de Suscripción por Correo (`alsdevstudio@alsdevstudio.com` en Resend + Porkbun/Cloudflare):**
  - Motor transaccional multi-tenant en [emailNotificationService.ts](../firebase-functions/src/notifications/emailNotificationService.ts) vía API HTTPS de Resend con el remitente verificado `La Parada SaaS · ALS Dev Studio <alsdevstudio@alsdevstudio.com>` y `Reply-To: alsdevstudio@alsdevstudio.com`.
  - Plantillas de correo con identidad oscura gastronómica (`#0A0A0A`, `#C9A84C`) para el Resumen Ejecutivo Diario, confirmaciones de alta/renovación SaaS y alertas preventivas de vencimiento/cuota de Sarin IA.
  - Agregador diario multi-tenant en [dailySummaryAggregator.ts](../firebase-functions/src/notifications/dailySummaryAggregator.ts) en zona horaria Colombia (`America/Bogota`), consolidando ventas, ticket promedio, canales (POS vs WhatsApp/Web), métodos de pago (Efectivo vs Transferencia), Top 3 productos vendidos, domicilios entregados, reservas agendadas y estado del cierre de caja del turno.
  - Cloud Functions desplegadas en [dailySummaryFunctions.ts](../firebase-functions/src/notifications/dailySummaryFunctions.ts) y [subscriptionNotifications.ts](../firebase-functions/src/notifications/subscriptionNotifications.ts):
    - `enviarResumenDiarioNegocios`: tarea programada a las 11:00 PM Colombia para todos los comercios activos.
    - `enviarResumenDiarioManual`: callable para despacho inmediato bajo demanda.
    - `obtenerResumenDiario`: callable para previsualización reactiva de métricas del día.
    - `notificarSuscripcionEmail`: callable de confirmación de plan al activar o renovar desde SuperAdmin.
    - `verificarAlertasSuscripciones`: tarea programada a las 9:00 AM Colombia para alertas preventivas de vencimiento (≤ 48 h) y consumo de Sarin IA (≥ 85%).
  - Colección auditada `notificaciones_correo` protegida en [firestore.rules](../firestore.rules) con índice compuesto en [firestore.indexes.json](../firestore.indexes.json).
  - Tarjeta interactiva [ResumenDiarioEmailCard.tsx](../src/components/dashboard/ResumenDiarioEmailCard.tsx) integrada en [DashboardPage.tsx](../src/pages/DashboardPage.tsx) y [ReportesPage.tsx](../src/pages/ReportesPage.tsx) con modal de previsualización en vivo, envío manual con 1 clic y auditoría de últimos correos.
  - Preferencias de notificación y correo de destino configurable en [AdminSettingsPage.tsx](../src/pages/AdminSettingsPage.tsx).
  - 268 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa de frontend y functions (`pnpm build:all`).

- [x] **Tarea 12 — Configuración de Secretos en Google Cloud Secret Manager y Habilitación de Anonymous Auth:**
  - Habilitado y verificado el proveedor **Anonymous** en Firebase Authentication para `laparada-26` mediante Google Identity Toolkit API (`projects/636576274928/config`), validando con prueba de cliente en vivo (`ANONYMOUS_AUTH_SUCCESS`) para el widget de Chat en Vivo ([LiveChatWidget.tsx](../src/components/storefront/LiveChatWidget.tsx), [chatService.ts](../src/services/chatService.ts)).
  - Configurados y versionados en Google Cloud Secret Manager (`projects/636576274928/secrets`) todos los secretos de Cloud Functions: `RESEND_API_KEY` (v1 con clave transaccional activa de Resend), `DEEPSEEK_API_KEY` (v1), `WHATSAPP_ACCESS_TOKEN` (v1), `WHATSAPP_APP_SECRET` (v1), `WHATSAPP_WEBHOOK_VERIFY_TOKEN` (v1) y `REMOVE_BG_API_KEY` (v2).
  - Integración en código de Cloud Functions: exportado `deepseekApiKey` con `defineSecret` en [integrationParams.ts](../firebase-functions/src/config/integrationParams.ts) e inyectado en la opción `secrets` de `procesarMensajesBot` ([messageProcessorScheduler.ts](../firebase-functions/src/bot/messageProcessorScheduler.ts)) y `whatsappWebhook` ([whatsappWebhook.ts](../firebase-functions/src/webhooks/whatsappWebhook.ts)) para resolución en tiempo de ejecución.
  - Parámetros operativos consolidados en [firebase-functions/.env.laparada-26](../firebase-functions/.env.laparada-26) y [.env.example](../firebase-functions/.env.example): `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION=v23.0`, `WHATSAPP_NEGOCIO_ID=laparada`, `EMAIL_FROM_ADDRESS` y `EMAIL_REPLY_TO`.
  - Script automatizado de auditoría y verificación continua en [verify-production-secrets.mjs](../scripts/verify-production-secrets.mjs) integrado al comando `pnpm secrets:verify`.
  - 273 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa de frontend y functions (`pnpm build:all`).

---

## Tareas Pendientes por Ejecutar con `/avanzar` (`[ ]`)

- [x] **Tarea 13 — Despliegue Completo a Producción (`laparada-26`) y Pruebas E2E con Playwright en Chromium:**
  - Desplegadas reglas e índices a `laparada-26`: [firestore.rules](../firestore.rules), [firestore.indexes.json](../firestore.indexes.json) y [storage.rules](../storage.rules).
  - Desplegadas las 13 Cloud Functions v2 en Google Cloud / Cloud Run (`crearPedidoPublico`, `crearUsuarioPersonal`, `enviarMensajeWhatsAppManual`, `removerFondoProducto`, `whatsappWebhook`, `procesarMensajesBot`, `limpiarOrdenesExpiradas`, `reintenrarMensajesEnError`, `enviarResumenDiarioNegocios`, `enviarResumenDiarioManual`, `obtenerResumenDiario`, `notificarSuscripcionEmail`, `verificarAlertasSuscripciones`) con resolución de secretos desde Google Cloud Secret Manager y política de limpieza de contenedores configurada.
  - Compilado y desplegado el frontend a Cloudflare Pages en producción ([https://laparada.pages.dev](https://laparada.pages.dev)) con sincronización y auto-despliegue continuo en GitHub (`main`) y respaldo en Firebase Hosting ([https://laparada-26.web.app](https://laparada-26.web.app)).
  - Suite de pruebas E2E automatizada con Playwright en Chromium ([produccionCompleta.spec.ts](../tests/e2e/produccionCompleta.spec.ts)) validada al 100% en vivo contra `https://laparada.pages.dev` (6/6 pruebas):
    1. Landing principal: marca gastronómica, banner interactivo, directorio de locales aliados (`#marketplace`) y vitrina comercial con los 4 planes SaaS.
    2. Formulario de registro de locales (`/registro-negocio`): selector visual de los 4 planes SaaS (`prueba_3d`, `semanal_7d`, `quincenal_15d`, `mensual_30d`), validación de campos obligatorios y contraseñas.
    3. Tienda multi-tenant por slug (`/tienda/:slug`): aislamiento por comercio y manejo amigable de `EmptyState` cuando el slug no existe o está inactivo.
    4. Carrito y checkout del storefront: selección de ítems, cálculo en tiempo real, métodos de pago offline (efectivo y transferencia manual) y ausencia absoluta de pasarelas de pago en línea.
    5. Autenticación y guardas de seguridad: redirección automática a `/login` al intentar acceder a `/admin` o `/pos` sin sesión activa.
    6. Verificación en vivo de Cloud Functions: endpoint `whatsappWebhook` en Google Cloud validando el desafío GET con token de Secret Manager y rechazando peticiones POST sin firma HMAC SHA-256.
  - 273 pruebas unitarias en verde (`pnpm test`), 6 pruebas E2E en verde (`pnpm run test:e2e`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa de frontend y functions (`pnpm build:all`).

- [x] **Tarea 14 — Modo Offline Resiliente en POS (PWA + Service Worker + IndexedDB + Cola de Auto-Sincronización Multi-Tenant):**
  - Implementado motor de almacenamiento local en IndexedDB ([offlineSyncService.ts](../src/services/offlineSyncService.ts)) con stores `ventas_pendientes` (cola FIFO multi-tenant por `negocioId`) y `catalogo_cache` (copia de productos y combos por local).
  - Creado hook reactivo [useOfflineSync.ts](../src/hooks/useOfflineSync.ts) con listeners automáticos de eventos `online`/`offline`, guardado inteligente con fallback si la red falla en el registro (`guardarVentaConFallback`), auto-sincronización al detectar reconexión y acciones de descarte.
  - Respaldo transparente en [useProductos.ts](../src/hooks/useProductos.ts): guarda el catálogo en IndexedDB tras cada consulta o actualización en vivo y recupera automáticamente la copia local si no hay internet al abrir o refrescar el POS.
  - Componente accesible [OfflineStatusBanner.tsx](../src/components/pos/OfflineStatusBanner.tsx) en [POSPage.tsx](../src/pages/POSPage.tsx):
    - Alerta ámbar de modo offline activo sin internet y contador reactivo de ventas en cola.
    - Notificación esmeralda de reconexión con botón a un toque de sincronización manual (`min-h-[44px]`).
    - Modal accesible de inspección de ventas offline con detalle de hora, total, método de pago, ítems y eliminación/descarte individual.
    - Soporte completo en cobro manual y comandos por voz con el copiloto Sarin (incluyendo anulación de ventas offline).
  - Indicador discreto de conectividad en [Header.tsx](../src/components/layout/Header.tsx) (`En línea` con pulso verde vs `Offline` con badge ámbar).
  - Configurado Manifiesto Web PWA ([manifest.webmanifest](../public/manifest.webmanifest)) y Service Worker ([sw.js](../public/sw.js)) con estrategia Cache-First para recursos estáticos y Network-First con fallback a shell para navegación, registrado en [main.tsx](../src/main.tsx) e [index.html](../index.html).
  - 287 pruebas unitarias en verde (`pnpm test`), 7 pruebas E2E en verde con Playwright (`pnpm run test:e2e`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

## Tareas Pendientes por Ejecutar con `/avanzar` (`[ ]`)

*Todas las tareas planificadas en la Hoja de Ruta hacia Producción han sido completadas, desplegadas y verificadas con éxito.*
