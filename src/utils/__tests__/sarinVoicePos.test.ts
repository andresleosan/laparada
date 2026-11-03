import { describe, expect, it, vi } from 'vitest';
import type { Combo, Producto } from '@/types';
import {
  formatSarinOperationalResponse,
  parseSarinVoiceCommand,
  playSarinWakeBeep,
  type SarinOperationalSnapshot,
} from '../sarinVoicePos';

const mockProductos: Producto[] = [
  {
    id: 'prod-panceroti-ranchero',
    negocioId: 'laparada',
    nombre: 'Panceroti Ranchero',
    descripcion: 'Relleno de pollo, tocineta y maíz',
    categoria: 'Pancerotis',
    precio: 4500,
    disponible: true,
    creadoEn: {} as any,
    actualizadoEn: {} as any,
  },
  {
    id: 'prod-arepa-queso',
    negocioId: 'laparada',
    nombre: 'Arepa con Queso',
    descripcion: 'Arepa asada con doble queso',
    categoria: 'Arepas',
    precio: 6000,
    disponible: true,
    creadoEn: {} as any,
    actualizadoEn: {} as any,
  },
];

const mockCombos: Combo[] = [
  {
    id: 'combo-pareja',
    negocioId: 'laparada',
    nombre: 'Combo Pareja',
    descripcion: '2 Pancerotis + 2 Bebidas',
    precioEspecial: 18000,
    items: [],
    disponible: true,
    creadoEn: {} as any,
    actualizadoEn: {} as any,
  },
];

const mockOperationalSnapshot: SarinOperationalSnapshot = {
  ventasHoyTotal: 145000,
  ventasHoyCantidad: 8,
  ventasEfectivoHoy: 95000,
  ventasTransferenciaHoy: 50000,
  cajaAbierta: true,
  saldoCajaEfectivo: 180000,
  montoInicialCaja: 100000,
  domiciliosPendientes: 2,
  domiciliosEnPreparacion: 1,
  domiciliosEnCamino: 1,
  domiciliosActivosTotal: 4,
};

