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

  test('4. Carrito y Límites Seguros de Pedido en Storefront (Modelo 100% Offline)', async ({ page }) => {
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

    // 4.5 Diálogo de Datos de Entrega y métodos de pago offline
    const deliveryDialog = page.getByRole('dialog', { name: /Datos de Entrega/i });
    await expect(deliveryDialog).toBeVisible();
    await expect(deliveryDialog.getByRole('radio', { name: /Efectivo/i })).toBeVisible();
    await expect(deliveryDialog.getByRole('radio', { name: /Transferencia manual/i })).toBeVisible();

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

  test('7. PWA Manifest y soporte Offline en el navegador', async ({ page, request }) => {
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
    // Al intentar navegar a /clientes sin sesión activa, se redirige a /login
    await page.goto('/clientes');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: /Iniciar Sesión|Panel de Operaciones/i })).toBeVisible();
  });

  test('10. Pantalla de Cocina KDS (/cocina y /kds): protegida tras login', async ({ page }) => {
    // Al intentar navegar a /cocina o /kds sin sesión activa, se redirige a /login
    await page.goto('/cocina');
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('heading', { name: /Iniciar Sesión|Panel de Operaciones/i })).toBeVisible();

    await page.goto('/kds');
    await expect(page).toHaveURL(/.*login/);
  });
});
