import { describe, it, expect } from 'vitest';
import {
  calcularConsumoInsumos,
  evaluarEstadoStockProducto,
  evaluarEstadoStockCombo,
  verificarStockSuficiente,
} from '../recetasEscandallo';
import type { Combo, Insumo, ItemVenta, Producto } from '@/types';
import { Timestamp } from 'firebase/firestore';

describe('recetasEscandallo utils', () => {
  const mockNow = Timestamp.now();

  const mockInsumos: Insumo[] = [
    {
      id: 'ins_queso',
      nombre: 'Queso Costeño',
      stockActual: 10,
      stockMinimo: 3,
      unidad: 'kg',
      negocioId: 'laparada',
      creadoEn: mockNow,
      actualizadoEn: mockNow,
    },
    {
      id: 'ins_masa',
      nombre: 'Masa de Tequeño',
      stockActual: 20,
      stockMinimo: 5,
      unidad: 'kg',
      negocioId: 'laparada',
      creadoEn: mockNow,
      actualizadoEn: mockNow,
    },
    {
      id: 'ins_caja',
      nombre: 'Caja Combo 10x',
      stockActual: 2, // Bajo stock (stockMinimo: 5)
      stockMinimo: 5,
      unidad: 'unidades',
      negocioId: 'laparada',
      creadoEn: mockNow,
      actualizadoEn: mockNow,
    },
    {
      id: 'ins_salsa',
      nombre: 'Salsa Tártara Especial',
      stockActual: 0, // Agotado
      stockMinimo: 2,
      unidad: 'litros',
      negocioId: 'laparada',
      creadoEn: mockNow,
      actualizadoEn: mockNow,
    },
  ];

  const mockProductos: Producto[] = [
    {
      id: 'prod_tequeno',
      nombre: 'Tequeño Tradicional',
      descripcion: 'Tequeño artesanal de queso',
      precio: 2500,
      disponible: true,
      negocioId: 'laparada',
      creadoEn: mockNow,
      actualizadoEn: mockNow,
      receta: [
        {
          insumoId: 'ins_queso',
          nombreSnapshot: 'Queso Costeño',
          cantidad: 0.05,
          unidadSnapshot: 'kg',
        },
        {
          insumoId: 'ins_masa',
          nombreSnapshot: 'Masa de Tequeño',
          cantidad: 0.08,
          unidadSnapshot: 'kg',
        },
      ],
    },
    {
      id: 'prod_sin_receta',
      nombre: 'Gaseosa Postobón 400ml',
      descripcion: 'Bebida embotellada',
      precio: 3000,
      disponible: true,
      negocioId: 'laparada',
      creadoEn: mockNow,
      actualizadoEn: mockNow,
    },
    {
      id: 'prod_con_salsa',
      nombre: 'Perrada Gourmet',
      descripcion: 'Perro caliente con salsa',
      precio: 12000,
      disponible: true,
      negocioId: 'laparada',
      creadoEn: mockNow,
      actualizadoEn: mockNow,
      receta: [
        {
          insumoId: 'ins_salsa',
          nombreSnapshot: 'Salsa Tártara Especial',
          cantidad: 0.03,
          unidadSnapshot: 'litros',
        },
      ],
    },
  ];

  const mockCombos: Combo[] = [
    {
      id: 'combo_10_tequenos',
      nombre: 'Caja 10 Tequeños + Empaque',
      descripcion: '10 tequeños tradicionales en caja',
      precioEspecial: 22000,
      disponible: true,
      negocioId: 'laparada',
      creadoEn: mockNow,
      actualizadoEn: mockNow,
      items: [
        {
          productoId: 'prod_tequeno',
          cantidad: 10,
          nombreSnapshot: 'Tequeño Tradicional',
        },
      ],
      receta: [
        {
          insumoId: 'ins_caja',
          nombreSnapshot: 'Caja Combo 10x',
          cantidad: 1,
          unidadSnapshot: 'unidades',
        },
      ],
    },
  ];

  describe('calcularConsumoInsumos', () => {
    it('calcula correctamente el consumo para productos individuales', () => {
      const items: ItemVenta[] = [
        {
          tipo: 'producto',
          referenciaId: 'prod_tequeno',
          nombre: 'Tequeño Tradicional',
          cantidad: 4,
          precioUnitario: 2500,
          subtotal: 10000,
        },
      ];

      const resultado = calcularConsumoInsumos(items, mockProductos, mockCombos);
      expect(resultado).toHaveLength(2);

      const queso = resultado.find((r) => r.insumoId === 'ins_queso');
      expect(queso).toBeDefined();
      expect(queso?.cantidadTotal).toBe(0.2); // 4 * 0.05

      const masa = resultado.find((r) => r.insumoId === 'ins_masa');
      expect(masa).toBeDefined();
      expect(masa?.cantidadTotal).toBe(0.32); // 4 * 0.08
    });

    it('calcula consumo para combos integrando insumos directos y de productos incluidos', () => {
      const items: ItemVenta[] = [
        {
          tipo: 'combo',
          referenciaId: 'combo_10_tequenos',
          nombre: 'Caja 10 Tequeños + Empaque',
          cantidad: 2,
          precioUnitario: 22000,
          subtotal: 44000,
        },
      ];

      const resultado = calcularConsumoInsumos(items, mockProductos, mockCombos);
      // Insumos esperados:
      // Caja direct: 2 combos * 1 caja = 2 cajas
      // Queso: 2 combos * (10 tequeños * 0.05 kg) = 1.0 kg
      // Masa: 2 combos * (10 tequeños * 0.08 kg) = 1.6 kg
      expect(resultado).toHaveLength(3);

      const caja = resultado.find((r) => r.insumoId === 'ins_caja');
      expect(caja?.cantidadTotal).toBe(2);

      const queso = resultado.find((r) => r.insumoId === 'ins_queso');
      expect(queso?.cantidadTotal).toBe(1);

      const masa = resultado.find((r) => r.insumoId === 'ins_masa');
      expect(masa?.cantidadTotal).toBe(1.6);
    });

    it('ignora productos sin receta sin arrojar error', () => {
      const items: ItemVenta[] = [
        {
          tipo: 'producto',
          referenciaId: 'prod_sin_receta',
          nombre: 'Gaseosa Postobón 400ml',
          cantidad: 3,
          precioUnitario: 3000,
          subtotal: 9000,
        },
      ];

      const resultado = calcularConsumoInsumos(items, mockProductos, mockCombos);
      expect(resultado).toHaveLength(0);
    });
  });

  describe('evaluarEstadoStockProducto', () => {
    it('retorna disponible para productos con insumos suficientes', () => {
      const tequeno = mockProductos[0];
      const alerta = evaluarEstadoStockProducto(tequeno.receta, mockInsumos);
      expect(alerta.estado).toBe('disponible');
      // stockActual queso: 10 / 0.05 = 200 porciones; masa: 20 / 0.08 = 250 porciones
      expect(alerta.porcionesDisponibles).toBe(200);
    });

    it('retorna agotado si algún insumo tiene stockActual <= 0', () => {
      const perrada = mockProductos[2];
      const alerta = evaluarEstadoStockProducto(perrada.receta, mockInsumos);
      expect(alerta.estado).toBe('agotado');
      expect(alerta.insumoCritico).toBe('Salsa Tártara Especial');
      expect(alerta.porcionesDisponibles).toBe(0);
    });

    it('retorna disponible si el producto no tiene receta', () => {
      const alerta = evaluarEstadoStockProducto(undefined, mockInsumos);
      expect(alerta.estado).toBe('disponible');
      expect(alerta.porcionesDisponibles).toBeUndefined();
    });
  });

  describe('evaluarEstadoStockCombo', () => {
    it('detecta bajo stock cuando un insumo directo del combo está por debajo del mínimo', () => {
      const combo = mockCombos[0];
      const alerta = evaluarEstadoStockCombo(combo, mockProductos, mockInsumos);
      // Caja combo tiene stockActual 2 (stockMinimo 5) -> bajo_stock
      expect(alerta.estado).toBe('bajo_stock');
      expect(alerta.insumoCritico).toBe('Caja Combo 10x');
      expect(alerta.porcionesDisponibles).toBe(2);
    });
  });

  describe('verificarStockSuficiente', () => {
    it('alerta cuando la cantidad solicitada supera el stock disponible', () => {
      const items: ItemVenta[] = [
        {
          tipo: 'combo',
          referenciaId: 'combo_10_tequenos',
          nombre: 'Caja 10 Tequeños',
          cantidad: 5, // Requiere 5 cajas, pero solo hay 2
          precioUnitario: 22000,
          subtotal: 110000,
        },
      ];

      const alertas = verificarStockSuficiente(items, mockProductos, mockCombos, mockInsumos);
      expect(alertas.length).toBeGreaterThan(0);
      const alertaCaja = alertas.find((a) => a.insumoId === 'ins_caja');
      expect(alertaCaja).toBeDefined();
      expect(alertaCaja?.cantidadRequerida).toBe(5);
      expect(alertaCaja?.stockActual).toBe(2);
      expect(alertaCaja?.faltante).toBe(3);
    });
  });
});
