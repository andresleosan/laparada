import { describe, it, expect } from 'vitest';
import {
  obtenerRangoFechaReporte,
  calcularEstadoResultados,
  generarReporteContablePLCSV,
} from '../analiticaFinancieraUtils';
import type {
  Combo,
  Gasto,
  Insumo,
  MovimientoKardex,
  Producto,
  Venta,
} from '@/types';
import { Timestamp } from 'firebase/firestore';

describe('analiticaFinancieraUtils', () => {
  describe('obtenerRangoFechaReporte', () => {
    const fixedNow = new Date(2026, 10, 15, 14, 30, 0); // 15 de Noviembre 2026

    it('genera el rango de "hoy" con límites exactos del día', () => {
      const rango = obtenerRangoFechaReporte('hoy', undefined, undefined, fixedNow);
      expect(rango.tipo).toBe('hoy');
      expect(rango.inicio.getFullYear()).toBe(2026);
      expect(rango.inicio.getMonth()).toBe(10);
      expect(rango.inicio.getDate()).toBe(15);
      expect(rango.inicio.getHours()).toBe(0);
      expect(rango.inicio.getMinutes()).toBe(0);

      expect(rango.fin.getDate()).toBe(15);
      expect(rango.fin.getHours()).toBe(23);
      expect(rango.fin.getMinutes()).toBe(59);
      expect(rango.etiqueta).toContain('Hoy');
    });

    it('genera el rango de "7dias" abarcando 7 días exactos', () => {
      const rango = obtenerRangoFechaReporte('7dias', undefined, undefined, fixedNow);
      expect(rango.tipo).toBe('7dias');
      expect(rango.inicio.getDate()).toBe(9); // 15 - 6 = 9
      expect(rango.fin.getDate()).toBe(15);
      expect(rango.etiqueta).toBe('Últimos 7 días');
    });

    it('genera el rango de "30dias" abarcando 30 días exactos', () => {
      const rango = obtenerRangoFechaReporte('30dias', undefined, undefined, fixedNow);
      expect(rango.tipo).toBe('30dias');
      expect(rango.etiqueta).toBe('Últimos 30 días');
    });

    it('genera el rango de "mes_actual" desde el día 1 hasta el último día del mes', () => {
      const rango = obtenerRangoFechaReporte('mes_actual', undefined, undefined, fixedNow);
      expect(rango.tipo).toBe('mes_actual');
      expect(rango.inicio.getDate()).toBe(1);
      expect(rango.fin.getDate()).toBe(30); // Noviembre tiene 30 días
      expect(rango.etiqueta).toContain('Noviembre 2026');
    });

    it('genera el rango de "mes_anterior" correctamente', () => {
      const rango = obtenerRangoFechaReporte('mes_anterior', undefined, undefined, fixedNow);
      expect(rango.tipo).toBe('mes_anterior');
      expect(rango.inicio.getMonth()).toBe(9); // Octubre
      expect(rango.inicio.getDate()).toBe(1);
      expect(rango.fin.getMonth()).toBe(9);
      expect(rango.fin.getDate()).toBe(31); // Octubre tiene 31 días
      expect(rango.etiqueta).toContain('Octubre 2026');
    });

    it('genera rango "personalizado" respetando fechas pasadas', () => {
      const customIni = new Date(2026, 9, 10);
      const customFin = new Date(2026, 9, 20);
      const rango = obtenerRangoFechaReporte('personalizado', customIni, customFin, fixedNow);
      expect(rango.tipo).toBe('personalizado');
      expect(rango.inicio.getDate()).toBe(10);
      expect(rango.fin.getDate()).toBe(20);
      expect(rango.etiqueta).toContain('Personalizado');
    });
  });

  describe('calcularEstadoResultados', () => {
    const rangoPeriodo = obtenerRangoFechaReporte('30dias');

    const insumosMock: Insumo[] = [
      {
        id: 'ins-pan',
        negocioId: 'laparada',
        nombre: 'Pan Brioche',
        stockActual: 100,
        stockMinimo: 20,
        unidad: 'unidad',
        costoUnitario: 1200,
        proveedor: 'Panadería Central',
        creadoEn: Timestamp.now(),
        actualizadoEn: Timestamp.now(),
      },
      {
        id: 'ins-carne',
        negocioId: 'laparada',
        nombre: 'Carne de Res 150g',
        stockActual: 80,
        stockMinimo: 15,
        unidad: 'unidad',
        costoUnitario: 4500,
        proveedor: 'Carnes del Norte',
        creadoEn: Timestamp.now(),
        actualizadoEn: Timestamp.now(),
      },
    ];

    const productosMock: Producto[] = [
      {
        id: 'prod-hamburguesa',
        negocioId: 'laparada',
        nombre: 'Hamburguesa Clásica',
        descripcion: 'Hamburguesa con carne y queso',
        precio: 18000,
        categoria: 'Hamburguesas',
        disponible: true,
        creadoEn: Timestamp.now(),
        actualizadoEn: Timestamp.now(),
        receta: [
          { insumoId: 'ins-pan', nombreSnapshot: 'Pan Brioche', cantidad: 1 },
          { insumoId: 'ins-carne', nombreSnapshot: 'Carne de Res 150g', cantidad: 1 },
        ],
      },
    ];

    const combosMock: Combo[] = [];

    const movimientosKardexMock: MovimientoKardex[] = [
      {
        id: 'mov-1',
        negocioId: 'laparada',
        insumoId: 'ins-pan',
        insumoNombre: 'Pan Brioche',
        cantidad: 50,
        costo: 60000,
        costoUnitario: 1200,
        proveedor: 'Panadería Central',
        fecha: Timestamp.now(),
        tipoMovimiento: 'entrada',
      },
      {
        id: 'mov-2',
        negocioId: 'laparada',
        insumoId: 'ins-carne',
        insumoNombre: 'Carne de Res 150g',
        cantidad: 40,
        costo: 180000,
        costoUnitario: 4500,
        proveedor: 'Carnes del Norte',
        fecha: Timestamp.now(),
        tipoMovimiento: 'entrada',
      },
      {
        id: 'mov-merma-1',
        negocioId: 'laparada',
        insumoId: 'ins-pan',
        insumoNombre: 'Pan Brioche',
        cantidad: -2,
        costo: 2400,
        proveedor: 'Merma',
        motivo: 'vencimiento',
        fecha: Timestamp.now(),
        tipoMovimiento: 'merma',
      },
    ];

    it('devuelve valores neutros cuando no hay transacciones ni ventas', () => {
      const pl = calcularEstadoResultados({
        ventas: [],
        gastos: [],
        movimientosKardex: [],
        productos: [],
        combos: [],
        insumos: [],
        periodo: rangoPeriodo,
      });

      expect(pl.ventasBrutas).toBe(0);
      expect(pl.ventasNetas).toBe(0);
      expect(pl.descuentosConcedidos).toBe(0);
      expect(pl.cmvInsumos).toBe(0);
      expect(pl.porcentajeCMV).toBe(0);
      expect(pl.utilidadBruta).toBe(0);
      expect(pl.margenBruto).toBe(0);
      expect(pl.totalMermasCOP).toBe(0);
      expect(pl.totalGastosOperativos).toBe(0);
      expect(pl.utilidadNeta).toBe(0);
      expect(pl.margenNeto).toBe(0);
      expect(pl.saludFinanciera).toBe('atencion');
    });

    it('calcula correctamente P&L con ingresos, CMV de recetas, mermas y gastos', () => {
      const ventas: Venta[] = [
        // Venta 1: POS, 2 hamburguesas, total 36.000, descuento 2.000, propina 1.000 (total a pagar 35.000)
        {
          id: 'v-1',
          negocioId: 'laparada',
          total: 35000,
          subtotal: 36000,
          descuento: 2000,
          propina: 1000,
          metodoPago: 'efectivo',
          origen: 'pos',
          fecha: Timestamp.now(),
          estado: 'completada',
          items: [
            {
              referenciaId: 'prod-hamburguesa',
              nombre: 'Hamburguesa Clásica',
              cantidad: 2,
              tipo: 'producto',
              precioUnitario: 18000,
              subtotal: 36000,
            },
          ],
        },
        // Venta 2: Salón (Mesa), 1 hamburguesa, total 18.000, sin descuento ni propina, transferencia
        {
          id: 'v-2',
          negocioId: 'laparada',
          total: 18000,
          subtotal: 18000,
          descuento: 0,
          propina: 0,
          metodoPago: 'transferencia',
          origen: 'pos',
          mesaNombre: 'Mesa 4',
          fecha: Timestamp.now(),
          estado: 'completada',
          items: [
            {
              referenciaId: 'prod-hamburguesa',
              nombre: 'Hamburguesa Clásica',
              cantidad: 1,
              tipo: 'producto',
              precioUnitario: 18000,
              subtotal: 18000,
            },
          ],
        },
        // Venta 3: Anulada (no debe sumar a ventas netas ni CMV)
        {
          id: 'v-3',
          negocioId: 'laparada',
          total: 18000,
          subtotal: 18000,
          metodoPago: 'efectivo',
          origen: 'pos',
          fecha: Timestamp.now(),
          estado: 'anulada',
          items: [
            {
              referenciaId: 'prod-hamburguesa',
              nombre: 'Hamburguesa Clásica',
              cantidad: 1,
              tipo: 'producto',
              precioUnitario: 18000,
              subtotal: 18000,
            },
          ],
        },
      ];

      const gastos: Gasto[] = [
        {
          id: 'g-1',
          negocioId: 'laparada',
          monto: 10000,
          categoria: 'gas',
          concepto: 'Recarga pipeta de gas',
          fecha: Timestamp.now(),
        },
        {
          id: 'g-2',
          negocioId: 'laparada',
          monto: 5000,
          categoria: 'servicios',
          concepto: 'Internet del local',
          fecha: Timestamp.now(),
        },
      ];

      const pl = calcularEstadoResultados({
        ventas,
        gastos,
        movimientosKardex: movimientosKardexMock,
        productos: productosMock,
        combos: combosMock,
        insumos: insumosMock,
        periodo: rangoPeriodo,
      });

      // 1. Ingresos
      // Venta 1: bruta 36.000, desc 2.000
      // Venta 2: bruta 18.000, desc 0
      // Ventas Brutas = 54.000
      // Descuentos = 2.000
      // Ventas Netas = 52.000
      expect(pl.ventasBrutas).toBe(54000);
      expect(pl.descuentosConcedidos).toBe(2000);
      expect(pl.ventasNetas).toBe(52000);
      expect(pl.propinasRecaudadas).toBe(1000);
      expect(pl.cantidadVentasValidas).toBe(2);
      expect(pl.cantidadVentasAnuladas).toBe(1);
      expect(pl.ventasAnuladasMonto).toBe(18000);

      // Canales
      expect(pl.canales.pos).toBe(35000);
      expect(pl.canales.mesas).toBe(18000);

      // Métodos de pago
      expect(pl.metodosPago.efectivo).toBe(35000);
      expect(pl.metodosPago.transferencia).toBe(18000);

      // 2. CMV (3 hamburguesas vendidas en total: 2 en v1 + 1 en v2)
      // Cada hamburguesa consume:
      // - 1 Pan Brioche ($1.200)
      // - 1 Carne Res ($4.500)
      // Costo por hamburguesa = $5.700
      // Total CMV = 3 * 5.700 = $17.100
      expect(pl.cmvInsumos).toBe(17100);
      // % CMV = (17.100 / 52.000) * 100 = 32.88% -> 32.9%
      expect(pl.porcentajeCMV).toBe(32.9);
      expect(pl.insumosClaveCMV.length).toBe(2);
      expect(pl.insumosClaveCMV[0].nombre).toBe('Carne de Res 150g');
      expect(pl.insumosClaveCMV[0].costoTotalCOP).toBe(13500); // 3 * 4.500

      // 3. Utilidad Bruta
      // Ventas Netas (52.000) - CMV (17.100) = 34.900
      expect(pl.utilidadBruta).toBe(34900);
      // Margen Bruto = (34.900 / 52.000) * 100 = 67.1%
      expect(pl.margenBruto).toBe(67.1);

      // 4. Mermas
      // 1 merma registrada en movimientosKardex: 2 panes = $2.400
      expect(pl.totalMermasCOP).toBe(2400);
      expect(pl.cantidadMermas).toBe(1);
      expect(pl.mermasPorMotivo.vencimiento).toBe(2400);

      // 5. Gastos Operativos
      // 10.000 + 5.000 = 15.000
      expect(pl.totalGastosOperativos).toBe(15000);
      expect(pl.cantidadGastos).toBe(2);
      expect(pl.gastosPorCategoria.gas).toBe(10000);
      expect(pl.gastosPorCategoria.servicios).toBe(5000);

      // 6. Utilidad Neta
      // Utilidad Bruta (34.900) - Mermas (2.400) - Gastos (15.000) = 17.500
      expect(pl.utilidadNeta).toBe(17500);
      // Margen Neto = (17.500 / 52.000) * 100 = 33.65% -> 33.7%
      expect(pl.margenNeto).toBe(33.7);
      expect(pl.saludFinanciera).toBe('excelente'); // > 20%
    });

    it('clasifica salud "critica" cuando la utilidad neta es negativa', () => {
      const ventas: Venta[] = [
        {
          id: 'v-1',
          negocioId: 'laparada',
          total: 10000,
          metodoPago: 'efectivo',
          origen: 'pos',
          items: [],
          fecha: Timestamp.now(),
          estado: 'completada',
        },
      ];
      const gastos: Gasto[] = [
        {
          id: 'g-1',
          negocioId: 'laparada',
          monto: 30000,
          categoria: 'otros',
          concepto: 'Arriendo',
          fecha: Timestamp.now(),
        },
      ];

      const pl = calcularEstadoResultados({
        ventas,
        gastos,
        movimientosKardex: [],
        productos: [],
        combos: [],
        insumos: [],
        periodo: rangoPeriodo,
      });

      expect(pl.utilidadNeta).toBe(-20000);
      expect(pl.margenNeto).toBeLessThan(0);
      expect(pl.saludFinanciera).toBe('critica');
      expect(pl.recomendacionOperativa).toContain('déficit');
    });
  });

  describe('generarReporteContablePLCSV', () => {
    it('genera un CSV con UTF-8 BOM y la estructura requerida para Excel', () => {
      const pl = calcularEstadoResultados({
        ventas: [
          {
            id: 'v-1',
            negocioId: 'laparada',
            total: 20000,
            subtotal: 20000,
            metodoPago: 'efectivo',
            origen: 'pos',
            items: [],
            fecha: Timestamp.now(),
            estado: 'completada',
          },
        ],
        gastos: [
          {
            id: 'g-1',
            negocioId: 'laparada',
            monto: 5000,
            categoria: 'gas',
            concepto: 'Gas',
            fecha: Timestamp.now(),
          },
        ],
        movimientosKardex: [],
        productos: [],
        combos: [],
        insumos: [],
        periodo: obtenerRangoFechaReporte('30dias'),
      });

      const csv = generarReporteContablePLCSV(pl, 'La Parada Hamburguesas');
      // Debe iniciar con BOM UTF-8
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv).toContain('ESTADO DE RESULTADOS (P&L) - LA PARADA HAMBURGUESAS');
      expect(csv).toContain('1. INGRESOS OPERACIONALES');
      expect(csv).toContain('2. COSTO DE MERCANCÍA VENDIDA');
      expect(csv).toContain('3. UTILIDAD BRUTA OPERACIONAL');
      expect(csv).toContain('4. MERMAS Y DESPERDICIOS DE INVENTARIO');
      expect(csv).toContain('5. GASTOS OPERATIVOS (OPEX)');
      expect(csv).toContain('6. RESULTADO FINAL (UTILIDAD NETA)');
      expect(csv).toContain('7. FONDOS ESPECIALES Y AUDITORÍA');
      expect(csv).toContain('"(=) VENTAS NETAS",20000');
      expect(csv).toContain('"(=) UTILIDAD NETA DEL PERÍODO",15000');
    });
  });
});

