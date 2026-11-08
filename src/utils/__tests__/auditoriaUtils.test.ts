import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import {
  determinarSeveridadEvento,
  generarHuellaForense,
  extraerCodigoVisible,
  sintetizarEventosAuditoria,
  filtrarEventosAuditoria,
  calcularMetricasAuditoria,
  extraerResponsablesUnicos,
  generarCertificadoForenseTexto,
  generarResumenWhatsAppAuditoria,
  generarCsvAuditoriaForense,
} from '../auditoriaUtils';
import type {
  EventoAuditoria,
  Venta,
  EntradaInventario,
  CierreCaja,
  TurnoPersonal,
  ValePersonal,
} from '@/types';

describe('auditoriaUtils', () => {
  describe('determinarSeveridadEvento', () => {
    it('clasifica anulaciones de venta como crítica (>= $50.000) o alta (< $50.000)', () => {
      expect(determinarSeveridadEvento('anulacion_venta', 60000)).toBe('critica');
      expect(determinarSeveridadEvento('anulacion_venta', 50000)).toBe('critica');
      expect(determinarSeveridadEvento('anulacion_venta', 25000)).toBe('alta');
    });

    it('clasifica cortesías del 100% o descuentos altos como crítica', () => {
      expect(determinarSeveridadEvento('cortesia_descuento', 12000, true)).toBe('critica');
      expect(determinarSeveridadEvento('cortesia_descuento', 45000, false)).toBe('critica');
      expect(determinarSeveridadEvento('cortesia_descuento', 20000, false)).toBe('alta');
      expect(determinarSeveridadEvento('cortesia_descuento', 5000, false)).toBe('media');
    });

    it('clasifica mermas, descuadres de caja y accesos de personal adecuadamente', () => {
      expect(determinarSeveridadEvento('merma_inventario', 35000)).toBe('critica');
      expect(determinarSeveridadEvento('merma_inventario', 10000)).toBe('alta');
      expect(determinarSeveridadEvento('descuadre_caja', 25000)).toBe('critica');
      expect(determinarSeveridadEvento('descuadre_caja', 5000)).toBe('alta');
      expect(determinarSeveridadEvento('descuadre_caja', 0)).toBe('informativa');
      expect(determinarSeveridadEvento('acceso_personal', 0)).toBe('informativa');
    });
  });

  describe('generarHuellaForense y extraerCodigoVisible', () => {
    it('genera una huella determinista con formato AUD-XXXX-YYYY y cambia si cambia el monto o tenant', () => {
      const h1 = generarHuellaForense({
        negocioId: 'laparada',
        categoria: 'anulacion_venta',
        referenciaId: 'venta_123456',
        montoImpacto: 32000,
        responsableNombre: 'Andrés',
      });
      const h2 = generarHuellaForense({
        negocioId: 'laparada',
        categoria: 'anulacion_venta',
        referenciaId: 'venta_123456',
        montoImpacto: 32000,
        responsableNombre: 'Andrés',
      });
      const h3 = generarHuellaForense({
        negocioId: 'laparada',
        categoria: 'anulacion_venta',
        referenciaId: 'venta_123456',
        montoImpacto: 99000,
        responsableNombre: 'Andrés',
      });

      expect(h1).toMatch(/^AUD-[0-9A-F]{4}-[0-9A-F]{4}$/);
      expect(h1).toBe(h2);
      expect(h1).not.toBe(h3);
    });

    it('extrae el código visible de los últimos 6 caracteres en mayúsculas', () => {
      expect(extraerCodigoVisible('abc123def456')).toBe('#DEF456');
      expect(extraerCodigoVisible('')).toBe('#000000');
    });
  });

  describe('sintetizarEventosAuditoria', () => {
    const fechaReciente = Timestamp.fromDate(new Date('2026-11-07T20:00:00Z'));
    const fechaAntigua = Timestamp.fromDate(new Date('2026-11-06T15:00:00Z'));

    it('correlaciona anulaciones, cortesías, mermas, cierres y accesos aislando por negocioId y sin duplicar registros inmutables', () => {
      const bitacoraInmutable: EventoAuditoria[] = [
        {
          id: 'aud_1',
          negocioId: 'laparada',
          categoria: 'anulacion_venta',
          severidad: 'critica',
          titulo: 'Venta Anulada #VNT001 (Inmutable)',
          descripcion: 'Anulada desde POS con firma inmutable',
          motivo: 'Pedido duplicado',
          montoImpacto: 55000,
          responsableNombre: 'Carlos Admin',
          entidadTipo: 'venta',
          referenciaId: 'vnt_001',
          codigoVisible: '#VNT001',
          fecha: fechaReciente,
          origenRegistro: 'bitacora_inmutable',
          huellaForense: 'AUD-1111-2222',
        },
      ];

      const ventas: Venta[] = [
        // Esta venta ya está en bitácora inmutable (vnt_001), no debe duplicarse
        {
          id: 'vnt_001',
          negocioId: 'laparada',
          items: [{ tipo: 'producto', referenciaId: 'p1', nombre: 'Bandeja', cantidad: 1, precioUnitario: 55000, subtotal: 55000 }],
          total: 55000,
          metodoPago: 'efectivo',
          origen: 'pos',
          fecha: fechaReciente,
          estado: 'anulada',
          anuladaPor: 'Carlos Admin',
          motivoAnulacion: 'Pedido duplicado',
        },
        // Venta histórica con descuento/cortesía
        {
          id: 'vnt_002',
          negocioId: 'laparada',
          items: [{ tipo: 'producto', referenciaId: 'p2', nombre: 'Tequeños', cantidad: 2, precioUnitario: 10000, subtotal: 20000 }],
          subtotal: 20000,
          descuento: 20000,
          descuentoMotivo: 'Cortesía de la Casa (100%)',
          total: 0,
          metodoPago: 'efectivo',
          origen: 'pos',
          fecha: fechaAntigua,
          estado: 'completada',
        },
        // Venta de otro tenant (debe ignorarse)
        {
          id: 'vnt_otro',
          negocioId: 'otro_tenant',
          items: [],
          total: 90000,
          metodoPago: 'efectivo',
          origen: 'pos',
          fecha: fechaReciente,
          estado: 'anulada',
        },
      ];

      const movimientosInventario: EntradaInventario[] = [
        {
          id: 'mov_merma_1',
          negocioId: 'laparada',
          insumoId: 'ins_queso',
          insumoNombre: 'Queso Costeño',
          cantidad: -2,
          costo: 0,
          costoUnitario: 18000,
          proveedor: 'Merma: vencimiento',
          motivo: 'vencimiento',
          tipoMovimiento: 'merma',
          stockPrevio: 10,
          stockResultante: 8,
          responsable: 'Chef Mario',
          unidadMedida: 'kg',
          fecha: fechaAntigua,
        },
      ];

      const cierresCaja: CierreCaja[] = [
        {
          id: 'cie_1',
          negocioId: 'laparada',
          fecha: fechaAntigua,
          totalIngresos: 300000,
          totalGastos: 50000,
          utilidadNeta: 250000,
          ventasPos: 300000,
          ventasWhatsapp: 0,
          cajeroNombre: 'Laura Cajera',
          efectivoEsperado: 250000,
          efectivoReal: 235000,
          diferenciaEfectivo: -15000,
        },
      ];

      const turnosPersonal: TurnoPersonal[] = [
        {
          id: 'tur_1',
          negocioId: 'laparada',
          empleadoId: 'emp_1',
          empleadoNombre: 'Pedro Mesero',
          cargo: 'mesero',
          fecha: fechaAntigua,
          horaEntrada: '17:00',
          horaSalida: '23:00',
          horasTrabajadas: 6,
          tipoTurno: 'nocturno',
          estado: 'completado',
          valorTurno: 45000,
          totalDevengado: 45000,
          creadoEn: fechaAntigua,
          actualizadoEn: fechaAntigua,
        },
      ];

      const valesPersonal: ValePersonal[] = [
        {
          id: 'val_1',
          negocioId: 'laparada',
          empleadoId: 'emp_1',
          empleadoNombre: 'Pedro Mesero',
          monto: 20000,
          motivo: 'adelanto_sueldo',
          notas: 'Adelanto transporte',
          metodoEntrega: 'efectivo',
          estado: 'pendiente_descuento',
          fecha: fechaAntigua,
          autorizadoPor: 'Carlos Admin',
          creadoEn: fechaAntigua,
          actualizadoEn: fechaAntigua,
        },
      ];

      const eventos = sintetizarEventosAuditoria({
        negocioId: 'laparada',
        bitacoraInmutable,
        ventas,
        movimientosInventario,
        cierresCaja,
        turnosPersonal,
        valesPersonal,
      });

      // Debe haber exactamente 6 eventos de 'laparada' (1 anulación inmutable deduplicada + 1 cortesía + 1 merma + 1 cierre + 1 turno + 1 vale)
      expect(eventos).toHaveLength(6);
      expect(eventos.every((e) => e.negocioId === 'laparada')).toBe(true);

      const evAnulacion = eventos.find((e) => e.categoria === 'anulacion_venta');
      expect(evAnulacion?.origenRegistro).toBe('bitacora_inmutable');
      expect(evAnulacion?.titulo).toContain('(Inmutable)');

      const evCortesia = eventos.find((e) => e.categoria === 'cortesia_descuento');
      expect(evCortesia?.severidad).toBe('critica');
      expect(evCortesia?.montoImpacto).toBe(20000);

      const evMerma = eventos.find((e) => e.categoria === 'merma_inventario');
      expect(evMerma?.montoImpacto).toBe(36000); // 2 kg * $18.000
      expect(evMerma?.severidad).toBe('critica');

      const evCaja = eventos.find((e) => e.categoria === 'descuadre_caja');
      expect(evCaja?.montoImpacto).toBe(15000);
      expect(evCaja?.severidad).toBe('alta');
    });
  });

  describe('filtrarEventosAuditoria, calcularMetricasAuditoria y exportaciones', () => {
    const ahora = new Date('2026-11-07T22:00:00Z');
    const hoyTs = Timestamp.fromDate(new Date('2026-11-07T18:00:00Z'));
    const hace10DiasTs = Timestamp.fromDate(new Date('2026-10-25T18:00:00Z'));

    const eventosMuestra: EventoAuditoria[] = [
      {
        id: '1',
        negocioId: 'laparada',
        categoria: 'anulacion_venta',
        severidad: 'critica',
        titulo: 'Venta Anulada #A1',
        descripcion: 'Cancelación de pedido grande',
        motivo: 'Cliente canceló',
        montoImpacto: 80000,
        responsableNombre: 'Andrés',
        entidadTipo: 'venta',
        referenciaId: 'v1',
        codigoVisible: '#A1',
        fecha: hoyTs,
        origenRegistro: 'bitacora_inmutable',
        huellaForense: 'AUD-AAAA-1111',
      },
      {
        id: '2',
        negocioId: 'laparada',
        categoria: 'acceso_personal',
        severidad: 'informativa',
        titulo: 'Apertura de Turno Cajero',
        descripcion: 'Ingreso normal',
        montoImpacto: 0,
        responsableNombre: 'Laura',
        entidadTipo: 'personal',
        referenciaId: 't1',
        codigoVisible: '#T1',
        fecha: hace10DiasTs,
        origenRegistro: 'correlacion_historica',
        huellaForense: 'AUD-BBBB-2222',
      },
    ];

    it('filtra por categoría, severidad, rango de fecha, impacto financiero y texto libre', () => {
      const soloHoy = filtrarEventosAuditoria(
        eventosMuestra,
        {
          busqueda: '',
          categoria: 'todas',
          severidad: 'todas',
          responsable: 'todos',
          rangoFecha: 'hoy',
          soloImpactoFinanciero: false,
        },
        ahora
      );
      expect(soloHoy).toHaveLength(1);
      expect(soloHoy[0].id).toBe('1');

      const soloImpacto = filtrarEventosAuditoria(
        eventosMuestra,
        {
          busqueda: '',
          categoria: 'todas',
          severidad: 'todas',
          responsable: 'todos',
          rangoFecha: 'todo',
          soloImpactoFinanciero: true,
        },
        ahora
      );
      expect(soloImpacto).toHaveLength(1);
      expect(soloImpacto[0].montoImpacto).toBe(80000);

      const porHuella = filtrarEventosAuditoria(
        eventosMuestra,
        {
          busqueda: 'AUD-BBBB',
          categoria: 'todas',
          severidad: 'todas',
          responsable: 'todos',
          rangoFecha: 'todo',
          soloImpactoFinanciero: false,
        },
        ahora
      );
      expect(porHuella).toHaveLength(1);
      expect(porHuella[0].responsableNombre).toBe('Laura');
    });

    it('calcula métricas consolidadas, responsables únicos, certificado y CSV con BOM', () => {
      const metricas = calcularMetricasAuditoria(eventosMuestra);
      expect(metricas.totalEventos).toBe(2);
      expect(metricas.impactoFinancieroTotal).toBe(80000);
      expect(metricas.totalAnulacionesCOP).toBe(80000);
      expect(metricas.cantidadAnulaciones).toBe(1);
      expect(metricas.nivelRiesgo).toBe('moderado');
      expect(metricas.porcentajeInmutable).toBe(50);

      const responsables = extraerResponsablesUnicos(eventosMuestra);
      expect(responsables).toEqual(['Andrés', 'Laura']);

      const cert = generarCertificadoForenseTexto(eventosMuestra[0]);
      expect(cert).toContain('AUD-AAAA-1111');
      expect(cert).toContain('Andrés');

      const resumenWa = generarResumenWhatsAppAuditoria(metricas, 'La Parada', 'Últimos 7 días');
      expect(resumenWa).toContain('LA PARADA');
      expect(resumenWa).toContain('RIESGO MODERADO');

      const csv = generarCsvAuditoriaForense(eventosMuestra);
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('"AUD-AAAA-1111"');
      expect(csv).toContain('"80000"');
    });
  });
});
