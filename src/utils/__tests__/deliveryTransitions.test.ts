import { describe, expect, it } from 'vitest';
import {
  assertDeliveryTransition,
  getAllowedDeliveryTransitions,
  getDeliverySaleId,
} from '../deliveryTransitions';

describe('transiciones de domicilios', () => {
  it('solo permite avanzar un paso y deja entregado como estado terminal', () => {
    expect(getAllowedDeliveryTransitions('pendiente')).toEqual(['en_preparacion']);
    expect(getAllowedDeliveryTransitions('en_preparacion')).toEqual(['en_camino']);
    expect(getAllowedDeliveryTransitions('en_camino')).toEqual(['entregado']);
    expect(getAllowedDeliveryTransitions('entregado')).toEqual([]);
  });

  it('rechaza saltos, retrocesos y repeticiones no terminales', () => {
    expect(() => assertDeliveryTransition('pendiente', 'entregado')).toThrow('Transición no permitida');
    expect(() => assertDeliveryTransition('en_camino', 'en_preparacion')).toThrow('Transición no permitida');
    expect(() => assertDeliveryTransition('pendiente', 'pendiente')).toThrow('Transición no permitida');
  });

  it('acepta repetir entregado para que la finalización sea idempotente', () => {
    expect(() => assertDeliveryTransition('entregado', 'entregado')).not.toThrow();
  });

  it('deriva un id de venta estable a partir del domicilio', () => {
    expect(getDeliverySaleId('pedido-123')).toBe('domicilio_pedido-123');
    expect(getDeliverySaleId('pedido-123')).toBe(getDeliverySaleId('pedido-123'));
    expect(() => getDeliverySaleId('')).toThrow('domicilio');
  });
});
