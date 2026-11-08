import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { MesasPage } from '../MesasPage';
import type { Mesa } from '@/types/mesa';

const mockMesas: Mesa[] = [
  { id: 'm1', numero: 1, nombre: 'Mesa 1', capacidad: 4, zona: 'Salón Principal', estado: 'libre', negocioId: 'laparada' },
  { id: 'm2', numero: 2, nombre: 'Mesa 2', capacidad: 4, zona: 'Salón Principal', estado: 'ocupada', comensales: 3, totalActual: 50000, negocioId: 'laparada' },
  { id: 'm3', numero: 3, nombre: 'Mesa 3', capacidad: 6, zona: 'Terraza', estado: 'por_cobrar', comensales: 5, totalActual: 80000, negocioId: 'laparada' },
];

const mockUseMesas = {
  mesas: mockMesas,
  mesasFiltradas: mockMesas,
  loading: false,
  error: null,
  zonasDisponibles: ['Salón Principal', 'Terraza'],
  filtroEstado: 'todas',
  setFiltroEstado: vi.fn(),
  filtroZona: 'todas',
  setFiltroZona: vi.fn(),
  busqueda: '',
  setBusqueda: vi.fn(),
  totalMesas: 3,
  totalLibres: 1,
  totalOcupadas: 1,
  totalPorCobrar: 1,
  totalVentasAbiertas: 130000,
  mesaSeleccionada: null,
  seleccionarMesa: vi.fn(),
  cuentaActiva: null,
  cargandoCuenta: false,
  abrirMesaAction: vi.fn(),
  agregarRondaAction: vi.fn(),
  precerrarMesaAction: vi.fn(),
  cobrarMesaAction: vi.fn(),
  cancelarCuentaAction: vi.fn(),
  crearMesaAction: vi.fn(),
  autoInicializarMesas: vi.fn(),
};

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: {
      id: 'laparada',
      nombre: 'La Parada Grill',
      slug: 'laparada',
    },
  }),
}));

vi.mock('@/hooks/useProductos', () => ({
  useProductos: () => ({
    productos: [],
    combos: [],
    loading: false,
  }),
}));

vi.mock('@/hooks/useMesas', () => ({
  useMesas: () => mockUseMesas,
}));

describe('MesasPage', () => {
  it('renderiza encabezado principal y los 4 KPIs de salón', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <MesasPage />
      </MemoryRouter>
    );

    expect(html).toContain('Modo Mesas &amp; Salón');
    expect(html).toContain('Total Mesas');
    expect(html).toContain('Mesas Libres');
    expect(html).toContain('Ocupadas / Activas');
    expect(html).toContain('En Cuentas Abiertas');

    expect(html).toContain('Mesa 1');
    expect(html).toContain('Mesa 2');
    expect(html).toContain('Mesa 3');
  });

  it('renderiza botón de Nueva Mesa y filtros por estado', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <MesasPage />
      </MemoryRouter>
    );

    expect(html).toContain('Nueva Mesa');
    expect(html).toContain('Libres');
    expect(html).toContain('Por Cobrar');
  });
});
