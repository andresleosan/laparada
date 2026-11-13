import type { Mesa } from '@/types/mesa';
import type { TurnoEspera } from '@/types/espera';

const ESTANCIA_PROMEDIO_MIN = 45;
const ROTACION_POR_COBRAR_MIN = 10;
const MIN_ESPERA_MIN = 5;
const MAX_ESPERA_MIN = 120;

/**
 * Convierte un Timestamp de Firestore o similar a milisegundos epoch.
 */
export function timestampToMs(
  ts?: { toDate?: () => Date; seconds?: number } | Date | null
): number | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  return null;
}

/**
 * Genera el código correlativo legible del turno de espera (ej. E-01, E-02).
 */
export function generarCodigoTurnoEspera(correlativo: number): string {
  const safe = Math.max(1, Math.floor(Number.isFinite(correlativo) ? correlativo : 1));
  return `E-${String(safe).padStart(2, '0')}`;
}

/**
 * Normaliza un número de teléfono colombiano para WhatsApp (57 + 10 dígitos).
 */
export function normalizarTelefonoEspera(telefono?: string): string {
  if (!telefono) return '';
  const digits = telefono.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10 && digits.startsWith('3')) {
    return `57${digits}`;
  }
  return digits;
}

/**
 * Filtra y ordena mesas libres compatibles con el tamaño de grupo y zona preferida.
 * Prioriza coincidencia de zona y menor desperdicio de sillas.
 */
export function filtrarMesasCompatibles(
  mesas: Mesa[],
  personas: number,
  zonaPreferida?: string
): Mesa[] {
  const numPersonas = Math.max(1, Math.floor(personas || 1));
  const zonaNormalizada = zonaPreferida?.trim().toLowerCase();
  const exigirZona = Boolean(zonaNormalizada && zonaNormalizada !== 'cualquiera');

  const libresConCapacidad = mesas.filter(
    (m) => m.estado === 'libre' && (m.capacidad || 0) >= numPersonas
  );

  return libresConCapacidad.sort((a, b) => {
    if (exigirZona) {
      const aCoincide = (a.zona || '').trim().toLowerCase() === zonaNormalizada ? 0 : 1;
      const bCoincide = (b.zona || '').trim().toLowerCase() === zonaNormalizada ? 0 : 1;
      if (aCoincide !== bCoincide) return aCoincide - bCoincide;
    }

    const diffCapacidadA = (a.capacidad || 0) - numPersonas;
    const diffCapacidadB = (b.capacidad || 0) - numPersonas;
    if (diffCapacidadA !== diffCapacidadB) {
      return diffCapacidadA - diffCapacidadB;
    }

    return (a.numero || 0) - (b.numero || 0);
  });
}

/**
 * Estima dinámicamente el tiempo de espera en minutos según:
 * - Mesas libres compatibles ahora mismo (0 min).
 * - Rotación estimada de mesas por cobrar / ocupadas compatibles.
 * - Grupos activos delante en la cola de espera.
 */
export function estimarTiempoEsperaMinutos(params: {
  mesas: Mesa[];
  turnosActivos: TurnoEspera[];
  personas: number;
  zonaPreferida?: string;
  posicionEnCola?: number;
  ahoraMs?: number;
}): number {
  const { mesas, turnosActivos, personas, zonaPreferida, ahoraMs = Date.now() } = params;
  const numPersonas = Math.max(1, Math.floor(personas || 1));
  const zonaNormalizada = zonaPreferida?.trim().toLowerCase();
  const tienePreferenciaZona = Boolean(zonaNormalizada && zonaNormalizada !== 'cualquiera');

  const compatibles = filtrarMesasCompatibles(mesas, numPersonas, zonaPreferida);
  const libresExactas = tienePreferenciaZona
    ? compatibles.filter((m) => (m.zona || '').trim().toLowerCase() === zonaNormalizada)
    : compatibles;

  // Contar cuántos grupos activos están delante esperando mesas similares
  const gruposDelante =
    typeof params.posicionEnCola === 'number'
      ? Math.max(0, params.posicionEnCola)
      : turnosActivos.filter(
          (t) => t.estado === 'esperando' || t.estado === 'notificado'
        ).length;

  // Si hay suficientes mesas libres inmediatas para cubrir la cola y a este grupo
  if (libresExactas.length > gruposDelante) {
    return 0;
  }

  // Analizar mesas ocupadas / por cobrar con capacidad suficiente
  const mesasCandidatas = mesas.filter((m) => {
    if (m.estado === 'libre') return false;
    if ((m.capacidad || 0) < numPersonas) return false;
    if (tienePreferenciaZona) {
      return (m.zona || '').trim().toLowerCase() === zonaNormalizada;
    }
    return true;
  });

  // Si no hay mesas exactas en la zona, considerar cualquier mesa con capacidad
  const poolMesas =
    mesasCandidatas.length > 0
      ? mesasCandidatas
      : mesas.filter((m) => m.estado !== 'libre' && (m.capacidad || 0) >= numPersonas);

  if (poolMesas.length === 0) {
    // Sin mesas de esa capacidad registradas: estimación conservadora por cola
    return Math.min(MAX_ESPERA_MIN, Math.max(15, 15 + gruposDelante * 12));
  }

  const tiemposRestantes = poolMesas.map((mesa) => {
    if (mesa.estado === 'por_cobrar') {
      return ROTACION_POR_COBRAR_MIN;
    }
    const aperturaMs = timestampToMs(mesa.apertura);
    if (!aperturaMs) {
      return 25;
    }
    const transcurridosMin = Math.max(0, Math.floor((ahoraMs - aperturaMs) / 60000));
    return Math.max(8, ESTANCIA_PROMEDIO_MIN - transcurridosMin);
  });

  tiemposRestantes.sort((a, b) => a - b);

  // Índice de rotación considerando mesas libres parciales y grupos delante
  const turnosPorAsignar = Math.max(0, gruposDelante - libresExactas.length);
  const mesaBase = tiemposRestantes[turnosPorAsignar % tiemposRestantes.length];
  const ciclosExtra = Math.floor(turnosPorAsignar / tiemposRestantes.length);
  const estimado = mesaBase + ciclosExtra * 25;

  return Math.min(MAX_ESPERA_MIN, Math.max(MIN_ESPERA_MIN, Math.round(estimado)));
}

/**
 * Calcula los minutos reales que lleva esperando un turno desde su registro.
 */
export function calcularMinutosEnEspera(
  creadoEn?: { toDate?: () => Date; seconds?: number } | Date | null,
  ahoraMs: number = Date.now()
): number {
  const ms = timestampToMs(creadoEn);
  if (!ms) return 0;
  return Math.max(0, Math.floor((ahoraMs - ms) / 60000));
}

/**
 * Construye el mensaje oficial de WhatsApp para llamar al comensal cuando su mesa está lista.
 */
export function construirMensajeMesaLista(params: {
  negocioNombre: string;
  clienteNombre: string;
  codigoTurno: string;
  mesaNombre?: string;
}): string {
  const nombre = params.clienteNombre.trim() || 'comensal';
  const negocio = params.negocioNombre.trim() || 'La Parada';
  const detalleMesa = params.mesaNombre ? ` (${params.mesaNombre})` : '';

  return (
    `¡Hola ${nombre}! 👋 Tu mesa${detalleMesa} en *${negocio}* ya está lista ` +
    `(Turno *${params.codigoTurno}*). Por favor acércate a recepción en los próximos 5 minutos. ¡Te esperamos!`
  );
}
