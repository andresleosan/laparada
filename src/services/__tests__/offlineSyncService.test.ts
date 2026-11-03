// src/services/__tests__/offlineSyncService.test.ts
import { describe, expect, it, beforeEach, vi } from 'vitest';
import type { ItemVenta, Producto, Combo } from '@/types';
import * as ventasService from '@/services/ventasService';
import {
  guardarVentaOffline,
  obtenerVentasPendientes,
  contarVentasPendientes,
  eliminarVentaPendiente,
  actualizarEstadoVentaPendiente,
  sincronizarVentasPendientes,
  guardarCatalogoEnCache,
  obtenerCatalogoEnCache,
} from '../offlineSyncService';

class MockIDBRequest {
  result: unknown = null;
  error: Error | null = null;
  onsuccess: ((ev: unknown) => void) | null = null;
  onerror: ((ev: unknown) => void) | null = null;
  onupgradeneeded: ((ev: unknown) => void) | null = null;

  triggerSuccess(res: unknown) {
    this.result = res;
    if (this.onsuccess) this.onsuccess({ target: this });
  }

  triggerError(err: Error) {
    this.error = err;
    if (this.onerror) this.onerror({ target: this });
  }
}

function createMockIndexedDB() {
  const dbs = new Map<string, { stores: Map<string, Map<any, any>> }>();
  return {
    open: (name: string, _version: number) => {
      const req = new MockIDBRequest();
      setTimeout(() => {
        let dbEntry = dbs.get(name);
        let isUpgrade = false;
        if (!dbEntry) {
          dbEntry = { stores: new Map() };
          dbs.set(name, dbEntry);
          isUpgrade = true;
        }

        const dbObj: any = {
          objectStoreNames: {
            contains: (sName: string) => dbEntry!.stores.has(sName),
          },
          createObjectStore: (sName: string, _options?: any) => {
            if (!dbEntry!.stores.has(sName)) {
              dbEntry!.stores.set(sName, new Map());
            }
            return {
              createIndex: () => {},
            };
          },
          transaction: (storeNames: string | string[], _mode: string) => {
            const sName = Array.isArray(storeNames) ? storeNames[0] : storeNames;
            let targetMap = dbEntry!.stores.get(sName);
            if (!targetMap) {
              targetMap = new Map();
              dbEntry!.stores.set(sName, targetMap);
            }
            return {
              objectStore: (_osName: string) => ({
                put: (val: any) => {
                  const pReq = new MockIDBRequest();
                  setTimeout(() => {
                    const key = val.id || val.negocioId;
                    targetMap!.set(key, { ...val });
                    pReq.triggerSuccess(key);
                  }, 0);
                  return pReq;
                },
                get: (key: any) => {
                  const gReq = new MockIDBRequest();
                  setTimeout(() => {
                    const item = targetMap!.get(key);
                    gReq.triggerSuccess(item ? { ...item } : undefined);
                  }, 0);
                  return gReq;
                },
                delete: (key: any) => {
                  const dReq = new MockIDBRequest();
                  setTimeout(() => {
                    targetMap!.delete(key);
                    dReq.triggerSuccess(undefined);
                  }, 0);
                  return dReq;
                },
                index: (_idxName: string) => ({
                  getAll: (range: any) => {
                    const aReq = new MockIDBRequest();
                    setTimeout(() => {
                      const filterVal = range?.lower || range;
                      const all = Array.from(targetMap!.values()).filter(
                        (item: any) => !filterVal || item.negocioId === filterVal
                      );
                      aReq.triggerSuccess(all);
                    }, 0);
                    return aReq;
                  },
                }),
              }),
            };
          },
        };

        if (isUpgrade && req.onupgradeneeded) {
          req.result = dbObj;
          req.onupgradeneeded({ target: req });
        }

        req.triggerSuccess(dbObj);
      }, 0);
      return req;
    },
  };
}

