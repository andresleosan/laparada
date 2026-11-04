// src/pages/__tests__/RastreoPedidoPage.test.tsx
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { RastreoPedido } from '@/types/tracking';

const mockOrder: RastreoPedido = {
  id: 'token-test-1234567890abcdef',
  negocioId: 'laparada',
  pedidoRef: 'ref-hash-123',
  codigo: 'LP-TEST42',
  estado: 'en_camino',
  origen: 'web',
  clienteNombre: 'Valentina',
  barrio: 'Caobos',
  items: [
    { nombre: 'Hamburguesa La Parada', cantidad: 2 },
    { nombre: 'Tequeños Tradicionales x5', cantidad: 1 },
  ],
  totalItems: 3,
  total: 42000,
  metodoPago: 'efectivo',
  domiciliarioNombre: 'Carlos',
  tiempoEstimadoMin: 35,
  negocio: {
    nombre: 'La Parada Gourmet',
    telefono: '3001234567',
    slug: 'la-parada',
  },
};

let mockHookReturn = {
  pedido: mockOrder as RastreoPedido | null,
  cargando: false,
  error: null as string | null,
};

vi.mock('@/hooks/useRastreoPedido', () => ({
  useRastreoPedido: (token?: string) => {
    if (token === 'token-test-1234567890abcdef') {
      return mockHookReturn;
    }
    return {
      pedido: null,
      cargando: false,
      error: null,
    };
  },
}));

import { RastreoPedidoPage } from '../RastreoPedidoPage';

describe('RastreoPedidoPage', () => {
  beforeEach(() => {
    mockHookReturn = {
      pedido: mockOrder,
      cargando: false,
      error: null,
    };
  });

  it('renderiza el código de pedido, el restaurante, el repartidor y los ítems', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/rastreo/token-test-1234567890abcdef']}>
        <Routes>
          <Route path="/rastreo/:token" element={<RastreoPedidoPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(html).toContain('LP-TEST42');
    expect(html).toContain('La Parada Gourmet');
    expect(html).toContain('Valentina');
    expect(html).toContain('Caobos');
    expect(html).toContain('Hamburguesa La Parada');
    expect(html).toContain('Tequeños Tradicionales x5');
    expect(html).toContain('Tu repartidor Carlos va en camino');
    expect(html).toContain('Rastreo en vivo');
    expect(html).toContain('Progreso del Despacho');
    expect(html).toContain('¿Necesitas ayuda? Escríbenos a WhatsApp');
  });

  it('muestra estado amigable si el pedido no es encontrado', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter initialEntries={['/rastreo/token-inexistente']}>
        <Routes>
          <Route path="/rastreo/:token" element={<RastreoPedidoPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(html).toContain('Pedido no encontrado');
    expect(html).toContain('Ir al Menú Principal');
  });
});
