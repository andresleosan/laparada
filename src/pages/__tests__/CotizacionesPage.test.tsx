import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import type { CotizacionComercial } from '@/types';

const mockCotizaciones: CotizacionComercial[] = [
  {
    id: 'cot-101',
    negocioId: 'laparada',
    codigo: 'COT-2026-001',
    clienteNombre: 'Camila Rivas',
    empresa: 'Grupo Empresarial Norte',
    clienteTelefono: '3112223344',
    tipoEvento: 'corporativo',
    modalidadEntrega: 'domicilio_evento',
    fechaEvento: '2026-11-24',
    horaEvento: '12:00',
    fechaVencimiento: '2026-12-01',
    invitados: 35,
    items: [
      {
        id: 'i1',
        tipo: 'producto',
        referenciaId: 'p1',
        nombre: 'Pancerotis Artesanales',
        cantidad: 35,
        precioUnitario: 12000,
        subtotal: 420000,
      },
    ],
    subtotal: 420000,
    descuento: 0,
    costoLogistica: 15000,
    totalCotizado: 435000,
    costoEstimadoInsumos: 170000,
    utilidadEstimada: 265000,
    margenEstimadoPct: 60.9,
    anticipoMonto: 200000,
    anticipoMetodo: 'transferencia',
    anticipoEstado: 'verificado',
    saldoPendiente: 235000,
    estado: 'aprobada',
  },
];

let mockUseCotizacionesReturn = {
  cotizaciones: mockCotizaciones,
  loading: false,
  error: null as string | null,
  metricas: {
    total: 1,
    borradores: 0,
    enviadas: 0,
    aprobadas: 1,
    convertidas: 0,
    rechazadasOVencidas: 0,
    pipelineActivoCOP: 435000,
    totalConvertidoCOP: 0,
    totalAnticiposVerificadosCOP: 200000,
    totalSaldoPorCobrarCOP: 235000,
    eventosProximos7Dias: 1,
    tasaConversionPct: 0,
    margenPromedioPct: 60.9,
  },
  crear: vi.fn(),
  actualizar: vi.fn(),
  cambiarEstado: vi.fn(),
  registrarAnticipo: vi.fn(),
  marcarEnviadaWhatsApp: vi.fn(),
  convertirAVenta: vi.fn(),
  eliminar: vi.fn(),
  recargar: vi.fn(),
};

vi.mock('@/hooks/useCotizaciones', () => ({
  useCotizaciones: () => mockUseCotizacionesReturn,
}));
vi.mock('@/hooks/useProductos', () => ({
  useProductos: () => ({ productos: [], combos: [], loading: false, error: null, refresh: vi.fn() }),
}));
vi.mock('@/hooks/useInventario', () => ({
  useInventario: () => ({ insumos: [], insumosConBajoStock: [], loading: false, error: null }),
}));
vi.mock('@/hooks/useKardex', () => ({
  useKardex: () => ({ movimientos: [], loading: false, error: null }),
}));
vi.mock('@/hooks/useFacturacion', () => ({
  useFacturacion: () => ({ configuracion: null, asignarConsecutivo: vi.fn() }),
}));
vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: { id: 'laparada', nombre: 'La Parada Grill', slug: 'laparada' },
    usuarioNegocio: { nombre: 'Admin', rol: 'admin' },
    esSuperAdmin: false,
  }),
}));
vi.mock('@/services/firebase', () => ({ auth: null, db: {} }));

import { CotizacionesPage } from '../CotizacionesPage';

describe('CotizacionesPage', () => {
  it('renderiza la consola de cotizaciones con sus 5 KPIs, filtros y tarjeta de propuesta corporativa', () => {
    const html = renderToStaticMarkup(
      <StaticRouter location="/cotizaciones">
        <CotizacionesPage />
      </StaticRouter>
    );

    expect(html).toContain('Cotizaciones, Eventos y Catering');
    expect(html).toContain('Pipeline Activo');
    expect(html).toContain('Aprobadas por Producir');
    expect(html).toContain('Anticipos Verificados');
    expect(html).toContain('Eventos Próximos (7d)');
    expect(html).toContain('Conversión &amp; Margen');
    expect(html).toContain('Grupo Empresarial Norte');
    expect(html).toContain('COT-2026-001');
    expect(html).toContain('Nueva Cotización');
    expect(html).toContain('Exportar CSV');
  });

  it('muestra estado vacío accionable cuando aún no existen cotizaciones', () => {
    mockUseCotizacionesReturn = {
      ...mockUseCotizacionesReturn,
      cotizaciones: [],
      metricas: {
        ...mockUseCotizacionesReturn.metricas,
        total: 0,
        aprobadas: 0,
        pipelineActivoCOP: 0,
      },
    };

    const html = renderToStaticMarkup(
      <StaticRouter location="/cotizaciones">
        <CotizacionesPage />
      </StaticRouter>
    );

    expect(html).toContain('Aún no tienes cotizaciones de eventos o catering');
    expect(html).toContain('Crear Primera Cotización');
  });
});