describe('Sarin Copiloto de Voz en POS (sarinVoicePos)', () => {
  it('interpreta "Sarin registra un panceroti ranchero pagado en efectivo con 5000 pesos" y calcula el cambio', () => {
    const result = parseSarinVoiceCommand({
      transcript: 'Sarin registra un panceroti ranchero pagado en efectivo con 5000 pesos',
      productos: mockProductos,
      combos: mockCombos,
    });

    expect(result.wakeWordDetected).toBe(true);
    expect(result.intent).toBe('registrar_venta_directa');
    expect(result.metodoPago).toBe('efectivo');
    expect(result.montoRecibido).toBe(5000);
    expect(result.totalCalculado).toBe(4500);
    expect(result.cambioCalculado).toBe(500);
    expect(result.matchedItems).toEqual([
      {
        tipo: 'producto',
        referenciaId: 'prod-panceroti-ranchero',
        nombre: 'Panceroti Ranchero',
        cantidad: 1,
        precioUnitario: 4500,
        subtotal: 4500,
      },
    ]);
    expect(result.spokenResponse).toContain('Panceroti Ranchero');
    expect(result.spokenResponse).toContain('500');
  });

  it('protege la caja si el monto hablado es menor al precio del producto y lo agrega al carrito con alerta didáctica', () => {
    const result = parseSarinVoiceCommand({
      transcript: 'Sarin registra dos arepas con queso pagado en efectivo con 5000 pesos',
      productos: mockProductos,
      combos: mockCombos,
    });

    expect(result.intent).toBe('agregar_al_carrito');
    expect(result.totalCalculado).toBe(12000);
    expect(result.faltanteCalculado).toBe(7000);
    expect(result.spokenResponse).toContain('Faltan');
  });

  it('interpreta ventas múltiples con números hablados y pago por transferencia', () => {
    const result = parseSarinVoiceCommand({
      transcript: 'Oye Sarin vende dos pancerotis rancheros y un combo pareja por transferencia',
      productos: mockProductos,
      combos: mockCombos,
    });

    expect(result.intent).toBe('registrar_venta_directa');
    expect(result.metodoPago).toBe('transferencia');
    expect(result.totalCalculado).toBe(27000);
    expect(result.matchedItems).toHaveLength(2);
  });

  it('ignora conversaciones ambiente que no mencionan la palabra de activación Sarin', () => {
    const result = parseSarinVoiceCommand({
      transcript: 'buenas tardes deme un panceroti ranchero por favor',
      productos: mockProductos,
      combos: mockCombos,
      requireWakeWord: true,
    });

    expect(result.wakeWordDetected).toBe(false);
    expect(result.intent).toBe('no_entendido');
  });

  it('responde consultas operativas de ventas de hoy ("Sarin cuánto llevamos vendido hoy")', () => {
    const result = parseSarinVoiceCommand({
      transcript: 'Sarin cuánto llevamos vendido hoy',
      productos: mockProductos,
      combos: mockCombos,
      operationalSnapshot: mockOperationalSnapshot,
    });

    expect(result.wakeWordDetected).toBe(true);
    expect(result.intent).toBe('consultar_ventas_hoy');
    expect(result.totalCalculado).toBe(145000);
    expect(result.spokenResponse).toContain('8 ventas registradas');
    expect(result.spokenResponse).toContain('145.000');
    expect(result.operationalHighlight?.label).toBe('Vendido hoy');
  });

  it('responde consultas de saldo en caja ("Sarin cuánto hay en caja")', () => {
    const result = parseSarinVoiceCommand({
      transcript: 'Sarin cuánto hay en caja',
      productos: mockProductos,
      combos: mockCombos,
      operationalSnapshot: mockOperationalSnapshot,
    });

    expect(result.wakeWordDetected).toBe(true);
    expect(result.intent).toBe('consultar_caja');
    expect(result.totalCalculado).toBe(180000);
    expect(result.spokenResponse).toContain('180.000');
    expect(result.operationalHighlight?.label).toBe('Efectivo en caja');
  });

  it('responde consultas de domicilios pendientes ("Sarin cuántos domicilios hay pendientes")', () => {
    const result = parseSarinVoiceCommand({
      transcript: 'Sarin cuántos domicilios hay pendientes',
      productos: mockProductos,
      combos: mockCombos,
      operationalSnapshot: mockOperationalSnapshot,
    });

    expect(result.wakeWordDetected).toBe(true);
    expect(result.intent).toBe('consultar_domicilios');
    expect(result.totalCalculado).toBe(4);
    expect(result.spokenResponse).toContain('4 domicilios activos');
    expect(result.spokenResponse).toContain('2 pendientes');
    expect(result.operationalHighlight?.label).toBe('Domicilios activos');
  });

  it('interpreta el comando de deshacer última acción por voz ("Sarin deshacer")', () => {
    const result = parseSarinVoiceCommand({
      transcript: 'Sarin deshacer el último comando',
      productos: mockProductos,
      combos: mockCombos,
    });

    expect(result.wakeWordDetected).toBe(true);
    expect(result.intent).toBe('deshacer_ultima_accion');
  });

  it('formatea correctamente el estado cuando aún no hay ventas ni domicilios activos', () => {
    const emptySnap: SarinOperationalSnapshot = {
      ventasHoyTotal: 0,
      ventasHoyCantidad: 0,
      ventasEfectivoHoy: 0,
      ventasTransferenciaHoy: 0,
      cajaAbierta: false,
      saldoCajaEfectivo: 0,
      montoInicialCaja: 0,
      domiciliosPendientes: 0,
      domiciliosEnPreparacion: 0,
      domiciliosEnCamino: 0,
      domiciliosActivosTotal: 0,
    };

    const salesResp = formatSarinOperationalResponse('consultar_ventas_hoy', emptySnap);
    expect(salesResp.spokenResponse).toContain('aún no llevamos ventas');

    const cashResp = formatSarinOperationalResponse('consultar_caja', emptySnap);
    expect(cashResp.spokenResponse).toContain('aún no tiene base abierta');

    const delivResp = formatSarinOperationalResponse('consultar_domicilios', emptySnap);
    expect(delivResp.spokenResponse).toContain('No hay domicilios pendientes');
  });

  it('emite un micro-tono auditivo suave con Web Audio API al detectar la palabra Sarin', () => {
    const startSpy = vi.fn();
    const stopSpy = vi.fn();
    const closeSpy = vi.fn().mockResolvedValue(undefined);

    class MockAudioContext {
      currentTime = 0;
      destination = {};
      createOscillator() {
        return {
          type: 'sine',
          frequency: { setValueAtTime: vi.fn() },
          connect: vi.fn(),
          start: startSpy,
          stop: stopSpy,
        };
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: vi.fn(),
            exponentialRampToValueAtTime: vi.fn(),
          },
          connect: vi.fn(),
        };
      }
      close = closeSpy;
    }

    const originalWindow = globalThis.window;
    Object.defineProperty(globalThis, 'window', {
      value: { AudioContext: MockAudioContext },
      configurable: true,
      writable: true,
    });

    try {
      playSarinWakeBeep('ok');
      expect(startSpy).toHaveBeenCalledTimes(2);
      expect(stopSpy).toHaveBeenCalledTimes(2);
    } finally {
      Object.defineProperty(globalThis, 'window', {
        value: originalWindow,
        configurable: true,
        writable: true,
      });
    }
  });
});
