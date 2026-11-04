import { describe, it, expect } from 'vitest';
import {
  sanitizarCantidadDenominacion,
  evaluarEstadoCuadre,
  calcularTotalesArqueo,
  formatearActaArqueoTexto,
  buildWhatsAppActaUrl,
  DENOMINACIONES_COP,
  BILLETES_COP,
  MONEDAS_COP,
} from '../arqueoCaja';
import { formatCOP } from '../formatCOP';
import type { CierreCaja } from '@/types/cierreCaja';
import { Timestamp } from 'firebase/firestore';

describe('arqueoCaja utility', () => {
  describe('constantes de denominaciones COP', () => {
    it('contiene los 6 billetes estándar de Colombia', () => {
      expect(BILLETES_COP).toHaveLength(6);
      const valores = BILLETES_COP.map((b) => b.valor);
      expect(valores).toEqual([100000, 50000, 20000, 10000, 5000, 2000]);
    });

    it('contiene las 5 monedas COP', () => {
      expect(MONEDAS_COP).toHaveLength(5);
      const valores = MONEDAS_COP.map((m) => m.valor);
      expect(valores).toEqual([1000, 500, 200, 100, 50]);
    });

    it('todas las denominaciones tienen claves válidas y valores positivos', () => {
      DENOMINACIONES_COP.forEach((d) => {
        expect(d.valor).toBeGreaterThan(0);
        expect(d.etiqueta).toBeTruthy();
        expect(['billete', 'moneda']).toContain(d.tipo);
      });
    });
  });

  describe('sanitizarCantidadDenominacion', () => {
    it('convierte números negativos o NaN a 0', () => {
      expect(sanitizarCantidadDenominacion(-5)).toBe(0);
      expect(sanitizarCantidadDenominacion(NaN)).toBe(0);
      expect(sanitizarCantidadDenominacion(Infinity)).toBe(0);
    });

    it('redondea enteros hacia abajo', () => {
      expect(sanitizarCantidadDenominacion(4.9)).toBe(4);
      expect(sanitizarCantidadDenominacion(10)).toBe(10);
    });

    it('sanitiza strings numéricos y descarta caracteres no numéricos', () => {
      expect(sanitizarCantidadDenominacion('15')).toBe(15);
      expect(sanitizarCantidadDenominacion('  8  ')).toBe(8);
      expect(sanitizarCantidadDenominacion('abc')).toBe(0);
      expect(sanitizarCantidadDenominacion(null)).toBe(0);
      expect(sanitizarCantidadDenominacion(undefined)).toBe(0);
    });
  });

  describe('evaluarEstadoCuadre', () => {
    it('retorna cuadrado cuando la diferencia es 0', () => {
      expect(evaluarEstadoCuadre(0)).toBe('cuadrado');
    });

    it('retorna sobrante cuando la diferencia es mayor a 0', () => {
      expect(evaluarEstadoCuadre(1500)).toBe('sobrante');
    });

    it('retorna faltante cuando la diferencia es menor a 0', () => {
      expect(evaluarEstadoCuadre(-2000)).toBe('faltante');
    });
  });

  describe('calcularTotalesArqueo', () => {
    it('calcula correctamente con conteo vacío y esperado 0', () => {
      const res = calcularTotalesArqueo({}, 0);
      expect(res.totalBilletes).toBe(0);
      expect(res.totalMonedas).toBe(0);
      expect(res.totalFisico).toBe(0);
      expect(res.efectivoEsperado).toBe(0);
      expect(res.diferencia).toBe(0);
      expect(res.estadoCuadre).toBe('cuadrado');
    });

    it('calcula sumas correctas de billetes y monedas con cuadre exacto', () => {
      // 2 billetes de $50k (100k) + 3 billetes de $20k (60k) + 5 monedas de $1.000 (5k) = 165.000
      const conteo = {
        b50k: 2,
        b20k: 3,
        m1000: 5,
      };
      const res = calcularTotalesArqueo(conteo, 165000);

      expect(res.totalBilletes).toBe(160000);
      expect(res.totalMonedas).toBe(5000);
      expect(res.totalFisico).toBe(165000);
      expect(res.efectivoEsperado).toBe(165000);
      expect(res.diferencia).toBe(0);
      expect(res.estadoCuadre).toBe('cuadrado');
    });

    it('detecta sobrante cuando el efectivo físico supera el esperado', () => {
      // 1 billete de $100k = 100.000, esperado = 95.000 -> sobrante +5.000
      const conteo = { b100k: 1 };
      const res = calcularTotalesArqueo(conteo, 95000);

      expect(res.totalFisico).toBe(100000);
      expect(res.efectivoEsperado).toBe(95000);
      expect(res.diferencia).toBe(5000);
      expect(res.estadoCuadre).toBe('sobrante');
    });

    it('detecta faltante cuando el efectivo físico es inferior al esperado', () => {
      // 1 billete de $50k + 1 de $10k = 60.000, esperado = 70.000 -> faltante -10.000
      const conteo = { b50k: 1, b10k: 1 };
      const res = calcularTotalesArqueo(conteo, 70000);

      expect(res.totalFisico).toBe(60000);
      expect(res.efectivoEsperado).toBe(70000);
      expect(res.diferencia).toBe(-10000);
      expect(res.estadoCuadre).toBe('faltante');
    });
  });

  describe('formatearActaArqueoTexto y buildWhatsAppActaUrl', () => {
    const mockCierre: CierreCaja = {
      id: 'cierre-abc12345',
      fecha: Timestamp.fromDate(new Date('2026-11-03T23:00:00Z')),
      negocioId: 'laparada',
      totalIngresos: 250000,
      totalGastos: 50000,
      utilidadNeta: 200000,
      ventasPos: 180000,
      ventasWhatsapp: 70000,
      notas: 'Turno sin novedades',
      cajeroNombre: 'Carlos Gómez',
      arqueo: {
        denominaciones: {
          b100k: 1,
          b50k: 2,
          m1000: 5,
        },
        totalBilletes: 200000,
        totalMonedas: 5000,
        totalFisico: 205000,
        efectivoEsperado: 205000,
        diferencia: 0,
        estadoCuadre: 'cuadrado',
      },
    };

    const mockNegocio = {
      nombre: 'La Parada Nocturna',
      direccion: 'Av 5 #10-20, Cúcuta',
      telefono: '3123456789',
    };

    it('genera texto completo con todas las secciones de auditoría', () => {
      const texto = formatearActaArqueoTexto(mockCierre, mockNegocio);

      expect(texto).toContain('ACTA DE CIERRE Y ARQUEO DE CAJA');
      expect(texto).toContain('LA PARADA NOCTURNA');
      expect(texto).toContain('Carlos Gómez');
      expect(texto).toContain(`Ventas POS: ${formatCOP(180000)}`);
      expect(texto).toContain(`WhatsApp / Web: ${formatCOP(70000)}`);
      expect(texto).toContain(`Total Gastos: -${formatCOP(50000)}`);
      expect(texto).toContain(`Utilidad Neta: +${formatCOP(200000)}`);
      expect(texto).toContain(`1 × $100.000 = ${formatCOP(100000)}`);
      expect(texto).toContain(`2 × $50.000 = ${formatCOP(100000)}`);
      expect(texto).toContain(`5 × $1.000 = ${formatCOP(5000)}`);
      expect(texto).toContain('CUADRE EXACTO ($0 COP)');
      expect(texto).toContain('Turno sin novedades');
    });

    it('construye URL de WhatsApp sin número destino', () => {
      const url = buildWhatsAppActaUrl(mockCierre, mockNegocio);
      expect(url).toContain('https://api.whatsapp.com/send?text=');
      expect(url).toContain(encodeURIComponent('ACTA DE CIERRE Y ARQUEO DE CAJA'));
    });

    it('construye URL de WhatsApp con número destino y prefijo 57', () => {
      const url = buildWhatsAppActaUrl(mockCierre, mockNegocio, '3123456789');
      expect(url).toContain('phone=573123456789');
      expect(url).toContain('&text=');
    });
  });
});
