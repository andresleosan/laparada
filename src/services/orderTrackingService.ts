// src/services/orderTrackingService.ts
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { RastreoPedido, TrackingStage } from '@/types/tracking';

export const TRACKING_TOKEN_REGEX = /^[A-Za-z0-9_-]{24,64}$/;

export function isValidTrackingToken(token: unknown): token is string {
  return typeof token === 'string' && TRACKING_TOKEN_REGEX.test(token.trim());
}

/**
 * Obtiene el estado público de rastreo de un pedido por su token seguro.
 */
export async function getRastreoPedido(token: string): Promise<RastreoPedido | null> {
  const normalized = (token || '').trim();
  if (!isValidTrackingToken(normalized)) return null;

  try {
    const docRef = doc(db, 'rastreo_pedidos', normalized);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    return {
      id: snap.id,
      ...snap.data(),
    } as RastreoPedido;
  } catch (error) {
    console.error('Error al obtener rastreo de pedido:', error);
    return null;
  }
}

/**
 * Suscribe un listener en tiempo real a los cambios de estado del pedido.
 */
export function onRastreoPedidoChange(
  token: string,
  callback: (pedido: RastreoPedido | null) => void,
  onError?: (error: Error) => void
): () => void {
  const normalized = (token || '').trim();
  if (!isValidTrackingToken(normalized)) {
    callback(null);
    return () => {};
  }

  const docRef = doc(db, 'rastreo_pedidos', normalized);

  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }
      callback({
        id: snapshot.id,
        ...snapshot.data(),
      } as RastreoPedido);
    },
    (error) => {
      console.error('Error en listener de rastreo:', error);
      if (onError) onError(error);
      callback(null);
    }
  );
}

export interface EstimacionTiempo {
  minutosRestantes: number;
  minutosTranscurridos: number;
  porcentajeEstimado: number;
  retrasado: boolean;
}

/**
 * Estima los minutos restantes y porcentaje de avance basados en la hora de creación.
 */
export function calcularEstimacionTiempo(
  creadoEn: unknown,
  tiempoEstimadoMin: number = 40,
  ahoraMs: number = Date.now()
): EstimacionTiempo {
  const estimadoTotal = Math.max(10, Math.min(180, tiempoEstimadoMin));
  let fechaInicioMs = ahoraMs;

  if (typeof creadoEn === 'object' && creadoEn !== null) {
    if ('toMillis' in creadoEn && typeof (creadoEn as { toMillis: () => number }).toMillis === 'function') {
      fechaInicioMs = (creadoEn as { toMillis: () => number }).toMillis();
    } else if ('seconds' in creadoEn && typeof (creadoEn as { seconds: number }).seconds === 'number') {
      fechaInicioMs = (creadoEn as { seconds: number }).seconds * 1000;
    }
  }

  const transcurridoMin = Math.max(0, Math.floor((ahoraMs - fechaInicioMs) / 60_000));
  const restantes = Math.max(0, estimadoTotal - transcurridoMin);
  const retrasado = transcurridoMin > estimadoTotal;

  const porcentaje = retrasado
    ? 95
    : Math.min(95, Math.max(10, Math.round((transcurridoMin / estimadoTotal) * 100)));

  return {
    minutosRestantes: restantes,
    minutosTranscurridos: transcurridoMin,
    porcentajeEstimado: porcentaje,
    retrasado,
  };
}

export const ETAPAS_ORDEN: Array<{
  stage: TrackingStage;
  label: string;
  sublabel: string;
  stepNumber: number;
}> = [
  { stage: 'pendiente', label: 'Recibido', sublabel: 'Confirmando en cocina', stepNumber: 1 },
  { stage: 'en_preparacion', label: 'En Preparación', sublabel: 'Elaborando tus platos', stepNumber: 2 },
  { stage: 'en_camino', label: 'En Camino', sublabel: 'Repartidor rumbo a tu casa', stepNumber: 3 },
  { stage: 'entregado', label: 'Entregado', sublabel: '¡Buen provecho!', stepNumber: 4 },
];

export function getIndiceEtapa(stage: TrackingStage): number {
  switch (stage) {
    case 'pendiente':
      return 0;
    case 'en_preparacion':
      return 1;
    case 'en_camino':
      return 2;
    case 'entregado':
      return 3;
    default:
      return 0;
  }
}

/**
 * Genera el enlace de ayuda directa por WhatsApp para consultar el pedido.
 */
export function buildWhatsAppHelpUrl(
  telefono?: string,
  nombreNegocio: string = 'La Parada',
  codigoPedido?: string
): string {
  const digits = (telefono || '3001234567').replace(/\D/g, '');
  const normalizedPhone = digits.startsWith('57') ? digits : `57${digits}`;
  const ref = codigoPedido ? ` mi pedido *#${codigoPedido}*` : ' mi pedido';
  const texto = encodeURIComponent(`Hola ${nombreNegocio}, quisiera consultar el estado de${ref}. 🛵🍔`);
  return `https://wa.me/${normalizedPhone}?text=${texto}`;
}

