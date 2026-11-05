import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EstadoResultadosCard } from '../EstadoResultadosCard';
import type { EstadoResultadosPL } from '@/types';
import { obtenerRangoFechaReporte } from '@/utils/analiticaFinancieraUtils';

describe('EstadoResultadosCard component', () => {
  const mockPL: EstadoResultadosPL = {
    periodo: obtenerRangoFechaReporte('30dias'),
    ventasBrutas: 120000,
    descuentosConcedidos: 5000,
    ventasNetas: 115000,
    propinasRecaudadas: 6000,
    ventasAnuladasMonto: 15000,
    cantidadVentasValidas: 8,
    cantidadVentasAnuladas: 1,
    ticketPromedio: 14375,
    canales: { pos: 60000, domicilios: 40000, mesas: 15000, otros: 0 },
    metodosPago: { efectivo: 80000, transferencia: 35000, otros: 0 },
    cmvInsumos: 35000,
    porcentajeCMV: 30.4,
    insumosClaveCMV: [],
    utilidadBruta: 80000,
    margenBruto: 69.6,
    totalMermasCOP: 3000,
    porcentajeMermas: 2.6,
    cantidadMermas: 1,
    mermasPorMotivo: { vencimiento: 3000 },
    totalGastosOperativos: 25000,
    porcentajeGastos: 21.7,
    cantidadGastos: 3,
    gastosPorCategoria: { gas: 15000, servicios: 10000 },
    utilidadNeta: 52000,
    margenNeto: 45.2,
    saludFinanciera: 'excelente',
    recomendacionOperativa: 'Rentabilidad óptima gastronómica (>20%).',
  };

  it('renderiza la cascada contable completa del Estado de Resultados P&L', () => {
    const onExportar = vi.fn();
    const html = renderToStaticMarkup(
      <EstadoResultadosCard pl={mockPL} onExportarCSV={onExportar} />
    );

    expect(html).toContain('Estado de Resultados (P&amp;L Gastronómico)');
    expect(html).toContain('Excelente Rentabilidad');
    expect(html).toContain('Ventas Netas Operacionales');
    expect(html).toContain('Costo de Insumos y Recetas (CMV / Food Cost)');
    expect(html).toContain('Utilidad Bruta');
    expect(html).toContain('Mermas y Desperdicios de Bodega / Cocina');
    expect(html).toContain('Gastos Operativos (OPEX)');
    expect(html).toContain('UTILIDAD NETA DEL PERÍODO');
    expect(html).toContain('Propinas Recaudadas');
    expect(html).toContain('Ventas Anuladas');
    expect(html).toContain('Exportar P&amp;L Contable (.csv)');
  });
});

