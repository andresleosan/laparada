import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TandasPage } from '../TandasPage';
import { Timestamp } from 'firebase/firestore';

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: { id: 'laparada', nombre: 'La Parada' },
    usuarioNegocio: { rol: 'cajero', nombre: 'Carlos' },
  }),
}));

vi.mock('@/hooks/useProductos', () => ({
  useProductos: () => ({
    productos: [],
    loading: false,
  }),
}));

vi.mock('@/hooks/useCaja', () => ({
  useCaja: () => ({
    cajaHoy: null,
  }),
}));

const mockTandaHook = {
  tandaActiva: null as any,
  loading: false,
  error: null,
  iniciarTanda: vi.fn(),
  agregarAdicion: vi.fn(),
  registrarMerma: vi.fn(),
  agregarProducto: vi.fn(),
  registrarTransferencia: vi.fn(),
  cerrarTanda: vi.fn(),
};

vi.mock('@/hooks/useTandaVitrina', () => ({
  useTandaVitrina: () => mockTandaHook,
}));

describe('TandasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('muestra estado vacío con botón de apertura si no hay tanda activa', () => {
    mockTandaHook.tandaActiva = null;

    const html = renderToStaticMarkup(<TandasPage />);

    expect(html).toContain('Venta por Tandas y Vitrina');
    expect(html).toContain('No hay una tanda de vitrina abierta');
    expect(html).toContain('Abrir Tanda de Hoy');
  });

  it('muestra el monitor y KPIs de vitrina cuando hay tanda abierta', () => {
    const dummyTime = Timestamp.now();
    mockTandaHook.tandaActiva = {
      id: 'tanda-active-1',
      negocioId: 'laparada',
      estado: 'abierta',
      fecha: dummyTime,
      responsable: 'Carlos',
      items: [
        {
          productoId: 'prod-1',
          nombre: 'Panceroti Ranchero',
          precioUnitario: 4000,
          cantidadInicial: 25,
          adiciones: [],
          mermas: [],
        },
      ],
      transferencias: [],
      creadoEn: dummyTime,
      actualizadoEn: dummyTime,
    };

    const html = renderToStaticMarkup(<TandasPage />);

    expect(html).toContain('Venta por Tandas y Vitrina');
    expect(html).toContain('Panceroti Ranchero');
    expect(html).toContain('+ Recargar');
    expect(html).toContain('Merma');
    expect(html).toContain('Cerrar Tanda / Sacar Cuenta');
  });
});
