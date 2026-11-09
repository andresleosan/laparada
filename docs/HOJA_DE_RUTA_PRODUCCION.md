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

- [x] **Tarea 23 — Gestión de Propinas Sugeridas (Voluntaria 10%), Modificadores/Términos de Cocina en Ítems y Cobro Parcial en POS y Mesas:**
  - Contratos y tipado en [index.ts](../src/types/index.ts), [mesa.ts](../src/types/mesa.ts), [ticket.ts](../src/types/ticket.ts) y [offline.ts](../src/types/offline.ts) (`PagoParcialMesa`, `subtotal`, `propina`, `cuentaMesaId`, `mesaNombre`, `esPagoParcial`, `modificadores`, `notas`).
  - Módulo utilitario puro y testeable [propinasYModificadores.ts](../src/utils/propinasYModificadores.ts) con cálculo configurable de propina voluntaria (10%, 15%, porcentaje libre, monto fijo en COP), cálculo de total seguro, evaluador de saldos pendientes para cuentas de salón (`calcularSaldoPendienteCuenta`), formateador de modificadores y catálogo predefinido de modificadores gastronómicos.
  - Actualización de utilitarios de salón y venta: [mesasUtils.ts](../src/utils/mesasUtils.ts) (consolidado por ítem con modificadores diferenciados y texto comanda/precuenta con desglose), [carritoUtils.ts](../src/utils/carritoUtils.ts) (`actualizarModificadoresItem`), [ticketWhatsApp.ts](../src/utils/ticketWhatsApp.ts) (desglose de términos, subtotal, propina sugerida y saldo restante), [exportVentasCsv.ts](../src/utils/exportVentasCsv.ts) (columnas Subtotal y Propina) y [adminReports.ts](../src/utils/adminReports.ts) (métrica `totalPropinas`).
  - Servicios y sincronización offline: [ventasService.ts](../src/services/ventasService.ts), [mesasService.ts](../src/services/mesasService.ts) (`registrarPagoParcialMesa` atómico con liberación al saldar la cuenta), [useMesas.ts](../src/hooks/useMesas.ts), [offlineSyncService.ts](../src/services/offlineSyncService.ts) y [useOfflineSync.ts](../src/hooks/useOfflineSync.ts).
  - Componentes táctiles interactivos (`min-h-[44px]`):
    - [ModificadorItemModal.tsx](../src/components/pos/ModificadorItemModal.tsx) para selección ágil de términos de cocción, exclusiones, extras, empaque y notas libres por plato.
    - [Carrito.tsx](../src/components/pos/Carrito.tsx) con selector visual de propina sugerida (0%, 10%, 15%, libre), edición de modificadores por ítem y desglose subtotal + propina.
    - [TicketVentaModal.tsx](../src/components/pos/TicketVentaModal.tsx) con visualización de términos, propina y alerta de abono parcial con saldo pendiente.
    - [ComandaCard.tsx](../src/components/cocina/ComandaCard.tsx) con badges destacados para términos y modificaciones de cocina en KDS.
    - [DetalleMesaModal.tsx](../src/components/mesas/DetalleMesaModal.tsx) con pestañas de modificadores por ronda, selector de propina sugerida, cobro total y cobro parcial por comensal.
    - [DividirCuentaModal.tsx](../src/components/mesas/DividirCuentaModal.tsx) con botón de 1 clic para cobro parcial instantáneo por comensal.
    - [ReportesPage.tsx](../src/pages/ReportesPage.tsx) con tarjeta KPI "Propinas Equipo" integrada en el resumen financiero.
  - 499 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build`).

---

## Tareas Pendientes por Ejecutar con `/avanzar` (`[ ]`)

- [x] **Tarea 24 — Módulo de Descuentos Comerciales, Cortesías de la Casa (100%) y Auditoría de Promociones en POS, Mesas, Recibo Térmico y Cierre de Caja:**
  - Contratos y tipado en [descuento.ts](../src/types/descuento.ts), [index.ts](../src/types/index.ts), [ticket.ts](../src/types/ticket.ts), [offline.ts](../src/types/offline.ts), [mesa.ts](../src/types/mesa.ts) y [cierreCaja.ts](../src/types/cierreCaja.ts) (`DescuentoAplicado`, `TipoDescuento`, `descuento`, `descuentoMotivo`, `totalDescuentos`, `cantidadDescuentos`).
  - Módulo utilitario puro y testeable [descuentosUtils.ts](../src/utils/descuentosUtils.ts) con cálculo defensivo de porcentajes (5%, 10%, 15%, 20%, 50%), monto fijo en COP, cortesía total (100%), límites de seguridad (descuento nunca mayor al subtotal ni negativo), catálogo predefinido de motivos gastronómicos y formateador para recibos/WhatsApp.
  - Modal táctil accesible [AplicarDescuentoModal.tsx](../src/components/pos/AplicarDescuentoModal.tsx) con botones rápidos (`min-h-[44px]`), cálculo en tiempo real, selector de motivo y opción de remoción con 1 toque.
  - Integración en el Carrito del Punto de Venta ([Carrito.tsx](../src/components/pos/Carrito.tsx)) y [POSPage.tsx](../src/pages/POSPage.tsx) con banner ámbar del ahorro, recálculo reactivo de subtotal neto, propina sugerida y total a cobrar, y persistencia en [ventasService.ts](../src/services/ventasService.ts) y en la cola de sincronización offline [offlineSyncService.ts](../src/services/offlineSyncService.ts).
  - Integración en Salón y Cuentas de Mesas ([DetalleMesaModal.tsx](../src/components/mesas/DetalleMesaModal.tsx), [PrecuentaModal.tsx](../src/components/mesas/PrecuentaModal.tsx)) permitiendo aplicar descuentos a la cuenta completa antes de la liquidación o cobro parcial.
  - Integración en Comprobante Térmico Digital ([TicketVentaModal.tsx](../src/components/pos/TicketVentaModal.tsx)), envío por WhatsApp ([ticketWhatsApp.ts](../src/utils/ticketWhatsApp.ts)) y exportación contable a CSV ([exportVentasCsv.ts](../src/utils/exportVentasCsv.ts)).
  - Auditoría y Cierre de Caja: métricas de descuentos concedidos en [useCaja.ts](../src/hooks/useCaja.ts), [useCierreCaja.ts](../src/hooks/useCierreCaja.ts), [adminReports.ts](../src/utils/adminReports.ts), [ActaCierreModal.tsx](../src/components/cierre/ActaCierreModal.tsx) y [ReportesPage.tsx](../src/pages/ReportesPage.tsx).
  - 517 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

- [x] **Tarea 25 — Módulo de Anulación y Cancelación Controlada de Ventas con Auditoría, Motivo de Baja, Reversión Opcional de Inventario en Bodega y Reflejo en Caja/Reportes:**
  - Contratos y tipado en [anulacionVenta.ts](../src/types/anulacionVenta.ts), [index.ts](../src/types/index.ts), [ticket.ts](../src/types/ticket.ts) y [cierreCaja.ts](../src/types/cierreCaja.ts) (`MotivoAnulacionVenta`, `DatosAnulacionVenta`, `estado?: 'completada' | 'anulada'`, `anuladaEn`, `anuladaPor`, `motivoAnulacion`, `notasAnulacion`, `revertirStock`, `totalAnuladas`, `cantidadAnuladas`).
  - Módulo utilitario puro y testeable [anulacionVentasUtils.ts](../src/utils/anulacionVentasUtils.ts) con catálogo de motivos gastronómicos (`error_digitacion`, `cliente_cancelo`, `plato_devuelto`, `cambio_metodo_pago`, `pedido_duplicado`, `otro`), filtro defensivo por estado de venta, cálculo consolidado de métricas (`totalAnulado`, `cantidadAnuladas`, `tasaAnulacion`) y validaciones con pruebas unitarias al 100%.
  - Reversión atómica y trazable de inventario: [revertirStockInsumosPorVenta](../src/services/inventarioService.ts) reintegra los consumos deducidos por recetas de escandallo al stock de bodega y registra entradas positivas de ajuste en `entradas_inventario`.
  - Reversión de fidelización en [clientesService.ts](../src/services/clientesService.ts) (`revertirCompraCliente`) deduciendo el importe y cantidad de pedidos del cliente sin permitir valores negativos.
  - Flujo de anulación transaccional en [ventasService.ts](../src/services/ventasService.ts) (`anularVentaConAuditoria`) con validación multi-tenant por `negocioId` y exclusión inmediata de ventas canceladas en el pulso operativo de Sarin Voz (`getSarinOperationalSnapshot`).
  - Componente modal accesible [AnularVentaModal.tsx](../src/components/ventas/AnularVentaModal.tsx) con objetivos táctiles (`min-h-[44px]`), confirmación visual con resumen de productos, selector de motivos, toggle para reintegrar stock o registrar merma/desperdicio de cocina, y captura de observaciones internas.
  - Historial administrativo en [VentasPage.tsx](../src/pages/VentasPage.tsx):
    - Selector táctil de estado (`Todas`, `Válidas`, `Anuladas`) con contadores reactivos.
    - Cuarta tarjeta KPI de auditoría para ventas canceladas (`Anulaciones auditadas: cantidad, monto COP y % tasa`).
    - Tarjetas de venta con borde e indicador rojo semántico `ANULADA`, motivo visible, fecha y monto tachado.
    - Acción de anulación protegida para roles autorizados (`admin` y `superadmin`) que abre el modal en lugar de un borrado destructivo.
  - Comprobante digital térmico ([TicketVentaModal.tsx](../src/components/pos/TicketVentaModal.tsx)) y texto de WhatsApp ([ticketWhatsApp.ts](../src/utils/ticketWhatsApp.ts)) con sello destacado de `⚠️ VENTA ANULADA - SIN VALOR FISCAL` y motivo de baja.
  - Exportación contable en [exportVentasCsv.ts](../src/utils/exportVentasCsv.ts) con columnas dedicadas de `Estado` (`COMPLETADA` vs `ANULADA`) y `Motivo Anulación`.
  - Integración en Arqueo y Cierre de Turno: exclusión de ventas anuladas de los ingresos netos y ventas en efectivo en [useCaja.ts](../src/hooks/useCaja.ts) y [useCierreCaja.ts](../src/hooks/useCierreCaja.ts), y reflejo transparente en el comprobante del acta de cierre ([ActaCierreModal.tsx](../src/components/cierre/ActaCierreModal.tsx), [arqueoCaja.ts](../src/utils/arqueoCaja.ts)) y en el tablero analítico ([ReportesPage.tsx](../src/pages/ReportesPage.tsx)).
  - 529 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

- [x] **Tarea 26 — Rediseño Ergonómico del Menú y Navegación de La Parada POS (Patrón Toast POS / Square Rail):**
  - Implementación de navegación lateral ergonómica en [AdminShell.tsx](../src/components/layout/AdminShell.tsx) con soporte para doble modalidad:
    - Modo colapsado (*Slim Rail* de 80px) con objetivos táctiles de alta precisión (`min-h-[48px]`, `min-w-[48px]`), tooltips flotantes accesibles y máxima área horizontal disponible para la pantalla de cobro.
    - Modo expandido (256px) con categorías visuales (`Operación`, `Gestión`, `Análisis`, `Sistema`), títulos descriptivos y toggle interactivo persistido en `localStorage` (`laparada_sidebar_collapsed`).
  - Integración de insignias operativas reactivas (*live badges*) mediante [useOperacionesLiveBadges.ts](../src/hooks/useOperacionesLiveBadges.ts) y [adminNavigation.ts](../src/components/layout/adminNavigation.ts) en rutas de alta criticidad en tiempo real:
    - Comandas activas en Cocina / KDS (`/cocina`).
    - Mesas abiertas / cuentas pendientes en Salón (`/mesas`).
    - Pedidos en curso / despachos en Domicilios (`/domicilios`).
  - Sincronización en [BottomNav.tsx](../src/components/layout/BottomNav.tsx) mostrando las insignias reactivas en dispositivos móviles tanto en la barra inferior como en el selector extendido.
  - Adaptabilidad responsiva para terminales táctiles de punto de cobro (POS) y tablets, preservando targets mínimos táctiles (`≥ 44px`), navegación por teclado y contraste accesible AAA bajo la paleta gastronómica oscura (`#0A0A0A`, dorado `#C9A84C`).
  - Suite de pruebas unitarias en [AdminShell.test.tsx](../src/components/layout/__tests__/AdminShell.test.tsx), [adminNavigation.test.ts](../src/components/layout/__tests__/adminNavigation.test.ts) y [useOperacionesLiveBadges.test.ts](../src/hooks/__tests__/useOperacionesLiveBadges.test.ts) garantizando renderizado, toggle, insignias reactivas y accesibilidad `aria-*`.
  - 535 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

