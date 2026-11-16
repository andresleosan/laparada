import { describe, expect, it } from 'vitest';
import type { Insumo, EntradaInventario, Proveedor } from '@/types';
import {
  determinarPrioridadReabastecimiento,
  calcularCantidadSugeridaReabastecimiento,
  generarSugerenciasReabastecimiento,
  agruparSugerenciasPorProveedor,
  generarNumeroOrdenCompra,
  convertirSugerenciasAItemsOrden,
  calcularTotalesOrdenCompra,
  generarMensajeWhatsAppOrdenCompra,
  construirUrlWhatsAppOrdenCompra,
  calcularLineaConteoFisico,
  calcularResumenConteoFisico,
  generarActaConteoWhatsApp,
} from '../ordenesCompraYConteoUtils';

const fakeTimestamp = {
  toDate: () => new Date('2026-11-15T12:00:00Z'),
} as unknown as Insumo['creadoEn'];

describe('ordenesCompraYConteoUtils', () => {
  describe('determinarPrioridadReabastecimiento', () => {
    it('clasifica agotado cuando stockActual <= 0', () => {
      expect(determinarPrioridadReabastecimiento(0, 10)).toBe('agotado');
      expect(determinarPrioridadReabastecimiento(-1, 10)).toBe('agotado');
    });

    it('clasifica critico cuando stockActual <= 50% del stockMinimo', () => {
      expect(determinarPrioridadReabastecimiento(3, 10)).toBe('critico');
      expect(determinarPrioridadReabastecimiento(5, 10)).toBe('critico');
    });

    it('clasifica bajo cuando está entre 50% y 100% del stockMinimo', () => {
      expect(determinarPrioridadReabastecimiento(8, 10)).toBe('bajo');
      expect(determinarPrioridadReabastecimiento(10, 10)).toBe('bajo');
    });
  });

  describe('calcularCantidadSugeridaReabastecimiento', () => {
    it('sugiere cantidad para cubrir 2x el stockMinimo por defecto', () => {
      // stockMinimo = 10 -> objetivo = 20; stockActual = 4 -> sugiere 16
      expect(calcularCantidadSugeridaReabastecimiento(4, 10)).toBe(16);
      // stockActual = 0, stockMinimo = 15 -> objetivo = 30 -> sugiere 30
      expect(calcularCantidadSugeridaReabastecimiento(0, 15)).toBe(30);
    });

    it('maneja valores fraccionarios y mínimos cero de forma segura', () => {
      expect(calcularCantidadSugeridaReabastecimiento(0, 0)).toBe(1);
      expect(calcularCantidadSugeridaReabastecimiento(0.2, 0.5)).toBe(0.8);
    });
  });

  describe('generarSugerenciasReabastecimiento y agruparSugerenciasPorProveedor', () => {
    const proveedores: Proveedor[] = [
      {
        id: 'prov-lacteos',
        negocioId: 'laparada',
        nombre: 'Lácteos del Norte',
        telefono: '3101112233',
        categoria: 'lacteos',
        diasCreditoHabitual: 15,
        activo: true,
        creadoEn: fakeTimestamp,
        actualizadoEn: fakeTimestamp,
      },
      {
        id: 'prov-carnes',
        negocioId: 'laparada',
        nombre: 'Carnes Premium',
        telefono: '3204445566',
        categoria: 'carnes',
        diasCreditoHabitual: 7,
        activo: true,
        creadoEn: fakeTimestamp,
        actualizadoEn: fakeTimestamp,
      },
    ];

    const insumos: Insumo[] = [
      {
        id: 'ins-queso',
        negocioId: 'laparada',
        nombre: 'Queso Mozzarella',
        stockActual: 0,
        stockMinimo: 10,
        unidad: 'kg',
        costoUnitario: 24000,
        proveedor: 'Lácteos del Norte',
        creadoEn: fakeTimestamp,
        actualizadoEn: fakeTimestamp,
      },
      {
        id: 'ins-carne',
        negocioId: 'laparada',
        nombre: 'Carne Desmechada',
        stockActual: 4,
        stockMinimo: 10,
        unidad: 'kg',
        creadoEn: fakeTimestamp,
        actualizadoEn: fakeTimestamp,
      },
      {
        id: 'ins-harina',
        negocioId: 'laparada',
        nombre: 'Harina de Trigo',
        stockActual: 25,
        stockMinimo: 10,
        unidad: 'kg',
        costoUnitario: 4200,
        creadoEn: fakeTimestamp,
        actualizadoEn: fakeTimestamp,
      },
    ];

    const movimientosKardex: EntradaInventario[] = [
      {
        id: 'mov-1',
        negocioId: 'laparada',
        insumoId: 'ins-carne',
        insumoNombre: 'Carne Desmechada',
        cantidad: 10,
        costo: 280000,
        costoUnitario: 28000,
        proveedor: 'Carnes Premium',
        tipoMovimiento: 'entrada',
        fecha: fakeTimestamp,
      },
    ];

    it('detecta insumos en quiebre, prioriza agotados y resuelve costos/proveedores del Kardex', () => {
      const sugerencias = generarSugerenciasReabastecimiento(
        insumos,
        proveedores,
        movimientosKardex
      );

      // Harina tiene stock 25 > 10, no entra. Entran Queso (0) y Carne (4).
      expect(sugerencias).toHaveLength(2);

      // Primero el agotado (Queso)
      expect(sugerencias[0].insumoId).toBe('ins-queso');
      expect(sugerencias[0].prioridad).toBe('agotado');
      expect(sugerencias[0].cantidadSugerida).toBe(20);
      expect(sugerencias[0].costoUnitarioReferencia).toBe(24000);
      expect(sugerencias[0].subtotalEstimado).toBe(480000);
      expect(sugerencias[0].proveedorSugeridoId).toBe('prov-lacteos');

      // Segundo el crítico (Carne, resuelto por Kardex)
      expect(sugerencias[1].insumoId).toBe('ins-carne');
      expect(sugerencias[1].prioridad).toBe('critico');
      expect(sugerencias[1].cantidadSugerida).toBe(16);
      expect(sugerencias[1].costoUnitarioReferencia).toBe(28000);
      expect(sugerencias[1].proveedorSugeridoId).toBe('prov-carnes');
    });

    it('agrupa correctamente las sugerencias por proveedor', () => {
      const sugerencias = generarSugerenciasReabastecimiento(
        insumos,
        proveedores,
        movimientosKardex
      );
      const grupos = agruparSugerenciasPorProveedor(sugerencias, proveedores);

      expect(grupos).toHaveLength(2);
      expect(grupos[0].proveedorId).toBe('prov-lacteos');
      expect(grupos[0].totalEstimado).toBe(480000);
      expect(grupos[0].cantidadAgotados).toBe(1);
    });
  });

  describe('órdenes de compra y WhatsApp', () => {
    it('genera consecutivo formateado OC-000X', () => {
      expect(generarNumeroOrdenCompra(0)).toBe('OC-0001');
      expect(generarNumeroOrdenCompra(14)).toBe('OC-0015');
    });

    it('convierte sugerencias y calcula totales estimados y reales', () => {
      const items = convertirSugerenciasAItemsOrden([
        {
          insumoId: 'ins-1',
          insumoNombre: 'Queso',
          unidad: 'kg',
          stockActual: 1,
          stockMinimo: 5,
          deficit: 4,
          cantidadSugerida: 9,
          costoUnitarioReferencia: 20000,
          subtotalEstimado: 180000,
          prioridad: 'critico',
        },
      ]);

      expect(items).toHaveLength(1);
      expect(items[0].subtotalEstimado).toBe(180000);

      const totales = calcularTotalesOrdenCompra([
        {
          ...items[0],
          cantidadRecibida: 10,
          costoUnitarioReal: 21000,
        },
      ]);

      expect(totales.totalEstimado).toBe(180000);
      expect(totales.totalReal).toBe(210000);
    });

    it('genera mensaje y URL de WhatsApp con prefijo 57', () => {
      const msg = generarMensajeWhatsAppOrdenCompra(
        {
          numeroOrden: 'OC-0003',
          proveedorNombre: 'Lácteos del Norte',
          items: [
            {
              insumoId: 'ins-1',
              insumoNombre: 'Queso Mozzarella',
              unidad: 'kg',
              stockActualSnapshot: 0,
              stockMinimoSnapshot: 10,
              cantidadSolicitada: 20,
              costoUnitarioEstimado: 24000,
              subtotalEstimado: 480000,
            },
          ],
          totalEstimado: 480000,
          notas: 'Entregar antes de las 4 PM',
        },
        'La Parada'
      );

      expect(msg).toContain('OC-0003');
      expect(msg).toContain('20 kg');
      expect(msg).toContain('Queso Mozzarella');
      expect(msg).toContain('Entregar antes de las 4 PM');

      const url = construirUrlWhatsAppOrdenCompra('3101112233', msg);
      expect(url.startsWith('https://wa.me/573101112233?text=')).toBe(true);
    });
  });

  describe('Conteo Físico Rápido de Bodega', () => {
    const insumoBase: Insumo = {
      id: 'ins-aceite',
      negocioId: 'laparada',
      nombre: 'Aceite Vegetal',
      stockActual: 10,
      stockMinimo: 4,
      unidad: 'litros',
      costoUnitario: 9000,
      creadoEn: fakeTimestamp,
      actualizadoEn: fakeTimestamp,
    };

    it('calcula línea exacta, faltante y sobrante con impacto en COP', () => {
      const exacto = calcularLineaConteoFisico(insumoBase, 10);
      expect(exacto.estadoDiferencia).toBe('exacto');
      expect(exacto.diferencia).toBe(0);
      expect(exacto.impactoValorCOP).toBe(0);

      const faltante = calcularLineaConteoFisico(insumoBase, 8);
      expect(faltante.estadoDiferencia).toBe('faltante');
      expect(faltante.diferencia).toBe(-2);
      expect(faltante.impactoValorCOP).toBe(-18000);

      const sobrante = calcularLineaConteoFisico(insumoBase, 13);
      expect(sobrante.estadoDiferencia).toBe('sobrante');
      expect(sobrante.diferencia).toBe(3);
      expect(sobrante.impactoValorCOP).toBe(27000);
    });

    it('consolida el resumen del conteo físico y genera acta WhatsApp', () => {
      const lineas = [
        calcularLineaConteoFisico(insumoBase, 10),
        calcularLineaConteoFisico({ ...insumoBase, id: '2', nombre: 'Queso' }, 8), // -18.000
        calcularLineaConteoFisico({ ...insumoBase, id: '3', nombre: 'Pan' }, 11),  // +9.000
      ];

      const resumen = calcularResumenConteoFisico(lineas);
      expect(resumen.totalInsumosEvaluados).toBe(3);
      expect(resumen.insumosConDiferencia).toBe(2);
      expect(resumen.exactosCount).toBe(1);
      expect(resumen.faltantesCount).toBe(1);
      expect(resumen.sobrantesCount).toBe(1);
      expect(resumen.valorFaltantesCOP).toBe(18000);
      expect(resumen.valorSobrantesCOP).toBe(9000);
      expect(resumen.balanceNetoCOP).toBe(-9000);

      const acta = generarActaConteoWhatsApp(resumen, lineas, 'La Parada', 'Cajero Turno');
      expect(acta).toContain('ACTA DE CONTEO FÍSICO DE BODEGA');
      expect(acta).toContain('Queso');
      expect(acta).toContain('Pan');
    });
  });
});
