import type { EstadoDomicilio } from '@/types';

const allowedTransitions: Record<EstadoDomicilio, EstadoDomicilio[]> = {
  pendiente: ['en_preparacion'],
  en_preparacion: ['en_camino'],
  en_camino: ['entregado'],
  entregado: [],
};

export function getAllowedDeliveryTransitions(
  currentState: EstadoDomicilio
): EstadoDomicilio[] {
  return [...allowedTransitions[currentState]];
}

export function assertDeliveryTransition(
  currentState: EstadoDomicilio,
  nextState: EstadoDomicilio
): void {
  if (currentState === 'entregado' && nextState === 'entregado') return;
  if (!allowedTransitions[currentState].includes(nextState)) {
    throw new Error(`Transición no permitida: ${currentState} → ${nextState}`);
  }
}

export function getDeliverySaleId(deliveryId: string): string {
  const normalizedId = deliveryId.trim();
  if (!normalizedId) throw new Error('El id del domicilio es obligatorio');
  return `domicilio_${normalizedId}`;
}