- [x] **Tarea 27 — Módulo de Traslado y Reasignación de Mesas (Cambio de Mesa) y Unión / Fusión de Cuentas en Salón (`/mesas`):**
  - Contratos y tipado en [mesa.ts](../src/types/mesa.ts) e [index.ts](../src/types/index.ts) (`TrasladoMesaEvento`, `FusionMesasEvento`, `CuentaMesa` con `traslados`, `fusiones`, estado `'fusionada'` y campos de enlace).
  - Lógica pura y testeable en [mesasTransferenciaYFusion.ts](../src/utils/mesasTransferenciaYFusion.ts) con validación estricta de aislamiento multi-tenant por `negocioId`, verificación de disponibilidad de mesa receptora libre, combinador determinista de rondas, ítems consolidados, comensales sumados y concatenación trazable de abonos parciales previos.
  - Servicio multi-tenant en [mesasService.ts](../src/services/mesasService.ts) (`transferirCuentaMesa`, `unirCuentasMesas`):
    - Traslado atómico: reasignación de mesa en la cuenta, liberación inmediata de mesa origen (`estado: 'libre'`, `totalActual: 0`), ocupación de mesa destino y sincronización de comandas activas en cocina (`domicilios`) para actualizar la comanda en pantalla KDS.
    - Fusión de mesas: consolidación de consumos y rondas, recálculo de saldo pendiente y total combinado en mesa principal receptora, cierre por fusión de cuenta secundaria y liberación de mesa secundaria.
  - Hook reactivo [useMesas.ts](../src/hooks/useMesas.ts) con las acciones operativas `transferirMesaAction` y `unirMesasAction`, retroalimentación auditada mediante `createToast` y actualización de selección de mesa activa.
  - Componentes táctiles interactivos (`min-h-[44px]`):
    - [TransferirMesaModal.tsx](../src/components/mesas/TransferirMesaModal.tsx) para traslado ágil a mesas libres disponibles clasificadas por zona y capacidad, con captura de motivo.
    - [UnirMesasModal.tsx](../src/components/mesas/UnirMesasModal.tsx) con previsualización en tiempo real de consumos comparados (Mesa Principal + Mesa Secundaria = Total Combinado) y aviso de liberación automática.
  - Integración en [DetalleMesaModal.tsx](../src/components/mesas/DetalleMesaModal.tsx) con botones táctiles accesibles `Mover` (`ArrowRightLeft`) y `Unir` (`Merge`) en la barra de control de cuenta, y badges visuales de auditoría en el resumen de salón ("📍 Trasladada desde Mesa X" y "🔗 Incluye consumos de Mesa Y").
  - Conexión en [MesasPage.tsx](../src/pages/MesasPage.tsx) pasando las acciones operativas a la interfaz de salón.
  - 555 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

## Tareas Pendientes por Ejecutar con `/avanzar` (`[ ]`)

