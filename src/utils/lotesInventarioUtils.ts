import type {
  AsignacionConsumoPeps,
  EstadoLoteInventario,
  EstadoSemaforoSanitario,
  FiltrosLotesInventario,
  LoteEvaluadoSanitario,
  LoteInventario,
  PlanConsumoPeps,
  ResumenLotesPorInsumoItem,
  ResumenSanitarioBodega,
  UbicacionBodegaLote,
} from '@/types/loteInventario';
import type { CrearNotificacionInput } from '@/types/notificacion';
import { toValidAdminDate } from './adminAnalytics';
import { formatCOP } from './formatCOP';

export const ZONA_HORARIA_BOGOTA = 'America/Bogota';
const ISO_DATE_REGEX = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_POR_DIA = 86_400_000;

export const UBICACIONES_BODEGA_LOTE_ORDEN: UbicacionBodegaLote[] = [
  'nevera_refrigeracion',
  'congelador',
  'despensa_secos',
  'barra_cocina',
  'bodega_empaques',
];

export const UBICACIONES_BODEGA_LOTE_META: Record<
  UbicacionBodegaLote,
  {
    id: UbicacionBodegaLote;
    label: string;
    shortLabel: string;
    rangoTempSugerido: string;
  }
> = {
  nevera_refrigeracion: {
    id: 'nevera_refrigeracion',
    label: 'Nevera / Refrigeración',
    shortLabel: 'Refrigerado',
    rangoTempSugerido: '0 °C a 4 °C',
  },
  congelador: {
    id: 'congelador',
    label: 'Congelador',
    shortLabel: 'Congelado',
    rangoTempSugerido: '-18 °C',
  },
  despensa_secos: {
    id: 'despensa_secos',
    label: 'Despensa / Secos',
    shortLabel: 'Secos',
    rangoTempSugerido: 'Ambiente fresco',
  },
  barra_cocina: {
    id: 'barra_cocina',
    label: 'Barra / Línea Cocina',
    shortLabel: 'Cocina',
    rangoTempSugerido: 'Uso diario',
  },
  bodega_empaques: {
    id: 'bodega_empaques',
    label: 'Bodega de Empaques',
    shortLabel: 'Empaques',
    rangoTempSugerido: 'Seco y ventilado',
  },
};

export const SEMAFORO_SANITARIO_META: Record<
  EstadoSemaforoSanitario,
  {
    id: EstadoSemaforoSanitario;
    label: string;
    shortLabel: string;
    descripcion: string;
    badgeClass: string;
    dotClass: string;
    textClass: string;
    borderClass: string;
    prioridad: number;
  }
> = {
  vencido: {
    id: 'vencido',
    label: 'Vencido · Retirar',
    shortLabel: 'Vencido',
    descripcion: 'Superó la fecha límite de consumo. Bloqueado en PEPS; dar de baja a merma.',
    badgeClass: 'border-red-500/60 bg-red-500/15 text-red-300',
    dotClass: 'bg-red-500',
    textClass: 'text-red-400',
    borderClass: 'border-red-500/40',
    prioridad: 4,
  },
  critico_3d: {
    id: 'critico_3d',
    label: 'Crítico (0–3 días)',
    shortLabel: '≤ 3 días',
    descripcion: 'Vence hoy o en los próximos 3 días. Priorizar salida inmediata en cocina.',
    badgeClass: 'border-orange-500/60 bg-orange-500/15 text-orange-300',
    dotClass: 'bg-orange-500',
    textClass: 'text-orange-400',
    borderClass: 'border-orange-500/40',
    prioridad: 3,
  },
  proximo_7d: {
    id: 'proximo_7d',
    label: 'Próximo (4–7 días)',
    shortLabel: '4–7 días',
    descripcion: 'Vence esta semana. Mantener al frente de estantería o nevera (PEPS).',
    badgeClass: 'border-amber-500/60 bg-amber-500/15 text-amber-300',
    dotClass: 'bg-amber-400',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-500/40',
    prioridad: 2,
  },
  vigente: {
    id: 'vigente',
    label: 'Vigente (> 7 días)',
    shortLabel: 'Vigente',
    descripcion: 'Vida útil óptima para operación en bodega.',
    badgeClass: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-400',
    borderClass: 'border-emerald-500/30',
    prioridad: 1,
  },
  sin_vencimiento: {
    id: 'sin_vencimiento',
    label: 'Sin caducidad',
    shortLabel: 'No perecedero',
    descripcion: 'Insumo no perecedero o sin fecha de vencimiento asignada.',
    badgeClass: 'border-neutral-700 bg-neutral-800/80 text-neutral-300',
    dotClass: 'bg-neutral-500',
    textClass: 'text-neutral-400',
    borderClass: 'border-neutral-800',
    prioridad: 0,
  },
};

