import { describe, expect, it } from 'vitest';
import {
  calculateOrderItems,
  parsePublicOrderInput,
  type CatalogItemData,
} from '../src/orders/publicOrder';
import {
  esEspecialVigenteServidor,
  evaluarControl86Servidor,
} from '../src/utils/control86Server';

function makeOrderInput(cantidad: number = 1) {
  return parsePublicOrderInput({
    negocioId: 'laparada',
    idempotencyKey: 'pedido_control86_12345678',
    items: [{ tipo: 'producto', referenciaId: 'prod-1', cantidad }],
    clienteNombre: 'Laura Gómez',
    clienteTelefono: '3001234567',
    direccion: 'Calle 15 # 4-20',
    barrio: 'Caobos',
    metodoPago: 'efectivo',
  });
}

describe('Control 86 y Especiales del Día en pedidos públicos (servidor)', () => {
  it('rechaza pedidos públicos cuando el producto está marcado en 86', () => {
    const catalog = new Map<string, CatalogItemData>([
      [
        'producto:prod-1',
        {
          nombre: 'Costilla BBQ',
          negocioId: 'laparada',
          disponible: true,
          precio: 28000,
          control86: {
            agotado86: true,
            motivo86: 'sin_insumos',
          },
        },
      ],
    ]);

    expect(() => calculateOrderItems(makeOrderInput(1), catalog)).toThrow(/Control 86/);
  });

  it('valida contador regresivo de porciones y calcula si debe pasar a auto-86', () => {
    const item: CatalogItemData = {
      nombre: 'Lomo al Trapo',
      negocioId: 'laparada',
      disponible: true,
      precio: 36000,
      control86: {
        agotado86: false,
        contadorActivo: true,
        porcionesDisponibles: 2,
        auto86AlLlegarACero: true,
      },
    };

    const catalog = new Map<string, CatalogItemData>([['producto:prod-1', item]]);

    expect(() => calculateOrderItems(makeOrderInput(3), catalog)).toThrow(
      /Solo quedan 2 porciones/
    );

    const ok = calculateOrderItems(makeOrderInput(2), catalog);
    expect(ok.total).toBe(72000);

    const evalExact = evaluarControl86Servidor(item, 2);
    expect(evalExact.permitido).toBe(true);
    expect(evalExact.porcionesRestantes).toBe(0);
    expect(evalExact.debeAuto86).toBe(true);
  });

  it('valida franja horaria de Especial del Día con soloEnHorarioProgramado en zona Bogotá', () => {
    // Sábado 2026-11-28 10:00 AM Bogotá -> 15:00 UTC
    const diezAmBogota = new Date('2026-11-28T15:00:00.000Z').getTime();
    // Sábado 2026-11-28 08:00 PM Bogotá -> 2026-11-29 01:00 UTC
    const ochoPmBogota = new Date('2026-11-29T01:00:00.000Z').getTime();

    const item: CatalogItemData = {
      nombre: 'Parrillada Nocturna',
      negocioId: 'laparada',
      disponible: true,
      precio: 42000,
      especialDelDia: {
        activo: true,
        etiqueta: 'Noche de Parrilla',
        diasSemana: [6],
        horaInicio: '18:00',
        horaFin: '23:30',
        soloEnHorarioProgramado: true,
      },
    };

    const catalog = new Map<string, CatalogItemData>([['producto:prod-1', item]]);

    expect(() => calculateOrderItems(makeOrderInput(1), catalog, diezAmBogota)).toThrow(
      /horario programado/
    );

    const resNocturno = calculateOrderItems(makeOrderInput(1), catalog, ochoPmBogota);
    expect(resNocturno.total).toBe(42000);

    expect(esEspecialVigenteServidor(item.especialDelDia, ochoPmBogota).vigente).toBe(true);
    expect(esEspecialVigenteServidor(item.especialDelDia, diezAmBogota).vigente).toBe(false);
  });
});
