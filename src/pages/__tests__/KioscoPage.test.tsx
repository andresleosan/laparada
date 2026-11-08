import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { KioscoPage } from '../KioscoPage';
import type { Producto } from '@/types';

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: {
      id: 'laparada',
      nombre: 'La Parada Autoservicio',
      slug: 'laparada',
      logoUrl: '',
    },
  }),
}));

const mockProductos: Producto[] = [
  {
    id: 'prod_1',
    nombre: 'Hamburguesa Monumental',
    descripcion: 'Carne artesanal y queso fundido',
    precio: 24000,
    disponible: true,
    negocioId: 'laparada',
    creadoEn: { seconds: 1600000000, nanoseconds: 0 } as any,
    actualizadoEn: { seconds: 1600000000, nanoseconds: 0 } as any,
  },
];

vi.mock('@/hooks/useProductos', () => ({
  useProductos: () => ({
    productos: mockProductos,
    combos: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCategorias', () => ({
  useCategorias: () => ({
    categorias: [{ id: 'hamburguesas', nombre: 'Hamburguesas', activo: true, negocioId: 'laparada' }],
    loading: false,
  }),
}));

vi.mock('@/services/kioscoService', () => ({
  crearPedidoKiosco: vi.fn().mockResolvedValue({
    id: 'kiosco_123',
    numeroTurno: 'K-042',
    total: 24000,
  }),
}));

describe('KioscoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inicia en la pantalla de bienvenida con opciones de autoservicio para salón y llevar', () => {
    const html = renderToStaticMarkup(
      <StaticRouter location="/kiosco">
        <KioscoPage />
      </StaticRouter>
    );

    expect(html).toContain('Terminal de Autoservicio');
    expect(html).toContain('Comer Aquí');
    expect(html).toContain('Para Llevar');
    expect(html).toContain('La Parada Autoservicio');
  });
});