function parseFechaIsoUtc(fechaIso: string): Date | null {
  const match = ISO_DATE_REGEX.exec(fechaIso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Obtiene la fecha calendario actual (YYYY-MM-DD) en zona horaria Colombia (America/Bogota).
 */
export function obtenerFechaIsoColombia(ahora: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA_BOGOTA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(ahora);

  const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const d = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`;
}

/**
 * Verifica que una cadena tenga formato ISO YYYY-MM-DD y corresponda a una fecha calendario real.
 */
export function esFechaIsoValida(valor?: string | null): boolean {
  if (typeof valor !== 'string') return false;
  return parseFechaIsoUtc(valor) !== null;
}

/**
 * Suma días calendario sobre una fecha ISO YYYY-MM-DD.
 */
export function sumarDiasAFechaIso(fechaIso: string, dias: number): string {
  const baseUtc = parseFechaIsoUtc(fechaIso) ?? parseFechaIsoUtc(obtenerFechaIsoColombia());
  if (!baseUtc) return obtenerFechaIsoColombia();
  const safeDias = Number.isFinite(dias) ? Math.trunc(dias) : 0;
  baseUtc.setUTCDate(baseUtc.getUTCDate() + safeDias);
  return baseUtc.toISOString().slice(0, 10);
}

/**
 * Calcula la fecha ISO de vencimiento en America/Bogota sumando horas de vida útil.
 */
export function calcularFechaVencimientoDesdeHoras(
  vidaUtilHoras: number,
  ahora: Date = new Date()
): string {
  if (!Number.isFinite(vidaUtilHoras) || vidaUtilHoras <= 0) {
    return obtenerFechaIsoColombia(ahora);
  }
  const fechaObjetivo = new Date(ahora.getTime() + vidaUtilHoras * 3_600_000);
  return obtenerFechaIsoColombia(fechaObjetivo);
}

/**
 * Calcula la diferencia en días calendario entre la fecha de vencimiento y el día actual en Colombia.
 */
export function calcularDiasParaVencer(
  fechaVencimiento?: string | null,
  ahora: Date = new Date()
): number | null {
  if (!fechaVencimiento) return null;
  const vencUtc = parseFechaIsoUtc(fechaVencimiento);
  if (!vencUtc) return null;
  const hoyIso = obtenerFechaIsoColombia(ahora);
  const hoyUtc = parseFechaIsoUtc(hoyIso);
  if (!hoyUtc) return null;
  return Math.round((vencUtc.getTime() - hoyUtc.getTime()) / MS_POR_DIA);
}

/**
 * Formatea una fecha de vencimiento ISO para lectura rápida en tarjetas y tablas.
 */
export function formatearFechaVencimientoCorta(fechaVencimiento?: string | null): string {
  if (!fechaVencimiento) return 'Sin caducidad';
  const fechaUtc = parseFechaIsoUtc(fechaVencimiento);
  if (!fechaUtc) return 'Sin caducidad';
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(fechaUtc);
}

/**
 * Genera un código único legible para identificar un lote en bodega.
 */
export function generarCodigoLote(
  prefijo = 'LOT',
  ahora: Date = new Date()
): string {
  const fechaCompacta = obtenerFechaIsoColombia(ahora).replace(/-/g, '');
  const pref = prefijo.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 12) || 'LOT';
  const sufijo = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, 'X');
  return `${pref}-${fechaCompacta}-${sufijo}`;
}

/**
 * Normaliza un código de lote ingresado por el usuario o genera uno automático si es inválido.
 */
export function normalizarCodigoLote(
  codigo?: string,
  prefijo = 'LOT',
  ahora: Date = new Date()
): string {
  const limpio = (codigo || '').trim().replace(/\s+/g, '-').toUpperCase().slice(0, 64);
  if (limpio.length >= 2) {
    return limpio;
  }
  return generarCodigoLote(prefijo, ahora);
}

/**
 * Evalúa el estado sanitario del semáforo para una fecha de vencimiento dada.
 */
export function evaluarSemaforoLote(
  fechaVencimiento?: string | null,
  ahora: Date = new Date()
): EstadoSemaforoSanitario {
  const dias = calcularDiasParaVencer(fechaVencimiento, ahora);
  if (dias === null) return 'sin_vencimiento';
  if (dias < 0) return 'vencido';
  if (dias <= 3) return 'critico_3d';
  if (dias <= 7) return 'proximo_7d';
  return 'vigente';
}

/**
 * Ordena lotes por criterio PEPS / FIFO sanitario:
 * primero vence primero sale, luego sin caducidad; empates resueltos por fecha de ingreso ascendente.
 */
export function ordenarLotesPeps<
  T extends {
    fechaVencimiento?: string | null;
    fechaIngreso?: unknown;
    creadoEn?: unknown;
  },
>(lotes: T[]): T[] {
  return [...lotes].sort((a, b) => {
    const aFecha = a.fechaVencimiento && esFechaIsoValida(a.fechaVencimiento)
      ? a.fechaVencimiento.trim()
      : null;
    const bFecha = b.fechaVencimiento && esFechaIsoValida(b.fechaVencimiento)
      ? b.fechaVencimiento.trim()
      : null;

    if (aFecha && bFecha && aFecha !== bFecha) {
      return aFecha.localeCompare(bFecha);
    }
    if (aFecha && !bFecha) return -1;
    if (!aFecha && bFecha) return 1;

    const aIng = toValidAdminDate(a.fechaIngreso ?? a.creadoEn)?.getTime() ?? 0;
    const bIng = toValidAdminDate(b.fechaIngreso ?? b.creadoEn)?.getTime() ?? 0;
    return aIng - bIng;
  });
}

/**
 * Enriquece un lote individual con semáforo sanitario, días restantes y valor disponible en COP.
 */
export function evaluarLoteSanitario(
  lote: LoteInventario,
  ahora: Date = new Date()
): LoteEvaluadoSanitario {
  const diasParaVencer = calcularDiasParaVencer(lote.fechaVencimiento, ahora);
  const estadoSemaforo = evaluarSemaforoLote(lote.fechaVencimiento, ahora);
  const disponible = Number.isFinite(lote.cantidadDisponible)
    ? Math.max(0, lote.cantidadDisponible)
    : 0;
  const inicial = Number.isFinite(lote.cantidadInicial) && lote.cantidadInicial > 0
    ? lote.cantidadInicial
    : 0;
  const costoUnitario = Number.isFinite(lote.costoUnitario) && lote.costoUnitario > 0
    ? Math.round(lote.costoUnitario)
    : 0;

  return {
    ...lote,
    diasParaVencer,
    estadoSemaforo,
    valorDisponibleCOP: Math.round(disponible * costoUnitario),
    porcentajeDisponible: inicial > 0
      ? Math.min(100, Math.max(0, Math.round((disponible / inicial) * 100)))
      : 0,
  };
}

/**
 * Evalúa todos los lotes, los ordena por PEPS y marca con `esPrimeroPeps` el siguiente a consumir por insumo.
 */
export function evaluarLotesSanitarios(
  lotes: LoteInventario[],
  ahora: Date = new Date()
): LoteEvaluadoSanitario[] {
  const ordenados = ordenarLotesPeps(lotes);
  const primeroAsignadoPorInsumo = new Set<string>();

  return ordenados.map((lote) => {
    const evaluado = evaluarLoteSanitario(lote, ahora);
    const esElegiblePeps =
      evaluado.estado === 'activo' &&
      evaluado.cantidadDisponible > 0 &&
      evaluado.estadoSemaforo !== 'vencido';

    let esPrimeroPeps = false;
    if (esElegiblePeps && !primeroAsignadoPorInsumo.has(evaluado.insumoId)) {
      primeroAsignadoPorInsumo.add(evaluado.insumoId);
      esPrimeroPeps = true;
    }

    return {
      ...evaluado,
      esPrimeroPeps,
    };
  });
}

/**
 * Planifica el descuento automático en cascada PEPS / FIFO para un insumo sin tocar Firestore.
 */
export function planificarConsumoPeps(
  insumoId: string,
  cantidadRequerida: number,
  lotesInsumo: LoteInventario[],
  opciones?: {
    ahora?: Date;
    permitirConsumirVencidos?: boolean;
  }
): PlanConsumoPeps {
  const ahora = opciones?.ahora ?? new Date();
  const permitirVencidos = Boolean(opciones?.permitirConsumirVencidos);

  if (!Number.isFinite(cantidadRequerida) || cantidadRequerida <= 0) {
    return {
      insumoId,
      cantidadSolicitada: 0,
      cantidadCubiertaPorLotes: 0,
      cantidadSinLote: 0,
      lotesVencidosOmitidos: 0,
      asignaciones: [],
    };
  }

  const solicitada = Number(cantidadRequerida.toFixed(4));
  let lotesVencidosOmitidos = 0;

  const candidatos: LoteInventario[] = [];
  for (const lote of lotesInsumo) {
    if (lote.insumoId !== insumoId) continue;
    if (lote.estado !== 'activo') continue;
    if (!Number.isFinite(lote.cantidadDisponible) || lote.cantidadDisponible <= 0) continue;

    const semaforo = evaluarSemaforoLote(lote.fechaVencimiento, ahora);
    if (!permitirVencidos && semaforo === 'vencido') {
      lotesVencidosOmitidos += 1;
      continue;
    }
    candidatos.push(lote);
  }

  const ordenados = ordenarLotesPeps(candidatos);
  const asignaciones: AsignacionConsumoPeps[] = [];
  let restante = solicitada;
  let cubierta = 0;

  for (const lote of ordenados) {
    if (restante <= 0) break;
    const disponible = Number(Math.max(0, lote.cantidadDisponible).toFixed(4));
    if (disponible <= 0) continue;

    const tomar = Number(Math.min(restante, disponible).toFixed(4));
    if (tomar <= 0) continue;

    const cantidadRestante = Number(Math.max(0, disponible - tomar).toFixed(4));
    const nuevoEstado: EstadoLoteInventario = cantidadRestante <= 0 ? 'agotado' : 'activo';

    asignaciones.push({
      loteId: lote.id,
      codigoLote: lote.codigoLote,
      cantidadConsumida: tomar,
      cantidadRestante,
      nuevoEstado,
      fechaVencimiento: lote.fechaVencimiento ?? null,
    });

    restante = Number(Math.max(0, restante - tomar).toFixed(4));
    cubierta = Number((cubierta + tomar).toFixed(4));
  }

  return {
    insumoId,
    cantidadSolicitada: solicitada,
    cantidadCubiertaPorLotes: cubierta,
    cantidadSinLote: restante,
    lotesVencidosOmitidos,
    asignaciones,
  };
}

/**
 * Calcula las métricas consolidadas del semáforo sanitario en toda la bodega.
 */
export function calcularResumenSanitarioBodega(
  lotes: LoteInventario[],
  ahora: Date = new Date()
): ResumenSanitarioBodega {
  const evaluados = evaluarLotesSanitarios(lotes, ahora);

  let totalLotesActivos = 0;
  let vencidosCount = 0;
  let criticos3dCount = 0;
  let proximos7dCount = 0;
  let vigentesCount = 0;
  let sinVencimientoCount = 0;
  let cuarentenaCount = 0;
  let valorVencidoCOP = 0;
  let valorProximo7dCOP = 0;
  let valorTotalLotesActivosCOP = 0;
  let loteMasUrgente: LoteEvaluadoSanitario | null = null;

  for (const lote of evaluados) {
    if (lote.estado === 'cuarentena' && lote.cantidadDisponible > 0) {
      cuarentenaCount += 1;
      continue;
    }

    if (lote.estado !== 'activo' || lote.cantidadDisponible <= 0) {
      continue;
    }

    totalLotesActivos += 1;
    valorTotalLotesActivosCOP += lote.valorDisponibleCOP;

    if (lote.diasParaVencer !== null) {
      if (
        !loteMasUrgente ||
        (loteMasUrgente.diasParaVencer !== null &&
          lote.diasParaVencer < loteMasUrgente.diasParaVencer)
      ) {
        loteMasUrgente = lote;
      }
    }

    switch (lote.estadoSemaforo) {
      case 'vencido':
        vencidosCount += 1;
        valorVencidoCOP += lote.valorDisponibleCOP;
        break;
      case 'critico_3d':
        criticos3dCount += 1;
        valorProximo7dCOP += lote.valorDisponibleCOP;
        break;
      case 'proximo_7d':
        proximos7dCount += 1;
        valorProximo7dCOP += lote.valorDisponibleCOP;
        break;
      case 'vigente':
        vigentesCount += 1;
        break;
      case 'sin_vencimiento':
      default:
        sinVencimientoCount += 1;
        break;
    }
  }

  const estadoGlobal: ResumenSanitarioBodega['estadoGlobal'] =
    vencidosCount > 0
      ? 'critico'
      : criticos3dCount > 0
      ? 'alerta'
      : proximos7dCount > 0
      ? 'preventivo'
      : 'saludable';

  return {
    totalLotesActivos,
    vencidosCount,
    criticos3dCount,
    proximos7dCount,
    vigentesCount,
    sinVencimientoCount,
    cuarentenaCount,
    valorEnRiesgoCOP: valorVencidoCOP + valorProximo7dCOP,
    valorVencidoCOP,
    valorProximo7dCOP,
    valorTotalLotesActivosCOP,
    estadoGlobal,
    loteMasUrgente,
  };
}

/**
 * Resume el estado de lotes activos y próximo vencimiento por cada `insumoId`.
 */
export function obtenerResumenLotesPorInsumo(
  lotes: LoteInventario[],
  ahora: Date = new Date()
): Record<string, ResumenLotesPorInsumoItem> {
  const evaluados = evaluarLotesSanitarios(lotes, ahora);
  const mapa: Record<string, ResumenLotesPorInsumoItem> = {};

  for (const lote of evaluados) {
    if (lote.estado !== 'activo' || lote.cantidadDisponible <= 0) continue;

    const actual = mapa[lote.insumoId] ?? {
      cantidadLotesActivos: 0,
      stockEnLotes: 0,
      proximoVencimiento: null,
      diasProximoVencimiento: null,
      peorSemaforo: 'sin_vencimiento' as EstadoSemaforoSanitario,
      vencidosCount: 0,
      criticos3dCount: 0,
      proximos7dCount: 0,
    };

    actual.cantidadLotesActivos += 1;
    actual.stockEnLotes = Number((actual.stockEnLotes + lote.cantidadDisponible).toFixed(4));

    if (lote.estadoSemaforo === 'vencido') actual.vencidosCount += 1;
    if (lote.estadoSemaforo === 'critico_3d') actual.criticos3dCount += 1;
    if (lote.estadoSemaforo === 'proximo_7d') actual.proximos7dCount += 1;

    if (
      SEMAFORO_SANITARIO_META[lote.estadoSemaforo].prioridad >
      SEMAFORO_SANITARIO_META[actual.peorSemaforo].prioridad
    ) {
      actual.peorSemaforo = lote.estadoSemaforo;
    }

    if (lote.fechaVencimiento && lote.diasParaVencer !== null) {
      if (
        actual.diasProximoVencimiento === null ||
        lote.diasParaVencer < actual.diasProximoVencimiento
      ) {
        actual.proximoVencimiento = lote.fechaVencimiento;
        actual.diasProximoVencimiento = lote.diasParaVencer;
      }
    }

    mapa[lote.insumoId] = actual;
  }

  return mapa;
}

/**
 * Filtra lotes evaluados según insumo, semáforo sanitario, estado operativo y texto libre.
 */
export function filtrarLotesInventario(
  lotesEvaluados: LoteEvaluadoSanitario[],
  filtros: FiltrosLotesInventario
): LoteEvaluadoSanitario[] {
  const q = (filtros.busqueda || '').trim().toLowerCase();

  return lotesEvaluados.filter((lote) => {
    if (filtros.insumoId && filtros.insumoId !== 'todos' && lote.insumoId !== filtros.insumoId) {
      return false;
    }

    if (filtros.estadoLote && filtros.estadoLote !== 'todos' && lote.estado !== filtros.estadoLote) {
      return false;
    }

    if (filtros.estadoSemaforo && filtros.estadoSemaforo !== 'todos') {
      if (filtros.estadoSemaforo === 'en_riesgo') {
        if (
          lote.estadoSemaforo !== 'vencido' &&
          lote.estadoSemaforo !== 'critico_3d' &&
          lote.estadoSemaforo !== 'proximo_7d'
        ) {
          return false;
        }
      } else if (lote.estadoSemaforo !== filtros.estadoSemaforo) {
        return false;
      }
    }

    if (q) {
      const haystack = [
        lote.codigoLote,
        lote.insumoNombre,
        lote.proveedor || '',
        lote.registroSanitario || '',
        lote.notas || '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

/**
 * Construye una clave única diaria para deduplicar alertas sanitarias por lote y estado.
 */
export function construirClaveAlertaSanitaria(
  loteId: string,
  estadoSemaforo: EstadoSemaforoSanitario,
  ahora: Date = new Date()
): string {
  return `${loteId}_${estadoSemaforo}_${obtenerFechaIsoColombia(ahora)}`;
}

/**
 * Genera alertas operativas de inventario para lotes vencidos, críticos (<= 3d) o próximos (4-7d).
 */
export function construirAlertasSanitariasLotes(
  lotes: LoteInventario[],
  ahora: Date = new Date()
): CrearNotificacionInput[] {
  const evaluados = evaluarLotesSanitarios(lotes, ahora);
  const alertas: CrearNotificacionInput[] = [];

  for (const lote of evaluados) {
    if (lote.estado !== 'activo' || lote.cantidadDisponible <= 0) continue;

    if (
      lote.estadoSemaforo !== 'vencido' &&
      lote.estadoSemaforo !== 'critico_3d' &&
      lote.estadoSemaforo !== 'proximo_7d'
    ) {
      continue;
    }

    const urgencia =
      lote.estadoSemaforo === 'vencido'
        ? 'critica'
        : lote.estadoSemaforo === 'critico_3d'
        ? 'alta'
        : 'media';

    const tipo =
      lote.estadoSemaforo === 'vencido'
        ? 'lote_vencido'
        : lote.estadoSemaforo === 'critico_3d'
        ? 'lote_critico_3d'
        : 'lote_proximo_7d';

    const dias = lote.diasParaVencer ?? 0;
    const detalleDias =
      lote.estadoSemaforo === 'vencido'
        ? `vencido hace ${Math.abs(dias)} día(s)`
        : dias === 0
        ? 'vence HOY'
        : `vence en ${dias} día(s)`;

    const titulo =
      lote.estadoSemaforo === 'vencido'
        ? `¡Lote Vencido: ${lote.insumoNombre} (${lote.codigoLote})!`
        : lote.estadoSemaforo === 'critico_3d'
        ? `Caducidad Crítica: ${lote.insumoNombre} (${lote.codigoLote})`
        : `Próximo a Vencer: ${lote.insumoNombre} (${lote.codigoLote})`;

    const mensaje = `Lote ${lote.codigoLote} con ${lote.cantidadDisponible} ${lote.unidadMedida} ${detalleDias} (${formatearFechaVencimientoCorta(lote.fechaVencimiento)}). Valor: ${formatCOP(lote.valorDisponibleCOP)}.`;

    alertas.push({
      modulo: 'inventario',
      tipo,
      titulo,
      mensaje,
      urgencia,
      enlace: '/inventario?tab=lotes',
      origen: 'automatico',
      metadata: {
        loteId: lote.id,
        codigoLote: lote.codigoLote,
        insumoId: lote.insumoId,
        estadoSemaforo: lote.estadoSemaforo,
        fechaVencimiento: lote.fechaVencimiento || '',
        claveSanitaria: construirClaveAlertaSanitaria(lote.id, lote.estadoSemaforo, ahora),
      },
    });
  }

  return alertas;
}

/**
 * Neutraliza fórmulas peligrosas de hojas de cálculo (CSV Injection) preservando números negativos.
 */
export function escapeCsvSeguro(valor: string | number | undefined | null): string {
  let texto = String(valor ?? '');
  if (/^[=+\-@\t\r]/.test(texto) && !/^-\d+(\.\d+)?$/.test(texto)) {
    texto = `'${texto}`;
  }
  return `"${texto.replace(/"/g, '""')}"`;
}

const ESTADO_LOTE_LABELS: Record<EstadoLoteInventario, string> = {
  activo: 'Activo en Bodega',
  agotado: 'Agotado (PEPS)',
  vencido_baja: 'Baja a Merma',
  cuarentena: 'En Cuarentena',
};

/**
 * Genera el contenido CSV (RFC 4180 + UTF-8 BOM) de trazabilidad sanitaria de lotes para auditorías BPM/INVIMA.
 */
export function generarCsvTrazabilidadSanitaria(
  lotes: LoteInventario[],
  nombreNegocio: string,
  ahora: Date = new Date()
): string {
  const evaluados = evaluarLotesSanitarios(lotes, ahora);
  const headers = [
    'Negocio',
    'Codigo Lote',
    'Insumo',
    'Unidad',
    'Estado Lote',
    'Semaforo Sanitario',
    'Prioridad PEPS',
    'Fecha Ingreso',
    'Fecha Vencimiento',
    'Dias Para Vencer',
    'Cantidad Inicial',
    'Cantidad Disponible',
    'Cantidad Consumida',
    'Cantidad Merma',
    'Costo Unitario COP',
    'Valor Disponible COP',
    'Proveedor / Origen',
    'Ubicacion Bodega',
    'Temperatura Recepcion C',
    'Registro Sanitario',
    'Motivo Baja',
    'Responsable',
    'Notas',
  ];

  const filas = evaluados.map((lote) => {
    const fechaIng = toValidAdminDate(lote.fechaIngreso ?? lote.creadoEn);
    const fechaIngStr = fechaIng ? fechaIng.toLocaleDateString('es-CO') : '';
    const semaforoLabel = SEMAFORO_SANITARIO_META[lote.estadoSemaforo].label;
    const ubicacionLabel = lote.ubicacionBodega
      ? UBICACIONES_BODEGA_LOTE_META[lote.ubicacionBodega]?.label || lote.ubicacionBodega
      : '';

    return [
      escapeCsvSeguro(nombreNegocio || 'La Parada'),
      escapeCsvSeguro(lote.codigoLote),
      escapeCsvSeguro(lote.insumoNombre),
      escapeCsvSeguro(lote.unidadMedida),
      escapeCsvSeguro(ESTADO_LOTE_LABELS[lote.estado] || lote.estado),
      escapeCsvSeguro(semaforoLabel),
      escapeCsvSeguro(lote.esPrimeroPeps ? 'SIGUIENTE PEPS (#1)' : ''),
      escapeCsvSeguro(fechaIngStr),
      escapeCsvSeguro(lote.fechaVencimiento || 'Sin caducidad'),
      escapeCsvSeguro(lote.diasParaVencer !== null ? lote.diasParaVencer : ''),
      escapeCsvSeguro(lote.cantidadInicial),
      escapeCsvSeguro(lote.cantidadDisponible),
      escapeCsvSeguro(lote.cantidadConsumida),
      escapeCsvSeguro(lote.cantidadMerma ?? 0),
      escapeCsvSeguro(lote.costoUnitario),
      escapeCsvSeguro(lote.valorDisponibleCOP),
      escapeCsvSeguro(lote.proveedor),
      escapeCsvSeguro(ubicacionLabel),
      escapeCsvSeguro(
        typeof lote.temperaturaRecepcionC === 'number' ? lote.temperaturaRecepcionC : ''
      ),
      escapeCsvSeguro(lote.registroSanitario || ''),
      escapeCsvSeguro(lote.motivoBaja || ''),
      escapeCsvSeguro(lote.bajaResponsable || lote.responsable || ''),
      escapeCsvSeguro(lote.notas || ''),
    ].join(',');
  });

  return `\uFEFF${[headers.map(escapeCsvSeguro).join(','), ...filas].join('\r\n')}`;
}

/**
 * Descarga en el navegador el reporte CSV de trazabilidad sanitaria de lotes.
 */
export function descargarCsvTrazabilidadSanitaria(
  lotes: LoteInventario[],
  nombreNegocio: string,
  ahora: Date = new Date()
): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }
  const contenido = generarCsvTrazabilidadSanitaria(lotes, nombreNegocio, ahora);
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fechaHoy = obtenerFechaIsoColombia(ahora);
  const safeNegocio = (nombreNegocio || 'negocio').toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.href = url;
  a.download = `trazabilidad_sanitaria_lotes_${safeNegocio}_${fechaHoy}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Genera el mensaje URL-encoded para compartir el semáforo sanitario PEPS por WhatsApp.
 */
export function generarResumenSanitarioWhatsApp(
  lotes: LoteInventario[],
  nombreNegocio = 'La Parada',
  ahora: Date = new Date()
): string {
  const evaluados = evaluarLotesSanitarios(lotes, ahora);
  const resumen = calcularResumenSanitarioBodega(lotes, ahora);
  const enRiesgo = evaluados.filter(
    (l) =>
      l.estado === 'activo' &&
      l.cantidadDisponible > 0 &&
      (l.estadoSemaforo === 'vencido' ||
        l.estadoSemaforo === 'critico_3d' ||
        l.estadoSemaforo === 'proximo_7d')
  );

  let texto = `*🧪 SEMÁFORO SANITARIO PEPS — ${nombreNegocio.toUpperCase()}*\n`;
  texto += `📅 Corte Colombia: ${obtenerFechaIsoColombia(ahora)}\n\n`;
  texto += `• Lotes activos en bodega: *${resumen.totalLotesActivos}*\n`;
  texto += `• 🔴 Vencidos (retirar): *${resumen.vencidosCount}* (${formatCOP(resumen.valorVencidoCOP)})\n`;
  texto += `• 🟠 Críticos (≤ 3 días): *${resumen.criticos3dCount}*\n`;
  texto += `• 🟡 Próximos (4–7 días): *${resumen.proximos7dCount}*\n`;
  texto += `• 💰 Capital en riesgo: *${formatCOP(resumen.valorEnRiesgoCOP)}*\n`;

  if (enRiesgo.length > 0) {
    texto += `\n*Lotes Prioritarios a Atender (PEPS):*\n`;
    enRiesgo.slice(0, 6).forEach((l, idx) => {
      const icono =
        l.estadoSemaforo === 'vencido' ? '🔴' : l.estadoSemaforo === 'critico_3d' ? '🟠' : '🟡';
      const diasTxt =
        l.diasParaVencer === null
          ? ''
          : l.diasParaVencer < 0
          ? `Vencido hace ${Math.abs(l.diasParaVencer)}d`
          : l.diasParaVencer === 0
          ? 'Vence HOY'
          : `Vence en ${l.diasParaVencer}d`;
      texto += `${idx + 1}. ${icono} *${l.insumoNombre}* (${l.codigoLote}) · ${l.cantidadDisponible} ${l.unidadMedida} · ${diasTxt}\n`;
    });
  } else {
    texto += `\n✅ *Todos los lotes perecederos están vigentes y bajo control sanitario.*`;
  }

  return encodeURIComponent(texto);
}
