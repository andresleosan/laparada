import { createHash, randomBytes } from 'node:crypto';

/**
 * Proyección pública y saneada del seguimiento de un pedido.
 *
 * El documento `domicilios/{id}` contiene datos personales (teléfono, dirección)
 * y solo lo leen miembros del negocio. El cliente final consulta en su lugar
 * `rastreo_pedidos/{token}`, que contiene exclusivamente lo necesario para
 * seguir el pedido y se identifica con un token aleatorio de 128 bits.
 */
export const TRACKING_COLLECTION = 'rastreo_pedidos';
export const DEFAULT_PUBLIC_APP_URL = 'https://laparada.pages.dev';
export const DEFAULT_DELIVERY_MINUTES = 40;
export const MIN_DELIVERY_MINUTES = 10;
export const MAX_DELIVERY_MINUTES = 180;
export const MAX_TRACKING_ITEMS = 20;

const DEFAULT_TENANT_ID = 'laparada';
const TRACKING_TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,64}$/;
const TENANT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const TRACKING_STAGES = ['pendiente', 'en_preparacion', 'en_camino', 'entregado'] as const;

export type TrackingStage = (typeof TRACKING_STAGES)[number];

export interface TimestampLike {
  toMillis(): number;
}

export interface TrackingItem {
  nombre: string;
  cantidad: number;
}

export interface TrackingNegocio {
  nombre: string;
  telefono?: string;
  slug?: string;
  logoUrl?: string;
}

export interface OrderTrackingProjection {
  negocioId: string;
  pedidoRef: string;
  codigo: string;
  estado: TrackingStage;
  origen: 'pos' | 'whatsapp' | 'web';
  clienteNombre: string;
  barrio?: string;
  items: TrackingItem[];
  totalItems: number;
  total: number;
  metodoPago: 'efectivo' | 'transferencia';
  domiciliarioNombre?: string;
  tiempoEstimadoMin: number;
  negocio: TrackingNegocio;
  creadoEn?: TimestampLike;
  actualizadoEn?: TimestampLike;
  entregadoEn?: TimestampLike;
}

/**
 * Token hexadecimal: 128 bits de entropía y sin letras que puedan formar
 * palabras bloqueadas por el filtro de enlaces de cobro en WhatsApp.
 */
export function generateTrackingToken(): string {
  return randomBytes(16).toString('hex');
}

export function isValidTrackingToken(value: unknown): value is string {
  return typeof value === 'string' && TRACKING_TOKEN_PATTERN.test(value);
}

export function isValidTrackingTenantId(value: unknown): value is string {
  return typeof value === 'string' && TENANT_ID_PATTERN.test(value);
}

export function isTrackingStage(value: unknown): value is TrackingStage {
  return typeof value === 'string' && (TRACKING_STAGES as readonly string[]).includes(value);
}

export function normalizePublicAppUrl(value: string | undefined): string {
  const trimmed = (value || '').trim().replace(/\/+$/, '');
  return /^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/.test(trimmed) ? trimmed : DEFAULT_PUBLIC_APP_URL;
}

export function buildTrackingUrl(baseUrl: string | undefined, token: string): string {
  if (!isValidTrackingToken(token)) {
    throw new Error('El token de rastreo no es válido');
  }
  return `${normalizePublicAppUrl(baseUrl)}/rastreo/${token}`;
}

export function normalizeDeliveryMinutes(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_DELIVERY_MINUTES;
  return Math.min(MAX_DELIVERY_MINUTES, Math.max(MIN_DELIVERY_MINUTES, Math.round(value)));
}

export function hashOrderReference(domicilioId: string): string {
  return createHash('sha256').update(`rastreo:${domicilioId}`).digest('hex').slice(0, 32);
}

function cleanText(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFKC')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, maxLength);
}

/** Solo el primer nombre: suficiente para personalizar sin exponer identidad completa. */
export function publicFirstName(value: unknown, fallback = 'Cliente'): string {
  const first = cleanText(value, 80).split(' ')[0];
  if (!first || /^cliente$/i.test(first)) return fallback;
  return first.slice(0, 40);
}

function isTimestampLike(value: unknown): value is TimestampLike {
  return typeof value === 'object'
    && value !== null
    && typeof (value as { toMillis?: unknown }).toMillis === 'function';
}

