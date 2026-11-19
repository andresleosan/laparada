import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import type { BonoPrepago, MovimientoBono } from '@/types';
import { BonosPage } from '../BonosPage';

const bonoDemo: BonoPrepago = {
  id: 'bono_laparada_BON-2026-XYZ999',
  negocioId: 'laparada',
  codigo: 'BON-2026-XYZ999',
  tipo: 'bono_regalo',
  titularNombre: 'Elena Torres',
  titularTelefono: '3155558899',
  montoInicial: 100000,
  saldoActual: 70000,
  totalCargadoHistorico: 100000,
  totalRedimidoHistorico: 30000,
  cantidadRecargas: 0,
  cantidadRedenciones: 1,
  recargable: true,
  estado: 'activo',
  metodoPagoEmision: 'efectivo',
  fechaEmision: new Date('2026-11-01T12:00:00Z'),
  fechaVencimiento: new Date('2027-01-30T23:59:59Z'),
  creadoEn: new Date('2026-11-01T12:00:00Z'),
  actualizadoEn: new Date('2026-11-05T12:00:00Z'),
};

const movDemo: MovimientoBono = {
  id: 'mov_bono_1',
  negocioId: 'laparada',
  bonoId: bonoDemo.id,
  bonoCodigo: bonoDemo.codigo,
  titularNombre: bonoDemo.titularNombre,
  tipo: 'emision',
  monto: 100000,
  saldoPrevio: 0,
  saldoResultante: 100000,
  codigoComprobante: 'EMI-2026-1111',
  metodoPago: 'efectivo',
  fecha: new Date('2026-11-01T12:00:00Z'),
};

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: { id: 'laparada', nombre: 'La Parada' },
    usuarioNegocio: { nombre: 'Admin', rol: 'admin', email: 'admin@laparada.co' },
  }),
}));

vi.mock('@/hooks/useBonos', async () => {
  const { calcularMetricasBonos, construirFilasAuditoriaBonos } = await import(
    '@/utils/bonosUtils'
  );
  return {
    useBonos: () => ({
      bonos: [bonoDemo],
      movimientos: [movDemo],
      filasAuditoria: construirFilasAuditoriaBonos([bonoDemo]),
      metricas: calcularMetricasBonos([bonoDemo], [movDemo]),
      bonoPorCodigo: new Map([[bonoDemo.codigo, bonoDemo]]),
      loading: false,
      error: null,
      emitirBono: vi.fn(),
      recargarBono: vi.fn(),
      redimirBono: vi.fn(),
      registrarVentaConBono: vi.fn(),
      cambiarEstado: vi.fn(),
    }),
  };
});

vi.mock('@/hooks/useClientes', () => ({
  useClientes: () => ({
    clientes: [],
  }),
}));

describe('BonosPage', () => {
  it('renderiza KPIs, tarjetas de bonos con código QR, acciones de emisión y exportación CSV', () => {
    const html = renderToStaticMarkup(
      <StaticRouter location="/bonos">
        <BonosPage />
      </StaticRouter>
    );

    expect(html).toContain('Bonos de Regalo, Prepago &amp; Vales');
    expect(html).toContain('Saldo Circulante Activo');
    expect(html).toContain('Recaudo del Mes');
    expect(html).toContain('Elena Torres');
    expect(html).toContain('BON-2026-XYZ999');
    expect(html).toContain('Emitir Bono / Tarjeta QR');
    expect(html).toContain('Exportar Auditoría CSV');
  });
});
