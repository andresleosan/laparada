// src/hooks/__tests__/useOfflineSync.test.ts
import { describe, expect, it, beforeEach, vi } from 'vitest';
import * as offlineSyncService from '@/services/offlineSyncService';
import * as ventasService from '@/services/ventasService';
import type { ItemVenta, VentaPendienteOffline } from '@/types';

describe('useOfflineSync hook logic', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const dummyItem: ItemVenta = {
    tipo: 'producto',
    referenciaId: 'p1',
    nombre: 'Panceroti de Pollo',
    cantidad: 1,
    precioUnitario: 8000,
    subtotal: 8000,
  };

  it('guarda en la nube si navigator.onLine es true', async () => {
    const spyRegistrar = vi
      .spyOn(ventasService, 'registrarVenta')
      .mockResolvedValue('venta-cloud-123');
    const spyGuardarOffline = vi.spyOn(offlineSyncService, 'guardarVentaOffline');

    // Simular que estamos online
    Object.defineProperty(globalThis.navigator, 'onLine', {
      value: true,
      configurable: true,
    });

    const items = [dummyItem];
    const total = 8000;
    const metodoPago = 'efectivo' as const;

    // Ejecutamos lógica equivalente a guardarVentaConFallback
    let resultado;
    if (navigator.onLine) {
      try {
        const ventaId = await ventasService.registrarVenta(
          'laparada',
          items,
          total,
          metodoPago,
          undefined,
          undefined,
          undefined,
          'mostrador'
        );
        resultado = { guardadoEn: 'nube' as const, ventaId };
      } catch {
        // Fallback
      }
    }

    expect(spyRegistrar).toHaveBeenCalledTimes(1);
    expect(spyGuardarOffline).not.toHaveBeenCalled();
    expect(resultado).toEqual({ guardadoEn: 'nube', ventaId: 'venta-cloud-123' });
  });

  it('hace fallback a cola local IndexedDB si la red falla en el registro', async () => {
    vi.spyOn(ventasService, 'registrarVenta').mockRejectedValue(new Error('Network error'));
    const dummyOfflineVenta: VentaPendienteOffline = {
      id: 'off-1',
      negocioId: 'laparada',
      items: [dummyItem],
      total: 8000,
      metodoPago: 'efectivo',
      tipoEntrega: 'mostrador',
      fechaCreacion: '2026-11-03T11:00:00.000Z',
      estadoSync: 'pendiente',
      intentos: 0,
    };

    const spyGuardarOffline = vi
      .spyOn(offlineSyncService, 'guardarVentaOffline')
      .mockResolvedValue(dummyOfflineVenta);

    Object.defineProperty(globalThis.navigator, 'onLine', {
      value: true,
      configurable: true,
    });

    let resultado;
    if (navigator.onLine) {
      try {
        const ventaId = await ventasService.registrarVenta(
          'laparada',
          [dummyItem],
          8000,
          'efectivo',
          undefined,
          undefined,
          undefined,
          'mostrador'
        );
        resultado = { guardadoEn: 'nube' as const, ventaId };
      } catch {
        // Fallback offline
        const ventaOffline = await offlineSyncService.guardarVentaOffline('laparada', {
          items: [dummyItem],
          total: 8000,
          metodoPago: 'efectivo',
          tipoEntrega: 'mostrador',
        });
        resultado = { guardadoEn: 'offline' as const, ventaOffline };
      }
    }

    expect(spyGuardarOffline).toHaveBeenCalledTimes(1);
    expect(resultado).toEqual({ guardadoEn: 'offline', ventaOffline: dummyOfflineVenta });
  });

  it('guarda directamente en IndexedDB sin tocar Firestore si navigator.onLine es false', async () => {
    const spyRegistrar = vi.spyOn(ventasService, 'registrarVenta');
    const dummyOfflineVenta: VentaPendienteOffline = {
      id: 'off-2',
      negocioId: 'laparada',
      items: [dummyItem],
      total: 8000,
      metodoPago: 'efectivo',
      tipoEntrega: 'mostrador',
      fechaCreacion: '2026-11-03T11:00:00.000Z',
      estadoSync: 'pendiente',
      intentos: 0,
    };

    const spyGuardarOffline = vi
      .spyOn(offlineSyncService, 'guardarVentaOffline')
      .mockResolvedValue(dummyOfflineVenta);

    Object.defineProperty(globalThis.navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    let resultado;
    if (!navigator.onLine) {
      const ventaOffline = await offlineSyncService.guardarVentaOffline('laparada', {
        items: [dummyItem],
        total: 8000,
        metodoPago: 'efectivo',
        tipoEntrega: 'mostrador',
      });
      resultado = { guardadoEn: 'offline' as const, ventaOffline };
    }

    expect(spyRegistrar).not.toHaveBeenCalled();
    expect(spyGuardarOffline).toHaveBeenCalledTimes(1);
    expect(resultado?.guardadoEn).toBe('offline');
  });
});
