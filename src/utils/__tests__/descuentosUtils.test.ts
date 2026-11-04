import { describe, it, expect } from 'vitest';
import {
  calcularDescuento,
  calcularTotalesConDescuentoYPropina,
  formatearDetalleDescuento,
  obtenerMotivoDescuentoLabel,
  MOTIVOS_DESCUENTO_PREDEFINIDOS,
} from '../descuentosUtils';
import { formatCOP } from '../formatCOP';

describe('descuentosUtils', () => {
  describe('calcularDescuento', () => {
    it('calcula correctamente un descuento por porcentaje estándar', () => {
      const res = calcularDescuento(50000, 'porcentaje', 10, 'Cliente VIP', 'cliente_vip');
      expect(res.tipo).toBe('porcentaje');
      expect(res.valor).toBe(10);
      expect(res.montoDescontadoCOP).toBe(5000);
      expect(res.motivo).toBe('Cliente VIP');
      expect(res.motivoId).toBe('cliente_vip');
    });

    it('calcula un descuento por monto fijo en COP', () => {
      const res = calcularDescuento(40000, 'monto_fijo', 7000, 'Promoción de la casa');
      expect(res.tipo).toBe('monto_fijo');
      expect(res.valor).toBe(7000);
      expect(res.montoDescontadoCOP).toBe(7000);
    });

    it('limita el monto fijo si supera el subtotal (no permite valores negativos)', () => {
      const res = calcularDescuento(25000, 'monto_fijo', 30000);
      expect(res.montoDescontadoCOP).toBe(25000);
    });

    it('calcula una cortesía del 100% cubriendo el subtotal total', () => {
      const res = calcularDescuento(65000, 'cortesia_100', 100, 'Invitación del Chef');
      expect(res.tipo).toBe('cortesia_100');
      expect(res.valor).toBe(100);
      expect(res.montoDescontadoCOP).toBe(65000);
    });

    it('maneja valores extremos, NaN y porcentajes mayores a 100', () => {
      const resMayor = calcularDescuento(30000, 'porcentaje', 150);
      expect(resMayor.valor).toBe(100);
      expect(resMayor.montoDescontadoCOP).toBe(30000);

      const resNaN = calcularDescuento(30000, 'porcentaje', NaN);
      expect(resNaN.valor).toBe(0);
      expect(resNaN.montoDescontadoCOP).toBe(0);

      const resNeg = calcularDescuento(30000, 'monto_fijo', -5000);
      expect(resNeg.valor).toBe(0);
      expect(resNeg.montoDescontadoCOP).toBe(0);
    });

    it('retorna 0 si el subtotal es 0 o negativo', () => {
      const res = calcularDescuento(0, 'porcentaje', 20);
      expect(res.montoDescontadoCOP).toBe(0);
      expect(res.valor).toBe(0);
    });
  });

  describe('calcularTotalesConDescuentoYPropina', () => {
    it('calcula correctamente subtotal, descuento, propina y total', () => {
      const desc = calcularDescuento(50000, 'porcentaje', 20, 'Convenio');
      const totales = calcularTotalesConDescuentoYPropina(50000, desc, 4000);

      expect(totales.subtotal).toBe(50000);
      expect(totales.descuentoCOP).toBe(10000);
      expect(totales.subtotalConDescuento).toBe(40000);
      expect(totales.propina).toBe(4000);
      expect(totales.total).toBe(44000);
    });

    it('funciona cuando no hay descuento aplicado', () => {
      const totales = calcularTotalesConDescuentoYPropina(35000, null, 3500);
      expect(totales.subtotal).toBe(35000);
      expect(totales.descuentoCOP).toBe(0);
      expect(totales.subtotalConDescuento).toBe(35000);
      expect(totales.total).toBe(38500);
    });

    it('en cortesía del 100%, el subtotal con descuento es $0 y solo queda la propina si se otorga', () => {
      const cortesia = calcularDescuento(40000, 'cortesia_100', 100, 'Invitación');
      const totales = calcularTotalesConDescuentoYPropina(40000, cortesia, 2000);

      expect(totales.subtotalConDescuento).toBe(0);
      expect(totales.descuentoCOP).toBe(40000);
      expect(totales.total).toBe(2000);
    });
  });

  describe('formatearDetalleDescuento', () => {
    it('formatea porcentaje', () => {
      const desc = calcularDescuento(50000, 'porcentaje', 15, 'Cliente VIP');
      const texto = formatearDetalleDescuento(desc);
      expect(texto).toContain('Descuento 15%');
      expect(texto).toContain('Cliente VIP');
      expect(texto).toContain(formatCOP(7500));
    });

    it('formatea cortesía', () => {
      const desc = calcularDescuento(50000, 'cortesia_100', 100, 'Chef');
      const texto = formatearDetalleDescuento(desc);
      expect(texto).toContain('Cortesía 100%');
      expect(texto).toContain(formatCOP(50000));
    });
  });

  describe('obtenerMotivoDescuentoLabel', () => {
    it('retorna la etiqueta del catálogo si coincide el id', () => {
      const label = obtenerMotivoDescuentoLabel('cortesia_casa');
      expect(label).toBe(MOTIVOS_DESCUENTO_PREDEFINIDOS[0].label);
    });

    it('retorna el fallback si no coincide', () => {
      expect(obtenerMotivoDescuentoLabel('desconocido', 'Promoción especial')).toBe('Promoción especial');
      expect(obtenerMotivoDescuentoLabel(undefined)).toBe('Descuento autorizado');
    });
  });
});