- [x] **Tarea 28 — Kardex Contable de Inventario, Registro Detallado de Movimientos (Entradas, Salidas, Ajustes de Merma) y Exportación a Excel (CSV) en `/inventario`:**
  - Contratos y tipado en [kardex.ts](../src/types/kardex.ts) e [index.ts](../src/types/index.ts) (`TipoMovimientoKardex`, `MotivoMerma`, `MotivoAjusteInventario`, `MovimientoKardex`, `EntradaInventario`, `MetricasKardex`, `FiltrosKardex`).
  - Módulo utilitario puro y testeable [kardexInventarioUtils.ts](../src/utils/kardexInventarioUtils.ts) con inferencia retrocompatible de tipos de movimiento (`determinarTipoMovimiento`), cálculo de costos unitarios recientes, valuación en COP del stock en bodega (`calcularValoracionBodega`), consolidación de métricas contables (`calcularMetricasKardex`), filtrado multidimensional y generador/exportador a Excel CSV con UTF-8 BOM.
  - Servicio multi-tenant en [inventarioService.ts](../src/services/inventarioService.ts) extendido con trazabilidad atómica:
    - `registrarEntradaInventario` y `registrarSalidaInventario` registrando `tipoMovimiento`, `stockPrevio`, `stockResultante`, `costoUnitario`, `responsable` y `unidadMedida`.
    - `registrarMermaInventario` para dar de baja mermas y desperdicios con motivo gastronómico predefinido y justificación.
    - `registrarAjusteInventario` para auditorías y conteo físico en bodega calculando la diferencia neta de stock.
    - `descontarStockInsumosPorVenta` y `revertirStockInsumosPorVenta` sincronizados con `tipoMovimiento: 'salida_venta'` y `'reversion'`.
    - `getTodosMovimientosInventario` y listener en tiempo real `onTodosMovimientosInventarioChange`.
  - Hook reactivo [useKardex.ts](../src/hooks/useKardex.ts) con listeners en tiempo real, filtros reactivos, métricas consolidadas, exportación CSV y aislamiento por tenant, y extensión en [useInventario.ts](../src/hooks/useInventario.ts).
  - Componentes táctiles interactivos (`min-h-[44px]`):
    - [AjusteStockModal.tsx](../src/components/inventario/AjusteStockModal.tsx) accesible y unificado con 4 modos (`Entrada`, `Salida`, `Merma`, `Conteo Físico`) con previsualización en vivo de diferencias y selección de motivos gastronómicos.
    - [KardexMovimientosView.tsx](../src/components/inventario/KardexMovimientosView.tsx) con 4 KPIs (Valuación Bodega, Compras, Salidas por Venta, Mermas), barra de herramientas con búsqueda, selector de insumo, filtros por tipo/fecha y botón de exportar a Excel (CSV).
  - Integración en [InventarioPage.tsx](../src/pages/InventarioPage.tsx) con 3 pestañas principales (`Insumos`, `Kardex de Movimientos`, `Bajo Stock`) y accesos directos desde las tarjetas de materias primas.
  - Índice compuesto agregado en [firestore.indexes.json](../firestore.indexes.json) para `entradas_inventario` (`negocioId ASC`, `fecha DESC`).
  - 588 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

## Tareas Pendientes por Ejecutar con `/avanzar` (`[ ]`)

- [x] **Tarea 29 — Centro de Analítica Financiera, Estado de Resultados (P&L: Ingresos, Costo de Insumos CMV, Mermas y Gastos Operativos), Margen de Utilidad Neta y Exportación Contable en `/reportes`:**
  - Contratos y tipado en [analiticaFinanciera.ts](../src/types/analiticaFinanciera.ts) e [index.ts](../src/types/index.ts) (`EstadoResultadosPL`, `TipoPeriodoReporte`, `RangoFechaReporte`, `InsumoConsumoCMV`, `DesgloseCanalesVenta`, `DesgloseMetodosPagoVenta`, `SaludFinancieraPyg`).
  - Módulo utilitario puro y testeable [analiticaFinancieraUtils.ts](../src/utils/analiticaFinancieraUtils.ts) con cálculo del rango temporal (`hoy`, `7dias`, `30dias`, `mes_actual`, `mes_anterior`, `personalizado`), cálculo consolidado del P&L (Ventas Brutas - Descuentos = Ventas Netas, Food Cost / CMV por recetas de escandallo, Utilidad Bruta, Mermas de bodega, Gastos OPEX, Utilidad Neta y Margen Neto %), evaluación de salud financiera gastronómica y exportador contable a Excel CSV con UTF-8 BOM.
  - Hook reactivo [useReportes.ts](../src/hooks/useReportes.ts) extendido con carga paralela de ventas, gastos, movimientos de Kardex, catálogo de productos, combos e insumos con estricto aislamiento multi-tenant por `negocioId`, cálculo memoizado de `estadoResultados` y soporte para conmutación de períodos.
  - Componentes táctiles interactivos (`min-h-[44px]`):
    - [SelectorPeriodoReportes.tsx](../src/components/reportes/SelectorPeriodoReportes.tsx) con controles rápidos de un toque y selector de rango de fechas personalizado.
    - [EstadoResultadosCard.tsx](../src/components/reportes/EstadoResultadosCard.tsx) con cascada contable completa, 4 KPIs de alto nivel, badge semántico de rentabilidad, diagnóstico operativo y acción de exportación.
    - [TopInsumosCostoCard.tsx](../src/components/reportes/TopInsumosCostoCard.tsx) mostrando los insumos de mayor peso monetario en el costo de recetas (Food Cost) con barras de progreso y porcentaje del CMV.
  - Integración en [ReportesPage.tsx](../src/pages/ReportesPage.tsx) unificando el Centro de Analítica Financiera, selector de períodos, P&L, gráficos de productos y gastos, manteniendo intacto el Historial de Cierres de Caja con comprobantes térmicos y el Resumen Ejecutivo Diario por correo.
  - 605 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

## Tareas Pendientes por Ejecutar con `/avanzar` (`[ ]`)

- [x] **Tarea 30 — Módulo de Proveedores y Cuentas por Pagar (Compras a Crédito / Plazos), Registro de Facturas de Compra y Programación de Pagos en `/proveedores`:**
  - Contratos y tipado en [proveedor.ts](../src/types/proveedor.ts) e [index.ts](../src/types/index.ts) (`Proveedor`, `FacturaCompra`, `PagoFacturaCompra`, `ItemFacturaCompra`, `CategoriaProveedor`, `CondicionPagoFactura`, `EstadoFacturaCompra`, `EstadoVencimientoFactura`, `MetricasCuentasPorPagar`, `ResumenProveedorTotales`, `CrearFacturaCompraInput`, `RegistrarPagoFacturaInput`).
  - Módulo utilitario puro y testeable [proveedoresUtils.ts](../src/utils/proveedoresUtils.ts) con cálculo del semáforo de vencimiento (`al_dia`, `por_vencer` en ≤ 3 días, `vencida`, `pagada`), cálculo defensivo de saldos pendientes y nuevos estados, generador de mensajes enriquecidos para WhatsApp con formato oficial COP, métricas consolidadas (deuda total, vencidas, por vencer en la semana) y exportador contable a Excel CSV con UTF-8 BOM.
  - Servicio multi-tenant en [proveedoresService.ts](../src/services/proveedoresService.ts) con estricto aislamiento por `negocioId`:
    - CRUD completo de aliados comerciales y suscripción reactiva en tiempo real.
    - Registro de facturas de compra (`crearFacturaCompra`) de contado o a crédito con actualización automática opcional del stock de insumos en bodega (entradas de inventario) y registro automático de egresos en `gastos`.
    - Registro atómico de abonos y pagos parciales (`registrarPagoFactura`) con transacción protegida contra sobrepagos, actualización de saldo y estado, y emisión opcional de comprobante en `gastos` operativos.
    - Anulación controlada de facturas con motivo justificado (`anularFacturaCompra`) y consulta de historial de abonos (`getPagosPorFactura`).
  - Hook reactivo [useProveedores.ts](../src/hooks/useProveedores.ts) con listeners en tiempo real para proveedores y facturas, métricas memoizadas, filtros reactivos por categoría/estado y búsqueda textual.
  - Componentes táctiles interactivos (`min-h-[44px]`):
    - [ProveedorCard.tsx](../src/components/proveedores/ProveedorCard.tsx) con badge de categoría, estado activo, saldos pendientes, plazo habitual, llamada directa, mensaje de WhatsApp precargado y acciones de gestión.
    - [FacturaCompraCard.tsx](../src/components/proveedores/FacturaCompraCard.tsx) con número de remisión, emisor, semáforo de vencimiento dinámico, barra de progreso de pago, desglose COP y accesos rápidos a abonar, ver detalle o anular.
    - [NuevoProveedorModal.tsx](../src/components/proveedores/NuevoProveedorModal.tsx) accesible para alta y edición de aliados comerciales con selector de plazo de crédito (0d, 7d, 15d, 30d, personalizado) y datos fiscales (NIT).
    - [NuevaFacturaCompraModal.tsx](../src/components/proveedores/NuevaFacturaCompraModal.tsx) para registro ágil de compras de contado o a plazos, tabla dinámica de ítems con vinculación a materias primas de bodega y toggle de recepción automática.
    - [AbonarFacturaModal.tsx](../src/components/proveedores/AbonarFacturaModal.tsx) con liquidación de saldo total a 1 clic, validación de métodos de pago offline (`efectivo` o `transferencia`), captura de comprobante y reflejo en caja.
    - [DetalleFacturaModal.tsx](../src/components/proveedores/DetalleFacturaModal.tsx) con desglose de ítems facturados e historial cronológico de abonos con responsables y referencias.
  - Vista integral en [ProveedoresPage.tsx](../src/pages/ProveedoresPage.tsx) (`/proveedores` en el grupo `Gestión` de [adminNavigation.ts](../src/components/layout/adminNavigation.ts) y enrutada en [ProtectedApp.tsx](../src/ProtectedApp.tsx)) con 4 KPIs de deuda y mora, 3 pestañas principales (Facturas, Directorio y Programación de Pagos) y exportación a Excel (CSV).
  - Reglas de seguridad añadidas en [firestore.rules](../firestore.rules) para `/proveedores`, `/facturas_compra` y `/pagos_facturas`, junto con 3 índices compuestos en [firestore.indexes.json](../firestore.indexes.json).
  - 640 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

