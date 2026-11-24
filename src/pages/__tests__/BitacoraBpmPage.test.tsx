import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BitacoraBpmPage } from '../BitacoraBpmPage';
import {
  calcularResumenCumplimientoBpm,
  crearConfiguracionBpmDefault,
  evaluarEquiposFrioHoy,
  evaluarFreidorasEstado,
} from '@/utils/bpmUtils';
import type { RegistroTemperaturaBpm } from '@/types/bpm';

const configDefault = crearConfiguracionBpmDefault('laparada');
const fechaHoy = '2026-11-24';

const tempSample: RegistroTemperaturaBpm = {
  id: 'temp-1',
  negocioId: 'laparada',
  equipoId: configDefault.equiposFrio[0].id,
  equipoNombre: configDefault.equiposFrio[0].nombre,
  tipoEquipo: 'refrigeracion',
  franja: 'apertura',
  fechaIso: fechaHoy,
  horaTexto: '07:45',
  temperaturaC: 2.3,
  tempMinOptimaC: 0,
  tempMaxOptimaC: 4,
  estadoConformidad: 'conforme',
  resuelto: true,
  responsableNombre: 'Andrés Sánchez',
  fecha: new Date('2026-11-24T12:45:00Z'),
  creadoEn: new Date('2026-11-24T12:45:00Z'),
};

let mockBpmHook = {
  config: configDefault,
  temperaturas: [tempSample],
  aceite: [],
  checklists: [],
  temperaturasFiltradas: [tempSample],
  aceiteFiltrado: [],
  checklistsFiltrados: [],
  equiposEvaluadosHoy: evaluarEquiposFrioHoy(
    configDefault.equiposFrio,
    [tempSample],
    fechaHoy
  ),
  freidorasEvaluadas: evaluarFreidorasEstado(
    configDefault.freidoras,
    [],
    fechaHoy
  ),
  resumen: calcularResumenCumplimientoBpm({
    config: configDefault,
    temperaturas: [tempSample],
    aceite: [],
    checklists: [],
    ahora: new Date('2026-11-24T15:00:00Z'),
  }),
  alertasBpmEnVivo: [],
  loading: false,
  error: null as string | null,
  filtros: { rango: '7dias' as const, busqueda: '', soloAlertas: false },
  setFiltros: vi.fn(),
  resetFiltros: vi.fn(),
  registrarTemperatura: vi.fn(),
  resolverDesviacion: vi.fn(),
  registrarAceite: vi.fn(),
  guardarChecklist: vi.fn(),
  guardarConfiguracion: vi.fn(),
  eliminarRegistro: vi.fn(),
  exportarCarpetaCsv: vi.fn(),
  refresh: vi.fn(),
};

vi.mock('@/hooks/useBitacoraBpm', () => ({
  useBitacoraBpm: () => mockBpmHook,
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

describe('BitacoraBpmPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza cabecera, 4 KPIs, pestañas BPM y tablero en vivo de equipos', () => {
    const html = renderToStaticMarkup(<BitacoraBpmPage />);

    expect(html).toContain('Bitácora Sanitaria BPM');
    expect(html).toContain('Cumplimiento BPM Hoy');
    expect(html).toContain('Cadena de Frío Hoy');
    expect(html).toContain('Freidoras / Aceite');
    expect(html).toContain('Checklists de Turno');
    expect(html).toContain('Nevera Principal Carnes &amp; Quesos');
    expect(html).toContain('2.3 °C');
    expect(html).toContain('Exportar CSV INVIMA');
    expect(html).toContain('Equipos');
  });

  it('muestra EmptyState con Reintentar cuando falla la consulta', () => {
    const backup = mockBpmHook;
    mockBpmHook = {
      ...backup,
      loading: false,
      error: 'Error de red en Firestore',
    };

    const html = renderToStaticMarkup(<BitacoraBpmPage />);
    expect(html).toContain('No pudimos cargar la Bitácora Sanitaria BPM');
    expect(html).toContain('Reintentar');

    mockBpmHook = backup;
  });
});