function sanitizeItems(value: unknown): TrackingItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, MAX_TRACKING_ITEMS)
    .flatMap((raw): TrackingItem[] => {
      if (typeof raw !== 'object' || raw === null) return [];
      const item = raw as Record<string, unknown>;
      const nombre = cleanText(item.nombre, 120);
      const cantidad = item.cantidad;
      if (!nombre || typeof cantidad !== 'number' || !Number.isInteger(cantidad) || cantidad < 1) {
        return [];
      }
      return [{ nombre, cantidad: Math.min(cantidad, 999) }];
    });
}

function buildPublicCode(domicilioId: string, codigo: unknown): string {
  const clean = cleanText(codigo, 40);
  if (/^[A-Z0-9-]{4,40}$/.test(clean)) return clean;
  return `LP-${domicilioId.slice(-6).toUpperCase()}`;
}

function buildTrackingNegocio(negocioId: string, negocio: Record<string, unknown> | undefined): TrackingNegocio {
  const nombre = cleanText(negocio?.nombre, 80)
    || (negocioId === DEFAULT_TENANT_ID ? 'La Parada' : 'Restaurante');
  const telefono = cleanText(negocio?.telefono, 20).replace(/[^\d+]/g, '');
  const slug = cleanText(negocio?.slug, 80);
  const logoUrl = cleanText(negocio?.logoUrl, 500);

  return {
    nombre,
    ...(telefono.length >= 7 && { telefono }),
    ...(/^[a-z0-9-]{1,80}$/.test(slug) && { slug }),
    ...((logoUrl.startsWith('https://') || logoUrl.startsWith('/')) && { logoUrl }),
  };
}

/**
 * Construye la proyección pública. Nunca copia teléfono, dirección, notas,
 * fotos de transferencia ni identificadores internos del pedido.
 */
export function buildOrderTrackingProjection(
  domicilioId: string,
  domicilio: Record<string, unknown>,
  negocio: Record<string, unknown> | undefined
): OrderTrackingProjection {
  const negocioId = domicilio.negocioId;
  if (!isValidTrackingTenantId(negocioId)) {
    throw new Error('El pedido no tiene un negocio válido');
  }

  const items = sanitizeItems(domicilio.items);
  const total = typeof domicilio.total === 'number' && Number.isSafeInteger(domicilio.total) && domicilio.total >= 0
    ? domicilio.total
    : 0;
  const origen = domicilio.origen === 'whatsapp' || domicilio.origen === 'web' ? domicilio.origen : 'pos';
  const barrio = cleanText(domicilio.barrio, 80);
  const domiciliario = publicFirstName(domicilio.domiciliarioNombre, '');

  return {
    negocioId,
    pedidoRef: hashOrderReference(domicilioId),
    codigo: buildPublicCode(domicilioId, domicilio.codigoPublico),
    estado: isTrackingStage(domicilio.estado) ? domicilio.estado : 'pendiente',
    origen,
    clienteNombre: publicFirstName(domicilio.clienteNombre),
    ...(barrio && { barrio }),
    items,
    totalItems: items.reduce((sum, item) => sum + item.cantidad, 0),
    total,
    metodoPago: domicilio.metodoPago === 'transferencia' ? 'transferencia' : 'efectivo',
    ...(domiciliario && { domiciliarioNombre: domiciliario }),
    tiempoEstimadoMin: normalizeDeliveryMinutes(negocio?.tiempoEntregaMinutos),
    negocio: buildTrackingNegocio(negocioId, negocio),
    ...(isTimestampLike(domicilio.creadoEn) && { creadoEn: domicilio.creadoEn }),
    ...(isTimestampLike(domicilio.actualizadoEn) && { actualizadoEn: domicilio.actualizadoEn }),
    ...(isTimestampLike(domicilio.entregadoEn) && { entregadoEn: domicilio.entregadoEn }),
  };
}

/**
 * Conserva la hora en que se alcanzó cada etapa y registra la nueva si aún no existe.
 */
export function mergeTrackingHistory<T>(
  existing: unknown,
  estado: TrackingStage,
  reachedAt: T
): Partial<Record<TrackingStage, unknown>> {
  const history: Partial<Record<TrackingStage, unknown>> = {};
  if (typeof existing === 'object' && existing !== null) {
    for (const stage of TRACKING_STAGES) {
      const value = (existing as Record<string, unknown>)[stage];
      if (value !== undefined && value !== null) history[stage] = value;
    }
  }
  if (history[estado] === undefined) {
    history[estado] = reachedAt;
  }
  return history;
}