## Tareas Pendientes por Ejecutar con `/avanzar` (`[ ]`)

- [x] **Tarea 31 — Módulo de Control de Turnos de Personal, Distribución de Propinas del Equipo, Registro de Vales/Adelantos y Liquidación de Nómina Operativa en `/personal`:**
  - Contratos y tipado en [personal.ts](../src/types/personal.ts) e [index.ts](../src/types/index.ts) (`EmpleadoPersonal`, `TurnoPersonal`, `ValePersonal`, `LiquidacionNomina`, `CargoPersonal`, `ModalidadPagoPersonal`, `TipoTurnoPersonal`, `EstadoTurnoPersonal`, `MotivoValePersonal`, `EstadoValePersonal`, `ModoDistribucionPropinas`, `ResumenPreLiquidacionEmpleado`, `DistribucionPropinaItem`, `MetricasPersonal`, `CrearTurnoInput`, `CrearValeInput`, `CrearLiquidacionInput`).
  - Módulo utilitario puro y testeable [personalUtils.ts](../src/utils/personalUtils.ts) con cálculo de horas trabajadas (incluyendo cruce de medianoche en turnos nocturnos), cálculo defensivo de pre-liquidación por colaborador (turnos completados + propinas asignadas - vales pendientes con piso `$ 0`), motor de distribución del fondo de propinas del equipo (`partes_iguales` vs `proporcional_turnos`), consolidación de propinas recaudadas en ventas válidas, generador de comprobante de pago para WhatsApp y exportador contable a Excel CSV con UTF-8 BOM.
  - Servicio multi-tenant en [personalService.ts](../src/services/personalService.ts) con estricto aislamiento por `negocioId`:
    - CRUD reactivo de colaboradores operativos (`empleados_personal`).
    - Registro, cierre de jornada en vivo y anulación de turnos (`turnos_personal`).
    - Registro y anulación de vales/adelantos de nómina (`vales_personal`) con reflejo opcional inmediato en `gastos` (`categoria: 'salarios'`).
    - Liquidación atómica de nómina (`registrarLiquidacionNomina` con `writeBatch`) que emite el acta en `liquidaciones_nomina`, marca los turnos incluidos como `liquidado`, descuenta los vales como `descontado` y registra opcionalmente el egreso salarial en `gastos`.
  - Hook reactivo [usePersonal.ts](../src/hooks/usePersonal.ts) con suscripciones en tiempo real, consolidación automática de propinas de los últimos 7 días, filtros por cargo/estado/texto y acciones operativas.
  - Componentes táctiles interactivos (`min-h-[44px]`):
    - [EmpleadoCard.tsx](../src/components/personal/EmpleadoCard.tsx) con badge de cargo, tarifa por turno, estado de cuenta en vivo (turnos, propina, vales y neto a liquidar) y botones rápidos (`+ Turno`, `+ Vale`, `Liquidar`, `WhatsApp`).
    - [NuevoEmpleadoModal.tsx](../src/components/personal/NuevoEmpleadoModal.tsx) accesible con `StorefrontDialog` para alta y edición de personal operativo.
    - [RegistrarTurnoModal.tsx](../src/components/personal/RegistrarTurnoModal.tsx) para registro de turnos completados o inicio de turnos en curso con cálculo automático de horas y bonos.
    - [RegistrarValeModal.tsx](../src/components/personal/RegistrarValeModal.tsx) para adelantos de sueldo, consumos o préstamos con botones de monto rápido y toggle de salida de caja.
    - [DistribuirPropinasCard.tsx](../src/components/personal/DistribuirPropinasCard.tsx) con calculadora interactiva de propinas del equipo y copiado directo para el grupo de WhatsApp.
    - [LiquidarNominaModal.tsx](../src/components/personal/LiquidarNominaModal.tsx) con cascada de liquidación, confirmación de pago offline (`efectivo` o `transferencia`) y envío de comprobante por WhatsApp a 1 clic.
  - Vista integral en [PersonalPage.tsx](../src/pages/PersonalPage.tsx) (`/personal` y alias `/nomina` en el grupo `Gestión` de [adminNavigation.ts](../src/components/layout/adminNavigation.ts) y enrutada en [ProtectedApp.tsx](../src/ProtectedApp.tsx)) con 4 KPIs ejecutivos, 4 pestañas operativas y exportación a Excel (CSV).
  - Reglas de seguridad añadidas en [firestore.rules](../firestore.rules) para `/empleados_personal`, `/turnos_personal`, `/vales_personal` y `/liquidaciones_nomina`, junto con 4 índices compuestos en [firestore.indexes.json](../firestore.indexes.json).
  - 657 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

## Tareas Pendientes por Ejecutar con `/avanzar` (`[ ]`)

