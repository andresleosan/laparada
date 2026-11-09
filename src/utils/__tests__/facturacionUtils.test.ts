import { describe, expect, it } from 'vitest';
import {
  calcularAlertaResolucion,
  calcularDesgloseFiscal,
  extraerNumeroConsecutivo,
  formatearConsecutivoFiscal,
  generarComprobanteZ,
  generarComprobanteZCsv,
  generarComprobanteZTextoWhatsApp,
  generarHistorialPosCsv,
  getConfiguracionFiscalDefault,
} from '../facturacionUtils';
import type { ConfiguracionFiscal, ResolucionDian, Venta } from '@/types';
import { Timestamp } from 'firebase/firestore';

describe('facturacionUtils', () => {
  const configBase: ConfiguracionFiscal = {
    negocioId: 'laparada',
    habilitado: true,
    razonSocial: 'COMERCIALIZADORA GASTRONÓMICA LA PARADA S.A.S.',
    nombreComercial: 'LA PARADA',
    nit: '901.845.123',
    dv: '5',
    tipoDocumentoIdentidad: 'NIT',
    regimenFiscal: 'responsable_inc',
    responsabilidad: 'Responsable de Impuesto Nacional al Consumo (INC 8%)',
    direccionFiscal: 'Av. 0 # 10-20',
    municipio: 'Cúcuta',
    departamento: 'Norte de Santander',
    telefonoContacto: '310 123 4567',
    tarifaDefault: {
      tipo: 'inc',
      porcentaje: 8,
      nombre: 'INC 8%',
    },
    preciosIncluyenImpuesto: true,
    resolucion: {
      numeroResolucion: '18764089123456',
      fechaExpedicion: '2026-01-01',
      fechaVencimiento: '2027-01-01',
      prefijo: 'POS',
      rangoInicial: 1,
      rangoFinal: 10000,
      consecutivoActual: 154,
    },
    alertas: {
      diasAnticipacionVencimiento: 30,
      consecutivosMinimosRestantes: 100,
    },
  };

  describe('calcularDesgloseFiscal', () => {
    it('calcula base gravable e impuesto INC (8%) cuando los precios incluyen impuesto', () => {
      // $10.800 con INC 8% -> Base: 10.800 / 1.08 = 10.000, Impuesto: 800
      const res = calcularDesgloseFiscal(10800, 8, true, 'inc');
      expect(res.baseGravable).toBe(10000);
      expect(res.valorImpuesto).toBe(800);
      expect(res.tarifa).toBe(8);
      expect(res.tipo).toBe('inc');
      expect(res.totalBruto).toBe(10800);
    });

    it('calcula base gravable e impuesto IVA (19%) cuando los precios incluyen impuesto', () => {
      // $11.900 con IVA 19% -> Base: 11.900 / 1.19 = 10.000, Impuesto: 1.900
      const res = calcularDesgloseFiscal(11900, 19, true, 'iva');
      expect(res.baseGravable).toBe(10000);
      expect(res.valorImpuesto).toBe(1900);
      expect(res.tarifa).toBe(19);
      expect(res.tipo).toBe('iva');
      expect(res.totalBruto).toBe(11900);
    });

    it('calcula impuesto sobre base cuando los precios no incluyen impuesto', () => {
      // $10.000 + 8% -> Base: 10.000, Impuesto: 800, Total: 10.800
      const res = calcularDesgloseFiscal(10000, 8, false, 'inc');
      expect(res.baseGravable).toBe(10000);
      expect(res.valorImpuesto).toBe(800);
      expect(res.totalBruto).toBe(10800);
    });

    it('retorna 0 de impuesto si la tarifa es 0 o tipo ninguno', () => {
      const res = calcularDesgloseFiscal(15000, 0, true, 'ninguno');
      expect(res.baseGravable).toBe(15000);
      expect(res.valorImpuesto).toBe(0);
      expect(res.tarifa).toBe(0);
      expect(res.tipo).toBe('ninguno');
    });

    it('maneja valores 0 o negativos de forma segura', () => {
      const res = calcularDesgloseFiscal(-500, 8, true, 'inc');
      expect(res.baseGravable).toBe(0);
      expect(res.valorImpuesto).toBe(0);
    });
  });

  describe('formatearConsecutivoFiscal y extraerNumeroConsecutivo', () => {
    it('formatea consecutivo con longitud de 5 por defecto', () => {
      expect(formatearConsecutivoFiscal('POS', 1)).toBe('POS-00001');
      expect(formatearConsecutivoFiscal('pos', 154)).toBe('POS-00154');
      expect(formatearConsecutivoFiscal('FAC', 99999)).toBe('FAC-99999');
    });

    it('extrae el número consecutivo numérico de una cadena', () => {
      expect(extraerNumeroConsecutivo('POS-00154')).toBe(154);
      expect(extraerNumeroConsecutivo('FAC-99')).toBe(99);
      expect(extraerNumeroConsecutivo('12345')).toBe(12345);
      expect(extraerNumeroConsecutivo(undefined)).toBeNull();
      expect(extraerNumeroConsecutivo('INV')).toBeNull();
    });
  });

  describe('calcularAlertaResolucion', () => {
    it('marca estado optimo cuando está vigente y con amplio rango', () => {
      const resDian: ResolucionDian = {
        numeroResolucion: '187640000',
        fechaExpedicion: '2026-01-01',
        fechaVencimiento: '2026-12-31',
        prefijo: 'POS',
        rangoInicial: 1,
        rangoFinal: 10000,
        consecutivoActual: 500,
      };

      const evalRes = calcularAlertaResolucion(resDian, undefined, new Date('2026-06-01'));
      expect(evalRes.estado).toBe('optimo');
      expect(evalRes.color).toBe('verde');
      expect(evalRes.requiereAtencion).toBe(false);
      expect(evalRes.diasRestantes).toBeGreaterThan(30);
      expect(evalRes.foliosRestantes).toBe(9501);
    });

    it('marca proximo_a_vencer cuando faltan 30 días o menos', () => {
      const resDian: ResolucionDian = {
        numeroResolucion: '187640000',
        fechaExpedicion: '2025-01-01',
        fechaVencimiento: '2026-06-15',
        prefijo: 'POS',
        rangoInicial: 1,
        rangoFinal: 10000,
        consecutivoActual: 500,
      };

      const evalRes = calcularAlertaResolucion(resDian, undefined, new Date('2026-06-01'));
      expect(evalRes.estado).toBe('proximo_a_vencer');
      expect(evalRes.color).toBe('amarillo');
      expect(evalRes.requiereAtencion).toBe(true);
      expect(evalRes.diasRestantes).toBe(14);
    });

    it('marca vencida cuando la fecha límite ya pasó', () => {
      const resDian: ResolucionDian = {
        numeroResolucion: '187640000',
        fechaExpedicion: '2025-01-01',
        fechaVencimiento: '2026-05-30',
        prefijo: 'POS',
        rangoInicial: 1,
        rangoFinal: 10000,
        consecutivoActual: 500,
      };

      const evalRes = calcularAlertaResolucion(resDian, undefined, new Date('2026-06-01'));
      expect(evalRes.estado).toBe('vencida');
      expect(evalRes.color).toBe('rojo');
      expect(evalRes.requiereAtencion).toBe(true);
    });

    it('marca agotando_folios cuando quedan 100 folios o menos', () => {
      const resDian: ResolucionDian = {
        numeroResolucion: '187640000',
        fechaExpedicion: '2026-01-01',
        fechaVencimiento: '2027-01-01',
        prefijo: 'POS',
        rangoInicial: 1,
        rangoFinal: 1000,
        consecutivoActual: 950,
      };

      const evalRes = calcularAlertaResolucion(resDian, undefined, new Date('2026-06-01'));
      expect(evalRes.estado).toBe('agotando_folios');
      expect(evalRes.color).toBe('amarillo');
      expect(evalRes.foliosRestantes).toBe(51);
    });

    it('marca agotada cuando se superó el rango final', () => {
      const resDian: ResolucionDian = {
        numeroResolucion: '187640000',
        fechaExpedicion: '2026-01-01',
        fechaVencimiento: '2027-01-01',
        prefijo: 'POS',
        rangoInicial: 1,
        rangoFinal: 1000,
        consecutivoActual: 1001,
      };

      const evalRes = calcularAlertaResolucion(resDian, undefined, new Date('2026-06-01'));
      expect(evalRes.estado).toBe('agotada');
      expect(evalRes.color).toBe('rojo');
      expect(evalRes.foliosRestantes).toBe(0);
    });
  });

  describe('generarComprobanteZ', () => {
    const ventasTest: Venta[] = [
      {
        id: 'venta_1',
        items: [
          {
            tipo: 'producto',
            referenciaId: 'p1',
            nombre: 'Hamburguesa La Parada',
            cantidad: 2,
            precioUnitario: 27000,
            subtotal: 54000,
          },
        ],
        subtotal: 54000,
        total: 54000,
        metodoPago: 'efectivo',
        origen: 'pos',
        fecha: Timestamp.fromDate(new Date('2026-11-08T14:30:00')),
        consecutivoFiscal: 'POS-00101',
        baseGravable: 50000,
        valorImpuesto: 4000,
        tarifaImpuesto: 8,
        tipoImpuesto: 'inc',
        negocioId: 'laparada',
      },
      {
        id: 'venta_2',
        items: [
          {
            tipo: 'producto',
            referenciaId: 'p2',
            nombre: 'Papas Especiales',
            cantidad: 1,
            precioUnitario: 16200,
            subtotal: 16200,
          },
        ],
        subtotal: 16200,
        descuento: 2000,
        total: 14200,
        metodoPago: 'transferencia',
        origen: 'pos',
        fecha: Timestamp.fromDate(new Date('2026-11-08T15:00:00')),
        consecutivoFiscal: 'POS-00102',
        baseGravable: 13148,
        valorImpuesto: 1052,
        tarifaImpuesto: 8,
        tipoImpuesto: 'inc',
        negocioId: 'laparada',
      },
      {
        id: 'venta_anulada',
        items: [],
        total: 20000,
        metodoPago: 'efectivo',
        origen: 'pos',
        fecha: Timestamp.fromDate(new Date('2026-11-08T16:00:00')),
        consecutivoFiscal: 'POS-00103',
        estado: 'anulada',
        negocioId: 'laparada',
      },
    ];

    it('consolida correctamente ventas completadas y excluye valores de anuladas', () => {
      const corteZ = generarComprobanteZ(ventasTest, configBase, '2026-11-08', 'Admin');

      expect(corteZ.totalDocumentosEmitidos).toBe(2);
      expect(corteZ.totalDocumentosAnulados).toBe(1);
      expect(corteZ.totalVentasBrutas).toBe(54000 + 16200);
      expect(corteZ.totalDescuentos).toBe(2000);
      expect(corteZ.totalVentasNetas).toBe(54000 + 14200);
      expect(corteZ.totalEfectivo).toBe(54000);
      expect(corteZ.totalTransferencia).toBe(14200);
      expect(corteZ.totalCobrado).toBe(54000 + 14200);
      expect(corteZ.baseGravableInc8).toBe(50000 + 13148);
      expect(corteZ.impuestoInc8).toBe(4000 + 1052);
      expect(corteZ.consecutivoInicialTexto).toBe('POS-00101');
      expect(corteZ.consecutivoFinalTexto).toBe('POS-00102');
    });

    it('genera texto para WhatsApp con formato adecuado', () => {
      const corteZ = generarComprobanteZ(ventasTest, configBase, '2026-11-08', 'Cajero POS');
      const texto = generarComprobanteZTextoWhatsApp(corteZ, configBase);

      expect(texto).toContain('COMPROBANTE Z DIARIO DE CORTE FISCAL POS');
      expect(texto).toContain('COMERCIALIZADORA GASTRONÓMICA LA PARADA S.A.S.');
      expect(texto).toContain('POS-00101 a POS-00102');
      expect(texto).toContain('Ventas Brutas');
      expect(texto).toContain('Base Gravable INC (8%)');
    });

    it('genera CSV del comprobante Z con BOM y delimitador de punto y coma', () => {
      const corteZ = generarComprobanteZ(ventasTest, configBase, '2026-11-08', 'Admin');
      const csv = generarComprobanteZCsv(corteZ, configBase);

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('COMPROBANTE Z DIARIO DE CORTE FISCAL POS');
      expect(csv).toContain('"Total Ventas Netas";68200');
    });

    it('genera CSV de historial de documentos POS', () => {
      const csv = generarHistorialPosCsv(ventasTest, configBase);

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('HISTORIAL DE DOCUMENTOS EQUIVALENTES POS');
      expect(csv).toContain('POS-00101');
      expect(csv).toContain('POS-00102');
      expect(csv).toContain('anulada');
    });
  });

  describe('getConfiguracionFiscalDefault', () => {
    it('retorna configuración inicial completa para un negocio', () => {
      const cfg = getConfiguracionFiscalDefault('laparada', 'La Parada');

      expect(cfg.negocioId).toBe('laparada');
      expect(cfg.habilitado).toBe(true);
      expect(cfg.razonSocial).toContain('LA PARADA');
      expect(cfg.regimenFiscal).toBe('responsable_inc');
      expect(cfg.tarifaDefault.porcentaje).toBe(8);
      expect(cfg.resolucion.prefijo).toBe('POS');
      expect(cfg.resolucion.rangoFinal).toBe(10000);
    });
  });
});
