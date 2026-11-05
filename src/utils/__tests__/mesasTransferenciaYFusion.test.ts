import { describe, it, expect } from 'vitest';
import type { CuentaMesa, Mesa } from '@/types/mesa';
import {
  validarTrasladoMesa,
  crearEventoTraslado,
  validarFusionMesas,
  combinarCuentasMesas,
} from '../mesasTransferenciaYFusion';

describe('mesasTransferenciaYFusion — Lógica pura de traslados y fusiones', () => {
  const mesaOrigenMock: Mesa = {
    id: 'mesa_1',
    numero: 1,
    nombre: 'Mesa 1',
    capacidad: 4,
    zona: 'Salón Principal',
    estado: 'ocupada',
    cuentaActivaId: 'cuenta_1',
    totalActual: 45000,
    comensales: 3,
    mesero: 'Carlos',
    negocioId: 'laparada',
  };

  const mesaDestinoLibreMock: Mesa = {
    id: 'mesa_2',
    numero: 2,
    nombre: 'Mesa 2',
    capacidad: 6,
    zona: 'Terraza',
    estado: 'libre',
    negocioId: 'laparada',
  };

  const mesaDestinoOcupadaMock: Mesa = {
    id: 'mesa_3',
    numero: 3,
    nombre: 'Mesa 3',
    capacidad: 4,
    zona: 'Salón Principal',
    estado: 'ocupada',
    cuentaActivaId: 'cuenta_3',
    totalActual: 20000,
    comensales: 2,
    negocioId: 'laparada',
  };

  const cuenta1Mock: CuentaMesa = {
    id: 'cuenta_1',
    mesaId: 'mesa_1',
    mesaNumero: 1,
    mesaNombre: 'Mesa 1',
    negocioId: 'laparada',
    estado: 'abierta',
    comensales: 3,
    mesero: 'Carlos',
    rondas: [
      {
        id: 'ronda_1_1',
        numero: 1,
        enviadoEn: { seconds: 100, nanoseconds: 0 },
        items: [
          {
            tipo: 'producto',
            referenciaId: 'prod_1',
            nombre: 'Hamburguesa Especial',
            cantidad: 2,
            precioUnitario: 20000,
            subtotal: 40000,
          },
        ],
        total: 40000,
        enviadoCocina: true,
      },
    ],
    items: [
      {
        tipo: 'producto',
        referenciaId: 'prod_1',
        nombre: 'Hamburguesa Especial',
        cantidad: 2,
        precioUnitario: 20000,
        subtotal: 40000,
      },
    ],
    total: 40000,
    apertura: { seconds: 100, nanoseconds: 0 },
  };

  const cuenta3Mock: CuentaMesa = {
    id: 'cuenta_3',
    mesaId: 'mesa_3',
    mesaNumero: 3,
    mesaNombre: 'Mesa 3',
    negocioId: 'laparada',
    estado: 'abierta',
    comensales: 2,
    rondas: [
      {
        id: 'ronda_3_1',
        numero: 1,
        enviadoEn: { seconds: 200, nanoseconds: 0 },
        items: [
          {
            tipo: 'producto',
            referenciaId: 'prod_2',
            nombre: 'Gaseosa 400ml',
            cantidad: 2,
            precioUnitario: 5000,
            subtotal: 10000,
          },
        ],
        total: 10000,
        enviadoCocina: false,
      },
    ],
    items: [
      {
        tipo: 'producto',
        referenciaId: 'prod_2',
        nombre: 'Gaseosa 400ml',
        cantidad: 2,
        precioUnitario: 5000,
        subtotal: 10000,
      },
    ],
    total: 10000,
    apertura: { seconds: 200, nanoseconds: 0 },
  };

  describe('validarTrasladoMesa', () => {
    it('permite trasladar hacia una mesa libre válida del mismo negocio', () => {
      const res = validarTrasladoMesa(mesaOrigenMock, mesaDestinoLibreMock, cuenta1Mock);
      expect(res.valido).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('rechaza traslado si la mesa destino es la misma que la origen', () => {
      const res = validarTrasladoMesa(mesaOrigenMock, mesaOrigenMock, cuenta1Mock);
      expect(res.valido).toBe(false);
      expect(res.error).toContain('no puede ser la misma mesa');
    });

    it('rechaza traslado si la mesa destino está ocupada', () => {
      const res = validarTrasladoMesa(mesaOrigenMock, mesaDestinoOcupadaMock, cuenta1Mock);
      expect(res.valido).toBe(false);
      expect(res.error).toContain('está ocupada');
    });

    it('rechaza traslado si los negocios no coinciden', () => {
      const mesaOtroTenant = { ...mesaDestinoLibreMock, negocioId: 'otro_local' };
      const res = validarTrasladoMesa(mesaOrigenMock, mesaOtroTenant, cuenta1Mock);
      expect(res.valido).toBe(false);
      expect(res.error).toContain('no pertenecen al mismo negocio');
    });

    it('rechaza traslado si la mesa origen está libre o no tiene cuenta', () => {
      const mesaLibre = { ...mesaOrigenMock, estado: 'libre' as const, cuentaActivaId: undefined };
      const res = validarTrasladoMesa(mesaLibre, mesaDestinoLibreMock, cuenta1Mock);
      expect(res.valido).toBe(false);
      expect(res.error).toContain('no tiene una cuenta activa');
    });
  });

  describe('crearEventoTraslado', () => {
    it('genera un objeto de auditoría con origen, destino y motivo', () => {
      const evento = crearEventoTraslado(mesaOrigenMock, mesaDestinoLibreMock, 'Cliente pidió terraza', 'Mesero Pedro');
      expect(evento.mesaOrigenNumero).toBe(1);
      expect(evento.mesaDestinoNumero).toBe(2);
      expect(evento.motivo).toBe('Cliente pidió terraza');
      expect(evento.operador).toBe('Mesero Pedro');
      expect(evento.id).toContain('traslado_');
    });
  });

  describe('validarFusionMesas', () => {
    it('permite fusionar dos mesas ocupadas distintas del mismo negocio', () => {
      const res = validarFusionMesas(mesaOrigenMock, mesaDestinoOcupadaMock, cuenta1Mock, cuenta3Mock);
      expect(res.valido).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it('rechaza fusionar una mesa consigo misma', () => {
      const res = validarFusionMesas(mesaOrigenMock, mesaOrigenMock, cuenta1Mock, cuenta1Mock);
      expect(res.valido).toBe(false);
      expect(res.error).toContain('consigo misma');
    });

    it('rechaza fusionar si la mesa secundaria está libre', () => {
      const res = validarFusionMesas(mesaOrigenMock, mesaDestinoLibreMock, cuenta1Mock, cuenta3Mock);
      expect(res.valido).toBe(false);
      expect(res.error).toContain('no tiene una cuenta activa');
    });
  });

  describe('combinarCuentasMesas', () => {
    it('combina rondas, recalcula ítems consolidados, suma comensales y genera auditoría', () => {
      const resultado = combinarCuentasMesas(cuenta1Mock, cuenta3Mock, 'Juntaron mesas 1 y 3', 'Admin');

      expect(resultado.nuevosComensales).toBe(5); // 3 + 2
      expect(resultado.rondasCombinadas).toHaveLength(2);
      expect(resultado.rondasCombinadas[1].numero).toBe(2); // re-numerada secuencialmente
      expect(resultado.rondasCombinadas[1].notas).toContain('De Mesa 3');

      expect(resultado.nuevoTotal).toBe(50000); // 40000 + 10000
      expect(resultado.itemsConsolidados).toHaveLength(2);
      expect(resultado.eventoFusion.mesaSecundariaNombre).toBe('Mesa 3');
      expect(resultado.eventoFusion.totalFusionado).toBe(10000);
      expect(resultado.saldoPendienteCombinado).toBe(50000);
    });

    it('preserva y concatena los abonos parciales previos de ambas mesas', () => {
      const cuentaConAbono1: CuentaMesa = {
        ...cuenta1Mock,
        pagosParciales: [
          {
            id: 'abono_1',
            monto: 15000,
            metodoPago: 'efectivo',
            fecha: { seconds: 120, nanoseconds: 0 },
            clienteNombre: 'Andrés',
          },
        ],
        totalPagado: 15000,
        saldoPendiente: 25000,
      };

      const cuentaConAbono3: CuentaMesa = {
        ...cuenta3Mock,
        pagosParciales: [
          {
            id: 'abono_2',
            monto: 5000,
            metodoPago: 'transferencia',
            fecha: { seconds: 210, nanoseconds: 0 },
            clienteNombre: 'Laura',
          },
        ],
        totalPagado: 5000,
        saldoPendiente: 5000,
      };

      const resultado = combinarCuentasMesas(cuentaConAbono1, cuentaConAbono3);
      expect(resultado.pagosParcialesCombinados).toHaveLength(2);
      expect(resultado.totalPagadoCombinado).toBe(20000); // 15000 + 5000
      expect(resultado.saldoPendienteCombinado).toBe(30000); // 50000 - 20000
    });
  });
});

