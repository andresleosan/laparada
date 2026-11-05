import { describe, it, expect } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  determinarEstadoVencimiento,
  calcularSaldoPendiente,
  determinarNuevoEstadoFactura,
  calcularFechaVencimiento,
  calcularMetricasCuentasPorPagar,
  calcularTotalesPorProveedor,
  generarMensajeWhatsAppProveedor,
  generarCuentasPorPagarCsv,
} from '../proveedoresUtils';
import type { FacturaCompra, Proveedor } from '@/types/proveedor';

describe('proveedoresUtils', () => {
  const refDate = new Date(2026, 10, 10, 12, 0, 0); // 10 Noviembre 2026

  const mockProveedor: Proveedor = {
    id: 'prov-1',
    negocioId: 'laparada',
    nombre: 'Carnes Santander SAS',
    contacto: 'Don Carlos',
    telefono: '3123456789',
    categoria: 'carnes',
    diasCreditoHabitual: 15,
    activo: true,
    nit: '900.123.456-7',
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
  };

  const createMockFactura = (overrides: Partial<FacturaCompra> = {}): FacturaCompra => ({
    id: 'fac-1',
    negocioId: 'laparada',
    proveedorId: 'prov-1',
    proveedorNombre: 'Carnes Santander SAS',
    numeroFactura: 'FAC-1001',
    fechaEmision: Timestamp.fromDate(new Date(2026, 10, 1)),
    fechaVencimiento: Timestamp.fromDate(new Date(2026, 10, 15)),
    condicionPago: 'credito',
    estado: 'pendiente',
    items: [
      {
        descripcion: 'Carne de res molida especial',
        cantidad: 10,
        unidad: 'kg',
        costoUnitario: 25000,
        subtotal: 250000,
      },
    ],
    subtotal: 250000,
    total: 250000,
    montoPagado: 0,
    saldoPendiente: 250000,
    creadoEn: Timestamp.now(),
    actualizadoEn: Timestamp.now(),
    ...overrides,
  });

  describe('determinarEstadoVencimiento', () => {
    it('retorna "pagada" si la factura ya está marcada como pagada o saldo es 0', () => {
      const pagada = createMockFactura({
        estado: 'pagada',
        montoPagado: 250000,
        saldoPendiente: 0,
      });
      expect(determinarEstadoVencimiento(pagada, refDate)).toBe('pagada');

      const saldoCero = createMockFactura({
        estado: 'pendiente',
        saldoPendiente: 0,
      });
      expect(determinarEstadoVencimiento(saldoCero, refDate)).toBe('pagada');
    });

    it('retorna "vencida" si la fecha de vencimiento es anterior a la fecha de referencia', () => {
      const vencida = createMockFactura({
        fechaVencimiento: Timestamp.fromDate(new Date(2026, 10, 8)), // 2 días atrás
        saldoPendiente: 150000,
      });
      expect(determinarEstadoVencimiento(vencida, refDate)).toBe('vencida');
    });

    it('retorna "por_vencer" si vence en 3 días o menos', () => {
      const porVencerHoy = createMockFactura({
        fechaVencimiento: Timestamp.fromDate(new Date(2026, 10, 10)), // Mismo día
      });
      expect(determinarEstadoVencimiento(porVencerHoy, refDate)).toBe('por_vencer');

      const porVencerTresDias = createMockFactura({
        fechaVencimiento: Timestamp.fromDate(new Date(2026, 10, 13)), // 3 días
      });
      expect(determinarEstadoVencimiento(porVencerTresDias, refDate)).toBe('por_vencer');
    });

    it('retorna "al_dia" si vence en más de 3 días', () => {
      const alDia = createMockFactura({
        fechaVencimiento: Timestamp.fromDate(new Date(2026, 10, 20)), // 10 días
      });
      expect(determinarEstadoVencimiento(alDia, refDate)).toBe('al_dia');
    });
  });

  describe('calcularSaldoPendiente', () => {
    it('calcula la resta correctamente', () => {
      expect(calcularSaldoPendiente(300000, 100000)).toBe(200000);
      expect(calcularSaldoPendiente(300000, 300000)).toBe(0);
    });

    it('no permite saldos negativos si el pago excede el total por error de digitación', () => {
      expect(calcularSaldoPendiente(100000, 150000)).toBe(0);
    });
  });

  describe('determinarNuevoEstadoFactura', () => {
    it('determina "pagada" cuando monto pagado cubre o supera el total', () => {
      expect(determinarNuevoEstadoFactura(100000, 100000)).toBe('pagada');
      expect(determinarNuevoEstadoFactura(100000, 120000)).toBe('pagada');
    });

    it('determina "parcial" cuando se ha pagado algo pero menos del total', () => {
      expect(determinarNuevoEstadoFactura(100000, 40000)).toBe('parcial');
    });

    it('determina "pendiente" cuando no se ha pagado nada', () => {
      expect(determinarNuevoEstadoFactura(100000, 0)).toBe('pendiente');
    });
  });

  describe('calcularFechaVencimiento', () => {
    it('suma los días de crédito a la fecha de emisión', () => {
      const emision = new Date(2026, 9, 1); // 1 de Octubre
      const vencimiento = calcularFechaVencimiento(emision, 15);
      expect(vencimiento.getDate()).toBe(16);
      expect(vencimiento.getMonth()).toBe(9);
    });

    it('para compras de contado (0 días) mantiene la misma fecha', () => {
      const emision = new Date(2026, 9, 1);
      const vencimiento = calcularFechaVencimiento(emision, 0);
      expect(vencimiento.getTime()).toBe(emision.getTime());
    });
  });

  describe('calcularMetricasCuentasPorPagar', () => {
    it('consolida deuda total, vencidas, por vencer y proveedores activos', () => {
      const facturas: FacturaCompra[] = [
        createMockFactura({
          id: 'fac-1',
          total: 200000,
          montoPagado: 50000,
          saldoPendiente: 150000,
          fechaVencimiento: Timestamp.fromDate(new Date(2026, 10, 5)), // Vencida
        }),
        createMockFactura({
          id: 'fac-2',
          total: 100000,
          montoPagado: 0,
          saldoPendiente: 100000,
          fechaVencimiento: Timestamp.fromDate(new Date(2026, 10, 12)), // Por vencer en semana (diff=2)
        }),
        createMockFactura({
          id: 'fac-3',
          total: 300000,
          montoPagado: 300000,
          saldoPendiente: 0,
          estado: 'pagada',
        }),
        createMockFactura({
          id: 'fac-4',
          total: 80000,
          saldoPendiente: 80000,
          estado: 'anulada', // Debe ignorarse
        }),
      ];

      const proveedores: Proveedor[] = [
        mockProveedor,
        { ...mockProveedor, id: 'prov-2', activo: false },
      ];

      const metricas = calcularMetricasCuentasPorPagar(facturas, proveedores, refDate);

      expect(metricas.deudaTotal).toBe(250000); // 150k + 100k
      expect(metricas.totalVencido).toBe(150000);
      expect(metricas.cantidadVencidas).toBe(1);
      expect(metricas.totalPorVencerSemana).toBe(100000);
      expect(metricas.cantidadPorVencerSemana).toBe(1);
      expect(metricas.proveedoresActivos).toBe(1);
    });
  });

  describe('calcularTotalesPorProveedor', () => {
    it('agrupa facturas y suma saldos pendientes por proveedor', () => {
      const facturas: FacturaCompra[] = [
        createMockFactura({ proveedorId: 'prov-1', total: 100000, saldoPendiente: 40000 }),
        createMockFactura({ proveedorId: 'prov-1', total: 50000, saldoPendiente: 50000 }),
        createMockFactura({ proveedorId: 'prov-2', total: 80000, saldoPendiente: 0, estado: 'pagada' }),
      ];

      const resumen = calcularTotalesPorProveedor(facturas);

      expect(resumen['prov-1']).toBeDefined();
      expect(resumen['prov-1'].totalComprado).toBe(150000);
      expect(resumen['prov-1'].saldoPendiente).toBe(90000);
      expect(resumen['prov-1'].facturasPendientes).toBe(2);

      expect(resumen['prov-2'].saldoPendiente).toBe(0);
      expect(resumen['prov-2'].facturasPendientes).toBe(0);
    });
  });

  describe('generarMensajeWhatsAppProveedor', () => {
    it('genera mensaje específico cuando se incluye factura', () => {
      const factura = createMockFactura({
        numeroFactura: 'FAC-8899',
        total: 150000,
        montoPagado: 50000,
        saldoPendiente: 100000,
      });

      const mensaje = generarMensajeWhatsAppProveedor(mockProveedor, factura);
      expect(mensaje).toContain('FAC-8899');
      expect(mensaje).toContain('100.000');
      expect(mensaje).toContain('Don Carlos');
    });

    it('genera saludo institucional general si no hay factura específica', () => {
      const mensaje = generarMensajeWhatsAppProveedor(mockProveedor);
      expect(mensaje).toContain('Don Carlos');
      expect(mensaje).toContain('próximo pedido de insumos');
    });
  });

  describe('generarCuentasPorPagarCsv', () => {
    it('incluye encabezados, escape de comillas y formato UTF-8 BOM', () => {
      const factura = createMockFactura();
      const csv = generarCuentasPorPagarCsv([factura], [mockProveedor]);

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('Proveedor;NIT;Teléfono');
      expect(csv).toContain('Carnes Santander SAS');
      expect(csv).toContain('FAC-1001');
    });
  });
});
