import { describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { Insumo, MovimientoKardex } from '@/types';
import {
  calcularCostosUnitariosRecientes,
  calcularMetricasKardex,
  calcularValoracionBodega,
  descargarKardexCsv,
  determinarTipoMovimiento,
  filtrarMovimientosKardex,
  generarKardexCsvContent,
  getBadgeInfoTipoMovimiento,
  MOTIVOS_AJUSTE,
  MOTIVOS_MERMA,
} from '../kardexInventarioUtils';

describe('kardexInventarioUtils', () => {
  const fakeTimestamp = (dateStr: string) => ({
    toDate: () => new Date(dateStr),
    seconds: Math.floor(new Date(dateStr).getTime() / 1000),
    nanoseconds: 0,
  } as unknown as Timestamp);

  const mockInsumos: Insumo[] = [
    {
      id: 'pan',
      nombre: 'Pan Hamburguesa',
      stockActual: 50,
      stockMinimo: 10,
      unidad: 'unidades',
      negocioId: 'laparada',
      creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
    },
    {
      id: 'carne',
      nombre: 'Carne Molida',
      stockActual: 10,
      stockMinimo: 5,
      unidad: 'kg',
      negocioId: 'laparada',
      creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
    },
  ];

  const mockMovimientos: MovimientoKardex[] = [
    {
      id: 'mov-1',
      negocioId: 'laparada',
      insumoId: 'pan',
      insumoNombre: 'Pan Hamburguesa',
      cantidad: 100,
      costo: 150000,
      costoUnitario: 1500,
      proveedor: 'Panificadora San José',
      fecha: fakeTimestamp('2026-11-01T11:00:00Z'),
      tipoMovimiento: 'entrada',
      stockPrevio: 0,
      stockResultante: 100,
      responsable: 'Admin',
      unidadMedida: 'unidades',
    },
    {
      id: 'mov-2',
      negocioId: 'laparada',
      insumoId: 'pan',
      insumoNombre: 'Pan Hamburguesa',
      cantidad: -40,
      costo: 0,
      proveedor: 'Venta POS #101',
      fecha: fakeTimestamp('2026-11-02T15:00:00Z'),
      tipoMovimiento: 'salida_venta',
      stockPrevio: 100,
      stockResultante: 60,
      unidadMedida: 'unidades',
    },
    {
      id: 'mov-3',
      negocioId: 'laparada',
      insumoId: 'pan',
      insumoNombre: 'Pan Hamburguesa',
      cantidad: -5,
      costo: 0,
      proveedor: 'Merma: vencimiento',
      motivo: 'vencimiento',
      notas: 'Panes hongueados por humedad',
      fecha: fakeTimestamp('2026-11-03T18:00:00Z'),
      tipoMovimiento: 'merma',
      stockPrevio: 60,
      stockResultante: 55,
      responsable: 'Cajero 1',
      unidadMedida: 'unidades',
    },
    {
      id: 'mov-4',
      negocioId: 'laparada',
      insumoId: 'carne',
      insumoNombre: 'Carne Molida',
      cantidad: 15,
      costo: 300000,
      costoUnitario: 20000,
      proveedor: 'Carnes del Norte',
      fecha: fakeTimestamp('2026-11-02T09:00:00Z'),
      tipoMovimiento: 'entrada',
      stockPrevio: 0,
      stockResultante: 15,
      unidadMedida: 'kg',
    },
    {
      id: 'mov-5',
      negocioId: 'laparada',
      insumoId: 'pan',
      insumoNombre: 'Pan Hamburguesa',
      cantidad: -5,
      costo: 0,
      proveedor: 'Ajuste: conteo_fisico',
      motivo: 'conteo_fisico',
      fecha: fakeTimestamp('2026-11-04T20:00:00Z'),
      tipoMovimiento: 'ajuste',
      stockPrevio: 55,
      stockResultante: 50,
      unidadMedida: 'unidades',
    },
  ];

  it('cuenta con listas predefinidas de motivos de merma y ajuste', () => {
    expect(MOTIVOS_MERMA.length).toBeGreaterThanOrEqual(5);
    expect(MOTIVOS_AJUSTE.length).toBeGreaterThanOrEqual(3);
    expect(MOTIVOS_MERMA.some((m) => m.id === 'vencimiento')).toBe(true);
    expect(MOTIVOS_AJUSTE.some((m) => m.id === 'conteo_fisico')).toBe(true);
  });

  describe('determinarTipoMovimiento', () => {
    it('respeta el tipo explícito si ya viene definido', () => {
      expect(determinarTipoMovimiento({ tipoMovimiento: 'merma' })).toBe('merma');
      expect(determinarTipoMovimiento({ tipoMovimiento: 'salida_venta' })).toBe('salida_venta');
      expect(determinarTipoMovimiento({ tipoMovimiento: 'ajuste' })).toBe('ajuste');
    });

    it('infiere salida_venta a partir de cantidad negativa y referencia de venta/domicilio', () => {
      expect(determinarTipoMovimiento({ cantidad: -2, proveedor: 'Venta POS' })).toBe('salida_venta');
      expect(determinarTipoMovimiento({ cantidad: -1, proveedor: 'Domicilio #123' })).toBe('salida_venta');
      expect(determinarTipoMovimiento({ cantidad: -4, proveedor: 'Comanda Mesa 4' })).toBe('salida_venta');
    });

    it('infiere merma a partir de cantidad negativa y proveedor con merma o desperdicio', () => {
      expect(determinarTipoMovimiento({ cantidad: -3, proveedor: 'Merma vencimiento' })).toBe('merma');
      expect(determinarTipoMovimiento({ cantidad: -1, proveedor: 'Desperdicio cocina' })).toBe('merma');
    });

    it('infiere ajuste a partir de proveedor con ajuste', () => {
      expect(determinarTipoMovimiento({ cantidad: -2, proveedor: 'Ajuste inventario' })).toBe('ajuste');
      expect(determinarTipoMovimiento({ cantidad: 5, proveedor: 'Ajuste conteo' })).toBe('ajuste');
    });

    it('infiere reversión a partir de cantidad positiva y anulación', () => {
      expect(determinarTipoMovimiento({ cantidad: 2, proveedor: 'Reversión venta #99' })).toBe('reversion');
      expect(determinarTipoMovimiento({ cantidad: 1, proveedor: 'Anulación de comanda' })).toBe('reversion');
    });

    it('infiere entrada comercial estándar para cantidades positivas', () => {
      expect(determinarTipoMovimiento({ cantidad: 50, proveedor: 'Distribuidora ABC' })).toBe('entrada');
    });

    it('infiere salida manual para cantidades negativas no categorizadas', () => {
      expect(determinarTipoMovimiento({ cantidad: -1, proveedor: 'Consumo' })).toBe('salida_manual');
    });
  });

  describe('getBadgeInfoTipoMovimiento', () => {
    it('retorna etiquetas y clases semánticas para todos los tipos', () => {
      const tipos = ['entrada', 'salida_venta', 'salida_manual', 'merma', 'ajuste', 'reversion'] as const;
      for (const t of tipos) {
        const info = getBadgeInfoTipoMovimiento(t);
        expect(info.label).toBeDefined();
        expect(info.shortLabel).toBeDefined();
        expect(info.badgeClasses).toContain('border-');
        expect(info.signo).toBeDefined();
      }
    });
  });

  describe('cálculo de costos y valuación de bodega', () => {
    it('calcula costos unitarios más recientes por insumo', () => {
      const costos = calcularCostosUnitariosRecientes(mockMovimientos);
      expect(costos.pan).toBe(1500);
      expect(costos.carne).toBe(20000);
    });

    it('calcula la valuación total de bodega en COP', () => {
      // pan: 50 * 1500 = 75,000 COP
      // carne: 10 * 20000 = 200,000 COP
      // Total = 275,000 COP
      const total = calcularValoracionBodega(mockInsumos, mockMovimientos);
      expect(total).toBe(275000);
    });
  });

  describe('calcularMetricasKardex', () => {
    it('consolida entradas, salidas por venta, mermas y ajustes con precisión', () => {
      const metricas = calcularMetricasKardex(mockMovimientos, mockInsumos);

      expect(metricas.cantidadMovimientos).toBe(5);
      // Entradas: pan 100 + carne 15 = 115
      expect(metricas.totalEntradasCantidad).toBe(115);
      // Costo entradas: 150,000 + 300,000 = 450,000 COP
      expect(metricas.totalEntradasCostoCOP).toBe(450000);
      // Salidas por venta: 40 panes
      expect(metricas.totalSalidasVentaCantidad).toBe(40);
      // Mermas: 5 panes * 1500 = 7500 COP
      expect(metricas.totalMermasCantidad).toBe(5);
      expect(metricas.totalMermasValorCOP).toBe(7500);
      // Ajustes netos: -5 panes
      expect(metricas.totalAjustesNetosCantidad).toBe(-5);
      // Valuación bodega
      expect(metricas.valorTotalBodegaCOP).toBe(275000);
    });
  });

  describe('filtrarMovimientosKardex', () => {
    it('filtra por insumo específico', () => {
      const filtrados = filtrarMovimientosKardex(mockMovimientos, { insumoId: 'carne' });
      expect(filtrados.length).toBe(1);
      expect(filtrados[0].insumoId).toBe('carne');
    });

    it('filtra por tipo de movimiento', () => {
      const mermas = filtrarMovimientosKardex(mockMovimientos, { tipoMovimiento: 'merma' });
      expect(mermas.length).toBe(1);
      expect(mermas[0].motivo).toBe('vencimiento');

      const entradas = filtrarMovimientosKardex(mockMovimientos, { tipoMovimiento: 'entrada' });
      expect(entradas.length).toBe(2);
    });

    it('filtra por término de búsqueda en varios campos', () => {
      const porProveedor = filtrarMovimientosKardex(mockMovimientos, { busqueda: 'San José' });
      expect(porProveedor.length).toBe(1);

      const porMotivo = filtrarMovimientosKardex(mockMovimientos, { busqueda: 'conteo' });
      expect(porMotivo.length).toBe(1);

      const porNotas = filtrarMovimientosKardex(mockMovimientos, { busqueda: 'hongueados' });
      expect(porNotas.length).toBe(1);
    });
  });

  describe('generarKardexCsvContent y descarga', () => {
    it('genera contenido CSV con BOM UTF-8 y cabeceras exactas', () => {
      const csv = generarKardexCsvContent(mockMovimientos, 'La Parada POS');
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('ID Movimiento,Fecha,Hora,Negocio,Insumo,Tipo Movimiento,Cantidad,Unidad');
      expect(csv).toContain('"La Parada POS"');
      expect(csv).toContain('"Pan Hamburguesa"');
      expect(csv).toContain('"Merma / Desperdicio"');
      expect(csv).toContain('"vencimiento"');
      expect(csv).toContain('"Panes hongueados por humedad"');
    });

    it('descargarKardexCsv se ejecuta sin errores en entorno simulado', () => {
      const clickMock = vi.fn();
      const appendMock = vi.fn();
      const removeMock = vi.fn();
      const revokeMock = vi.fn();

      globalThis.window = {} as unknown as Window & typeof globalThis;
      globalThis.document = {
        createElement: vi.fn(() => ({
          click: clickMock,
          download: '',
          href: '',
        })),
        body: {
          appendChild: appendMock,
          removeChild: removeMock,
        },
      } as unknown as Document;

      globalThis.URL.createObjectURL = vi.fn(() => 'blob:http://localhost/fake');
      globalThis.URL.revokeObjectURL = revokeMock;

      descargarKardexCsv(mockMovimientos, 'La Parada');

      expect(clickMock).toHaveBeenCalled();
      expect(appendMock).toHaveBeenCalled();
      expect(removeMock).toHaveBeenCalled();
      expect(revokeMock).toHaveBeenCalledWith('blob:http://localhost/fake');
    });
  });
});
