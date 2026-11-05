import { describe, expect, it, vi, beforeEach } from 'vitest';
import * as analiticaUtils from '@/utils/analiticaFinancieraUtils';
import type { EstadoResultadosPL } from '@/types';

describe('useReportes integration and P&L calculations', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('obtiene rangos de período predeterminados de 30 días', () => {
    const rango = analiticaUtils.obtenerRangoFechaReporte('30dias');
    expect(rango.tipo).toBe('30dias');
    expect(rango.inicio).toBeInstanceOf(Date);
    expect(rango.fin).toBeInstanceOf(Date);
    expect(rango.inicio.getTime()).toBeLessThan(rango.fin.getTime());
  });

  it('cambia entre períodos y genera etiquetas precisas', () => {
    const hoy = analiticaUtils.obtenerRangoFechaReporte('hoy');
    expect(hoy.etiqueta).toContain('Hoy');

    const sieteDias = analiticaUtils.obtenerRangoFechaReporte('7dias');
    expect(sieteDias.etiqueta).toBe('Últimos 7 días');

    const mesActual = analiticaUtils.obtenerRangoFechaReporte('mes_actual');
    expect(mesActual.etiqueta).toContain('Este Mes');

    const mesAnterior = analiticaUtils.obtenerRangoFechaReporte('mes_anterior');
    expect(mesAnterior.etiqueta).toContain('Mes Anterior');
  });

  it('ejecuta descargarReportePLCSV con los parámetros del negocio', () => {
    const spy = vi.spyOn(analiticaUtils, 'descargarReportePLCSV').mockImplementation(() => {});

    const mockPL: EstadoResultadosPL = {
      periodo: analiticaUtils.obtenerRangoFechaReporte('30dias'),
      ventasBrutas: 100000,
      descuentosConcedidos: 5000,
      ventasNetas: 95000,
      propinasRecaudadas: 8000,
      ventasAnuladasMonto: 0,
      cantidadVentasValidas: 10,
      cantidadVentasAnuladas: 0,
      ticketPromedio: 9500,
      canales: { pos: 50000, domicilios: 30000, mesas: 15000, otros: 0 },
      metodosPago: { efectivo: 60000, transferencia: 35000, otros: 0 },
      cmvInsumos: 28000,
      porcentajeCMV: 29.5,
      insumosClaveCMV: [],
      utilidadBruta: 67000,
      margenBruto: 70.5,
      totalMermasCOP: 2000,
      porcentajeMermas: 2.1,
      cantidadMermas: 1,
      mermasPorMotivo: { vencimiento: 2000 },
      totalGastosOperativos: 25000,
      porcentajeGastos: 26.3,
      cantidadGastos: 3,
      gastosPorCategoria: { arriendo: 20000, servicios: 5000 },
      utilidadNeta: 40000,
      margenNeto: 42.1,
      saludFinanciera: 'excelente',
      recomendacionOperativa: 'Margen óptimo',
    };

    analiticaUtils.descargarReportePLCSV(mockPL, 'La Parada Hamburguesas');

    expect(spy).toHaveBeenCalledWith(mockPL, 'La Parada Hamburguesas');
  });
});
