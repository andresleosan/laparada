import { test, expect } from '@playwright/test';

test.describe('E2E Producción La Parada (laparada-26)', () => {
  test('1. Landing Principal: marca, hero, marketplace y vitrina de 4 planes SaaS', async ({ page }) => {
    await page.goto('/');

    // 1.1 Título y Brand
    await expect(page).toHaveTitle(/La Parada/i);

    // 1.2 Banner y encabezado visible
    const banner = page.getByRole('banner');
    await expect(banner).toBeVisible();

    // 1.3 Vitrina de Planes SaaS
    const vitrinaSection = page.getByRole('region', { name: /Planes de suscripción/i });
    await expect(vitrinaSection).toBeVisible();
    await expect(vitrinaSection).toContainText(/¿Tienes un Restaurante o Puesto de Comida\?/i);
    await expect(vitrinaSection).toContainText(/Prueba 3 días/i);
    await expect(vitrinaSection).toContainText(/Semanal \(7 días\)/i);
    await expect(vitrinaSection).toContainText(/Quincenal \(15 días\)/i);
    await expect(vitrinaSection).toContainText(/Mensual \(30 días\)/i);
    await expect(vitrinaSection).toContainText(/Sarin IA/i);

    // 1.4 Directorio Gastronómico / Marketplace
    const marketplaceSection = page.getByRole('region', { name: /Directorio de restaurantes/i });
    await expect(marketplaceSection).toBeVisible();
    await expect(marketplaceSection).toContainText(/Locales y Puestos Aliados/i);
    await expect(marketplaceSection).toContainText(/La Parada/i);

    // 1.5 Enlace al registro de negocio
    const registroLink = page.getByRole('link', { name: /Crear Cuenta de Negocio/i });
    await expect(registroLink).toBeVisible();
  });

  test('2. Registro de Negocio (/registro-negocio): formulario, planes SaaS y validación', async ({ page }) => {
    await page.goto('/registro-negocio');

    // 2.1 Encabezado y título
    await expect(page.getByRole('heading', { name: /Registra tu Restaurante o Puesto/i })).toBeVisible();

    // 2.2 Campos del formulario con atributos obligatorios
    const nameInput = page.getByPlaceholder('Ej: El Punto Fast Food');
    const ownerInput = page.getByPlaceholder('Ej: Carlos Pérez');
    const phoneInput = page.getByPlaceholder('Ej: 300 987 6543');
    const emailInput = page.getByPlaceholder('admin@elpunto.com');
    const passInput = page.getByPlaceholder('Mínimo 6 caracteres');
    const confirmPassInput = page.getByPlaceholder('Repite la contraseña');

    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveAttribute('required', '');
    await expect(ownerInput).toHaveAttribute('required', '');
    await expect(phoneInput).toHaveAttribute('required', '');
    await expect(emailInput).toHaveAttribute('required', '');

    // 2.3 Selección de planes SaaS
    const planPrueba = page.getByRole('button', { name: /Prueba 3 días/i });
    const planMensual = page.getByRole('button', { name: /Mensual \(30 días\)/i });
    await expect(planPrueba).toBeVisible();
    await expect(planMensual).toBeVisible();

    // Alternar selección de plan
    await planMensual.click();
    await expect(planMensual).toHaveAttribute('aria-pressed', 'true');

    // 2.4 Validación al intentar registrar contraseñas que no coinciden
    await nameInput.fill('Puesto Don Test');
    await ownerInput.fill('Don Test');
    await phoneInput.fill('3101234567');
    await emailInput.fill('test@laparada-qa.com');
    await passInput.fill('clave1234');
    await confirmPassInput.fill('clave9999');

    const submitBtn = page.getByRole('button', { name: /Solicitar Activación de Cuenta/i });
    await submitBtn.click();
    await expect(page.getByText(/Las contraseñas no coinciden/i)).toBeVisible();
  });

  test('3. Tienda Multi-Tenant por Slug (/tienda/:slug) y manejo de comercio inexistente', async ({ page }) => {
    // 3.1 Tienda canónica /tienda/laparada
    await page.goto('/tienda/laparada');
    await expect(page).toHaveTitle(/La Parada/i);

    // 3.2 Manejo de slug inexistente
    await page.goto('/tienda/slug-inexistente-qa-2026');
    await expect(page.getByRole('heading', { name: /Local no disponible/i })).toBeVisible();
    await expect(page.getByText(/no se encuentra activo o el enlace ingresado no es correcto/i)).toBeVisible();

    // 3.3 Botón de retorno al directorio / tienda
    const returnLink = page.getByRole('link', { name: /Ir a La Parada/i });
    await expect(returnLink).toBeVisible();
  });

  test('4. Carrito, Cupón y Límites Seguros de Pedido en Storefront (Modelo 100% Offline)', async ({ page }) => {
    await page.goto('/');

    // 4.1 Agregar un producto del menú al pedido
    const agregarBtn = page.getByRole('button', { name: /Agregar .* al pedido/i }).first();
    await expect(agregarBtn).toBeVisible({ timeout: 25_000 });
    await agregarBtn.click();

    // 4.2 Abrir carrito en el banner
    const cartButton = page.getByRole('button', { name: /Ver pedido/i });
    await expect(cartButton).toBeVisible();
    await cartButton.click();

    // 4.3 Modal de Carrito con producto agregado
    const cartDialog = page.getByRole('dialog', { name: /Tu Pedido/i });
    await expect(cartDialog).toBeVisible();
    await expect(cartDialog.getByText(/1 producto/i)).toBeVisible();

    // 4.4 Avanzar al paso de datos de entrega y pago
    const continuarBtn = cartDialog.getByRole('button', { name: /Continuar con los Datos de Entrega/i });
    await expect(continuarBtn).toBeVisible();
    await continuarBtn.click();

    // 4.5 Diálogo de Datos de Entrega, cupón promocional y métodos de pago offline
    const deliveryDialog = page.getByRole('dialog', { name: /Datos de Entrega/i });
    await expect(deliveryDialog).toBeVisible();
    await expect(deliveryDialog.getByRole('radio', { name: /Efectivo/i })).toBeVisible();
    await expect(deliveryDialog.getByRole('radio', { name: /Transferencia manual/i })).toBeVisible();

    const couponInput = deliveryDialog.locator('#cupon-storefront-input');
    await expect(couponInput).toBeVisible();
    await couponInput.fill('NOEXISTE99');
    await deliveryDialog.getByRole('button', { name: /^Aplicar$/i }).click();
    await expect(deliveryDialog.getByText(/✗/)).toBeVisible();

    // 4.6 Modelo offline garantizado: ningún gateway en línea
    await expect(page.locator('body')).not.toContainText(/MercadoPago|Stripe|PayU|Tarjeta de crédito online/i);

    // 4.7 Cerrar diálogo de pedido
    const closeBtn = deliveryDialog.getByRole('button', { name: /Cerrar datos de entrega/i });
    await closeBtn.click();
  });

  test('5. Autenticación y Guardas de Seguridad (/login y /admin)', async ({ page }) => {
    // 5.1 Redirección al intentar acceder a rutas protegidas sin sesión
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/pos');
    await expect(page).toHaveURL(/\/login/);

    // 5.2 Elementos de la vista de login
    await expect(page.getByRole('heading', { name: /Panel de Operaciones/i })).toBeVisible();
    await expect(page.getByPlaceholder(/admin@tunegocio.com/i)).toBeVisible();
    await expect(page.getByPlaceholder(/••••••••/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Ingresar al Panel/i })).toBeVisible();
  });

  test('6. Verificación en Vivo de Cloud Functions: whatsappWebhook en Google Cloud', async ({ request }) => {
    const webhookUrl = 'https://whatsappwebhook-szhnvukupq-uc.a.run.app';
    const verifyToken = 'laparada_webhook_verify_sec_9f8b2c4e1a0d7f3e8b5c';

    // 6.1 Desafío GET con token inválido debe retornar 403 Forbidden
    const invalidChallengeResponse = await request.get(webhookUrl, {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': 'token_invalido_de_prueba',
        'hub.challenge': '12345678',
      },
    });
    expect(invalidChallengeResponse.status()).toBe(403);

    // 6.2 Desafío GET con token configurado en Secret Manager debe retornar 200 y el challenge
    const validChallengeResponse = await request.get(webhookUrl, {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': verifyToken,
        'hub.challenge': '9988776655',
      },
    });
    expect(validChallengeResponse.status()).toBe(200);
    const body = await validChallengeResponse.text();
    expect(body).toBe('9988776655');

    // 6.3 POST sin firma criptográfica HMAC SHA-256 debe ser rechazado
    const unauthorizedPost = await request.post(webhookUrl, {
      data: { object: 'whatsapp_business_account' },
    });
    expect([401, 403]).toContain(unauthorizedPost.status());
  });

  test('7. PWA Manifest, Service Worker y soporte Offline en el navegador', async ({ page, request }) => {
    // 7.1 Verificar que el manifest PWA esté enlazado en index.html
    await page.goto('/');
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.webmanifest');

    // 7.2 Descarga y parseo del manifest
    const manifestResponse = await request.get('/manifest.webmanifest');
    expect(manifestResponse.status()).toBe(200);
    const manifest = await manifestResponse.json();
    expect(manifest.name).toBe('La Parada POS · Comida Rápida');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#0A0A0A');

    // 7.3 Verificación del Service Worker actualizado sin referencias rotas
    const swResponse = await request.get('/sw.js');
    expect(swResponse.status()).toBe(200);
    const swText = await swResponse.text();
    expect(swText).toContain('laparada-cache-v2');
    expect(swText).not.toContain('order-chime.mp3');
  });

  test('8. Rastreo en Vivo (/rastreo/:token o /orden/:id): sin fricción de login y visualización de progreso', async ({ page }) => {
    // 8.1 Acceso público a /rastreo con token inexistente muestra EmptyState sin redirigir a /login
    await page.goto('/rastreo/token-inexistente-12345');
    await expect(page).toHaveURL(/rastreo\/token-inexistente-12345/);
    await expect(page.getByText(/Pedido no encontrado/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Ir al Menú Principal/i })).toBeVisible();

    // 8.2 Alias /orden/:id tampoco redirige a /login
    await page.goto('/orden/LP-TEST999');
    await expect(page).toHaveURL(/orden\/LP-TEST999/);
    await expect(page.getByText(/Pedido no encontrado/i)).toBeVisible();
  });

  test('9. Directorio de Clientes (/clientes): protegido tras login', async ({ page }) => {
    await page.goto('/clientes');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: /Iniciar Sesión|Panel de Operaciones/i })).toBeVisible();
  });

  test('10. Pantalla de Cocina KDS (/cocina y /kds): protegida tras login', async ({ page }) => {
    await page.goto('/cocina');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: /Iniciar Sesión|Panel de Operaciones/i })).toBeVisible();

    await page.goto('/kds');
    await expect(page).toHaveURL(/.*login/);
  });

  test('11. Módulo de Inventario y Escandallos (/inventario): protegido tras login', async ({ page }) => {
    await page.goto('/inventario');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: /Iniciar Sesión|Panel de Operaciones/i })).toBeVisible();
  });

  test('12. Cierre de Caja y Reportes (/reportes y /dashboard): protegidos tras login', async ({ page }) => {
    await page.goto('/reportes');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: /Iniciar Sesión|Panel de Operaciones/i })).toBeVisible();

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*login/);
  });

  test('13. Modo Mesas y Salón (/mesas y /salon): protegidos tras login', async ({ page }) => {
    await page.goto('/mesas');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: /Iniciar Sesión|Panel de Operaciones/i })).toBeVisible();

    await page.goto('/salon');
    await expect(page).toHaveURL(/.*login/);
  });

  test('14. Encuesta de Satisfacción Post-Venta pública (/calificar y /evaluar): interacción táctil y estrellas', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/calificar?negocio=laparada&mesa=Mesa+1');
    await expect(page).toHaveURL(/\/calificar/);
    await expect(page.getByRole('heading', { name: /LA PARADA/i })).toBeVisible();

    const radioGroup = page.getByRole('radiogroup', { name: /Calificación en estrellas/i });
    await expect(radioGroup).toBeVisible();

    // Seleccionar 2 estrellas -> muestra tags constructivos y botón táctil >= 44px
    const twoStars = radioGroup.getByRole('radio', { name: /2 estrellas/i });
    const box = await twoStars.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
    await twoStars.click();
    await expect(twoStars).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByText(/¿En qué podemos mejorar\?/i)).toBeVisible();

    // Volver a 5 estrellas -> muestra tags positivos
    const fiveStars = radioGroup.getByRole('radio', { name: /5 estrellas/i });
    await fiveStars.click();
    await expect(page.getByText(/¿Qué fue lo que más te gustó\?/i)).toBeVisible();

    // Expandir evaluación opcional de dimensiones
    await page.getByRole('button', { name: /Evaluar Comida, Servicio y Rapidez/i }).click();
    await expect(page.getByText(/Calidad de Comida/i)).toBeVisible();
    await expect(page.getByText(/Atención y Servicio/i)).toBeVisible();

    // Alias /evaluar también público sin redirección a /login
    await page.goto('/evaluar');
    await expect(page).toHaveURL(/\/evaluar/);
    await expect(page.getByRole('radiogroup', { name: /Calificación en estrellas/i })).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test('15. Menú Digital QR por Mesa (/mesa/:slug/:numeroMesa y /m/:slug/:numeroMesa): acceso público resiliente', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto('/mesa/laparada/1');
    await expect(page).toHaveURL(/\/mesa\/laparada\/1/);

    // Debe cargar el menú de la mesa o mostrar el estado resiliente sin redirigir a login
    await expect(
      page.getByRole('heading', { name: /Mesa no disponible|Mesa 1|La Parada/i }).first()
    ).toBeVisible({ timeout: 20_000 });

    await page.goto('/m/laparada/1');
    await expect(page).toHaveURL(/\/m\/laparada\/1/);
    await expect(
      page.getByRole('heading', { name: /Mesa no disponible|Mesa 1|La Parada/i }).first()
    ).toBeVisible({ timeout: 20_000 });

    expect(pageErrors).toEqual([]);
  });

  test('16. Guardas de Seguridad en Módulos Operativos y Financieros (Tareas 28–46)', async ({ page }) => {
    const protectedRoutes = [
      '/tandas',
      '/espera',
      '/meseros',
      '/promociones',
      '/notificaciones',
      '/proveedores',
      '/personal',
      '/kiosco',
      '/turnos',
      '/auditoria',
      '/facturacion',
      '/contabilidad',
      '/ingenieria-menu',
      '/satisfaccion',
      '/super-admin/negocios',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page, `La ruta protegida ${route} debe exigir autenticación`).toHaveURL(/\/login/);
    }
  });

  test('17. Experiencia Móvil (390x844), Integridad de Consola y Cero Errores de Permisos Firestore', async ({ page }) => {
    const pageErrors: string[] = [];
    const permissionErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/Missing or insufficient permissions|Error al escuchar promociones/i.test(text)) {
          permissionErrors.push(text);
        }
      }
    });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    // Esperar a que el catálogo termine de renderizar
    await expect(page.getByRole('button', { name: /Agregar .* al pedido/i }).first()).toBeVisible({ timeout: 25_000 });
    await page.waitForTimeout(1500);

    // Verificar ausencia de desbordamiento horizontal excesivo en móvil
    const hasOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth + 2;
    });
    expect(hasOverflow).toBe(false);

    // Navegar a tienda canónica por slug también en móvil
    await page.goto('/tienda/laparada');
    await expect(page.getByRole('button', { name: /Agregar .* al pedido/i }).first()).toBeVisible({ timeout: 25_000 });
    await page.waitForTimeout(1500);

    expect(pageErrors).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });

  test('18. Recursos Críticos de Producción (robots.txt, llms.txt e íconos PWA)', async ({ request }) => {
    for (const asset of ['/robots.txt', '/llms.txt', '/favicon-32.png', '/logo-96.jpg', '/logo-192.jpg']) {
      const response = await request.get(asset);
      expect(response.status(), `El recurso ${asset} debe responder HTTP 200`).toBe(200);
    }
  });

  test('19. Tarifario de Zonas de Domicilio por Barrio en Storefront y Regla Pública configuraciones_zonas_domicilio', async ({ page }) => {
    const pageErrors: string[] = [];
    const permissionErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/Missing or insufficient permissions/i.test(text)) {
          permissionErrors.push(text);
        }
      }
    });

    await page.goto('/');

    const agregarBtn = page.getByRole('button', { name: /Agregar .* al pedido/i }).first();
    await expect(agregarBtn).toBeVisible({ timeout: 25_000 });
    await agregarBtn.click();

    await page.getByRole('button', { name: /Ver pedido/i }).click();
    const cartDialog = page.getByRole('dialog', { name: /Tu Pedido/i });
    await expect(cartDialog).toBeVisible();
    await cartDialog.getByRole('button', { name: /Continuar con los Datos de Entrega/i }).click();

    const deliveryDialog = page.getByRole('dialog', { name: /Datos de Entrega/i });
    await expect(deliveryDialog).toBeVisible();

    const barrioInput = deliveryDialog.getByLabel('Barrio');
    await expect(barrioInput).toHaveAttribute('list', 'storefront-barrios-datalist');

    const zonaInfo = deliveryDialog.getByTestId('storefront-zona-domicilio-info');
    await expect(zonaInfo).toBeVisible();

    await barrioInput.fill('Caobos');
    await expect(zonaInfo).toContainText(/Cercana \(Centro - Caobos\)/i);
    await expect(zonaInfo).toContainText(/~25 min/i);
    await expect(zonaInfo).toContainText(/\$\s*4\.000/);

    await barrioInput.fill('Los Patios');
    await expect(zonaInfo).toContainText(/Los Patios/i);
    await expect(zonaInfo).toContainText(/~40 min/i);
    await expect(zonaInfo).toContainText(/\$\s*8\.000/);

    await barrioInput.fill('La Parada');
    await expect(zonaInfo).toContainText(/Villa del Rosario \/ La Parada/i);
    await expect(zonaInfo).toContainText(/~40 min/i);
    await expect(zonaInfo).toContainText(/\$\s*8\.000/);

    expect(pageErrors).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });

  test('20. Guardas de Seguridad en Centro de Despacho Logístico (/domicilios) y Portal del Repartidor (/repartidor)', async ({ page }) => {
    await page.goto('/domicilios');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /Panel de Operaciones/i })).toBeVisible();

    await page.goto('/repartidor');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /Panel de Operaciones/i })).toBeVisible();
  });

  test('21. Combos Personalizables y "Arma tu Combo" en Storefront: grupos de elección, cambio de opciones y carrito', async ({ page }) => {
    const pageErrors: string[] = [];
    const permissionErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/Missing or insufficient permissions/i.test(text)) {
          permissionErrors.push(text);
        }
      }
    });

    await page.goto('/');

    // 21.1 Verificar sección de Combos de la Casa y filtro de categoría Combos
    await expect(page.getByRole('heading', { name: /Combos de la Casa/i })).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText(/ARMA TU COMBO/i).first()).toBeVisible();

    const catGroup = page.getByRole('group', { name: /Filtrar el menú por categoría/i });
    const combosCatBtn = catGroup.getByRole('button', { name: /^Combos/i });
    await expect(combosCatBtn).toBeVisible();
    await combosCatBtn.click();
    await expect(combosCatBtn).toHaveAttribute('aria-pressed', 'true');

    // 21.2 Abrir el personalizador "Arma tu Combo" con botón táctil >= 44px
    const personalizarBtn = page.getByRole('button', { name: /Personalizar Combo Arma tu Parada/i });
    await expect(personalizarBtn).toBeVisible();
    const btnBox = await personalizarBtn.boundingBox();
    expect(btnBox?.height).toBeGreaterThanOrEqual(44);
    await personalizarBtn.click();

    // 21.3 Validar estructura del modal, componentes base y los 3 grupos de elección
    const comboDialog = page.getByRole('dialog', { name: /Combo Arma tu Parada/i });
    await expect(comboDialog).toBeVisible();
    await expect(comboDialog.getByText(/1× Panceroti/i)).toBeVisible();
    await expect(comboDialog.getByText(/1× Tequeño/i)).toBeVisible();
    await expect(comboDialog.getByRole('heading', { name: /Elige tu Bebida/i })).toBeVisible();
    await expect(comboDialog.getByRole('heading', { name: /Elige tu Acompañamiento/i })).toBeVisible();
    await expect(comboDialog.getByRole('heading', { name: /Elige tus Salsas/i })).toBeVisible();

    // 21.4 Seleccionar opciones personalizadas y verificar objetivos táctiles
    const jugoBtn = comboDialog.getByRole('button', { name: /Jugo Natural de Maracuyá/i });
    const jugoBox = await jugoBtn.boundingBox();
    expect(jugoBox?.height).toBeGreaterThanOrEqual(44);
    await jugoBtn.click();
    await expect(jugoBtn).toHaveAttribute('aria-pressed', 'true');

    const papasBtn = comboDialog.getByRole('button', { name: /Porción de Papas Doradas/i });
    await papasBtn.click();
    await expect(papasBtn).toHaveAttribute('aria-pressed', 'true');

    const tartaraBtn = comboDialog.getByRole('button', { name: /Salsa Tártara Artesanal/i });
    await tartaraBtn.click();
    await expect(tartaraBtn).toHaveAttribute('aria-pressed', 'true');

    await comboDialog.getByLabel(/Notas de cocina/i).fill('Bebida sin hielo');

    // 21.5 Confirmar agregado y validar resumen en tarjeta
    await comboDialog.getByRole('button', { name: /^Agregar Combo$/i }).click();
    await expect(comboDialog).not.toBeVisible();

    await expect(page.getByText(/Tu selección:/i).first()).toContainText(/Jugo Natural de Maracuyá/i);
    await expect(page.getByText(/Tu selección:/i).first()).toContainText(/Porción de Papas Doradas/i);
    await expect(page.getByText(/Tu selección:/i).first()).toContainText(/Salsa Tártara Artesanal/i);

    // 21.6 Reabrir con "Cambiar opciones", incrementar a 2 unidades ($ 25.000) y actualizar
    const cambiarOpcionesBtn = page.getByRole('button', { name: /Cambiar opciones/i }).first();
    await expect(cambiarOpcionesBtn).toBeVisible();
    await cambiarOpcionesBtn.click();

    await expect(comboDialog).toBeVisible();
    await comboDialog.getByRole('button', { name: /Aumentar cantidad del combo/i }).click();
    await expect(comboDialog).toContainText(/\$\s*25\.000/);
    await comboDialog.getByRole('button', { name: /^Actualizar Combo$/i }).click();
    await expect(comboDialog).not.toBeVisible();

    // 21.7 Validar en Drawer de Pedido y Modal de Datos de Entrega (100% offline)
    await page.getByRole('button', { name: /Ver pedido/i }).click();
    const cartDialog = page.getByRole('dialog', { name: /Tu Pedido/i });
    await expect(cartDialog).toBeVisible();
    await expect(cartDialog).toContainText(/Combo Arma tu Parada/i);
    await expect(cartDialog).toContainText(/Jugo Natural de Maracuyá/i);
    await expect(cartDialog).toContainText(/Porción de Papas Doradas/i);
    await expect(cartDialog).toContainText(/\$\s*25\.000/);

    await cartDialog.getByRole('button', { name: /Continuar con los Datos de Entrega/i }).click();
    const deliveryDialog = page.getByRole('dialog', { name: /Datos de Entrega/i });
    await expect(deliveryDialog).toBeVisible();
    await expect(deliveryDialog).toContainText(/\$\s*25\.000/);
    await expect(deliveryDialog.getByRole('radio', { name: /Efectivo/i })).toBeVisible();
    await expect(deliveryDialog.getByRole('radio', { name: /Transferencia manual/i })).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });

  test('22. Guardas de Seguridad en Catálogo de Productos/Combos (/productos) e Ingeniería de Menú (/ingenieria-menu)', async ({ page }) => {
    await page.goto('/productos');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /Panel de Operaciones/i })).toBeVisible();

    await page.goto('/ingenieria-menu');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /Panel de Operaciones/i })).toBeVisible();
  });

  test('23. Reserva de Mesa en Salón desde Storefront: Mapa de Mesas por Capacidad, Ocasión Especial, Anticipo Offline y WhatsApp', async ({ page }) => {
    const pageErrors: string[] = [];
    const permissionErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/Missing or insufficient permissions/i.test(text)) {
          permissionErrors.push(text);
        }
      }
    });

    await page.goto('/');

    // 23.1 Abrir el asistente de reserva desde el Header del Storefront (botón táctil >= 44px)
    const reservarBtn = page.getByTestId('btn-reservar-mesa-storefront');
    await expect(reservarBtn).toBeVisible({ timeout: 25_000 });
    const btnBox = await reservarBtn.boundingBox();
    expect(btnBox?.height).toBeGreaterThanOrEqual(44);
    await reservarBtn.click();

    const dialog = page.getByRole('dialog', { name: /Reservar Mesa/i });
    await expect(dialog).toBeVisible();

    // 23.2 Verificar Mapa de Mesas y recomendación automática al cambiar a 6 comensales
    const mapaMesas = dialog.getByTestId('storefront-mapa-mesas');
    await expect(mapaMesas).toBeVisible({ timeout: 15_000 });

    const btn6Personas = dialog.getByRole('button', { name: /^6 pers\.$/i });
    await expect(btn6Personas).toBeVisible();
    await btn6Personas.click();
    await expect(btn6Personas).toHaveAttribute('aria-pressed', 'true');

    const mesa4Btn = dialog.getByTestId('btn-mesa-reserva-4');
    await expect(mesa4Btn).toHaveAttribute('aria-pressed', 'true');
    await expect(mesa4Btn).toContainText(/Mesa 4/i);
    await expect(mesa4Btn).toContainText(/Terraza/i);
    await expect(mesa4Btn).toContainText(/Sugerida/i);

    const mesa1Btn = dialog.getByTestId('btn-mesa-reserva-1');
    await expect(mesa1Btn).toBeDisabled();

    // 23.3 Seleccionar Ocasión Especial (Cumpleaños) y Anticipo Offline por Transferencia ($ 50.000)
    const cumpleBtn = dialog.getByRole('button', { name: /Cumpleaños/i });
    await cumpleBtn.click();
    await expect(cumpleBtn).toHaveAttribute('aria-pressed', 'true');

    const anticipo50kBtn = dialog.getByRole('button', { name: /\$\s*50\.000/i });
    await anticipo50kBtn.click();
    await expect(anticipo50kBtn).toHaveAttribute('aria-pressed', 'true');

    const transferenciaBtn = dialog.getByRole('button', { name: /Transferencia manual/i });
    await expect(transferenciaBtn).toHaveAttribute('aria-pressed', 'true');
    await dialog.locator('#storefront-reserva-referencia').fill('NEQUI-998877');

    // Modelo 100% offline garantizado
    await expect(dialog).not.toContainText(/MercadoPago|Stripe|PayU|PayPal/i);

    // 23.4 Completar datos del cliente y confirmar solicitud hacia WhatsApp
    await dialog.locator('#storefront-reserva-nombre').fill('Mariana Duarte');
    await dialog.locator('#storefront-reserva-telefono').fill('3105551234');
    await dialog.getByRole('button', { name: /Confirmar Solicitud de Reserva/i }).click();

    const confirmacion = dialog.getByTestId('storefront-reserva-confirmada');
    await expect(confirmacion).toBeVisible();
    await expect(confirmacion).toContainText(/Mariana Duarte/i);
    await expect(confirmacion).toContainText(/Mesa 4/i);
    await expect(confirmacion).toContainText(/Terraza/i);
    await expect(confirmacion).toContainText(/Cumpleaños/i);
    await expect(confirmacion).toContainText(/\$\s*50\.000/);
    await expect(confirmacion).toContainText(/NEQUI-998877/);

    const waLink = dialog.getByTestId('link-whatsapp-reserva-storefront');
    await expect(waLink).toBeVisible();
    const href = await waLink.getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\//);
    const decodedHref = decodeURIComponent(href || '');
    expect(decodedHref).toContain('Mesa 4');
    expect(decodedHref).toContain('Cumpleaños');
    expect(decodedHref).toContain('50.000');

    expect(pageErrors).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });

  test('24. Menú Digital QR en Mesa (/mesa/laparada/1) con "Arma tu Combo" Personalizable y Manejo de Mesa Inexistente (/mesa/laparada/99)', async ({ page }) => {
    const pageErrors: string[] = [];
    const permissionErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/Missing or insufficient permissions/i.test(text)) {
          permissionErrors.push(text);
        }
      }
    });

    // 24.1 Cargar menú QR de Mesa 1 en La Parada
    await page.goto('/mesa/laparada/1');
    await expect(page.getByRole('heading', { name: /Mesa 1/i })).toBeVisible({ timeout: 25_000 });
    await expect(page.getByRole('heading', { name: /Combos Especiales/i })).toBeVisible();

    // 24.2 Abrir personalizador "Arma tu Combo" en mesa
    const personalizarBtn = page.getByRole('button', { name: /Personalizar Combo Arma tu Parada/i });
    await expect(personalizarBtn).toBeVisible();
    const btnBox = await personalizarBtn.boundingBox();
    expect(btnBox?.height).toBeGreaterThanOrEqual(44);
    await personalizarBtn.click();

    const comboDialog = page.getByRole('dialog', { name: /Combo Arma tu Parada/i });
    await expect(comboDialog).toBeVisible();

    await comboDialog.getByRole('button', { name: /Jugo Natural de Maracuyá/i }).click();
    await comboDialog.getByRole('button', { name: /Porción de Papas Doradas/i }).click();
    await comboDialog.getByRole('button', { name: /Salsa Tártara Artesanal/i }).click();
    await comboDialog.getByRole('button', { name: /Aumentar cantidad del combo/i }).click();
    await expect(comboDialog).toContainText(/\$\s*25\.000/);

    await comboDialog.getByRole('button', { name: /^Agregar Combo$/i }).click();
    await expect(comboDialog).not.toBeVisible();

    // 24.3 Verificar selección en tarjeta y barra flotante "Ronda a Cocina"
    await expect(page.getByText(/Tu selección:/i).first()).toContainText(/Jugo Natural de Maracuyá/i);
    const rondaAside = page.getByRole('complementary', { name: /Resumen de autopedido/i });
    await expect(rondaAside).toBeVisible();
    await expect(rondaAside).toContainText(/Ronda a Cocina/i);
    await expect(rondaAside).toContainText(/\$\s*25\.000/);

    // 24.4 Validar manejo resiliente de mesa fuera de catálogo (/mesa/laparada/99)
    await page.goto('/mesa/laparada/99');
    await expect(page.getByRole('heading', { name: /Mesa no disponible/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/La Mesa 99 no está registrada/i)).toBeVisible();

    expect(pageErrors).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });

  test('25. Guardas de Seguridad en Libro de Reservas (/reservas), Salón (/mesas), Kiosco (/kiosco) y Turnos (/turnos)', async ({ page }) => {
    const protectedRoutes = [
      '/reservas',
      '/mesas',
      '/salon',
      '/kiosco',
      '/turnos',
      '/llamador',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page, `La ruta protegida ${route} debe exigir autenticación`).toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: /Panel de Operaciones/i })).toBeVisible();
    }
  });

  test('26. Preparaciones de la Casa y Salsas Artesanales por Lotes en Storefront: ficha de frescura, filtro por categoría e inclusión en pedido', async ({ page }) => {
    const pageErrors: string[] = [];
    const permissionErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/Missing or insufficient permissions/i.test(text)) {
          permissionErrors.push(text);
        }
      }
    });

    await page.goto('/');

    // 26.1 Abrir modal de Preparaciones de la Casa & Salsas Artesanales (botón táctil >= 44px)
    const preparacionesBtn = page.getByTestId('btn-preparaciones-casa-storefront');
    await expect(preparacionesBtn).toBeVisible({ timeout: 25_000 });
    const prepBox = await preparacionesBtn.boundingBox();
    expect(prepBox?.height).toBeGreaterThanOrEqual(44);
    await preparacionesBtn.click();

    const dialog = page.getByRole('dialog', {
      name: /Preparaciones de la Casa & Salsas Artesanales/i,
    });
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    // 26.2 Verificar las 4 preparaciones base con ficha de frescura
    const grid = dialog.getByTestId('storefront-preparaciones-grid');
    await expect(grid).toContainText(/Salsa de Ajo de la Casa/i);
    await expect(grid).toContainText(/Carne Desmechada Marinada/i);
    await expect(grid).toContainText(/Masa Artesanal de Tequeños y Pancerotis/i);
    await expect(grid).toContainText(/Mezcla de Quesos Fundidos para Relleno/i);
    await expect(grid).toContainText(/Frescura 72h/i);

    // 26.3 Filtrar por categoría Masas & Panadería y regresar a Todas
    const catGroup = dialog.getByRole('group', {
      name: /Filtrar preparaciones de la casa por categoría/i,
    });
    const masasBtn = catGroup.getByRole('button', { name: /Masas & Panadería/i });
    await masasBtn.click();
    await expect(masasBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(grid).toContainText(/Masa Artesanal de Tequeños y Pancerotis/i);
    await expect(grid).not.toContainText(/Carne Desmechada Marinada/i);

    const todasBtn = catGroup.getByRole('button', { name: /^Todas/i });
    await todasBtn.click();
    await expect(todasBtn).toHaveAttribute('aria-pressed', 'true');

    // 26.4 Seleccionar Salsa de Ajo de la Casa y Salsa Tártara Artesanal
    const salsasGroup = dialog.getByRole('group', {
      name: /Seleccionar salsas de la casa para tu pedido/i,
    });
    const salsaAjoBtn = salsasGroup.getByRole('button', { name: /Salsa de Ajo de la Casa/i });
    const ajoBox = await salsaAjoBtn.boundingBox();
    expect(ajoBox?.height).toBeGreaterThanOrEqual(44);
    await salsaAjoBtn.click();
    await expect(salsaAjoBtn).toHaveAttribute('aria-pressed', 'true');

    const salsaTartaraBtn = salsasGroup.getByRole('button', { name: /Salsa Tártara Artesanal/i });
    await salsaTartaraBtn.click();
    await expect(salsaTartaraBtn).toHaveAttribute('aria-pressed', 'true');

    await dialog.getByTestId('btn-aplicar-salsas-pedido').click();
    await expect(dialog).not.toBeVisible();

    // 26.5 Agregar producto y verificar badge + notas en Datos de Entrega
    const agregarBtn = page.getByRole('button', { name: /Agregar .* al pedido/i }).first();
    await expect(agregarBtn).toBeVisible({ timeout: 25_000 });
    await agregarBtn.click();

    await page.getByRole('button', { name: /Ver pedido/i }).click();
    const cartDialog = page.getByRole('dialog', { name: /Tu Pedido/i });
    await expect(cartDialog).toBeVisible();
    await cartDialog.getByRole('button', { name: /Continuar con los Datos de Entrega/i }).click();

    const deliveryDialog = page.getByRole('dialog', { name: /Datos de Entrega/i });
    await expect(deliveryDialog).toBeVisible();

    const badgeSalsas = deliveryDialog.getByTestId('badge-salsas-casa-checkout');
    await expect(badgeSalsas).toBeVisible();
    await expect(badgeSalsas).toContainText(/Salsa de Ajo de la Casa/i);
    await expect(badgeSalsas).toContainText(/Salsa Tártara Artesanal/i);

    const notasInput = deliveryDialog.getByLabel(/Instrucciones para el domiciliario/i);
    await expect(notasInput).toHaveValue(/Salsa de Ajo de la Casa/i);
    await expect(notasInput).toHaveValue(/Salsa Tártara Artesanal/i);

    expect(pageErrors).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });

  test('27. Guardas de Seguridad en Producción de Cocina, Sub-Recetas y Bodega (/inventario, /produccion-cocina, /sub-recetas y /bodega)', async ({ page }) => {
    const protectedRoutes = [
      '/inventario',
      '/inventario?tab=produccion',
      '/produccion-cocina',
      '/sub-recetas',
      '/bodega',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page, `La ruta protegida ${route} debe exigir autenticación`).toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: /Panel de Operaciones/i })).toBeVisible();
    }
  });

  test('28. Garantía de Frescura 100%, Reposición y Devolución de Producto en Storefront: pilares de calidad, reporte de plato afectado, compensación 100% offline y enlace a WhatsApp', async ({ page }) => {
    const pageErrors: string[] = [];
    const permissionErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/Missing or insufficient permissions/i.test(text)) {
          permissionErrors.push(text);
        }
      }
    });

    await page.goto('/');

    // 28.1 Abrir modal de Garantía de Frescura 100% con botón táctil >= 44px
    const garantiaBtn = page.getByTestId('btn-garantia-frescura-storefront');
    await expect(garantiaBtn).toBeVisible({ timeout: 25_000 });
    const btnBox = await garantiaBtn.boundingBox();
    expect(btnBox?.height).toBeGreaterThanOrEqual(44);
    await garantiaBtn.click();

    const dialog = page.getByRole('dialog', {
      name: /Garantía de Frescura 100% & Reposición de Producto/i,
    });
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    // 28.2 Verificar los 4 pilares de calidad y frescura
    const pilares = dialog.getByTestId('storefront-garantia-pilares');
    await expect(pilares).toContainText(/Preparación al Instante/i);
    await expect(pilares).toContainText(/Empaque Térmico Sellado/i);
    await expect(pilares).toContainText(/Trazabilidad de Lotes 72h/i);
    await expect(pilares).toContainText(/Reposición 100% Sin Costo/i);

    // 28.3 Seleccionar plato afectado, motivo y compensación 100% offline
    const platosGroup = dialog.getByRole('group', { name: /Seleccionar plato o combo afectado/i });
    const primerPlatoBtn = platosGroup.getByRole('button').first();
    await expect(primerPlatoBtn).toBeVisible();
    const platoText = (await primerPlatoBtn.textContent())?.trim() || '';
    const platoBox = await primerPlatoBtn.boundingBox();
    expect(platoBox?.height).toBeGreaterThanOrEqual(44);
    await primerPlatoBtn.click();
    await expect(primerPlatoBtn).toHaveAttribute('aria-pressed', 'true');

    const motivosGroup = dialog.getByRole('group', {
      name: /Seleccionar motivo de novedad o devolución/i,
    });
    const motivoBtn = motivosGroup.getByRole('button', { name: /Temperatura o textura al llegar/i });
    await motivoBtn.click();
    await expect(motivoBtn).toHaveAttribute('aria-pressed', 'true');

    const modalidadGroup = dialog.getByRole('group', {
      name: /Seleccionar modalidad de solución offline/i,
    });
    const modalidadBtn = modalidadGroup.getByRole('button', {
      name: /Reposición inmediata del plato/i,
    });
    await modalidadBtn.click();
    await expect(modalidadBtn).toHaveAttribute('aria-pressed', 'true');

    // Modelo 100% offline garantizado
    await expect(dialog).not.toContainText(/MercadoPago|Stripe|PayU|PayPal/i);

    // 28.4 Completar datos y confirmar solicitud hacia WhatsApp
    await dialog.locator('#storefront-garantia-codigo').fill('LP-8899');
    await dialog.locator('#storefront-garantia-nombre').fill('Carlos Mendoza');
    await dialog.locator('#storefront-garantia-telefono').fill('3158889900');
    await dialog.getByTestId('btn-confirmar-garantia-storefront').click();

    const confirmacion = dialog.getByTestId('storefront-garantia-confirmada');
    await expect(confirmacion).toBeVisible();
    await expect(confirmacion).toContainText(/Carlos Mendoza/i);
    await expect(confirmacion).toContainText(/LP-8899/i);
    if (platoText) {
      await expect(confirmacion).toContainText(platoText);
    }
    await expect(confirmacion).toContainText(/Temperatura o textura al llegar/i);
    await expect(confirmacion).toContainText(/Reposición inmediata del plato/i);

    const waLink = dialog.getByTestId('link-whatsapp-garantia-storefront');
    await expect(waLink).toBeVisible();
    const href = await waLink.getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\//);
    const decodedHref = decodeURIComponent(href || '');
    expect(decodedHref).toContain('LP-8899');
    expect(decodedHref).toContain('Carlos Mendoza');
    expect(decodedHref).toContain('Reposición inmediata del plato');

    expect(pageErrors).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });

  test('29. Guardas de Seguridad en Control de Mermas Operativas, Desperdicios de Cocina, Reportes P&L y Auditoría Forense (/mermas, /desperdicios, /inventario?tab=mermas, /cocina, /reportes y /auditoria)', async ({ page }) => {
    const protectedRoutes = [
      '/mermas',
      '/desperdicios',
      '/inventario?tab=mermas',
      '/cocina',
      '/reportes',
      '/auditoria',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page, `La ruta protegida ${route} debe exigir autenticación`).toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: /Panel de Operaciones/i })).toBeVisible();
    }
  });

  test('30. Asistente Público de Cotización de Eventos & Catering en Storefront: paquetes por invitado, anticipo 50% offline, cero pasarelas en línea y enlace formal a WhatsApp', async ({ page }) => {
    const pageErrors: string[] = [];
    const permissionErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/Missing or insufficient permissions/i.test(text)) {
          permissionErrors.push(text);
        }
      }
    });

    await page.goto('/');

    // 30.1 Abrir asistente de Eventos & Catering desde botón táctil >= 44px
    const cotizarBtn = page.getByTestId('btn-cotizar-evento-storefront');
    await expect(cotizarBtn).toBeVisible({ timeout: 25_000 });
    const btnBox = await cotizarBtn.boundingBox();
    expect(btnBox?.height).toBeGreaterThanOrEqual(44);
    await cotizarBtn.click();

    const dialog = page.getByRole('dialog', {
      name: /Cotización de Eventos & Catering/i,
    });
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    // 30.2 Seleccionar Evento Corporativo, 50 invitados, Domicilio Evento y servicio extra
    const tipoGroup = dialog.getByRole('group', { name: /Seleccionar tipo de evento/i });
    const corpBtn = tipoGroup.getByRole('button', { name: /Evento Corporativo/i });
    await corpBtn.click();
    await expect(corpBtn).toHaveAttribute('aria-pressed', 'true');

    const invitadosGroup = dialog.getByRole('group', { name: /Cantidad rápida de invitados/i });
    const btn50 = invitadosGroup.getByRole('button', { name: '50', exact: true });
    await btn50.click();
    await expect(btn50).toHaveAttribute('aria-pressed', 'true');

    const extrasGroup = dialog.getByRole('group', {
      name: /Seleccionar servicios adicionales de catering/i,
    });
    const empaqueBtn = extrasGroup.getByRole('button', {
      name: /Empaque térmico y menaje desechable/i,
    });
    await empaqueBtn.click();
    await expect(empaqueBtn).toHaveAttribute('aria-pressed', 'true');

    // 30.3 Verificar cálculo en vivo: 50 * $22.000 + $35.000 = $1.135.000, anticipo 50% = $567.500
    const resumenVivo = dialog.getByTestId('storefront-cotizacion-resumen-vivo');
    await expect(resumenVivo).toContainText(/1\.135\.000/);
    await expect(resumenVivo).toContainText(/567\.500/);

    // Garantía 100% offline y cero exposición de costos internos
    await expect(dialog).not.toContainText(/MercadoPago|Stripe|PayU|PayPal/i);
    await expect(dialog).not.toContainText(/18\.000/);

    // 30.4 Diligenciar datos de empresa/contacto y confirmar hacia WhatsApp
    await dialog.locator('#storefront-cotizacion-nombre').fill('Laura Gómez');
    await dialog.locator('#storefront-cotizacion-empresa').fill('Constructora Norte SAS');
    await dialog.locator('#storefront-cotizacion-telefono').fill('3158889900');
    await dialog.locator('#storefront-cotizacion-direccion').fill('Av. Libertadores #12-30, Caobos');
    await dialog.getByTestId('btn-confirmar-cotizacion-storefront').click();

    const confirmacion = dialog.getByTestId('storefront-cotizacion-confirmada');
    await expect(confirmacion).toBeVisible();
    await expect(confirmacion).toContainText(/Constructora Norte SAS/i);
    await expect(confirmacion).toContainText(/50 invitados/i);
    await expect(confirmacion).toContainText(/1\.135\.000/);
    await expect(confirmacion).toContainText(/567\.500/);

    const waLink = dialog.getByTestId('link-whatsapp-cotizacion-storefront');
    await expect(waLink).toBeVisible();
    const href = await waLink.getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\//);
    const decodedHref = decodeURIComponent(href || '');
    expect(decodedHref).toContain('Constructora Norte SAS');
    expect(decodedHref).toContain('50 personas');
    expect(decodedHref).toContain('Av. Libertadores #12-30, Caobos');

    expect(pageErrors).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });

  test('31. Guardas de Seguridad en Cotizaciones Comerciales, Eventos Corporativos y Catering (/cotizaciones, /catering y /eventos)', async ({ page }) => {
    const protectedRoutes = [
      '/cotizaciones',
      '/catering',
      '/eventos',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page, `La ruta protegida ${route} debe exigir autenticación`).toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: /Panel de Operaciones/i })).toBeVisible();
    }
  });

  test('32. Asistente Público de Cuenta Corriente & Convenio Corporativo Offline en Storefront: cupo sugerido, plazo de corte, abono 100% offline y enlace a WhatsApp', async ({ page }) => {
    const pageErrors: string[] = [];
    const permissionErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/Missing or insufficient permissions/i.test(text)) {
          permissionErrors.push(text);
        }
      }
    });

    await page.goto('/');

    // 32.1 Abrir asistente de Cuenta Corriente desde botón táctil >= 44px
    const carteraBtn = page.getByTestId('btn-cuenta-corriente-storefront');
    await expect(carteraBtn).toBeVisible({ timeout: 25_000 });
    const btnBox = await carteraBtn.boundingBox();
    expect(btnBox?.height).toBeGreaterThanOrEqual(44);
    await carteraBtn.click();

    const dialog = page.getByRole('dialog', {
      name: /Cuenta Corriente & Convenio Corporativo/i,
    });
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    // 32.2 Seleccionar Convenio Corporativo, cupo $500.000, plazo 15 días y abono por transferencia offline
    const tipoGroup = dialog.getByRole('group', { name: /Seleccionar tipo de cuenta corriente/i });
    const corpBtn = tipoGroup.getByRole('button', { name: /Convenio Corporativo/i });
    await corpBtn.click();
    await expect(corpBtn).toHaveAttribute('aria-pressed', 'true');

    const cupoGroup = dialog.getByRole('group', { name: /Seleccionar cupo sugerido de crédito/i });
    const btn500k = cupoGroup.getByRole('button', { name: /500\.000/i });
    await btn500k.click();
    await expect(btn500k).toHaveAttribute('aria-pressed', 'true');

    const plazoGroup = dialog.getByRole('group', { name: /Seleccionar plazo de corte/i });
    const btn15d = plazoGroup.getByRole('button', { name: /15 días · Quincenal/i });
    await btn15d.click();
    await expect(btn15d).toHaveAttribute('aria-pressed', 'true');

    const resumenVivo = dialog.getByTestId('storefront-cuenta-corriente-resumen-vivo');
    await expect(resumenVivo).toContainText(/500\.000/);
    await expect(resumenVivo).toContainText(/15 días/);

    // Garantía 100% offline: cero pasarelas en línea
    await expect(dialog).not.toContainText(/MercadoPago|Stripe|PayU|PayPal/i);

    // 32.3 Completar formulario de convenio corporativo y confirmar hacia WhatsApp
    await dialog.locator('#storefront-cartera-nombre').fill('Andrés Gómez');
    await dialog.locator('#storefront-cartera-telefono').fill('3158889900');
    await dialog.locator('#storefront-cartera-empresa').fill('Clínica Norte SAS');
    await dialog.locator('#storefront-cartera-nit').fill('901.234.567-8');
    await dialog.getByTestId('btn-confirmar-cuenta-corriente-storefront').click();

    const confirmacion = dialog.getByTestId('storefront-cuenta-corriente-confirmada');
    await expect(confirmacion).toBeVisible();
    await expect(confirmacion).toContainText(/Clínica Norte SAS/i);
    await expect(confirmacion).toContainText(/500\.000/);
    await expect(confirmacion).toContainText(/15 días calendario/i);

    const waLink = dialog.getByTestId('link-whatsapp-cuenta-corriente-storefront');
    await expect(waLink).toBeVisible();
    const href = await waLink.getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\//);
    const decodedHref = decodeURIComponent(href || '');
    expect(decodedHref).toContain('Clínica Norte SAS');
    expect(decodedHref).toContain('901.234.567-8');
    expect(decodedHref).toContain('15 días');

    expect(pageErrors).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });

  test('33. Guardas de Seguridad en Cuentas Corrientes, Fiado Controlado y Cartera por Cobrar (/cartera, /fiados, /cuentas-corrientes, /creditos y /clientes)', async ({ page }) => {
    const protectedRoutes = [
      '/cartera',
      '/fiados',
      '/cuentas-corrientes',
      '/creditos',
      '/clientes',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page, `La ruta protegida ${route} debe exigir autenticación`).toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: /Panel de Operaciones/i })).toBeVisible();
    }
  });

  test('34. Asistente Público de Bonos de Regalo & Tarjetas Prepago Offline en Storefront: modalidad, valor sugerido, vigencia, dedicatoria, pago 100% offline y enlace a WhatsApp', async ({ page }) => {
    const pageErrors: string[] = [];
    const permissionErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/Missing or insufficient permissions/i.test(text)) {
          permissionErrors.push(text);
        }
      }
    });

    await page.goto('/');

    // 34.1 Abrir asistente de Bonos de Regalo desde botón táctil >= 44px
    const bonosBtn = page.getByTestId('btn-bonos-regalo-storefront');
    await expect(bonosBtn).toBeVisible({ timeout: 25_000 });
    const btnBox = await bonosBtn.boundingBox();
    expect(btnBox?.height).toBeGreaterThanOrEqual(44);
    await bonosBtn.click();

    const dialog = page.getByRole('dialog', {
      name: /Bonos de Regalo & Tarjetas Prepago/i,
    });
    await expect(dialog).toBeVisible({ timeout: 15_000 });

    // 34.2 Seleccionar modalidad, valor $100.000, vigencia 180 días y ocasión Cumpleaños
    const modalidadGroup = dialog.getByRole('group', { name: /Seleccionar modalidad de bono/i });
    const bonoRegaloBtn = modalidadGroup.getByRole('button', { name: /Bono de Regalo/i });
    await bonoRegaloBtn.click();
    await expect(bonoRegaloBtn).toHaveAttribute('aria-pressed', 'true');

    const valorGroup = dialog.getByRole('group', { name: /Seleccionar valor sugerido del bono/i });
    const btn100k = valorGroup.getByRole('button', { name: /100\.000/i });
    await btn100k.click();
    await expect(btn100k).toHaveAttribute('aria-pressed', 'true');

    const vigenciaGroup = dialog.getByRole('group', { name: /Seleccionar vigencia del bono/i });
    const btn180d = vigenciaGroup.getByRole('button', { name: /180 días/i });
    await btn180d.click();
    await expect(btn180d).toHaveAttribute('aria-pressed', 'true');

    const ocasionGroup = dialog.getByRole('group', { name: /Seleccionar ocasión del regalo/i });
    const btnCumple = ocasionGroup.getByRole('button', { name: /Cumpleaños/i });
    await btnCumple.click();
    await expect(btnCumple).toHaveAttribute('aria-pressed', 'true');

    const resumenVivo = dialog.getByTestId('storefront-bono-resumen-vivo');
    await expect(resumenVivo).toContainText(/100\.000/);
    await expect(resumenVivo).toContainText(/180 días/);

    // Garantía 100% offline: cero pasarelas en línea
    await expect(dialog).not.toContainText(/MercadoPago|Stripe|PayU|PayPal/i);

    // 34.3 Diligenciar beneficiario, solicitante, dedicatoria y confirmar hacia WhatsApp
    await dialog.locator('#storefront-bono-destinatario').fill('Camila Rojas');
    await dialog.locator('#storefront-bono-comprador').fill('Laura Méndez');
    await dialog.locator('#storefront-bono-comprador-tel').fill('3147778899');
    await dialog
      .locator('#storefront-bono-mensaje')
      .fill('¡Feliz cumpleaños! Disfruta tus favoritos en La Parada.');
    await dialog.getByTestId('btn-confirmar-bono-storefront').click();

    const confirmacion = dialog.getByTestId('storefront-bono-confirmado');
    await expect(confirmacion).toBeVisible();
    await expect(confirmacion).toContainText(/Camila Rojas/i);
    await expect(confirmacion).toContainText(/100\.000/);
    await expect(confirmacion).toContainText(/180 días/i);
    await expect(confirmacion).toContainText(/Laura Méndez/i);

    const waLink = dialog.getByTestId('link-whatsapp-bono-storefront');
    await expect(waLink).toBeVisible();
    const href = await waLink.getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\//);
    const decodedHref = decodeURIComponent(href || '');
    expect(decodedHref).toContain('Camila Rojas');
    expect(decodedHref).toContain('Laura Méndez');
    expect(decodedHref).toContain('100.000');
    expect(decodedHref).toContain('180 días');
    expect(decodedHref).toContain('Feliz cumpleaños');

    expect(pageErrors).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });

  test('35. Guardas de Seguridad en Bonos de Regalo Digitales, Tarjetas Prepago y Vales Offline (/bonos, /tarjetas-prepago, /vales y /gift-cards)', async ({ page }) => {
    const protectedRoutes = [
      '/bonos',
      '/tarjetas-prepago',
      '/vales',
      '/gift-cards',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page, `La ruta protegida ${route} debe exigir autenticación`).toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: /Panel de Operaciones/i })).toBeVisible();
    }
  });

  test('36. Guardas de Seguridad en Movimientos de Caja en Turno, Sangrías, Caja Menor, Corte X y Dashboard (/caja, /movimientos-caja, /sangrias, /corte-x, /pos y /dashboard)', async ({ page }) => {
    const pageErrors: string[] = [];
    const permissionErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/Missing or insufficient permissions/i.test(text)) {
          permissionErrors.push(text);
        }
      }
    });

    const protectedRoutes = [
      '/caja',
      '/movimientos-caja',
      '/sangrias',
      '/corte-x',
      '/pos',
      '/dashboard',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page, `La ruta protegida ${route} debe exigir autenticación`).toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: /Panel de Operaciones/i })).toBeVisible();
    }

    expect(pageErrors).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });

  test('37. Guardas de Seguridad en Gastos Operativos Detallados, Control de Caja Menor y Conciliación P&L (/gastos, /caja, /reportes y /dashboard)', async ({ page }) => {
    const pageErrors: string[] = [];
    const permissionErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/Missing or insufficient permissions/i.test(text)) {
          permissionErrors.push(text);
        }
      }
    });

    const protectedRoutes = [
      '/gastos',
      '/caja',
      '/reportes',
      '/dashboard',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page, `La ruta protegida ${route} debe exigir autenticación`).toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: /Panel de Operaciones/i })).toBeVisible();
    }

    expect(pageErrors).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });

  test('38. Guardas de Seguridad en Horarios & Pausa de Cocina (/admin-settings, /kiosco, /pos) y Storefront sin errores de disponibilidad', async ({ page }) => {
    const pageErrors: string[] = [];
    const permissionErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/Missing or insufficient permissions/i.test(text)) {
          permissionErrors.push(text);
        }
      }
    });

    const protectedRoutes = [
      '/admin-settings',
      '/kiosco',
      '/pos',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page, `La ruta protegida ${route} debe exigir autenticación`).toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: /Panel de Operaciones/i })).toBeVisible();
    }

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 25_000 });
    await expect(page.locator('body')).not.toContainText(/MercadoPago|Stripe|PayU|PayPal/i);

    expect(pageErrors).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });

  test('39. Guardas de Seguridad en Base de Sencillo en Ruta, Liquidación de Domiciliarios y Conciliación con Caja (/repartidor, /domicilios, /caja) y Storefront sin errores', async ({ page }) => {
    const pageErrors: string[] = [];
    const permissionErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/Missing or insufficient permissions/i.test(text)) {
          permissionErrors.push(text);
        }
      }
    });

    const protectedRoutes = [
      '/repartidor',
      '/domicilios',
      '/caja',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page, `La ruta protegida ${route} debe exigir autenticación`).toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: /Panel de Operaciones/i })).toBeVisible();
    }

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 25_000 });
    await expect(page.locator('body')).not.toContainText(/MercadoPago|Stripe|PayU|PayPal/i);

    expect(pageErrors).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });

  test('40. Guardas de Seguridad en Comandas por Estación de Cocina y Tiempos Objetivo (/cocina, /kds, /productos, /pos) y Storefront sin errores', async ({ page }) => {
    const pageErrors: string[] = [];
    const permissionErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/Missing or insufficient permissions/i.test(text)) {
          permissionErrors.push(text);
        }
      }
    });

    const protectedRoutes = [
      '/cocina',
      '/kds',
      '/productos',
      '/pos',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page, `La ruta protegida ${route} debe exigir autenticación`).toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: /Panel de Operaciones/i })).toBeVisible();
    }

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 25_000 });
    await expect(page.locator('body')).not.toContainText(/MercadoPago|Stripe|PayU|PayPal/i);

    expect(pageErrors).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });

  test('41. Guardas de Seguridad en Empaques, Bolsas y Desechables por Canal (/inventario, /productos, /pos, /reportes) y Storefront sin errores', async ({ page }) => {
    const pageErrors: string[] = [];
    const permissionErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/Missing or insufficient permissions/i.test(text)) {
          permissionErrors.push(text);
        }
      }
    });

    const protectedRoutes = [
      '/inventario',
      '/productos',
      '/pos',
      '/reportes',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page, `La ruta protegida ${route} debe exigir autenticación`).toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: /Panel de Operaciones/i })).toBeVisible();
    }

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 25_000 });
    await expect(page.locator('body')).not.toContainText(/MercadoPago|Stripe|PayU|PayPal/i);

    expect(pageErrors).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });

  test('42. Filtros de Dieta y Alérgenos en Storefront (/) y Menú QR (/mesa/laparada/1): objetivos táctiles ≥ 44 px, panel "Tengo alergias", aria-pressed, estado reactivo y limpieza sin errores', async ({ page }) => {
    const pageErrors: string[] = [];
    const permissionErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/Missing or insufficient permissions/i.test(text)) {
          permissionErrors.push(text);
        }
      }
    });

    await page.goto('/');

    const filtroBar = page.getByTestId('filtro-dietetico-bar');
    await expect(filtroBar).toBeVisible({ timeout: 25_000 });

    const dietaGroup = filtroBar.getByRole('group', { name: /Filtrar por dieta/i });
    const veggieBtn = dietaGroup.getByRole('button', { name: /Vegetariano/i });
    await veggieBtn.scrollIntoViewIfNeeded();
    const veggieBox = await veggieBtn.boundingBox();
    expect(veggieBox?.height).toBeGreaterThanOrEqual(44);
    await expect(veggieBtn).toHaveAttribute('aria-pressed', 'false');

    await veggieBtn.click();
    await expect(veggieBtn).toHaveAttribute('aria-pressed', 'true');

    const statusText = filtroBar.getByRole('status');
    await expect(statusText).toBeVisible();
    await expect(statusText).toHaveText(/Ningún plato cumple estos filtros\.|\d+ platos? cumplen? tus filtros\./i);

    const alergiasBtn = dietaGroup.getByRole('button', { name: /Tengo alergias/i });
    const alergiasBox = await alergiasBtn.boundingBox();
    expect(alergiasBox?.height).toBeGreaterThanOrEqual(44);
    await expect(alergiasBtn).toHaveAttribute('aria-expanded', 'false');

    await alergiasBtn.click();
    await expect(alergiasBtn).toHaveAttribute('aria-expanded', 'true');

    const alergenosGroup = filtroBar.getByRole('group', { name: /Excluir alérgenos/i });
    await expect(alergenosGroup).toBeVisible();
    await expect(filtroBar).toContainText(/Solo mostramos platos con alérgenos verificados por la cocina/i);

    const sinGlutenAlergenoBtn = alergenosGroup.getByRole('button', { name: 'Sin Gluten', exact: true });
    const sinGlutenBox = await sinGlutenAlergenoBtn.boundingBox();
    expect(sinGlutenBox?.height).toBeGreaterThanOrEqual(44);
    await sinGlutenAlergenoBtn.click();
    await expect(sinGlutenAlergenoBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(alergiasBtn).toContainText('1');

    const limpiarBtn = filtroBar.getByRole('button', { name: /Quitar todos los filtros de dieta y alergias/i });
    await limpiarBtn.click();
    await expect(veggieBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(sinGlutenAlergenoBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(limpiarBtn).not.toBeVisible();

    await page.goto('/mesa/laparada/1');
    await expect(page.getByRole('heading', { name: /Mesa 1/i })).toBeVisible({ timeout: 25_000 });

    const mesaFiltro = page.getByTestId('filtro-dietetico-bar');
    await expect(mesaFiltro).toBeVisible();

    const mesaDietaGroup = mesaFiltro.getByRole('group', { name: /Filtrar por dieta/i });
    const mesaSinGlutenBtn = mesaDietaGroup.getByRole('button', { name: /Sin gluten/i });
    await mesaSinGlutenBtn.click();
    await expect(mesaSinGlutenBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(mesaFiltro.getByRole('status')).toBeVisible();

    await mesaFiltro.getByRole('button', { name: /Quitar todos los filtros de dieta y alergias/i }).click();
    await expect(mesaSinGlutenBtn).toHaveAttribute('aria-pressed', 'false');

    expect(pageErrors).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });

  test('43. Guardas de Seguridad en Módulo de Alérgenos, Restricciones Alimentarias y Comandas (/productos, /pos, /mesas, /cocina, /kiosco) y Storefront 100% offline sin errores', async ({ page }) => {
    const pageErrors: string[] = [];
    const permissionErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/Missing or insufficient permissions/i.test(text)) {
          permissionErrors.push(text);
        }
      }
    });

    const protectedRoutes = [
      '/productos',
      '/pos',
      '/mesas',
      '/cocina',
      '/kiosco',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page, `La ruta protegida ${route} debe exigir autenticación`).toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: /Panel de Operaciones/i })).toBeVisible();
    }

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 25_000 });
    await expect(page.locator('body')).not.toContainText(/MercadoPago|Stripe|PayU|PayPal/i);

    expect(pageErrors).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });

  test('44. Guardas de Seguridad en Control de Lotes PEPS/FIFO, Semáforo Sanitario y Alertas (/lotes, /vencimientos, /peps, /inventario?tab=lotes, /notificaciones, /alertas, /admin) y Storefront 100% offline sin errores', async ({ page }) => {
    const pageErrors: string[] = [];
    const permissionErrors: string[] = [];

    page.on('pageerror', (err) => pageErrors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (/Missing or insufficient permissions/i.test(text)) {
          permissionErrors.push(text);
        }
      }
    });

    const protectedRoutes = [
      '/lotes',
      '/vencimientos',
      '/peps',
      '/inventario?tab=lotes',
      '/notificaciones',
      '/alertas',
      '/admin',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page, `La ruta protegida ${route} debe exigir autenticación`).toHaveURL(/\/login/);
      await expect(page.getByRole('heading', { name: /Panel de Operaciones/i })).toBeVisible();
    }

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 25_000 });
    await expect(page.locator('body')).not.toContainText(/MercadoPago|Stripe|PayU|PayPal/i);

    expect(pageErrors).toEqual([]);
    expect(permissionErrors).toEqual([]);
  });

  test('45. Verificación en Vivo de Reglas Firestore en /lotes_inventario (laparada-26): bloqueo de lectura y escritura no autenticada', async ({ request }) => {
    const endpoint = 'https://firestore.googleapis.com/v1/projects/laparada-26/databases/(default)/documents/lotes_inventario';

    const readRes = await request.get(endpoint);
    expect(readRes.status()).toBe(403);

    const writeRes = await request.post(endpoint, {
      data: {
        fields: {
          negocioId: { stringValue: 'laparada' },
          insumoId: { stringValue: 'insumo-qa-test' },
          insumoNombre: { stringValue: 'Insumo QA Test' },
          codigoLote: { stringValue: 'LOT-QA-01' },
          cantidadInicial: { doubleValue: 10 },
          cantidadDisponible: { doubleValue: 10 },
          cantidadConsumida: { doubleValue: 0 },
          costoUnitario: { integerValue: '1000' },
          estado: { stringValue: 'activo' },
        },
      },
    });
    expect(writeRes.status()).toBe(403);
  });
});
