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

- [x] **Tarea 15 — Comprobante de Venta Térmico Digital (58mm/80mm), Compartir Recibo por WhatsApp y Exportación Contable a Excel (CSV) en `/pos`, `/ventas` y `/reportes`:**
  - Componente modal accesible de comprobante de venta ([TicketVentaModal.tsx](../src/components/pos/TicketVentaModal.tsx)) con diseño de papel comanda/recibo térmico (`font-mono`), identidad multi-tenant del negocio activo (nombre, dirección, teléfono, logo), desglose ordenado de ítems, totales, método de pago offline (efectivo y transferencia) y cálculo de cambio.
  - Estilos de impresión térmica en [index.css](../src/index.css) (`@media print`) configurados a 80 mm / 58 mm continuo para impresoras térmicas POS USB/Bluetooth, aislando el recibo e invisibilizando la UI de la app.
  - Formateador de texto y generador de URL enriquecida para WhatsApp ([ticketWhatsApp.ts](../src/utils/ticketWhatsApp.ts)) con botón directo para compartir al cliente a 1 toque o ingreso rápido de número telefónico.
  - Integración en [POSPage.tsx](../src/pages/POSPage.tsx): previsualización automática tras registrar la venta (en línea o respaldada en cola offline), botón persistente de último ticket y soporte por voz en el Copiloto Sarin (`"Sarin imprime el ticket"`).
  - Integración en [VentasPage.tsx](../src/pages/VentasPage.tsx) con acción dedicada de Ticket en cada tarjeta de venta y exportador contable a Excel (`.csv` con UTF-8 BOM) en [exportVentasCsv.ts](../src/utils/exportVentasCsv.ts) para descarga instantánea del periodo filtrado en Ventas y [ReportesPage.tsx](../src/pages/ReportesPage.tsx).
  - 301 pruebas unitarias en verde (`pnpm test`), 7 pruebas E2E en verde con Playwright (`pnpm run test:e2e`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

- [x] **Tarea 16 — Portal Móvil del Domiciliario / Repartidor (`/repartidor`) para el Rol `domiciliario`:**
  - Acceso optimizado para el rol `domiciliario` (y administradores/cajeros) con vista móvil táctil de pedidos asignados y en curso (`en_preparacion`, `en_camino`) en [RepartidorPage.tsx](../src/pages/RepartidorPage.tsx) y enrutamiento en [ProtectedApp.tsx](../src/ProtectedApp.tsx).
  - Enlaces a 1 toque para abrir dirección en **Google Maps** o **Waze**, y contacto rápido telefónico o por **WhatsApp** al cliente con mensaje precargado ([deliveryNavigation.ts](../src/utils/deliveryNavigation.ts), [RepartidorOrderCard.tsx](../src/components/repartidor/RepartidorOrderCard.tsx)).
  - Flujo de entrega y cobro en 1 clic: confirmación del método de pago recibido (`efectivo` o `transferencia` con foto de comprobante), notas de entrega y finalización atómica con emisión de venta en Firestore ([ModalEntregaDomicilio.tsx](../src/components/repartidor/ModalEntregaDomicilio.tsx), [domiciliosService.ts](../src/services/domiciliosService.ts)).
  - Liquidación del turno: tarjeta interactiva ([LiquidacionResumenCard.tsx](../src/components/repartidor/LiquidacionResumenCard.tsx)) con cálculo en tiempo real del total de carreras completadas, efectivo en mano a rendir al cajero y transferencias validadas ([deliverySettlement.ts](../src/utils/deliverySettlement.ts)).
  - Integración de roles `domiciliario` y `cocinero` en contratos de TypeScript ([negocio.ts](../src/types/negocio.ts), [types/index.ts](../src/types/index.ts)), Cloud Functions de personal ([staffUser.ts](../firebase-functions/src/staff/staffUser.ts)), reglas de Firestore ([firestore.rules](../firestore.rules)), guardas de autorización ([adminAuthorization.ts](../src/security/adminAuthorization.ts)) y alta de equipo en [AdminSettingsPage.tsx](../src/pages/AdminSettingsPage.tsx).
  - 320 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

- [x] **Tarea 17 — Rastreo en Vivo del Pedido para el Cliente (`/orden/:id` o `/rastreo/:token`) en WhatsApp y Web:**
  - Enlace público único de seguimiento sin fricción de login generado con token seguro de 128 bits (`rastreoToken`) tanto en pedidos de WhatsApp como desde el Storefront Web ([orderTracking.ts](../firebase-functions/src/orders/orderTracking.ts), [orderProcessingService.ts](../firebase-functions/src/bot/orderProcessingService.ts), [publicOrder.ts](../firebase-functions/src/orders/publicOrder.ts)).
  - Proyección pública saneada en Firestore `rastreo_pedidos/{token}` sincronizada reactivamente vía Cloud Function ([orderTrackingTrigger.ts](../firebase-functions/src/orders/orderTrackingTrigger.ts), [index.ts](../firebase-functions/src/index.ts)) que protege la privacidad del cliente (excluye teléfono, dirección completa, notas y comprobantes privados) y reglas de lectura pública protegidas en [firestore.rules](../firestore.rules).
  - Vista completa y accesible de seguimiento en [RastreoPedidoPage.tsx](../src/pages/RastreoPedidoPage.tsx) y enrutamiento en [App.tsx](../src/App.tsx) (`/rastreo/:token` y alias `/orden/:id`):
    - Barra de progreso gastronómica de 4 etapas: **Recibido** ➔ **En Preparación** ➔ **En Camino** (con nombre del repartidor asignado) ➔ **Entregado**.
    - Cálculo reactivo del tiempo estimado restante de entrega y porcentaje de avance.
    - Desglose ordenado de ítems y total en formato COP (`formatCOP`).
    - Botón de auxilio y contacto directo a 1 toque con el restaurante por **WhatsApp** precargando el código del pedido.
  - Integración en la confirmación del Storefront ([LandingTiendaPage.tsx](../src/pages/LandingTiendaPage.tsx)) con botón "Rastrear mi pedido en vivo" y en tarjetas de administración de pedidos ([DomicilioCard.tsx](../src/components/domicilios/DomicilioCard.tsx)).
  - 346 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

## Tareas Pendientes por Ejecutar con `/avanzar` (`[ ]`)

- [x] **Tarea 18 — Directorio de Clientes Frecuentes, Historial de Compras y "Lo de Siempre" a 1 Clic en POS (`/clientes`):**
  - Entidad multi-tenant `Cliente` y `LoDeSiempreCliente` en [cliente.ts](../src/types/cliente.ts) con soporte para contador de pedidos, consumo total acumulado, direcciones de entrega guardadas, barrio y último pedido habitual ("lo de siempre").
  - Servicio multi-tenant de clientes en [clientesService.ts](../src/services/clientesService.ts) con búsqueda indexada, creación manual, actualización, eliminación y consulta de historial de compras por teléfono.
  - Registro y actualización reactiva automática de clientes al emitir ventas en mostrador o domicilios en [ventasService.ts](../src/services/ventasService.ts), [domiciliosService.ts](../src/services/domiciliosService.ts) y en la cola resiliente de [offlineSyncService.ts](../src/services/offlineSyncService.ts).
  - Reglas de seguridad en [firestore.rules](../firestore.rules) para `/clientes/{clienteId}` con validación estricta por `negocioId` y 3 índices compuestos en [firestore.indexes.json](../firestore.indexes.json).
  - Componente accesible de búsqueda rápida y selección de clientes en el Punto de Venta ([ClienteSelectorPOS.tsx](../src/components/pos/ClienteSelectorPOS.tsx)) integrado en [Carrito.tsx](../src/components/pos/Carrito.tsx) y [POSPage.tsx](../src/pages/POSPage.tsx), con botón a un toque (`min-h-[44px]`) para **Cargar lo de siempre** al ticket directamente con 1 clic.
  - Vista administrativa completa del Directorio de Clientes en [ClientesPage.tsx](../src/pages/ClientesPage.tsx) (`/clientes` en el grupo `Gestión` de [adminNavigation.ts](../src/components/layout/adminNavigation.ts)):
    - 4 KPIs de fidelización (Total Clientes, Clientes VIP con ≥ 3 pedidos, Facturación Acumulada y Ticket Promedio).
    - Tarjetas interactivas [ClienteCard.tsx](../src/components/clientes/ClienteCard.tsx) con enlace directo a WhatsApp, badge VIP, direcciones y previsualización de pedido favorito.
    - Modales accesibles con `StorefrontDialog` para alta ([NuevoClienteModal.tsx](../src/components/clientes/NuevoClienteModal.tsx)), edición ([EditarClienteModal.tsx](../src/components/clientes/EditarClienteModal.tsx)) e historial detallado de compras ([ClienteDetalleModal.tsx](../src/components/clientes/ClienteDetalleModal.tsx)).
  - 368 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

## Tareas Pendientes por Ejecutar con `/avanzar` (`[ ]`)

- [x] **Tarea 19 — Pantalla de Cocina en Tiempo Real / KDS (`/cocina` y `/kds`) para el Rol `cocinero`:**
  - Interfaz de comanda de cocina optimizada para tablets y pantallas táctiles con alta visibilidad y contraste sobre fondo oscuro (`#0A0A0A`).
  - Módulo utilitario [kitchenKds.ts](../src/utils/kitchenKds.ts) con semáforo de tiempo de espera (verde < 10 min, ámbar 10-20 min, rojo crítico > 20 min con pulso visual), cronómetro en tiempo real reactivo y formateo de canal de origen (WhatsApp, Tienda Web, Mostrador/POS).
  - Campana sonora de comanda Web Audio API (`playKitchenComandaBell`) con doble armónico acústico de cocina (987.77 Hz y 1318.51 Hz) y decay metálico, interruptor táctil de sonido (`Sonido: ON / Silenciado`) persistido en `localStorage` y botón de prueba de timbre.
  - Tarjetas interactivas de comanda ([ComandaCard.tsx](../src/components/cocina/ComandaCard.tsx)) con desglose de ítems, selector táctil de tachado de platos emplatados (`min-h-[44px]`), banner de advertencia para instrucciones especiales de cocina y acciones de transición a 1 toque (`A Cocina / Iniciar` ➔ `¡Comanda Lista!` ➔ `Entregar / Despachado` y `Devolver`).
  - Cabecera y controles KDS ([KdsHeader.tsx](../src/components/cocina/KdsHeader.tsx), [KdsFilters.tsx](../src/components/cocina/KdsFilters.tsx)) con reloj digital en vivo, 4 KPIs de turno (Pendientes, En Fuego, Listas, Demora Máxima), modo Pantalla Completa (Fullscreen API) y selector de vista (Kanban de 3 columnas vs Rejilla continua de alta densidad).
  - Hook reactivo [useCocinaKDS.ts](../src/hooks/useCocinaKDS.ts) y vista completa en [CocinaPage.tsx](../src/pages/CocinaPage.tsx), con redirección automática para el rol `cocinero` al ingresar al sistema ([ProtectedApp.tsx](../src/ProtectedApp.tsx), [adminNavigation.ts](../src/components/layout/adminNavigation.ts), [adminAuthorization.ts](../src/security/adminAuthorization.ts)).
  - 396 pruebas unitarias en verde (`pnpm test`), 10 pruebas E2E en verde con Playwright (`pnpm run test:e2e`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

- [x] **Tarea 20 — Escandallos de Recetas y Deducción Automática de Inventario en Ventas POS y Pedidos:**
  - Tipado y contratos de recetas en [receta.ts](../src/types/receta.ts) e [index.ts](../src/types/index.ts) (`InsumoReceta`, `receta?: InsumoReceta[]` en `Producto` y `Combo`, `AlertaStockItem`).
  - Módulo utilitario puro y testeable [recetasEscandallo.ts](../src/utils/recetasEscandallo.ts) con cálculo consolidado de consumo (`calcularConsumoInsumos` para productos y combos recursivos), evaluación en tiempo real de disponibilidad por stock (`evaluarEstadoStockProducto`, `evaluarEstadoStockCombo`) y detección preventiva de déficit (`verificarStockSuficiente`).
  - Deducción atómica en Firestore [descontarStockInsumosPorVenta](../src/services/inventarioService.ts) con actualización de stock protegida contra valores negativos (`Math.max(0, ...)`) y registro cronológico de salidas en `entradas_inventario`.
  - Deducción automática conectada al registrar ventas de mostrador y sincronizar ventas offline en [ventasService.ts](../src/services/ventasService.ts), y al marcar domicilios entregados en [domiciliosService.ts](../src/services/domiciliosService.ts).
  - Reglas de seguridad en [firestore.rules](../firestore.rules) actualizadas para autorizar actualización de stock a roles operativos del tenant (`canUpdateTenantDocument()` en `/inventario` y `canCreateTenantDocument()` en `/entradas_inventario`).
  - Componente accesible [RecetaEditor.tsx](../src/components/productos/RecetaEditor.tsx) integrado en [ProductoForm.tsx](../src/components/productos/ProductoForm.tsx) y [ComboForm.tsx](../src/components/productos/ComboForm.tsx) con selector de insumos en bodega, desglose de cantidades y cálculo de porciones preparables.
  - Badges visuales de escandallo en tarjetas del catálogo administrativo en [ProductosPage.tsx](../src/pages/ProductosPage.tsx).
  - Alertas preventivas en el Punto de Venta ([POSPage.tsx](../src/pages/POSPage.tsx), [Catalogo.tsx](../src/components/pos/Catalogo.tsx), [ItemProducto.tsx](../src/components/pos/ItemProducto.tsx), [Carrito.tsx](../src/components/pos/Carrito.tsx)): badges de producto agotado o stock bajo, bloqueo de agregado si el insumo está en 0 y banner de déficit de ingredientes en el ticket.
  - 410 pruebas unitarias en verde (`pnpm test`), 11 pruebas E2E en verde con Playwright (`pnpm run test:e2e`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 399.95 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

## Tareas Pendientes por Ejecutar con `/avanzar` (`[ ]`)

- [x] **Tarea 21 — Arqueo Físico de Efectivo con Desglose de Denominaciones COP en Cierre de Caja:**
  - Contratos y tipado en [cierreCaja.ts](../src/types/cierreCaja.ts) e [index.ts](../src/types/index.ts) (`DesgloseDenominaciones`, `ArqueoEfectivo`, `EstadoCuadreCaja`, `CierreCaja` con campos de arqueo, cajero, base inicial y diferencias).
  - Módulo utilitario puro y testeable [arqueoCaja.ts](../src/utils/arqueoCaja.ts) con denominaciones oficiales COP (6 billetes: $100k, $50k, $20k, $10k, $5k, $2k; y 5 monedas: $1.000, $500, $200, $100, $50), sanitización defensiva, cálculo consolidado de totales, evaluador de estado de cuadre (`cuadrado`, `sobrante`, `faltante`), formateo monoespaciado de acta y generador de URL para WhatsApp.
  - Servicio [cierreCajaService.ts](../src/services/cierreCajaService.ts) y hook reactivo [useCierreCaja.ts](../src/hooks/useCierreCaja.ts) extendidos para persistir de forma inmutable el arqueo físico, cajero responsable y saldos esperados con aislamiento multi-tenant.
  - Componente accesible [DesgloseDenominacionesGrid.tsx](../src/components/cierre/DesgloseDenominacionesGrid.tsx) con controles táctiles (`min-h-[44px]`), inputs directos con validación numérica y botón de limpieza rápida de conteo.
  - Tarjeta de comparador en vivo [ComparadorArqueoCard.tsx](../src/components/cierre/ComparadorArqueoCard.tsx) con feedback en tiempo real de Efectivo Físico vs Esperado y badges semánticos de cuadre exacto, sobrante o faltante.
  - Modal interactivo de cierre de turno [ModalCierreCaja.tsx](../src/components/cierre/ModalCierreCaja.tsx) integrado en [DashboardPage.tsx](../src/pages/DashboardPage.tsx) con navegación por pasos (Arqueo Físico ➔ Balance y Notas).
  - Modal de comprobante térmico digital [ActaCierreModal.tsx](../src/components/cierre/ActaCierreModal.tsx) integrado en [DashboardPage.tsx](../src/pages/DashboardPage.tsx) y en el Historial de Cierres de [ReportesPage.tsx](../src/pages/ReportesPage.tsx), con soporte directo para impresión térmica (`window.print()` con `#acta-cierre-impresion` en [index.css](../src/index.css)), envío por WhatsApp y copiado al portapapeles.
  - 435 pruebas unitarias en verde (`pnpm test`), 12 pruebas E2E en verde con Playwright (`pnpm run test:e2e`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 399.95 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

## Tareas Pendientes por Ejecutar con `/avanzar` (`[ ]`)

- [x] **Tarea 22 — Modo Mesas y Cuentas Abiertas en Salón con Comandas en POS y KDS (`/mesas`):**
  - Entidades y contratos multi-tenant en [mesa.ts](../src/types/mesa.ts) e [index.ts](../src/types/index.ts) (`Mesa`, `CuentaMesa`, `RondaComanda`, `EstadoMesa`, `DivisionCuentaResultado`).
  - Módulo utilitario puro y testeable [mesasUtils.ts](../src/utils/mesasUtils.ts) con consolidación de consumos entre rondas (`calcularConsolidadoItems`), cálculo de total seguro en COP, calculadora de división equitativa de cuentas (`dividirCuentaEnPartesIguales`), filtros por estado/zona/texto, badges semánticos (`getBadgeEstadoMesa`), generador de comanda monoespaciada para pre-cuenta y catálogo inicial de 6 mesas.
  - Servicio multi-tenant en [mesasService.ts](../src/services/mesasService.ts) y hook reactivo [useMesas.ts](../src/hooks/useMesas.ts) con listeners en tiempo real para salón y cuentas activas, despacho inmediato de rondas a la pantalla de cocina (KDS) mediante la colección `domicilios`, precierre y facturación contable atómica con deducción de stock y liberación automática de la mesa.
  - Reglas de seguridad en [firestore.rules](../firestore.rules) para `/mesas/{mesaId}` y `/cuentas_mesas/{cuentaId}` con validación estricta por `negocioId` e índices compuestos en [firestore.indexes.json](../firestore.indexes.json).
  - Componentes táctiles interactivos (`min-h-[44px]`):
    - [MesaCard.tsx](../src/components/mesas/MesaCard.tsx) con badge semántico, comensales, mesero, apertura y accesos directos a abrir, ver cuenta o cobrar.
    - [AbrirMesaModal.tsx](../src/components/mesas/AbrirMesaModal.tsx) para apertura rápida con selector táctil de comensales.
    - [DetalleMesaModal.tsx](../src/components/mesas/DetalleMesaModal.tsx) con pestañas de Consolidado/Rondas, armador rápido de rondas con envío a KDS, y pasarela offline de cobro y vueltas.
    - [DividirCuentaModal.tsx](../src/components/mesas/DividirCuentaModal.tsx) con cálculo instantáneo por comensal y copiado de desglose a WhatsApp.
    - [PrecuentaModal.tsx](../src/components/mesas/PrecuentaModal.tsx) con formato comanda para impresión térmica o envío digital.
    - [NuevaMesaModal.tsx](../src/components/mesas/NuevaMesaModal.tsx) para alta de mesas y zonas del restaurante.
  - Vista completa de Salón en [MesasPage.tsx](../src/pages/MesasPage.tsx) (`/mesas` y `/salon` en [ProtectedApp.tsx](../src/ProtectedApp.tsx) y [adminNavigation.ts](../src/components/layout/adminNavigation.ts)) con 4 KPIs de ocupación y cuentas abiertas, filtros por zona y botón de autoconfiguración de mesas iniciales.
  - Acceso directo al salón desde el Punto de Venta en [POSPage.tsx](../src/pages/POSPage.tsx) e inclusión de mesa en el ticket de venta ([TicketVentaModal.tsx](../src/components/pos/TicketVentaModal.tsx), [ticketWhatsApp.ts](../src/utils/ticketWhatsApp.ts)).
  - 478 pruebas unitarias en verde (`pnpm test`), 13 pruebas E2E en verde con Playwright (`pnpm run test:e2e`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

## Tareas Pendientes por Ejecutar con `/avanzar` (`[ ]`)

- [ ] **Tarea 23 — Gestión de Propinas Sugeridas (Voluntaria 10%), Modificadores/Términos de Cocina en Ítems y Cobro Parcial en POS y Mesas:**
  - Modificadores y términos de preparación por plato en el POS y Mesas (ej: "Término 3/4", "Sin salsas", "Queso extra", "Para llevar").
  - Cálculo configurable de propina voluntaria sugerida (10%, 15%, valor libre) en cobro de salón / mostrador con desglose contable en ventas y reportes.
  - Soporte para cobro parcial dividido por comensal en cuentas de salón.
