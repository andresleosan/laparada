import { describe, it, expect } from 'vitest';
import { formatCOP } from '@/utils/formatCOP';
import {
  calcularConsolidadoItems,
  calcularTotalCuenta,
  dividirCuentaEnPartesIguales,
  filtrarMesas,
  getBadgeEstadoMesa,
  generarTextoPrecuentaTicket,
  mesasDefaultIniciales,
} from '../mesasUtils';
import type { CuentaMesa, Mesa, RondaComanda } from '@/types/mesa';
import type { ItemVenta } from '@/types';

describe('mesasUtils', () => {
  describe('calcularConsolidadoItems', () => {
    it('consolida ítems sumando cantidades y subtotales entre diferentes rondas', () => {
      const rondas: RondaComanda[] = [
        {
          id: 'r1',
          numero: 1,
          enviadoEn: { seconds: 1000, nanoseconds: 0 },
          enviadoCocina: true,
          items: [
            { tipo: 'producto', referenciaId: 'p1', nombre: 'Hamburguesa Especial', cantidad: 2, precioUnitario: 18000, subtotal: 36000 },
            { tipo: 'producto', referenciaId: 'p2', nombre: 'Gaseosa Postobón', cantidad: 2, precioUnitario: 4000, subtotal: 8000 },
          ],
          total: 44000,
        },
        {
          id: 'r2',
          numero: 2,
          enviadoEn: { seconds: 2000, nanoseconds: 0 },
          enviadoCocina: true,
          items: [
            { tipo: 'producto', referenciaId: 'p1', nombre: 'Hamburguesa Especial', cantidad: 1, precioUnitario: 18000, subtotal: 18000 },
            { tipo: 'combo', referenciaId: 'c1', nombre: 'Combo Tequeños', cantidad: 1, precioUnitario: 15000, subtotal: 15000 },
          ],
          total: 33000,
        },
      ];

      const consolidado = calcularConsolidadoItems(rondas);
      expect(consolidado).toHaveLength(3);

      const burger = consolidado.find((it) => it.referenciaId === 'p1');
      expect(burger?.cantidad).toBe(3);
      expect(burger?.subtotal).toBe(54000);

      const gaseosa = consolidado.find((it) => it.referenciaId === 'p2');
      expect(gaseosa?.cantidad).toBe(2);
      expect(gaseosa?.subtotal).toBe(8000);

      const combo = consolidado.find((it) => it.referenciaId === 'c1');
      expect(combo?.cantidad).toBe(1);
      expect(combo?.subtotal).toBe(15000);
    });

    it('devuelve array vacío ante rondas vacías o inválidas', () => {
      expect(calcularConsolidadoItems([])).toEqual([]);
      // @ts-expect-error probando valor nulo defensivo
      expect(calcularConsolidadoItems(null)).toEqual([]);
    });
  });

  describe('calcularTotalCuenta', () => {
    it('suma los subtotales de manera segura evitando NaN o valores negativos', () => {
      const items: ItemVenta[] = [
        { tipo: 'producto', referenciaId: 'p1', nombre: 'P1', cantidad: 2, precioUnitario: 10000, subtotal: 20000 },
        { tipo: 'producto', referenciaId: 'p2', nombre: 'P2', cantidad: 1, precioUnitario: 15000, subtotal: 15000 },
      ];
      expect(calcularTotalCuenta(items)).toBe(35000);
      expect(calcularTotalCuenta([])).toBe(0);
    });
  });

  describe('dividirCuentaEnPartesIguales', () => {
    it('divide una cuenta exactamente cuando es múltiplo', () => {
      const res = dividirCuentaEnPartesIguales(60000, 3);
      expect(res.comensales).toBe(3);
      expect(res.montoPorPersona).toBe(20000);
      expect(res.residuo).toBe(0);
    });

    it('calcula el residuo exacto cuando no divide uniformemente', () => {
      const res = dividirCuentaEnPartesIguales(50000, 3);
      expect(res.comensales).toBe(3);
      expect(res.montoPorPersona).toBe(16666);
      expect(res.residuo).toBe(2);
      expect(res.montoPorPersona * 3 + res.residuo).toBe(50000);
    });

    it('maneja valores extremos como 0 o comensales inválidos', () => {
      const res = dividirCuentaEnPartesIguales(20000, 0);
      expect(res.comensales).toBe(1);
      expect(res.montoPorPersona).toBe(20000);
      expect(res.residuo).toBe(0);
    });
  });

  describe('filtrarMesas', () => {
    const mockMesas: Mesa[] = [
      { id: 'm1', numero: 1, nombre: 'Mesa 1', capacidad: 4, zona: 'Salón Principal', estado: 'libre', negocioId: 'test' },
      { id: 'm2', numero: 2, nombre: 'Mesa 2', capacidad: 4, zona: 'Salón Principal', estado: 'ocupada', mesero: 'Carlos', negocioId: 'test' },
      { id: 'm3', numero: 3, nombre: 'Mesa 3', capacidad: 6, zona: 'Terraza', estado: 'por_cobrar', mesero: 'Ana', negocioId: 'test' },
      { id: 'm4', numero: 4, nombre: 'Barra 1', capacidad: 2, zona: 'Barra', estado: 'libre', negocioId: 'test' },
    ];

    it('filtra por estado', () => {
      const libres = filtrarMesas(mockMesas, { estado: 'libre' });
      expect(libres).toHaveLength(2);
      expect(libres.map((m) => m.numero)).toEqual([1, 4]);

      const ocupadas = filtrarMesas(mockMesas, { estado: 'ocupada' });
      expect(ocupadas).toHaveLength(1);
      expect(ocupadas[0].numero).toBe(2);
    });

    it('filtra por zona', () => {
      const terraza = filtrarMesas(mockMesas, { zona: 'Terraza' });
      expect(terraza).toHaveLength(1);
      expect(terraza[0].nombre).toBe('Mesa 3');
    });

    it('filtra por búsqueda de texto (nombre, número, mesero o zona)', () => {
      const porMesero = filtrarMesas(mockMesas, { busqueda: 'Carlos' });
      expect(porMesero).toHaveLength(1);
      expect(porMesero[0].numero).toBe(2);

      const porBarra = filtrarMesas(mockMesas, { busqueda: 'Barra' });
      expect(porBarra).toHaveLength(1);
      expect(porBarra[0].nombre).toBe('Barra 1');
    });
  });

  describe('getBadgeEstadoMesa', () => {
    it('retorna la información correcta para cada estado', () => {
      const libre = getBadgeEstadoMesa('libre');
      expect(libre.label).toBe('Libre');
      expect(libre.colorClass).toContain('emerald');

      const ocupada = getBadgeEstadoMesa('ocupada');
      expect(ocupada.label).toBe('Ocupada');
      expect(ocupada.colorClass).toContain('amber');

      const porCobrar = getBadgeEstadoMesa('por_cobrar');
      expect(porCobrar.label).toBe('Por Cobrar');
      expect(porCobrar.colorClass).toContain('yellow');
    });
  });

  describe('generarTextoPrecuentaTicket', () => {
    it('genera un comprobante legible con productos y totales formateados en COP', () => {
      const cuenta: CuentaMesa = {
        id: 'c1',
        mesaId: 'm1',
        mesaNumero: 4,
        mesaNombre: 'Mesa 4',
        negocioId: 'test',
        estado: 'abierta',
        comensales: 3,
        mesero: 'Mateo',
        clienteNombre: 'Familia Gómez',
        rondas: [],
        items: [
          { tipo: 'producto', referenciaId: 'p1', nombre: 'Hamburguesa Doble', cantidad: 2, precioUnitario: 22000, subtotal: 44000 },
          { tipo: 'producto', referenciaId: 'p2', nombre: 'Limonada de Coco', cantidad: 3, precioUnitario: 7000, subtotal: 21000 },
        ],
        total: 65000,
        apertura: { seconds: 1234, nanoseconds: 0 },
      };

      const texto = generarTextoPrecuentaTicket(cuenta, 'La Parada Grill');
      expect(texto).toContain('LA PARADA GRILL');
      expect(texto).toContain('PRE-CUENTA DE SALÓN');
      expect(texto).toContain('MESA: MESA 4');
      expect(texto).toContain('ATENDIDO POR: Mateo');
      expect(texto).toContain('COMENSALES: 3');
      expect(texto).toContain('Hamburguesa Dob');
      expect(texto).toContain(formatCOP(65000));
    });
  });

  describe('mesasDefaultIniciales', () => {
    it('genera 6 mesas iniciales con negocioId asignado', () => {
      const defaults = mesasDefaultIniciales('mi_negocio');
      expect(defaults).toHaveLength(6);
      expect(defaults.every((m) => m.negocioId === 'mi_negocio')).toBe(true);
      expect(defaults.every((m) => m.estado === 'libre')).toBe(true);
      expect(defaults[0].numero).toBe(1);
      expect(defaults[5].nombre).toBe('Barra 1');
    });
  });
});