- [x] **Tarea 32 — Centro de Fidelización VIP, Tarjeta Digital de Sellos/Recompensas por Visita, Detección de Clientes en Riesgo de Inactividad y Campañas Directas por WhatsApp en `/clientes` y `/pos`:**
  - Contratos y tipado en [fidelizacion.ts](../src/types/fidelizacion.ts), [cliente.ts](../src/types/cliente.ts) e [index.ts](../src/types/index.ts) (`NivelFidelizacion`, `EstadoRiesgoCliente`, `CampanaWhatsAppTipo`, `MovimientoSello`, `ProgresoTarjetaSellos`, `KpisFidelizacion`, `sellosActuales`, `metaSellos`, `recompensasDisponibles`, `recompensasRedimidas`, `nivelFidelizacion`).
  - Módulo utilitario puro y testeable [fidelizacionUtils.ts](../src/utils/fidelizacionUtils.ts) con:
    - Escala VIP gastronómica (`evaluarNivelFidelizacion` para Bronce, Plata, Oro y Diamante con etiquetas, íconos y badges semánticos).
    - Semáforo y detector de inactividad preventiva (`evaluarEstadoRiesgoCliente` para `nuevo`, `activo` ≤ 14d, `en_riesgo` 15-30d con pulso ámbar, e `inactivo` > 30d).
    - Tarjeta digital de sellos (`calcularProgresoTarjetaSellos` con cálculo de avance %, sellos faltantes, meta configurable y recompensas desbloqueadas).
    - Motor de generación de campañas directas para WhatsApp (`generarMensajeCampanaWhatsApp` con plantillas predefinidas: reactivación por riesgo con beneficio, felicitación de recompensa completa, avance de sellos, agradecimiento VIP y recuerdo de "lo de siempre").
    - KPIs consolidados de retención y lealtad (`calcularKpisFidelizacion`) y exportador contable a Excel CSV con UTF-8 BOM (`exportarCampanaClientesCsv`).
  - Servicio [clientesService.ts](../src/services/clientesService.ts) extendido con aislamiento multi-tenant por `negocioId`:
    - Adición automática de 1 sello por cada compra completada en `registrarCompraCliente`, con otorgamiento automático de recompensas al completar la meta (6 sellos) y reinicio de tarjeta.
    - Canje seguro de beneficios (`canjearRecompensaCliente`) con decremento de recompensas disponibles e incremento de histórico redimido.
    - Ajuste manual supervisado de sellos (`ajustarSellosCliente`) para sumas o deducciones controladas.
    - Reversión automática de sellos y recompensas en `revertirCompraCliente` cuando una venta es anulada.
  - Hook reactivo [useClientes.ts](../src/hooks/useClientes.ts) exponiendo las acciones operativas `canjearRecompensa` y `ajustarSellos`.
  - Componentes táctiles interactivos (`min-h-[44px]`):
    - [TarjetaSellosDigital.tsx](../src/components/clientes/TarjetaSellosDigital.tsx) con cuadrícula de sellos troquelados virtuales, sello dorado de confirmación, barra de progreso con gradiente, banner interactivo de recompensa lista con botón de canje a 1 clic y mini controles de ajuste (+1 / -1 sello).
    - [CampanaWhatsAppModal.tsx](../src/components/clientes/CampanaWhatsAppModal.tsx) accesible para selección de plantillas con previsualización fidedigna tipo chat de WhatsApp, copiado instantáneo al portapapeles y apertura directa de `wa.me`.
    - Actualización de [ClienteCard.tsx](../src/components/clientes/ClienteCard.tsx) con badges dobles (nivel VIP + semáforo de retención), barra compacta de sellos acumulados y botón táctil para lanzar campaña por WhatsApp a 1 toque.
    - Actualización de [ClienteDetalleModal.tsx](../src/components/clientes/ClienteDetalleModal.tsx) incorporando la tarjeta completa interactiva de sellos y banner de lanzamiento de campaña directa.
    - Actualización de [ClienteSelectorPOS.tsx](../src/components/pos/ClienteSelectorPOS.tsx) y [POSPage.tsx](../src/pages/POSPage.tsx) con visualización de sellos en tiempo real, alerta de premio listo y canje ágil directo en la pantalla de cobro.
    - Vista integral en [ClientesPage.tsx](../src/pages/ClientesPage.tsx) con 4 KPIs de fidelización (Total, VIP, En Riesgo, Recompensas Listas), 6 pestañas segmentadas (`Todos`, `VIP`, `En Riesgo`, `Con Premio`, `Inactivos`, `Con Domicilio`) y exportación a Excel (CSV).
  - 686 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

## Tareas Pendientes por Ejecutar con `/avanzar` (`[ ]`)

