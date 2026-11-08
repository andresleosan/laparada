import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { MeserosPage } from '../MeserosPage';
import type { DesempenoMesero } from '@/types/mesero';
import type { Mesa } from '@/types/mesa';

const mockDesempenoCarlos: DesempenoMesero = {
  meseroId: 'emp_carlos',
  meseroNombre: 'Carlos Pérez',
  telefono: '3001234567',
  documento: '1090123456',
  activo: true,
  totalVentas: 350000,
  cantidadVentas: 7,
  ticketPromedio: 50000,
  totalPropinas: 35000,
  propinaDirecta: 28000,
  propinaPool: 7000,
  porcentajeComision: 3,
  comisionVentas: 10500,
  totalIncentivos: 38500,
  mesasActivasCount: 2,
  mesasActivasNombres: ['Mesa 1', 'Mesa 2'],
  metaVentaTurno: 300000,
  porcentajeMeta: 117,
  ranking: 1,
  esEstrella: true,
};

const mockDesempenoAna: DesempenoMesero = {
  meseroId: 'emp_ana',
  meseroNombre: 'Ana Gómez',
  telefono: '3007654321',
  activo: true,
  totalVentas: 200000,
  cantidadVentas: 4,
  ticketPromedio: 50000,
  totalPropinas: 20000,
  propinaDirecta: 20000,
  propinaPool: 0,
  porcentajeComision: 0,
  comisionVentas: 0,
  totalIncentivos: 20000,
  mesasActivasCount: 1,
  mesasActivasNombres: ['Mesa 3'],
  porcentajeMeta: 67,
  ranking: 2,
  esEstrella: false,
};

const mockMesas: Mesa[] = [
  {
    id: 'm1',
    numero: 1,
    nombre: 'Mesa 1',
    capacidad: 4,
    zona: 'Salón Principal',
    estado: 'ocupada',
    mesero: 'Carlos Pérez',
    meseroNombre: 'Carlos Pérez',
    totalActual: 85000,
    negocioId: 'laparada',
  },
  {
    id: 'm2',
    numero: 2,
    nombre: 'Mesa 2',
    capacidad: 2,
    zona: 'Salón Principal',
    estado: 'por_cobrar',
    mesero: 'Carlos Pérez',
    meseroNombre: 'Carlos Pérez',
    totalActual: 62000,
    negocioId: 'laparada',
  },
  {
    id: 'm3',
    numero: 3,
    nombre: 'Mesa 3',
    capacidad: 6,
    zona: 'Terraza',
    estado: 'ocupada',
    mesero: 'Ana Gómez',
    meseroNombre: 'Ana Gómez',
    totalActual: 110000,
    negocioId: 'laparada',
  },
];

let mockUseMeserosReturn = {
  negocioNombre: 'La Parada Grill',
  cargando: false,
  error: null as string | null,
  mesas: mockMesas,
  desempenos: [mockDesempenoCarlos, mockDesempenoAna],
  todosDesempenos: [mockDesempenoCarlos, mockDesempenoAna],
  resumenSalon: {
    totalVentasSalon: 550000,
    totalPropinasSalon: 55000,
    ticketPromedioSalon: 50000,
    totalComisionesSalon: 10500,
    mesasOcupadasEnSalon: 3,
    meseroEstrella: mockDesempenoCarlos as DesempenoMesero | null,
    rankingMeseros: [mockDesempenoCarlos, mockDesempenoAna],
  },
  liquidaciones: [],
  meserosOpciones: [
    { id: 'emp_carlos', nombre: 'Carlos Pérez' },
    { id: 'emp_ana', nombre: 'Ana Gómez' },
  ],
  filtroPeriodo: 'hoy' as const,
  setFiltroPeriodo: vi.fn(),
  busqueda: '',
  setBusqueda: vi.fn(),
  rangoFechas: { fechaInicio: new Date(), fechaFin: new Date(), label: 'Hoy' },
  guardarConfiguracion: vi.fn(),
  liquidarMesero: vi.fn(),
  reasignarMesa: vi.fn(),
  exportarCsv: vi.fn(),
};

vi.mock('@/hooks/useMeseros', () => ({
  useMeseros: () => mockUseMeserosReturn,
}));

describe('MeserosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza la cabecera, los 4 KPIs de salón y el ranking de meseros', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <MeserosPage />
      </MemoryRouter>
    );

    // Título y breadcrumb
    expect(html).toContain('Gestión de Meseros y Salón');
    expect(html).toContain('Salón &amp; Operaciones');

    // 4 KPIs
    expect(html).toContain('Ventas Salón');
    expect(html).toContain('Ticket Promedio');
    expect(html).toContain('Propinas Salón');
    expect(html).toContain('Mesero Estrella');

    // Nombre del mesero estrella y monto
    expect(html).toContain('Carlos Pérez');
    expect(html).toContain('Ana Gómez');

    // Botones de acción
    expect(html).toContain('Exportar CSV');
    expect(html).toContain('Ir a Salón / Mesas');
  });

  it('muestra estado vacío amigable cuando no hay ventas en el período', () => {
    mockUseMeserosReturn = {
      ...mockUseMeserosReturn,
      desempenos: [],
      todosDesempenos: [],
      resumenSalon: {
        totalVentasSalon: 0,
        totalPropinasSalon: 0,
        ticketPromedioSalon: 0,
        totalComisionesSalon: 0,
        mesasOcupadasEnSalon: 0,
        meseroEstrella: null,
        rankingMeseros: [],
      },
    };

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <MeserosPage />
      </MemoryRouter>
    );

    expect(html).toContain('No hay meseros con ventas en este período');
    expect(html).toContain('Ir al Modo Mesas');
  });
});
