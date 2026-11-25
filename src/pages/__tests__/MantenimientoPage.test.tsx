import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Timestamp } from 'firebase/firestore';
import type {
  EquipoActivoMantenimiento,
  OrdenMantenimiento,
  ReporteFallaEquipo,
} from '@/types/mantenimiento';
import {
  calcularResumenMantenimiento,
  evaluarEquiposMantenimiento,
} from '@/utils/mantenimientoUtils';
import { MantenimientoPage } from '../MantenimientoPage';

const tsStub = { seconds: 1732400000, nanoseconds: 0 } as Timestamp;

const equipoSample: EquipoActivoMantenimiento = {
  id: 'eq-freidora',
  negocioId: 'laparada',
  codigoActivo: 'COC-001',
  nombre: 'Freidora Industrial #1',
  categoria: 'coccion',
  ubicacion: 'Línea de Fritura',
  estadoOperativo: 'operativo',
  frecuenciaPreventivoDias: 90,
  proximoMantenimientoIso: '2026-12-15',
  costoAcumuladoCOP: 150000,
  totalIntervenciones: 1,
  activo: true,
  creadoEn: tsStub,
  actualizadoEn: tsStub,
};

const ordenSample: OrdenMantenimiento = {
  id: 'ord-1',
  negocioId: 'laparada',
  equipoId: 'eq-freidora',
  equipoNombre: 'Freidora Industrial #1',
  equipoCodigo: 'COC-001',
  categoriaEquipo: 'coccion',
  tipo: 'preventivo',
  descripcionTrabajo: 'Limpieza de quemadores y termostato',
  fechaIso: '2026-11-20',
  fecha: tsStub,
  tecnicoNombre: 'TecniCocinas',
  costoCOP: 150000,
  conciliadoConGasto: true,
  gastoId: 'g-1',
  estadoEquipoResultante: 'operativo',
  responsableNombre: 'Andrés',
  creadoEn: tsStub,
};

const equiposEval = evaluarEquiposMantenimiento([equipoSample], [], '2026-11-24');

let mockMantHook = {
  equipos: [equipoSample],
  ordenes: [ordenSample],
  fallas: [] as ReporteFallaEquipo[],
  equiposEvaluados: equiposEval,
  equiposFiltrados: equiposEval,
  equiposSeguridad: [],
  fallasAbiertas: [] as ReporteFallaEquipo[],
  resumen: calcularResumenMantenimiento(equiposEval, [ordenSample], [], '2026-11-24'),
  loading: false,
  error: null as string | null,
  filtros: {
    busqueda: '',
    categoria: 'todas' as const,
    semaforo: 'todos' as const,
    estadoOperativo: 'todos' as const,
    soloSeguridad: false,
  },
  setFiltros: vi.fn(),
  resetFiltros: vi.fn(),
  crearEquipo: vi.fn(),
  actualizarEquipo: vi.fn(),
  eliminarEquipo: vi.fn(),
  inicializarPlantilla: vi.fn(),
  registrarOrden: vi.fn(),
  eliminarOrden: vi.fn(),
  reportarFalla: vi.fn(),
  resolverFalla: vi.fn(),
  eliminarFalla: vi.fn(),
  exportarCsv: vi.fn(),
  refresh: vi.fn(),
};

vi.mock('@/hooks/useMantenimiento', () => ({
  useMantenimiento: () => mockMantHook,
}));

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: { id: 'laparada', nombre: 'La Parada' },
    esSuperAdmin: false,
    usuarioNegocio: { rol: 'admin', nombre: 'Andrés' },
  }),
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { displayName: 'Andrés', email: 'andres@laparada.co' },
  }),
}));

describe('MantenimientoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza cabecera, 4 KPIs, pestañas y tarjeta del equipo activo', () => {
    const html = renderToStaticMarkup(<MantenimientoPage />);

    expect(html).toContain('Mantenimiento Preventivo');
    expect(html).toContain('Salud del Parque');
    expect(html).toContain('Extintores &amp; Red Gas');
    expect(html).toContain('Fallas Abiertas KDS');
    expect(html).toContain('Gasto Mantenimiento (Mes)');
    expect(html).toContain('Freidora Industrial #1');
    expect(html).toContain('COC-001');
    expect(html).toContain('Exportar CSV');
    expect(html).toContain('Nuevo Activo');
  });

  it('muestra EmptyState con Reintentar cuando falla la consulta', () => {
    const backup = mockMantHook;
    mockMantHook = {
      ...backup,
      equipos: [],
      equiposEvaluados: [],
      equiposFiltrados: [],
      loading: false,
      error: 'Error de conexión Firestore',
    };

    const html = renderToStaticMarkup(<MantenimientoPage />);
    expect(html).toContain('No pudimos cargar el módulo de Mantenimiento');
    expect(html).toContain('Reintentar');

    mockMantHook = backup;
  });
});
