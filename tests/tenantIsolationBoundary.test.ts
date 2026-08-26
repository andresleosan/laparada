import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (relativePath: string) => readFileSync(resolve(relativePath), 'utf8');

describe('frontera multi-tenant', () => {
  it('hace obligatorio negocioId en todas las entidades operativas del frontend', () => {
    const types = read('src/types/index.ts');
    const entities = [
      'CategoriaProducto',
      'Producto',
      'Combo',
      'Venta',
      'Domicilio',
      'Insumo',
      'EntradaInventario',
      'Gasto',
      'CierreCaja',
      'Caja',
      'ConfiguracionBot',
      'MensajeWhatsApp',
    ];

    for (const entity of entities) {
      const declaration = types.match(
        new RegExp(`export interface ${entity} \\{[\\s\\S]*?\\n\\}`)
      )?.[0];
      expect(declaration, `${entity} debe existir`).toBeTruthy();
      expect(declaration, `${entity} debe exigir negocioId`).toMatch(/negocioId:\s*string/);
      expect(declaration, `${entity} no debe aceptar negocioId opcional`).not.toMatch(
        /negocioId\?:/
      );
    }
  });

  it('elimina claims globales y exige pertenencia del tenant en reglas', () => {
    const firestoreRules = read('firestore.rules');
    const storageRules = read('storage.rules');

    expect(firestoreRules).not.toMatch(/request\.auth\.token\.(role|admin|employee)/);
    expect(storageRules).not.toMatch(/request\.auth\.token\.(role|admin|employee)/);
    expect(firestoreRules).toContain('get(userProfilePath()).data.negocioId == negocioId');
    expect(firestoreRules).toContain('request.resource.data.negocioId == resource.data.negocioId');
    expect(storageRules).toContain('transferencias/{negocioId}/{allPaths=**}');
  });

  it('mantiene las consultas activas del cliente acotadas al tenant', () => {
    const scopedServices = [
      'src/services/productosService.ts',
      'src/services/categoriasService.ts',
      'src/services/domiciliosService.ts',
      'src/services/inventarioService.ts',
      'src/services/gastosService.ts',
      'src/services/cajaService.ts',
      'src/services/cierreCajaService.ts',
      'src/services/whatsappService.ts',
    ];

    for (const service of scopedServices) {
      const source = read(service);
      expect(source, `${service} debe validar el tenant`).toContain('requireTenantId');
      expect(source, `${service} debe filtrar por tenant`).toMatch(
        /where\('negocioId',\s*'=='/
      );
    }

    expect(read('src/services/botConfigService.ts')).toContain(
      "doc(db, 'configuracion', tenantId)"
    );
    expect(read('src/services/ventasService.ts')).toContain('negocioId: tenantId');
    expect(read('src/services/ventasService.ts')).not.toContain('getDownloadURL');
    expect(read('src/services/ventasService.ts')).toContain(
      '`transferencias/${tenantId}/`'
    );
  });

  it('conecta también Storage al emulador durante los smoke locales', () => {
    const firebase = read('src/services/firebase.ts');
    expect(firebase).toContain("connectStorageEmulator(storage, '127.0.0.1', 9199)");
  });

  it('aísla el runtime exportado de WhatsApp con WHATSAPP_NEGOCIO_ID', () => {
    const bot = read('functions/src/bot/whatsappBotService.ts');
    const orders = read('functions/src/bot/orderProcessingService.ts');
    const menu = read('functions/src/bot/menuGenerationService.ts');
    const scheduler = read('functions/src/bot/messageProcessorScheduler.ts');
    const webhook = read('functions/src/webhooks/whatsappWebhook.ts');

    for (const source of [bot, orders, menu, scheduler]) {
      expect(source).toContain('WHATSAPP_NEGOCIO_ID');
      expect(source).toMatch(/where\('negocioId',\s*'=='/);
    }
    expect(webhook).toContain(".where('negocioId', '==', negocioId)");
    expect(webhook).toContain('negocioId,');
  });

  it('declara negocioId como primer campo de cada índice operativo compuesto', () => {
    const indexes = JSON.parse(read('firestore.indexes.json')) as {
      indexes: Array<{ collectionGroup: string; fields: Array<{ fieldPath: string }> }>;
    };
    const operational = new Set([
      'productos',
      'combos',
      'ventas',
      'domicilios',
      'inventario',
      'entradas_inventario',
      'gastos',
      'cajas',
      'cierres_caja',
      'mensajes_whatsapp',
      'bot_queue',
      'ordenes_pendientes',
    ]);

    for (const index of indexes.indexes.filter((item) => operational.has(item.collectionGroup))) {
      expect(index.fields[0]?.fieldPath, index.collectionGroup).toBe('negocioId');
    }
  });
});
