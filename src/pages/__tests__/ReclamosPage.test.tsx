import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import type { Timestamp } from 'firebase/firestore';
import type { ReclamoPqrs } from '@/types/reclamo';
import { calcularResumenReclamos, evaluarReclamos } from '@/utils/reclamosUtils';
import { ReclamosPage } from '../ReclamosPage';

const tsBase = new Date('2026-11-24T18:00:00Z');

const reclamoSample: ReclamoPqrs = {
  id: 'rec-1',
  negocioId: 'laparada',
  codigoRadicado: 'PQR-20261124-001',
  tipo: 'garantia_pedido',
  canal: 'domicilio',
  causaRaiz: 'empaque_derrame',
  prioridad: 'alta',
  estado: 'abierto',
  slaObjetivoMin: 60,
  clienteNombre: 'Carlos Ramírez',
  clienteTelefono: '3112223344',
  montoPedidoCOP: 36000,
  descripcion: 'Se derramó la bebida por empaque mal sellado.',
  fechaIso: '2026-11-24',
  creadoEn: tsBase as unknown as Timestamp,
  actualizadoEn: tsBase as unknown as Timestamp,
  registradoPor: 'Andrés',
};

const evaluados = evaluarReclamos([reclamoSample], tsBase.getTime() + 15 * 60000);

let mockReclamosHook = {
  reclamos: [reclamoSample],
  reclamosEvaluados: evaluados,
  reclamosFiltrados: evaluados,
  reclamosActivos: evaluados,
  resumen: calcularResumenReclamos(evaluados, 80, '2026-11-24'),
  loading: false,
  error: null as string | null,
  filtros: {
    busqueda: '',
    tipo: 'todos' as const,
    canal: 'todos' as const,
    causaRaiz: 'todos' as const,
    prioridad: 'todos' as const,
    estado: 'todos' as const,
    semaforoSla: 'todos' as const,
  },
  setFiltros: vi.fn(),
  resetFiltros: vi.fn(),
  registrarReclamo: vi.fn(),
  actualizarEstado: vi.fn(),
  resolverReclamo: vi.fn(),
  marcarWhatsAppEnviado: vi.fn(),
  eliminarReclamo: vi.fn(),
  exportarCsv: vi.fn(),
  refresh: vi.fn(),
};

vi.mock('@/hooks/useReclamos', () => ({
  useReclamos: () => mockReclamosHook,
}));

vi.mock('@/hooks/useReportes', () => ({
  useReportes: () => ({
    ventas: [],
    resumen: { cantidadVentas: 80 },
  }),
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

describe('ReclamosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza cabecera, 4 KPIs, pestañas y tarjeta del reclamo activo', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ReclamosPage />
      </MemoryRouter>
    );

    expect(html).toContain('Reclamos, PQRS &amp; Garantías');
    expect(html).toContain('Reclamos Abiertos &amp; SLA');
    expect(html).toContain('Tasa de Reclamos');
    expect(html).toContain('Compensaciones (Mes)');
    expect(html).toContain('Causa Raíz Principal');
    expect(html).toContain('PQR-20261124-001');
    expect(html).toContain('Carlos Ramírez');
    expect(html).toContain('Exportar CSV');
    expect(html).toContain('Registrar Reclamo');
  });

  it('muestra EmptyState con Reintentar cuando falla la consulta', () => {
    const backup = mockReclamosHook;
    mockReclamosHook = {
      ...backup,
      reclamos: [],
      reclamosEvaluados: [],
      reclamosFiltrados: [],
      reclamosActivos: [],
      loading: false,
      error: 'Error de conexión Firestore',
    };

    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ReclamosPage />
      </MemoryRouter>
    );

    expect(html).toContain('No pudimos cargar el módulo de Reclamos y PQRS');
    expect(html).toContain('Reintentar');

    mockReclamosHook = backup;
  });
});