- [x] **Tarea 33 — Modo Kiosco de Autoservicio / Terminal Táctil para Clientes (`/kiosco`), Personalización de Pedido, Emisión de Ticket de Turno para Pago en Caja y Pantalla de Llamador de Pedidos en Salón (`/turnos`):**
  - Contratos y tipado en [kiosco.ts](../src/types/kiosco.ts) e [index.ts](../src/types/index.ts) (`ItemKioscoCustomizado`, `PedidoKiosco`, `CrearPedidoKioscoInput`, `TurnoDisplay`, `TipoServicioKiosco`, `EstadoTurno`, `OrigenVenta = 'pos' | 'whatsapp' | 'web' | 'kiosco'`, y campos de turno y modalidad de servicio en `Domicilio` y `Venta`).
  - Módulo utilitario puro y testeable [kioscoTurnosUtils.ts](../src/utils/kioscoTurnosUtils.ts) con:
    - Generador secuencial de número de turno (`generarNumeroTurno` para formato `K-001`, `K-015`, etc.) y extractor de código corto (`extraerCodigoCortoTurno`).
    - Cálculo defensivo de totales para kiosco (`calcularTotalKiosco`).
    - Formateador de modificadores y notas para cocina (`formatearModificadores`).
    - Motor de generación de ticket de turno para WhatsApp (`generarMensajeWhatsAppTurno`).
    - Motor de clasificación para pantalla de TV en salón (`filtrarTurnosLlamador` separando en preparación vs listos con límite temporal).
    - Sintetizador Web Audio API (`playTurnoLlamadorChime`) con campana acústica armónica de 3 tonos (E5, G#5, B5).
    - Sintetizador de voz por Web Speech API (`anunciarTurnoVoz`) para avisar a clientes en sala de espera.
  - Servicio multi-tenant en [kioscoService.ts](../src/services/kioscoService.ts) con estricto aislamiento por `negocioId`:
    - Detección automática del último turno de la jornada (`getUltimoTurnoDelDia`).
    - Emisión atómica de pedidos desde el kiosco en `domicilios` con estado `pendiente`, `pagado: false`, `origen: 'kiosco'` y registro asíncrono en el directorio de clientes.
    - Consulta y listener en tiempo real de turnos pendientes de pago (`getPedidosKioscoPendientes`, `onPedidosKioscoPendientesChange`).
    - Marcado de turno pagado en caja (`marcarPedidoKioscoPagado`) que avanza la comanda directamente a preparación en cocina.
  - Componentes táctiles interactivos (`min-h-[44px]`):
    - [KioscoWelcomeScreen.tsx](../src/components/kiosco/KioscoWelcomeScreen.tsx): salvapantallas interactivo con diseño gastronómico inmersivo y selector de modalidad ("Comer Aquí" vs "Para Llevar").
    - [KioscoHeader.tsx](../src/components/kiosco/KioscoHeader.tsx): barra superior con switch de modalidad, contador y total del carrito en tiempo real, reset y candado de seguridad para salida del personal con PIN.
    - [KioscoCategoriasBar.tsx](../src/components/kiosco/KioscoCategoriasBar.tsx): navegación táctil con scroll suave por categorías del menú.
    - [KioscoProductCard.tsx](../src/components/kiosco/KioscoProductCard.tsx): tarjetas de productos y combos con fotografía, badges y botón de ordenar.
    - [PersonalizarItemModal.tsx](../src/components/kiosco/PersonalizarItemModal.tsx): modal accesible con `StorefrontDialog` con chips de modificaciones predeterminadas, notas especiales de cocina y selector de cantidades.
    - [KioscoCartDrawer.tsx](../src/components/kiosco/KioscoCartDrawer.tsx): carrito táctil con desglose de productos, captura obligatoria de nombre para el turno, teléfono opcional para WhatsApp, mesa y selección de método de pago en caja.
    - [KioscoTicketTurnoModal.tsx](../src/components/kiosco/KioscoTicketTurnoModal.tsx): confirmación con número de turno gigante (`TURNO #K-015`), comanda térmica digital, botón de impresión, botón de WhatsApp y cuenta regresiva de auto-reinicio.
    - [KioscoPinModal.tsx](../src/components/kiosco/KioscoPinModal.tsx): teclado numérico táctil de 4 dígitos para que los administradores/cajeros puedan salir del modo kiosco y regresar al POS.
    - [KioscoTurnosDrawer.tsx](../src/components/pos/KioscoTurnosDrawer.tsx): panel de turnos de kiosco en el POS con cobro rápido a un clic o carga directa al ticket.
  - Vistas principales:
    - [KioscoPage.tsx](../src/pages/KioscoPage.tsx): experiencia inmersiva completa de terminal táctil con temporizador preventivo de inactividad (60s sin interacción = alerta de 15s antes de reiniciar).
    - [TurnosSalonPage.tsx](../src/pages/TurnosSalonPage.tsx): llamador de salón para televisores con reloj digital en vivo, fecha actual, 2 columnas de alta legibilidad ("En Preparación" vs "¡Listo para Entregar!"), campana armónica y anuncio por voz.
  - Integración en navegación y POS:
    - Soporte standalone sin barra lateral en [AdminShell.tsx](../src/components/layout/AdminShell.tsx) para `/kiosco` y `/turnos`.
    - Enrutamiento en [ProtectedApp.tsx](../src/ProtectedApp.tsx) y accesos directos en [adminNavigation.ts](../src/components/layout/adminNavigation.ts).
    - Badge con indicador de canal `kiosco` e ícono en [ComandaCard.tsx](../src/components/cocina/ComandaCard.tsx) y [kitchenKds.ts](../src/utils/kitchenKds.ts).
    - Botón reactivo con contador de turnos de kiosco pendientes de cobro en [POSPage.tsx](../src/pages/POSPage.tsx).
  - 718 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

## Tareas Pendientes por Ejecutar con `/avanzar` (`[ ]`)

- [x] **Tarea 34 — Centro de Auditoría y Bitácora de Seguridad Operativa (Log Inmutable de Anulaciones de Venta, Cortesías/Descuentos, Ajustes de Merma en Inventario, Cancelaciones de Comandas y Accesos de Personal) con Filtros Forenses y Exportación Contable en `/auditoria`:**
  - Contratos y tipado en [auditoria.ts](../src/types/auditoria.ts) e [index.ts](../src/types/index.ts) (`CategoriaEventoAuditoria`, `SeveridadAuditoria`, `OrigenRegistroAuditoria`, `EventoAuditoria`, `RegistrarEventoAuditoriaInput`, `FiltrosAuditoria`, `MetricasAuditoria`, `NivelRiesgoOperativo`).
  - Módulo utilitario puro y testeable [auditoriaUtils.ts](../src/utils/auditoriaUtils.ts) con:
    - Generador de huella forense determinista (`generarHuellaForense` para sello `AUD-XXXX-YYYY`).
    - Evaluador de severidad forense (`determinarSeveridadEvento` clasificando crítica, alta, media o informativa).
    - Motor de síntesis y correlación forense (`sintetizarEventosAuditoria`) unificando la colección inmutable `bitacora_auditoria` con ventas anuladas, cortesías 100%, descuentos, mermas del Kardex, actas de descuadre de caja, turnos y vales de personal con aislamiento estricto por `negocioId`.
    - Filtros multidimensionales (`filtrarEventosAuditoria` por búsqueda, severidad, categoría, operador, rango de fecha e impacto financiero).
    - Cálculo de KPIs y semáforo de riesgo operativo (`calcularMetricasAuditoria`).
    - Emisor de certificados forenses de integridad en texto plano para WhatsApp (`generarCertificadoForenseTexto`, `generarResumenWhatsAppAuditoria`).
    - Generador y exportador contable a Excel CSV con UTF-8 BOM (`generarCsvAuditoriaForense`, `descargarCsvAuditoriaForense`).
  - Servicio multi-tenant en [auditoriaService.ts](../src/services/auditoriaService.ts) para registro inmutable (`registrarEventoAuditoria`, `registrarEventoAuditoriaSilencioso`), consulta y suscripción reactiva en tiempo real (`onBitacoraAuditoriaChange`).
  - Disparadores automáticos de auditoría integrados en [ventasService.ts](../src/services/ventasService.ts) (cortesías/descuentos y anulaciones de venta), [inventarioService.ts](../src/services/inventarioService.ts) (bajas por merma en bodega) y [cierreCajaService.ts](../src/services/cierreCajaService.ts) (descuadres de arqueo físico).
  - Reglas de seguridad en [firestore.rules](../firestore.rules) para `/bitacora_auditoria/{eventoId}` con aislamiento multi-tenant e inmutabilidad garantizada (`allow update, delete: if false`) y 2 índices compuestos en [firestore.indexes.json](../firestore.indexes.json).
  - Hook reactivo [useAuditoria.ts](../src/hooks/useAuditoria.ts) con listeners en tiempo real, correlación paralela de fuentes históricas, métricas memoizadas y exportación.
  - Componentes táctiles interactivos (`min-h-[44px]`):
    - [AuditoriaKpisGrid.tsx](../src/components/auditoria/AuditoriaKpisGrid.tsx) con semáforo de riesgo operativo, sello de bitácora protegida y 4 KPIs de impacto financiero.
    - [AuditoriaFiltersBar.tsx](../src/components/auditoria/AuditoriaFiltersBar.tsx) con buscador forense, selector de períodos, píldoras táctiles por categoría, severidades y filtro de impacto COP.
    - [EventoAuditoriaCard.tsx](../src/components/auditoria/EventoAuditoriaCard.tsx) con badge de severidad, categoría, sello inmutable, justificación, hora y acceso a inspección.
    - [DetalleForenseModal.tsx](../src/components/auditoria/DetalleForenseModal.tsx) modal accesible con `StorefrontDialog` mostrando el certificado de auditoría, evidencias técnicas, copiado al portapapeles y envío por WhatsApp.
    - [RegistrarIncidenteModal.tsx](../src/components/auditoria/RegistrarIncidenteModal.tsx) modal accesible para documentar y sellar actas manuales inmutables.
  - Vista completa en [AuditoriaPage.tsx](../src/pages/AuditoriaPage.tsx) (`/auditoria` y alias `/seguridad`, `/bitacora` en grupo `Análisis` de [adminNavigation.ts](../src/components/layout/adminNavigation.ts) y enrutada en [ProtectedApp.tsx](../src/ProtectedApp.tsx)).
  - 731 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

## Próximas Tareas Pendientes (`[ ]`)

- [x] **Tarea 35 — Módulo de Gestión de Meseros y Asignación de Comandas en Salón (Desempeño Operativo, Ticket Promedio por Mesero, Comisiones/Incentivos y Liquidación de Propinas por Mesero) en `/meseros` y `/mesas`:**
  - Contratos y tipado en [mesero.ts](../src/types/mesero.ts), [mesa.ts](../src/types/mesa.ts) e [index.ts](../src/types/index.ts) (`ConfiguracionMesero`, `DesempenoMesero`, `ResumenSalonMeseros`, `LiquidacionMesero`, `CrearLiquidacionMeseroInput`, y campos de mesero y comisión en `Venta`, `Mesa` y `CuentaMesa`).
  - Módulo utilitario puro y testeable [meserosUtils.ts](../src/utils/meserosUtils.ts) con:
    - Motor de cálculo de desempeño operativo (`calcularDesempenoMeseros`) agrupando ventas válidas, excluyendo cancelaciones, calculando comisiones por ventas netas y partición de propinas directas vs fondo pool de salón.
    - Consolidación de KPIs ejecutivos de salón (`calcularResumenSalon`) con detección automática del Mesero Estrella (#1 en ventas).
    - Generador de comprobante de desempeño y balance para WhatsApp (`generarComprobanteMeseroWhatsApp`) con formato gastronómico.
    - Exportador contable a Excel CSV con UTF-8 BOM (`generarCsvMeseros`, `descargarCsvMeseros`).
  - Servicio multi-tenant en [meserosService.ts](../src/services/meserosService.ts) para persistencia de configuraciones de comisiones (`configuraciones_meseros`), consulta y liquidación oficial de incentivos con egreso en caja (`liquidaciones_meseros`), y listener reactivo de ventas de salón (`onVentasMeserosChange`).
  - Reasignación de mesero en salón y propagación de mesero asignado a las ventas contables en [mesasService.ts](../src/services/mesasService.ts) (`reasignarMeseroMesa`, `abrirCuentaMesa`, `cerrarCuentaMesa` y `registrarPagoParcialMesa`).
  - Hook reactivo [useMeseros.ts](../src/hooks/useMeseros.ts) con listeners en tiempo real a mesas, colaboradores de personal, ventas y configuraciones, con filtros por período (`hoy`, `semana`, `mes`, `todos`) y búsqueda.
  - Reglas de seguridad en [firestore.rules](../firestore.rules) para `/configuraciones_meseros` y `/liquidaciones_meseros` con aislamiento multi-tenant por `negocioId`.
  - Componentes táctiles interactivos (`min-h-[44px]`):
    - [MeseroCard.tsx](../src/components/meseros/MeseroCard.tsx) con badge de ranking (#1 🥇, #2 🥈, #3 🥉), corona de Mesero Estrella, 4 KPIs, barra de meta de turno, botón de WhatsApp y liquidación.
    - [LiquidarMeseroModal.tsx](../src/components/meseros/LiquidarMeseroModal.tsx) modal accesible para confirmación de pago en efectivo o transferencia y reflejo contable en gastos.
    - [ConfigurarComisionesModal.tsx](../src/components/meseros/ConfigurarComisionesModal.tsx) modal accesible para definir % de comisión, reparto de propinas (100% directa vs pool) y meta de ventas con simulación didáctica en tiempo real.
    - [ReasignarMeseroModal.tsx](../src/components/meseros/ReasignarMeseroModal.tsx) para transferir la atención de cualquier mesa de salón entre meseros con 1 clic.
    - Integración en [AbrirMesaModal.tsx](../src/components/mesas/AbrirMesaModal.tsx), [DetalleMesaModal.tsx](../src/components/mesas/DetalleMesaModal.tsx) y [MesaCard.tsx](../src/components/mesas/MesaCard.tsx) con chips de meseros registrados y acción de reasignación.
  - Vista completa en [MeserosPage.tsx](../src/pages/MeserosPage.tsx) (`/meseros` y alias `/camareros` en grupo `Gestión` de [adminNavigation.ts](../src/components/layout/adminNavigation.ts) y enrutada en [ProtectedApp.tsx](../src/ProtectedApp.tsx)).
  - 745 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

## Próximas Tareas Pendientes (`[ ]`)

- [x] **Tarea 36 — Módulo de Promociones Automatizadas, Happy Hour (Descuentos Dinámicos por Franja Horaria y Día de la Semana: 2x1, % OFF en Categorías) y Cupones Digitales con Código QR para Mostrador POS y Storefront Web en `/promociones` y `/pos`:**
  - Contratos y tipado en [promocion.ts](../src/types/promocion.ts), [descuento.ts](../src/types/descuento.ts) e [index.ts](../src/types/index.ts) (`TipoPromocion`, `CanalPromocion`, `TipoDescuentoPromocion`, `Promocion`, `CrearPromocionInput`, `ResultadoEvaluacionPromocion`, `KpisPromociones`, y campos `promocionId` y `codigoCupon` en `Venta` y `DescuentoAplicado`).
  - Módulo utilitario puro y testeable [promocionesUtils.ts](../src/utils/promocionesUtils.ts) con:
    - Validador de vigencia multidimensional (`estaPromocionVigente` con soporte para límites de usos, fechas calendario ISO, días de la semana y franjas horarias diurnas y nocturnas cruzando medianoche).
    - Motor de evaluación determinista de carrito (`evaluarPromocionesParaCarrito` calculando automáticamente 2x1 en pares de ítems idénticos o de categoría, % de descuento en categorías seleccionadas, y Happy Hour / cupones con tope de descuento máximo y compra mínima).
    - Validador de cupones por canal (`validarCodigoCupon`).
    - Consolidación de KPIs comerciales (`calcularKpisPromociones`).
    - Formateadores visuales (`formatearDiasSemana`, `formatearHorarioPromocion`).
    - Generador de mensajes promocionales para WhatsApp con enlace a tienda (`generarMensajeWhatsAppPromocion`).
    - Generador de códigos QR vectoriales autónomos en Data URL canvas (`generarQrCuponDataUrl`).
    - Exportador contable a Excel CSV con UTF-8 BOM (`exportarPromocionesCsv`).
  - Servicio multi-tenant en [promocionesService.ts](../src/services/promocionesService.ts) para persistencia de promociones en `/promociones`, suscripción en tiempo real (`onPromocionesChange`), activación/desactivación instantánea (`toggleActivarPromocion`) y canje atómico de cupones (`registrarUsoCupon`).
  - Hook reactivo [usePromociones.ts](../src/hooks/usePromociones.ts) con temporizador interno a 30s para refrescar automáticamente el estado "En Vivo Ahora", cálculo memoizado de KPIs, filtros por pestaña/canal/búsqueda y acciones de canje.
  - Reglas de seguridad en [firestore.rules](../firestore.rules) para `/promociones/{promocionId}` con aislamiento multi-tenant por `negocioId` e índices compuestos en [firestore.indexes.json](../firestore.indexes.json).
  - Componentes táctiles interactivos (`min-h-[44px]`):
    - [PromocionCard.tsx](../src/components/promociones/PromocionCard.tsx) con badge de estado ("🔥 En Vivo Ahora", "Programada", "Inactiva"), desglose de franja y días, botón de compartir en WhatsApp, visualización de cupón y modal QR.
    - [NuevaPromocionModal.tsx](../src/components/promociones/NuevaPromocionModal.tsx) modal accesible con selector de tipo de campaña (Happy Hour, 2x1, % Categoría, Cupón QR), franjas horarias y días de la semana.
    - [CuponQrModal.tsx](../src/components/promociones/CuponQrModal.tsx) ticket gastronómico de alta fidelidad con código QR renderizado, copiado de código al portapapeles, descarga en PNG, impresión y envío por WhatsApp.
    - [PromocionBadgeBanner.tsx](../src/components/promociones/PromocionBadgeBanner.tsx) banner reactivo de promociones activas.
  - Integraciones de punto de cobro y storefront:
    - Integración en [Carrito.tsx](../src/components/pos/Carrito.tsx), [AplicarDescuentoModal.tsx](../src/components/pos/AplicarDescuentoModal.tsx) y [POSPage.tsx](../src/pages/POSPage.tsx) con sugerencias de promociones aplicables a 1 clic, validación de cupones y registro de uso de cupón en la venta contable.
    - Integración en [LandingTiendaPage.tsx](../src/pages/LandingTiendaPage.tsx) con captura de cupón en URL (`?cupon=XXXX`), banner en vivo de Happy Hour y canje de cupón en checkout.
  - Vista completa en [PromocionesPage.tsx](../src/pages/PromocionesPage.tsx) (`/promociones` y alias `/happy-hour`, `/cupones` en grupo `Gestión` de [adminNavigation.ts](../src/components/layout/adminNavigation.ts) y enrutada en [ProtectedApp.tsx](../src/ProtectedApp.tsx)).
  - 771 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

## Próximas Tareas Pendientes (`[ ]`)

- [x] **Tarea 37 — Centro de Notificaciones Operativas en Tiempo Real, Bandeja de Alertas Gastronómicas y Campana Flotante en Cabecera (Alertas Web Audio Diferenciadas por Urgencia, Filtro por Módulos: Pedidos Web/Kiosco, Comandas Demoradas en Cocina, Stock Mínimo en Bodega y Llamados de Meseros en Salón) en `/notificaciones` y Header:**
  - Contratos y tipado en [notificacion.ts](../src/types/notificacion.ts) e [index.ts](../src/types/index.ts) (`ModuloNotificacion`, `UrgenciaNotificacion`, `OrigenNotificacion`, `NotificacionOperativa`, `CrearNotificacionInput`, `FiltrosNotificaciones`, `MetricasNotificaciones`).
  - Módulo utilitario puro y testeable [notificacionesUtils.ts](../src/utils/notificacionesUtils.ts) con:
    - Motor Web Audio API con síntesis diferenciada por severidad:
      - `playAlertaCriticaAudio`: Tono doble pulsante de emergencia rápida (880 Hz -> 1046 Hz).
      - `playAlertaAltaAudio`: Campana armónica brillante de cocina / nuevo pedido (E5: 659.25 Hz -> G5: 783.99 Hz).
      - `playAlertaInformativaAudio`: Ding suave y discreto con decaimiento natural (C5: 523.25 Hz).
      - `reproducirAlertaPorUrgencia`: Despachador de alertas que respeta el switch de sonido.
    - Persistencia de preferencias de audio en `localStorage` (`laparada_notificaciones_sonido`).
    - Detección y síntesis de alertas en vivo (`sintetizarAlertasOperativasEnVivo`): detección automática de insumos en 0 o stock mínimo en bodega, y comandas en cocina con más de 15 o 20 minutos de demora.
    - Motor de filtrado y métricas consolidadas (`filtrarNotificaciones`, `calcularMetricasNotificaciones`).
    - Formateador de tiempo relativo amigable en español (`formatearTiempoRelativoNotificacion`).
    - Generador de resumen estructurado para WhatsApp (`generarResumenNotificacionesWhatsApp`).
  - Servicio multi-tenant en [notificacionesService.ts](../src/services/notificacionesService.ts) para persistencia en `/notificaciones_operativas`, marcado individual y en lote de leídas (`marcarTodasNotificacionesLeidas` con `writeBatch`), eliminación y suscripción reactiva en tiempo real (`onNotificacionesChange`).
  - Hook reactivo [useNotificaciones.ts](../src/hooks/useNotificaciones.ts) con listener en tiempo real, detección de nuevas alertas entrantes sin repetición sonora en recargas, métricas memoizadas y toggle de sonido.
  - Reglas de seguridad añadidas en [firestore.rules](../firestore.rules) para `/notificaciones_operativas/{notificacionId}` e índice compuesto en [firestore.indexes.json](../firestore.indexes.json).
  - Componentes táctiles interactivos (`min-h-[44px]`):
    - [NotificacionesHeaderBell.tsx](../src/components/notificaciones/NotificacionesHeaderBell.tsx): Campana flotante en la cabecera administrativa con badge reactivo de no leídas, pulso animado para críticas, y menú desplegable flotante con switch de sonido, marcado rápido y previsualización de alertas.
    - [NotificacionCard.tsx](../src/components/notificaciones/NotificacionCard.tsx): Tarjeta de alerta con borde semántico por urgencia, badge de módulo, tiempo relativo, botón de acceso directo al módulo y botones para marcar leída o descartar.
    - [CrearAlertaManualModal.tsx](../src/components/notificaciones/CrearAlertaManualModal.tsx): Modal accesible con `StorefrontDialog` para emitir comunicados o alertas manuales al equipo.
  - Integración en navegación y Header:
    - Campana integrada en la cabecera superior de [AdminShell.tsx](../src/components/layout/AdminShell.tsx).
    - Vista completa en [NotificacionesPage.tsx](../src/pages/NotificacionesPage.tsx) (`/notificaciones`, `/alertas`, `/bandeja-alertas` en grupo `Operación` de [adminNavigation.ts](../src/components/layout/adminNavigation.ts) y enrutada en [ProtectedApp.tsx](../src/ProtectedApp.tsx)).
  - 813 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

## Próximas Tareas Pendientes (`[ ]`)

- [x] **Tarea 38 — Módulo de Configuración Fiscal, Impoconsumo (INC 8% / IVA), Rangos Consecutivos DIAN de Documento Equivalente POS, Comprobante Z Diario de Corte y Alerta de Vencimiento de Resolución en `/facturacion` y `/pos`:**
  - Contratos y tipado en [facturacion.ts](../src/types/facturacion.ts), [ticket.ts](../src/types/ticket.ts), [offline.ts](../src/types/offline.ts) e [index.ts](../src/types/index.ts) (`RegimenFiscal`, `TipoImpuestoFiscal`, `TarifaImpuesto`, `ResolucionDian`, `ConfiguracionFiscal`, `DesgloseImpuestoCalculado`, `EvaluacionResolucionDian`, `ComprobanteZ`, `DatosFiscalesTicket`, y campos fiscales en `Venta` y `VentaPendienteOffline`).
  - Módulo utilitario puro y testeable [facturacionUtils.ts](../src/utils/facturacionUtils.ts) con:
    - Motor de liquidación tributaria (`calcularDesgloseFiscal` con soporte para precios brutos al consumidor con impuesto incluido o base exenta).
    - Formateador y extractor de consecutivos oficiales (`formatearConsecutivoFiscal`, `extraerNumeroConsecutivo`).
    - Semáforo de vigencia y folios DIAN (`calcularAlertaResolucion` clasificando óptimo, próximo a vencer, agotando folios, vencida o agotada con código semántico verde/amarillo/rojo).
    - Generador del Comprobante Z Diario de Corte POS (`generarComprobanteZ`) consolidando ventas brutas, descuentos, ventas netas, discriminación impositiva (Base e Impuesto INC 8%, Base e Impuesto IVA 19%, Base exenta), propinas voluntarias, formas de pago (efectivo vs transferencia) y rango de consecutivos emitidos.
    - Generador de resumen para WhatsApp (`generarComprobanteZTextoWhatsApp`).
    - Generador y descargador de archivo contable Excel CSV con UTF-8 BOM (`generarComprobanteZCsv`, `descargarComprobanteZCsv`).
    - Exportador de historial de documentos equivalentes POS en CSV (`generarHistorialPosCsv`, `descargarHistorialPosCsv`).
    - Configuración fiscal inicial con defaults gastronómicos colombianos (`getConfiguracionFiscalDefault`).
  - Servicio multi-tenant en [facturacionService.ts](../src/services/facturacionService.ts) para persistencia en `/configuraciones_fiscales`, incremento atómico transaccional de folios (`asignarSiguienteConsecutivoPos`), guardado y consulta de cortes Z en `/comprobantes_z` y listeners reactivos en tiempo real (`onConfiguracionFiscalChange`, `onComprobantesZChange`).
  - Hook reactivo [useFacturacion.ts](../src/hooks/useFacturacion.ts) con sincronización en tiempo real, cálculo memoizado de alertas de resolución y generador de cortes Z.
  - Reglas de seguridad añadidas en [firestore.rules](../firestore.rules) para `/configuraciones_fiscales/{configId}` y `/comprobantes_z/{comprobanteId}` e índice compuesto en [firestore.indexes.json](../firestore.indexes.json).
  - Componentes táctiles interactivos (`min-h-[44px]`):
    - [AlertaResolucionBanner.tsx](../src/components/facturacion/AlertaResolucionBanner.tsx): Banner reactivo con semáforo fiscal y acceso directo a actualización de resolución.
    - [ResolucionDianCard.tsx](../src/components/facturacion/ResolucionDianCard.tsx): Tarjeta de resolución con prefijo, rango autorizado, barra de consumo de folios, días restantes de vigencia y modal de renovación.
    - [RenovarResolucionModal.tsx](../src/components/facturacion/RenovarResolucionModal.tsx): Modal accesible para actualizar número de formulario, prefijo, rangos y vigencia DIAN.
    - [ConfiguracionFiscalCard.tsx](../src/components/facturacion/ConfiguracionFiscalCard.tsx): Tarjeta de datos fiscales del establecimiento (Razón Social, NIT con DV, Régimen: INC 8% / IVA 19% / No responsable / Simple, dirección, contacto) y previsualización en vivo del encabezado del ticket.
    - [ComprobanteZModal.tsx](../src/components/facturacion/ComprobanteZModal.tsx): Ticket térmico comanda del Comprobante Z con acciones directas para imprimir en papel continuo, descargar en CSV (Excel) o enviar por WhatsApp al contador.
    - [HistorialDocumentosPosTable.tsx](../src/components/facturacion/HistorialDocumentosPosTable.tsx): Listado oficial de documentos equivalentes con buscador, filtros por estado (válida/anulada), inspección de ticket y exportación en CSV.
  - Integración en POS y comprobantes de venta:
    - [POSPage.tsx](../src/pages/POSPage.tsx) asigna automáticamente el consecutivo fiscal y desglose de base gravable e impuesto al cobrar (mostrador y comandos de voz de Sarin), integra alerta de resolución DIAN y enlace directo a facturación.
    - [TicketVentaModal.tsx](../src/components/pos/TicketVentaModal.tsx) y [ticketWhatsApp.ts](../src/utils/ticketWhatsApp.ts) muestran encabezado oficial DIAN, consecutivo POS, resolución autorizada y desglose de Base e Impoconsumo 8%.
    - Respaldo de campos fiscales en la cola offline de [offlineSyncService.ts](../src/services/offlineSyncService.ts).
  - Integración en navegación y rutas:
    - Ruta `/facturacion` y alias `/resolucion-dian`, `/comprobante-z` registrada en [ProtectedApp.tsx](../src/ProtectedApp.tsx) y enlazada en el grupo `Gestión` de [adminNavigation.ts](../src/components/layout/adminNavigation.ts).
  - Vista completa en [FacturacionPage.tsx](../src/pages/FacturacionPage.tsx).
  - 844 pruebas unitarias en verde (`pnpm test`), 0 advertencias de ESLint (`pnpm lint`), presupuesto de bundle verificado (`pnpm check:bundle` en 390.58 kB / 635 kB) y compilación exitosa (`pnpm build:all`).

---

## Próximas Tareas Pendientes (`[ ]`)

- [ ] **Tarea 39 — Módulo de Conciliación Contable, Libro Fiscal de Operaciones Diarias (Art. 616 del E.T.), Consolidado Tributario para Declaración de Impoconsumo (Formulario 310 / IVA) y Exportación Parametrizada para Software Contable (Siigo, World Office, Helisa) en `/contabilidad` y `/reportes`:** `Argon (Medium)`


