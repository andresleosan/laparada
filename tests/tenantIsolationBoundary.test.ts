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
      'src/services/movimientosCajaService.ts',
      'src/services/cierreCajaService.ts',
      'src/services/whatsappService.ts',
      'src/services/clientesService.ts',
      'src/services/metasPresupuestoService.ts',
      'src/services/promocionesService.ts',
      'src/services/esperaService.ts',
      'src/services/meserosService.ts',
      'src/services/auditoriaService.ts',
      'src/services/contabilidadService.ts',
      'src/services/emailNotificationsService.ts',
      'src/services/facturacionService.ts',
      'src/services/kioscoService.ts',
      'src/services/mesasService.ts',
      'src/services/notificacionesService.ts',
      'src/services/personalService.ts',
      'src/services/proveedoresService.ts',
      'src/services/reservasService.ts',
      'src/services/cotizacionesService.ts',
      'src/services/carteraService.ts',
      'src/services/bonosService.ts',
      'src/services/satisfaccionService.ts',
      'src/services/tandaVitrinaService.ts',
      'src/services/lotesInventarioService.ts',
      'src/services/bpmService.ts',
      'src/services/mantenimientoService.ts',
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

  it('conserva el ID canónico del documento al mapear datos no confiables', () => {
    const documentMappers = [
      'src/hooks/useReportes.ts',
      'src/services/categoriasService.ts',
      'src/services/cajaService.ts',
      'src/services/movimientosCajaService.ts',
      'src/services/cierreCajaService.ts',
      'src/services/domiciliosService.ts',
      'src/services/gastosService.ts',
      'src/services/inventarioService.ts',
      'src/services/negociosService.ts',
      'src/services/productosService.ts',
      'src/services/whatsappService.ts',
      'src/services/metasPresupuestoService.ts',
      'src/services/auditoriaService.ts',
      'src/services/clientesService.ts',
      'src/services/contabilidadService.ts',
      'src/services/emailNotificationsService.ts',
      'src/services/esperaService.ts',
      'src/services/facturacionService.ts',
      'src/services/kioscoService.ts',
      'src/services/mesasService.ts',
      'src/services/meserosService.ts',
      'src/services/notificacionesService.ts',
      'src/services/orderTrackingService.ts',
      'src/services/personalService.ts',
      'src/services/promocionesService.ts',
      'src/services/proveedoresService.ts',
      'src/services/reservasService.ts',
      'src/services/cotizacionesService.ts',
      'src/services/carteraService.ts',
      'src/services/bonosService.ts',
      'src/services/satisfaccionService.ts',
      'src/services/tandaVitrinaService.ts',
      'src/services/lotesInventarioService.ts',
      'src/services/bpmService.ts',
      'src/services/mantenimientoService.ts',
      'firebase-functions/src/bot/orderProcessingService.ts',
      'firebase-functions/src/bot/messageProcessorScheduler.ts',
      'firebase-functions/src/bot/whatsappBotService.ts',
    ];
    const storedIdCanOverrideCanonicalId = /id:\s*[\w.]+\.id,\s*\r?\n\s*\.\.\.\(?[\w.]+\.data\(\)/;
    const inlineStoredIdCanOverride = /\{\s*id:\s*[\w.]+\.id,\s*\.\.\.\(?[\w.]+\.data\(\)/;

    for (const sourcePath of documentMappers) {
      expect(read(sourcePath), sourcePath).not.toMatch(storedIdCanOverrideCanonicalId);
      expect(read(sourcePath), sourcePath).not.toMatch(inlineStoredIdCanOverride);
    }
  });

  it('conecta también Storage al emulador durante los smoke locales', () => {
    const firebase = read('src/services/firebase.ts');
    expect(firebase).toContain("connectStorageEmulator(storage, '127.0.0.1', 9199)");
  });

  it('aísla el runtime exportado de WhatsApp con WHATSAPP_NEGOCIO_ID', () => {
    const bot = read('firebase-functions/src/bot/whatsappBotService.ts');
    const orders = read('firebase-functions/src/bot/orderProcessingService.ts');
    const menu = read('firebase-functions/src/bot/menuGenerationService.ts');
    const scheduler = read('firebase-functions/src/bot/messageProcessorScheduler.ts');
    const webhook = read('firebase-functions/src/webhooks/whatsappWebhook.ts');

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
      'lotes_inventario',
      'gastos',
      'cajas',
      'movimientos_caja',
      'cortes_x',
      'cierres_caja',
      'mensajes_whatsapp',
      'bot_queue',
      'ordenes_pendientes',
      'metas_presupuestos',
      'liquidaciones_meseros',
      'lista_espera',
      'cotizaciones',
      'cuentas_corrientes',
      'movimientos_cartera',
      'bonos_prepago',
      'movimientos_bonos',
      'notificaciones_correo',
      'promociones',
      'tandas_vitrina',
      'encuestas_satisfaccion',
      'registros_temperatura_bpm',
      'registros_aceite_bpm',
      'checklists_bpm',
      'equipos_mantenimiento',
      'ordenes_mantenimiento',
      'reportes_falla_equipos',
    ]);

    for (const index of indexes.indexes.filter((item) => operational.has(item.collectionGroup))) {
      expect(index.fields[0]?.fieldPath, index.collectionGroup).toBe('negocioId');
    }
  });

  it('restringe campos, estados y totales en las reglas públicas de salón y autopedido', () => {
    const firestoreRules = read('firestore.rules');

    const mesasBlock = firestoreRules.match(/match \/mesas\/\{mesaId\}\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';
    const cuentasBlock = firestoreRules.match(/match \/cuentas_mesas\/\{cuentaId\}\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';
    const domiciliosBlock = firestoreRules.match(/match \/domicilios\/\{domicilioId\}\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';

    expect(mesasBlock).toContain('affectedKeys().hasOnly');
    expect(mesasBlock).toContain("request.resource.data.estado in ['ocupada', 'por_cobrar']");
    expect(cuentasBlock).toContain("request.resource.data.estado == 'abierta'");
    expect(cuentasBlock).toContain('request.resource.data.total == 0');
    expect(cuentasBlock).toContain("request.resource.data.estado in ['abierta', 'por_cobrar']");
    expect(cuentasBlock).toContain('request.resource.data.total >= resource.data.total');
    expect(cuentasBlock).toContain('affectedKeys().hasOnly');
    expect(domiciliosBlock).toContain("request.resource.data.estado == 'pendiente'");
    expect(domiciliosBlock).toContain('request.resource.data.total >= 0');

    const zonasBlock = firestoreRules.match(/match \/configuraciones_zonas_domicilio\/\{negocioId\}\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';
    expect(zonasBlock).toContain('request.resource.data.negocioId == negocioId');
    expect(zonasBlock).toContain('isTenantAdmin(negocioId)');

    const bonosBlock = firestoreRules.match(/match \/bonos_prepago\/\{bonoId\}\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';
    expect(bonosBlock).toContain('request.resource.data.saldoActual >= 0');
    expect(bonosBlock).toContain('request.resource.data.codigo == resource.data.codigo');
    expect(bonosBlock).toContain('request.resource.data.montoInicial == resource.data.montoInicial');

    const movBonosBlock = firestoreRules.match(/match \/movimientos_bonos\/\{movimientoId\}\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';
    expect(movBonosBlock).toContain('allow update: if false;');
    expect(movBonosBlock).toContain('!request.resource.data.keys().hasAny([\'id\'])');

    const lotesBlock = firestoreRules.match(/match \/lotes_inventario\/\{loteId\}\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';
    expect(lotesBlock).toContain('canReadTenantDocument()');
    expect(lotesBlock).toContain('!request.resource.data.keys().hasAny([\'id\'])');
    expect(lotesBlock).toContain('request.resource.data.codigoLote == resource.data.codigoLote');
    expect(lotesBlock).toContain('request.resource.data.cantidadInicial == resource.data.cantidadInicial');
    expect(lotesBlock).toContain('request.resource.data.cantidadDisponible >= 0');

    const configBpmBlock = firestoreRules.match(/match \/configuraciones_bpm\/\{negocioId\}\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';
    expect(configBpmBlock).toContain('isTenantMember(negocioId)');
    expect(configBpmBlock).toContain('isValidConfiguracionBpmData(negocioId)');

    const tempBpmBlock = firestoreRules.match(/match \/registros_temperatura_bpm\/\{registroId\}\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';
    expect(tempBpmBlock).toContain('canReadTenantDocument()');
    expect(tempBpmBlock).toContain('request.resource.data.temperaturaC >= -60');
    expect(tempBpmBlock).toContain('request.resource.data.temperaturaC <= 250');
    expect(tempBpmBlock).toContain('affectedKeys().hasOnly');

    const aceiteBpmBlock = firestoreRules.match(/match \/registros_aceite_bpm\/\{registroId\}\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';
    expect(aceiteBpmBlock).toContain('canReadTenantDocument()');
    expect(aceiteBpmBlock).toContain('allow update: if false;');

    const checklistBpmBlock = firestoreRules.match(/match \/checklists_bpm\/\{checklistId\}\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';
    expect(checklistBpmBlock).toContain('canReadTenantDocument()');
    expect(checklistBpmBlock).toContain('isValidChecklistBpmComun()');
    expect(checklistBpmBlock).toContain('request.resource.data.tipo == resource.data.tipo');

    const equiposMantBlock = firestoreRules.match(/match \/equipos_mantenimiento\/\{equipoId\}\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';
    expect(equiposMantBlock).toContain('canReadTenantDocument()');
    expect(equiposMantBlock).toContain('isValidEquipoMantenimientoData()');
    expect(equiposMantBlock).toContain("affectedKeys().hasOnly([\n            'estadoOperativo',\n            'actualizadoEn'\n          ])");

    const ordenesMantBlock = firestoreRules.match(/match \/ordenes_mantenimiento\/\{ordenId\}\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';
    expect(ordenesMantBlock).toContain('canReadTenantDocument()');
    expect(ordenesMantBlock).toContain('isValidOrdenMantenimientoData()');
    expect(ordenesMantBlock).toContain('allow update: if false;');

    const fallasMantBlock = firestoreRules.match(/match \/reportes_falla_equipos\/\{fallaId\}\s*\{[\s\S]*?\n {4}\}/)?.[0] ?? '';
    expect(fallasMantBlock).toContain('canReadTenantDocument()');
    expect(fallasMantBlock).toContain('isValidReporteFallaCreateMantenimiento()');
    expect(fallasMantBlock).toContain('request.resource.data.equipoNombre == resource.data.equipoNombre');
  });
});
