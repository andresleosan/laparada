import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import type { CuentaCorriente, MovimientoCartera } from '@/types';
import { CarteraPage } from '../CarteraPage';

const cuentaVencida: CuentaCorriente = {
  id: 'cc_laparada_cli1',
  negocioId: 'laparada',
  clienteId: 'cli1',
  clienteNombre: 'Carlos Mendoza',
  clienteTelefono: '3105551234',
  empresa: 'Clínica Norte SAS',
  cupoCredito: 200000,
  saldoActual: 95000,
  plazoDias: 15,
  estado: 'activa',
  fechaVencimientoMasAntiguo: new Date('2026-10-01T12:00:00Z'),
  totalConsumosHistorico: 95000,
  totalAbonosHistorico: 0,
  cantidadConsumos: 2,
  cantidadAbonos: 0,
  creadoEn: new Date('2026-09-15T12:00:00Z'),
  actualizadoEn: new Date('2026-09-20T12:00:00Z'),
};

const movDemo: MovimientoCartera = {
  id: 'mov1',
  negocioId: 'laparada',
  cuentaCorrienteId: cuentaVencida.id,
  clienteId: 'cli1',
  clienteNombre: 'Carlos Mendoza',
  clienteTelefono: '3105551234',
  tipo: 'consumo_credito',
  monto: 95000,
  saldoPrevio: 0,
  saldoResultante: 95000,
  codigoComprobante: 'FIA-2026-7777',
  origen: 'pos',
  fecha: new Date('2026-09-20T18:00:00Z'),
};

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: { id: 'laparada', nombre: 'La Parada' },
    usuarioNegocio: { nombre: 'Admin', rol: 'admin', email: 'admin@laparada.co' },
  }),
}));

vi.mock('@/hooks/useCartera', async () => {
  const { calcularMetricasCartera, construirFilasCartera } = await import('@/utils/carteraUtils');
  return {
    useCartera: () => ({
      cuentas: [cuentaVencida],
      movimientos: [movDemo],
      filasCartera: construirFilasCartera([cuentaVencida], [movDemo]),
      metricas: calcularMetricasCartera([cuentaVencida], [movDemo]),
      cuentaPorClienteId: new Map([['cli1', cuentaVencida]]),
      loading: false,
      error: null,
      guardarConfiguracionCuenta: vi.fn().mockResolvedValue(cuentaVencida),
      registrarConsumo: vi.fn(),
      registrarAbono: vi.fn(),
    }),
  };
});

vi.mock('@/hooks/useClientes', () => ({
  useClientes: () => ({
    clientes: [
      {
        id: 'cli1',
        negocioId: 'laparada',
        nombre: 'Carlos Mendoza',
        telefono: '3105551234',
        direcciones: [],
        totalPedidos: 4,
        totalConsumido: 200000,
        primerPedidoEn: new Date(),
        ultimoPedidoEn: new Date(),
        origenRegistro: 'pos',
        creadoEn: new Date(),
        actualizadoEn: new Date(),
      },
    ],
  }),
}));

describe('CarteraPage', () => {
  it('renderiza KPIs, cuentas corrientes, alerta de cartera vencida y botones de acción', () => {
    const html = renderToStaticMarkup(
      <StaticRouter location="/cartera">
        <CarteraPage />
      </StaticRouter>
    );

    expect(html).toContain('Cuentas Corrientes &amp; Cartera por Cobrar');
    expect(html).toContain('Cartera por Cobrar');
    expect(html).toContain('Cartera Vencida');
    expect(html).toContain('Carlos Mendoza');
    expect(html).toContain('Clínica Norte SAS');
    expect(html).toContain('Habilitar Cupo de Crédito');
    expect(html).toContain('Exportar Cartera CSV');
  });
});
