// src/components/pos/__tests__/OfflineStatusBanner.test.tsx
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { VentaPendienteOffline } from '@/types';
import { OfflineStatusBanner } from '../OfflineStatusBanner';

describe('OfflineStatusBanner', () => {
  const dummyVentas: VentaPendienteOffline[] = [
    {
      id: 'v1',
      negocioId: 'laparada',
      items: [
        {
          tipo: 'producto',
          referenciaId: 'p1',
          nombre: 'Hamburguesa La Parada',
          cantidad: 1,
          precioUnitario: 22000,
          subtotal: 22000,
        },
      ],
      total: 22000,
      metodoPago: 'efectivo',
      tipoEntrega: 'mostrador',
      fechaCreacion: '2026-11-03T11:00:00.000Z',
      estadoSync: 'pendiente',
      intentos: 0,
    },
    {
      id: 'v2',
      negocioId: 'laparada',
      items: [
        {
          tipo: 'producto',
          referenciaId: 'p2',
          nombre: 'Papas Rústicas',
          cantidad: 1,
          precioUnitario: 8000,
          subtotal: 8000,
        },
      ],
      total: 8000,
      metodoPago: 'transferencia',
      tipoEntrega: 'mostrador',
      fechaCreacion: '2026-11-03T11:05:00.000Z',
      estadoSync: 'pendiente',
      intentos: 0,
    },
  ];

  it('no renderiza nada si está en línea y no hay ventas pendientes', () => {
    const html = renderToStaticMarkup(
      <OfflineStatusBanner
        isOnline={true}
        cantidadPendientes={0}
        sincronizando={false}
        ventasPendientes={[]}
        onSincronizar={() => {}}
      />
    );

    expect(html).toBe('');
  });

  it('renderiza banner ámbar accesible cuando está sin conexión (offline)', () => {
    const html = renderToStaticMarkup(
      <OfflineStatusBanner
        isOnline={false}
        cantidadPendientes={2}
        sincronizando={false}
        ventasPendientes={dummyVentas}
        onSincronizar={() => {}}
      />
    );

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('Modo Offline activo (sin internet)');
    expect(html).toContain('2 ventas en cola');
    expect(html).toContain('border-amber-500/40');
    expect(html).toContain('aria-label="Ver detalle de las 2 ventas offline en cola"');
  });

  it('renderiza banner esmeralda de reconexión cuando regresa internet y hay pendientes', () => {
    const html = renderToStaticMarkup(
      <OfflineStatusBanner
        isOnline={true}
        cantidadPendientes={2}
        sincronizando={false}
        ventasPendientes={dummyVentas}
        onSincronizar={() => {}}
      />
    );

    expect(html).toContain('Conexión restablecida');
    expect(html).toContain('border-emerald-500/40');
    expect(html).toContain('Sincronizar ahora');
    expect(html).toContain('aria-label="Sincronizar ventas offline con el servidor ahora"');
  });

  it('muestra estado de sincronización activa animada cuando sincronizando es true', () => {
    const html = renderToStaticMarkup(
      <OfflineStatusBanner
        isOnline={true}
        cantidadPendientes={2}
        sincronizando={true}
        ventasPendientes={dummyVentas}
        onSincronizar={() => {}}
      />
    );

    expect(html).toContain('Sincronizando...');
    expect(html).toContain('disabled=""');
  });
});
