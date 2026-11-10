import { describe, it, expect } from 'vitest';
import {
  MOTIVOS_LLAMADO_MESERO,
  getMotivoLlamadoMeta,
  generarUrlMenuMesa,
  generarQrMesaDataUrl,
  calcularResumenCuentaMesa,
  validarAutopedidoMesa,
  generarTextoCompartirPrecuentaMesa,
} from '@/utils/menuMesaUtils';
import type { CuentaMesa } from '@/types';

describe('menuMesaUtils', () => {
  describe('MOTIVOS_LLAMADO_MESERO & getMotivoLlamadoMeta', () => {
    it('contiene los 6 motivos gastronómicos predefinidos', () => {
      expect(MOTIVOS_LLAMADO_MESERO).toHaveLength(6);
      const ids = MOTIVOS_LLAMADO_MESERO.map((m) => m.id);
      expect(ids).toContain('asistencia');
      expect(ids).toContain('servilletas');
      expect(ids).toContain('bebidas_hielo');
      expect(ids).toContain('limpieza');
      expect(ids).toContain('cuenta');
      expect(ids).toContain('otro');
    });

    it('retorna los metadatos correctos para un motivo existente', () => {
      const meta = getMotivoLlamadoMeta('servilletas');
      expect(meta.id).toBe('servilletas');
      expect(meta.label).toBe('Servilletas / Cubiertos');
      expect(meta.icono).toBe('UtensilsCrossed');
    });

    it('retorna fallback para motivo desconocido', () => {
      // @ts-expect-error probando entrada inválida
      const fallback = getMotivoLlamadoMeta('desconocido');
      expect(fallback.id).toBe('otro');
      expect(fallback.label).toBe('Atención General');
    });
  });

  describe('generarUrlMenuMesa', () => {
    it('genera la URL interactiva normalizando barras y número', () => {
      const url = generarUrlMenuMesa('https://la-parada.co/', 'laparada', 4);
      expect(url).toBe('https://la-parada.co/mesa/laparada/4');
    });

    it('maneja slug con espacios y número negativo defensivamente', () => {
      const url = generarUrlMenuMesa('http://localhost:5173', 'Mi-Resto', -5);
      expect(url).toBe('http://localhost:5173/mesa/mi-resto/1');
    });
  });

  describe('generarQrMesaDataUrl', () => {
    it('genera una imagen en base64 Data URL válida', async () => {
      const dataUrl = await generarQrMesaDataUrl('https://la-parada.co/mesa/laparada/1');
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('calcularResumenCuentaMesa', () => {
    it('retorna ceros si la cuenta es null', () => {
      const res = calcularResumenCuentaMesa(null);
      expect(res.total).toBe(0);
      expect(res.subtotal).toBe(0);
      expect(res.propinaSugerida).toBe(0);
      expect(res.saldoRestante).toBe(0);
      expect(res.itemsCount).toBe(0);
    });

    it('calcula subtotal, descuento, propina y saldos con precisión', () => {
      const cuentaMock: CuentaMesa = {
        id: 'cta_1',
        mesaId: 'm_1',
        mesaNumero: 3,
        mesaNombre: 'Mesa 3',
        negocioId: 'laparada',
        estado: 'abierta',
        comensales: 2,
        rondas: [
          {
            id: 'r_1',
            numero: 1,
            enviadoEn: { seconds: 1700000000, nanoseconds: 0 },
            items: [
              { tipo: 'producto', referenciaId: 'p1', nombre: 'Hamburguesa', precioUnitario: 25000, cantidad: 2, subtotal: 50000 },
            ],
            total: 50000,
            enviadoCocina: true,
          },
        ],
        items: [
          { tipo: 'producto', referenciaId: 'p1', nombre: 'Hamburguesa', precioUnitario: 25000, cantidad: 2, subtotal: 50000 },
        ],
        descuento: 5000,
        descuentoMotivo: 'Cortesía 10%',
        total: 45000,
        pagosParciales: [
          {
            id: 'p_1',
            monto: 20000,
            metodoPago: 'efectivo',
            fecha: { seconds: 1700000100, nanoseconds: 0 },
          },
        ],
        apertura: { seconds: 1700000000, nanoseconds: 0 },
      };

      const res = calcularResumenCuentaMesa(cuentaMock, 10);
      expect(res.subtotal).toBe(45000); // 50000 - 5000
      expect(res.propinaSugerida).toBe(4500); // 10% de 45000
      expect(res.total).toBe(45000);
      expect(res.totalPagado).toBe(20000);
      expect(res.saldoRestante).toBe(25000); // 45000 - 20000
      expect(res.itemsCount).toBe(2);
      expect(res.rondasCount).toBe(1);
    });
  });

  describe('validarAutopedidoMesa', () => {
    it('falla si la lista de ítems está vacía', () => {
      const res = validarAutopedidoMesa([]);
      expect(res.valido).toBe(false);
      expect(res.error).toContain('al menos un producto');
    });

    it('falla si un producto tiene cantidad 0 o negativa', () => {
      const res = validarAutopedidoMesa([
        { tipo: 'producto', referenciaId: 'p1', nombre: 'Papas', precioUnitario: 8000, cantidad: 0, subtotal: 0 },
      ]);
      expect(res.valido).toBe(false);
      expect(res.error).toContain('Cantidad no válida');
    });

    it('pasa cuando los ítems son válidos', () => {
      const res = validarAutopedidoMesa([
        { tipo: 'producto', referenciaId: 'p1', nombre: 'Papas', precioUnitario: 8000, cantidad: 2, subtotal: 16000 },
        { tipo: 'producto', referenciaId: 'p2', nombre: 'Gaseosa', precioUnitario: 5000, cantidad: 1, subtotal: 5000 },
      ]);
      expect(res.valido).toBe(true);
    });
  });

  describe('generarTextoCompartirPrecuentaMesa', () => {
    it('genera texto para WhatsApp con desglose claro y división entre comensales', () => {
      const cuentaMock: CuentaMesa = {
        id: 'cta_2',
        mesaId: 'm_2',
        mesaNumero: 5,
        mesaNombre: 'Mesa Terraza 5',
        negocioId: 'laparada',
        estado: 'abierta',
        comensales: 3,
        meseroNombre: 'Carlos Mesero',
        rondas: [],
        items: [
          { tipo: 'producto', referenciaId: 'p1', nombre: 'Burger Doble', precioUnitario: 30000, cantidad: 3, subtotal: 90000, notas: 'Sin cebolla' },
        ],
        total: 90000,
        apertura: { seconds: 1700000000, nanoseconds: 0 },
      };

      const texto = generarTextoCompartirPrecuentaMesa(cuentaMock, 'La Parada Gourmet');
      expect(texto).toContain('PRE-CUENTA DE SALÓN — LA PARADA GOURMET');
      expect(texto).toContain('Mesa Terraza 5');
      expect(texto).toContain('Carlos Mesero');
      expect(texto).toContain('3x Burger Doble');
      expect(texto).toContain('Sin cebolla');
      expect(texto).toContain('Dividido entre 3 personas:');
    });
  });
});