describe('offlineSyncService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const mockIdb = createMockIndexedDB();
    (globalThis as any).window = (globalThis as any).window || {};
    (globalThis as any).window.indexedDB = mockIdb;
    (globalThis as any).IDBKeyRange = {
      only: (val: any) => ({ lower: val, upper: val }),
    };
  });

  const dummyItem: ItemVenta = {
    tipo: 'producto',
    referenciaId: 'prod-1',
    nombre: 'Hamburguesa Doble',
    cantidad: 2,
    precioUnitario: 18000,
    subtotal: 36000,
  };

  it('guarda una venta offline con aislamiento por negocioId y valores por defecto', async () => {
    const venta = await guardarVentaOffline('laparada', {
      items: [dummyItem],
      total: 36000,
      metodoPago: 'efectivo',
      tipoEntrega: 'mostrador',
    });

    expect(venta.id).toBeDefined();
    expect(venta.negocioId).toBe('laparada');
    expect(venta.estadoSync).toBe('pendiente');
    expect(venta.intentos).toBe(0);
    expect(venta.fechaCreacion).toBeDefined();

    const pendientes = await obtenerVentasPendientes('laparada');
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0].total).toBe(36000);
    expect(await contarVentasPendientes('laparada')).toBe(1);
  });

  it('aisla las ventas pendientes estrictamente por tenant (multi-tenant)', async () => {
    await guardarVentaOffline('tenant-a', {
      items: [dummyItem],
      total: 10000,
      metodoPago: 'efectivo',
      tipoEntrega: 'mostrador',
    });

    await guardarVentaOffline('tenant-b', {
      items: [dummyItem],
      total: 20000,
      metodoPago: 'efectivo',
      tipoEntrega: 'mostrador',
    });

    const pendientesA = await obtenerVentasPendientes('tenant-a');
    const pendientesB = await obtenerVentasPendientes('tenant-b');

    expect(pendientesA).toHaveLength(1);
    expect(pendientesA[0].total).toBe(10000);

    expect(pendientesB).toHaveLength(1);
    expect(pendientesB[0].total).toBe(20000);
  });

  it('rechaza eliminar una venta si el negocioId no coincide', async () => {
    const venta = await guardarVentaOffline('tenant-a', {
      items: [dummyItem],
      total: 10000,
      metodoPago: 'efectivo',
      tipoEntrega: 'mostrador',
    });

    await expect(
      eliminarVentaPendiente(venta.id, 'tenant-otro')
    ).rejects.toThrow(/El negocio activo es requerido|no pertenece al negocio activo/i);
  });

  it('actualiza el estado a error e incrementa intentos en fallo', async () => {
    const venta = await guardarVentaOffline('laparada', {
      items: [dummyItem],
      total: 36000,
      metodoPago: 'efectivo',
      tipoEntrega: 'mostrador',
    });

    await actualizarEstadoVentaPendiente(
      venta.id,
      'laparada',
      'error',
      'Fallo de timeout en red'
    );

    const pendientes = await obtenerVentasPendientes('laparada');
    expect(pendientes[0].estadoSync).toBe('error');
    expect(pendientes[0].intentos).toBe(1);
    expect(pendientes[0].errorDetalle).toBe('Fallo de timeout en red');
  });

  it('sincroniza ventas pendientes en orden FIFO hacia Firestore y limpia la cola', async () => {
    const spyRegistrar = vi
      .spyOn(ventasService, 'registrarVenta')
      .mockResolvedValue('doc-firebase-123');

    await guardarVentaOffline('laparada', {
      id: 'v-primera',
      fechaCreacion: '2026-11-03T10:00:00.000Z',
      items: [dummyItem],
      total: 36000,
      metodoPago: 'efectivo',
      tipoEntrega: 'mostrador',
    });

    await guardarVentaOffline('laparada', {
      id: 'v-segunda',
      fechaCreacion: '2026-11-03T10:05:00.000Z',
      items: [dummyItem],
      total: 20000,
      metodoPago: 'transferencia',
      tipoEntrega: 'mostrador',
    });

    const resultado = await sincronizarVentasPendientes('laparada');

    expect(resultado.exitosas).toBe(2);
    expect(resultado.fallidas).toBe(0);
    expect(spyRegistrar).toHaveBeenCalledTimes(2);

    expect(spyRegistrar).toHaveBeenNthCalledWith(
      1,
      'laparada',
      expect.any(Array),
      36000,
      'efectivo',
      undefined,
      undefined,
      undefined,
      'mostrador'
    );

    const pendientesRestantes = await obtenerVentasPendientes('laparada');
    expect(pendientesRestantes).toHaveLength(0);
  });

  it('maneja fallos parciales durante la sincronización sin perder ventas pendientes', async () => {
    vi.spyOn(ventasService, 'registrarVenta')
      .mockResolvedValueOnce('doc-ok')
      .mockRejectedValueOnce(new Error('Servidor no disponible'));

    await guardarVentaOffline('laparada', {
      id: 'v-ok',
      fechaCreacion: '2026-11-03T10:00:00.000Z',
      items: [dummyItem],
      total: 10000,
      metodoPago: 'efectivo',
      tipoEntrega: 'mostrador',
    });

    await guardarVentaOffline('laparada', {
      id: 'v-fallo',
      fechaCreacion: '2026-11-03T10:01:00.000Z',
      items: [dummyItem],
      total: 15000,
      metodoPago: 'efectivo',
      tipoEntrega: 'mostrador',
    });

    const resultado = await sincronizarVentasPendientes('laparada');

    expect(resultado.exitosas).toBe(1);
    expect(resultado.fallidas).toBe(1);
    expect(resultado.errores).toHaveLength(1);
    expect(resultado.errores[0].id).toBe('v-fallo');

    const pendientesRestantes = await obtenerVentasPendientes('laparada');
    expect(pendientesRestantes).toHaveLength(1);
    expect(pendientesRestantes[0].id).toBe('v-fallo');
    expect(pendientesRestantes[0].estadoSync).toBe('error');
  });

  it('guarda y recupera el catálogo en caché local para modo offline', async () => {
    const dummyProds: Producto[] = [
      {
        id: 'p1',
        nombre: 'Tequeños x5',
        descripcion: 'Rellenos de queso',
        precio: 12000,
        disponible: true,
        negocioId: 'laparada',
        creadoEn: { seconds: 0, nanoseconds: 0 } as any,
        actualizadoEn: { seconds: 0, nanoseconds: 0 } as any,
      },
    ];

    const dummyCombos: Combo[] = [
      {
        id: 'c1',
        nombre: 'Combo Tequeños + Gaseosa',
        descripcion: 'Combo promo',
        items: [{ productoId: 'p1', cantidad: 1, nombreSnapshot: 'Tequeños x5' }],
        precioEspecial: 15000,
        disponible: true,
        negocioId: 'laparada',
        creadoEn: { seconds: 0, nanoseconds: 0 } as any,
        actualizadoEn: { seconds: 0, nanoseconds: 0 } as any,
      },
    ];

    await guardarCatalogoEnCache('laparada', dummyProds, dummyCombos);

    const cache = await obtenerCatalogoEnCache('laparada');
    expect(cache).not.toBeNull();
    expect(cache?.productos).toHaveLength(1);
    expect(cache?.combos).toHaveLength(1);
    expect(cache?.productos[0].nombre).toBe('Tequeños x5');
  });
});
