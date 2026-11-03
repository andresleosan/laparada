import { describe, expect, it } from 'vitest';
import type { Combo, Producto } from '@/types';
import { parseSarinVoiceCommand } from '../sarinVoicePos';

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
});

