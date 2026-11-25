import type {
  CanalIncidenteReclamo,
  CausaRaizReclamo,
  DesgloseCausaRaizReclamo,
  EstadoGlobalReclamos,
  EstadoReclamo,
  EstadoSemaforoSlaReclamo,
  FiltrosReclamos,
  PrioridadReclamo,
  ReclamoEvaluado,
  ReclamoPqrs,
  ResumenReclamos,
  TipoPqrs,
  TipoResolucionReclamo,
} from '@/types/reclamo';
import { normalizarTelefono } from './clienteUtils';
import { formatCOP } from './formatCOP';
import { esFechaIsoValida, obtenerFechaIsoColombia } from './lotesInventarioUtils';

export const SLA_MINUTOS_POR_PRIORIDAD: Record<PrioridadReclamo, number> = {
  critica: 30,
  alta: 60,
  media: 240,
  baja: 1440,
};

export const TIPO_PQRS_ORDEN: TipoPqrs[] = [
  'garantia_pedido',
  'reclamo',
  'queja',
  'peticion',
  'sugerencia',
];

export const TIPO_PQRS_META: Record<
  TipoPqrs,
  {
    id: TipoPqrs;
    label: string;
    shortLabel: string;
    badgeClass: string;
  }
> = {
  garantia_pedido: {
    id: 'garantia_pedido',
    label: 'Garantía de Pedido',
    shortLabel: 'Garantía',
    badgeClass: 'border-red-500/40 bg-red-500/15 text-red-300',
  },
  reclamo: {
    id: 'reclamo',
    label: 'Reclamo Formal',
    shortLabel: 'Reclamo',
    badgeClass: 'border-orange-500/40 bg-orange-500/15 text-orange-300',
  },
  queja: {
    id: 'queja',
    label: 'Queja de Servicio',
    shortLabel: 'Queja',
    badgeClass: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  },
  peticion: {
    id: 'peticion',
    label: 'Petición / Solicitud',
    shortLabel: 'Petición',
    badgeClass: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
  },
  sugerencia: {
    id: 'sugerencia',
    label: 'Sugerencia de Mejora',
    shortLabel: 'Sugerencia',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  },
};

export const CANAL_INCIDENTE_ORDEN: CanalIncidenteReclamo[] = [
  'domicilio',
  'salon',
  'mostrador',
  'whatsapp',
  'web',
  'kiosco',
];

export const CANAL_INCIDENTE_META: Record<
  CanalIncidenteReclamo,
  {
    id: CanalIncidenteReclamo;
    label: string;
    shortLabel: string;
    badgeClass: string;
  }
> = {
  domicilio: {
    id: 'domicilio',
    label: 'Domicilio / Reparto',
    shortLabel: 'Domicilio',
    badgeClass: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
  },
  salon: {
    id: 'salon',
    label: 'Salón / Mesas',
    shortLabel: 'Salón',
    badgeClass: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
  },
  mostrador: {
    id: 'mostrador',
    label: 'Mostrador / POS',
    shortLabel: 'Mostrador',
    badgeClass: 'border-gold-400/40 bg-gold-400/15 text-gold-300',
  },
  whatsapp: {
    id: 'whatsapp',
    label: 'WhatsApp Directo',
    shortLabel: 'WhatsApp',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  },
  web: {
    id: 'web',
    label: 'Tienda Web',
    shortLabel: 'Web',
    badgeClass: 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300',
  },
  kiosco: {
    id: 'kiosco',
    label: 'Kiosco Autoservicio',
    shortLabel: 'Kiosco',
    badgeClass: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  },
};

export const CAUSA_RAIZ_ORDEN: CausaRaizReclamo[] = [
  'demora_entrega',
  'pedido_incompleto',
  'producto_equivocado',
  'calidad_temperatura',
  'empaque_derrame',
  'cobro_vueltas',
  'atencion_servicio',
  'otro',
];

export const CAUSA_RAIZ_META: Record<
  CausaRaizReclamo,
  {
    id: CausaRaizReclamo;
    label: string;
    shortLabel: string;
    areaResponsable: string;
  }
> = {
  demora_entrega: {
    id: 'demora_entrega',
    label: 'Demora en entrega / preparación',
    shortLabel: 'Demora entrega',
    areaResponsable: 'Cocina / Despacho',
  },
  pedido_incompleto: {
    id: 'pedido_incompleto',
    label: 'Pedido incompleto / faltante',
    shortLabel: 'Incompleto',
    areaResponsable: 'Armado / Empaque',
  },
  producto_equivocado: {
    id: 'producto_equivocado',
    label: 'Producto o término equivocado',
    shortLabel: 'Equivocado',
    areaResponsable: 'Cocina / Toma pedido',
  },
  calidad_temperatura: {
    id: 'calidad_temperatura',
    label: 'Calidad, sabor o temperatura fría',
    shortLabel: 'Calidad / Temp.',
    areaResponsable: 'Cocina',
  },
  empaque_derrame: {
    id: 'empaque_derrame',
    label: 'Empaque dañado o derrame en ruta',
    shortLabel: 'Empaque / Derrame',
    areaResponsable: 'Empaque / Reparto',
  },
  cobro_vueltas: {
    id: 'cobro_vueltas',
    label: 'Diferencia en cobro o vueltas',
    shortLabel: 'Cobro / Vueltas',
    areaResponsable: 'Caja / Repartidor',
  },
  atencion_servicio: {
    id: 'atencion_servicio',
    label: 'Atención o trato al cliente',
    shortLabel: 'Atención',
    areaResponsable: 'Salón / Servicio',
  },
  otro: {
    id: 'otro',
    label: 'Otra causa operativa',
    shortLabel: 'Otro',
    areaResponsable: 'Administración',
  },
};

export const PRIORIDAD_RECLAMO_ORDEN: PrioridadReclamo[] = [
  'critica',
  'alta',
  'media',
  'baja',
];

export const PRIORIDAD_RECLAMO_META: Record<
  PrioridadReclamo,
  {
    id: PrioridadReclamo;
    label: string;
    badgeClass: string;
    pesoOrden: number;
  }
> = {
  critica: {
    id: 'critica',
    label: 'Crítica (30m)',
    badgeClass: 'border-red-500/60 bg-red-500/20 text-red-200',
    pesoOrden: 4,
  },
  alta: {
    id: 'alta',
    label: 'Alta (1h)',
    badgeClass: 'border-orange-500/50 bg-orange-500/15 text-orange-300',
    pesoOrden: 3,
  },
  media: {
    id: 'media',
    label: 'Media (4h)',
    badgeClass: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
    pesoOrden: 2,
  },
  baja: {
    id: 'baja',
    label: 'Baja (24h)',
    badgeClass: 'border-neutral-600 bg-neutral-800 text-neutral-300',
    pesoOrden: 1,
  },
};

export const ESTADO_RECLAMO_META: Record<
  EstadoReclamo,
  {
    id: EstadoReclamo;
    label: string;
    badgeClass: string;
  }
> = {
  abierto: {
    id: 'abierto',
    label: 'Abierto',
    badgeClass: 'border-red-500/50 bg-red-500/15 text-red-300',
  },
  en_gestion: {
    id: 'en_gestion',
    label: 'En Gestión',
    badgeClass: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
  },
  resuelto: {
    id: 'resuelto',
    label: 'Resuelto',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  },
  cerrado: {
    id: 'cerrado',
    label: 'Cerrado',
    badgeClass: 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300',
  },
  descartado: {
    id: 'descartado',
    label: 'Descartado',
    badgeClass: 'border-neutral-700 bg-neutral-800 text-neutral-400',
  },
};

export const TIPO_RESOLUCION_ORDEN: TipoResolucionReclamo[] = [
  'reenvio_domicilio',
  'bono_cortesia',
  'devolucion_caja',
  'reposicion_salon',
  'disculpa_seguimiento',
];

export const TIPO_RESOLUCION_META: Record<
  TipoResolucionReclamo,
  {
    id: TipoResolucionReclamo;
    label: string;
    shortLabel: string;
    descripcion: string;
    requiereMonto: boolean;
    badgeClass: string;
  }
> = {
  reenvio_domicilio: {
    id: 'reenvio_domicilio',
    label: 'Reenvío de Pedido (Garantía $0)',
    shortLabel: 'Reenvío $0',
    descripcion: 'Crea una nueva comanda de domicilio a $0 sin duplicar venta.',
    requiereMonto: false,
    badgeClass: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
  },
  bono_cortesia: {
    id: 'bono_cortesia',
    label: 'Bono de Cortesía (/bonos)',
    shortLabel: 'Bono Cortesía',
    descripcion: 'Emite un vale de consumo offline redimible en POS o Mesas.',
    requiereMonto: true,
    badgeClass: 'border-gold-400/50 bg-gold-400/15 text-gold-300',
  },
  devolucion_caja: {
    id: 'devolucion_caja',
    label: 'Devolución en Caja (/caja)',
    shortLabel: 'Devolución Caja',
    descripcion: 'Registra egreso en Caja Menor vinculado al radicado PQRS.',
    requiereMonto: true,
    badgeClass: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
  },
  reposicion_salon: {
    id: 'reposicion_salon',
    label: 'Reposición Inmediata en Salón/Barra',
    shortLabel: 'Reposición Salón',
    descripcion: 'Reposición de plato o bebida entregada directamente al cliente.',
    requiereMonto: false,
    badgeClass: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
  },
  disculpa_seguimiento: {
    id: 'disculpa_seguimiento',
    label: 'Disculpa Formal y Seguimiento',
    shortLabel: 'Disculpa / Cierre',
    descripcion: 'Atención de aclaración o mejora sin compensación económica.',
    requiereMonto: false,
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  },
};

export const SLA_RECLAMO_META: Record<
  EstadoSemaforoSlaReclamo,
  {
    id: EstadoSemaforoSlaReclamo;
    label: string;
    shortLabel: string;
    badgeClass: string;
    prioridadOrden: number;
  }
> = {
  vencido: {
    id: 'vencido',
    label: 'SLA Vencido',
    shortLabel: 'Vencido',
    badgeClass: 'border-red-500/60 bg-red-500/20 text-red-200 animate-pulse',
    prioridadOrden: 4,
  },
  por_vencer: {
    id: 'por_vencer',
    label: 'SLA Por Vencer',
    shortLabel: 'Por vencer',
    badgeClass: 'border-orange-500/50 bg-orange-500/15 text-orange-300',
    prioridadOrden: 3,
  },
  en_tiempo: {
    id: 'en_tiempo',
    label: 'En Tiempo SLA',
    shortLabel: 'En tiempo',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    prioridadOrden: 2,
  },
  incumplido: {
    id: 'incumplido',
    label: 'Fuera de SLA',
    shortLabel: 'Fuera SLA',
    badgeClass: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    prioridadOrden: 1,
  },
  cumplido: {
    id: 'cumplido',
    label: 'Cumplido en SLA',
    shortLabel: 'En SLA',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    prioridadOrden: 0,
  },
};

/**
 * Sanitiza un monto monetario en COP devolviendo siempre un entero >= 0.
 */
export function sanitizarMontoReclamoCOP(valor: number): number {
  if (!Number.isFinite(valor) || valor < 0) return 0;
  return Math.round(valor);
}

/**
 * Devuelve el SLA objetivo en minutos según prioridad.
 */
export function obtenerSlaObjetivoMin(prioridad: PrioridadReclamo): number {
  return SLA_MINUTOS_POR_PRIORIDAD[prioridad] ?? 240;
}

/**
 * Genera el código único de radicado PQRS (ej. "PQR-20261124-001").
 */
export function generarCodigoRadicadoReclamo(
  fechaIso: string,
  existentesCount: number
): string {
  const fechaLimpia = esFechaIsoValida(fechaIso)
    ? fechaIso.replace(/-/g, '')
    : obtenerFechaIsoColombia().replace(/-/g, '');
  const consecutivo = Math.max(1, Math.trunc(existentesCount) + 1);
  return `PQR-${fechaLimpia}-${String(consecutivo).padStart(3, '0')}`;
}

/**
 * Convierte Timestamp, Date, string o número a Date válido.
 */
export function parseFechaReclamo(valor: unknown): Date | null {
  if (!valor) return null;
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : valor;
  }
  if (
    typeof valor === 'object' &&
    valor !== null &&
    'toDate' in valor &&
    typeof (valor as { toDate: () => unknown }).toDate === 'function'
  ) {
    const dt = (valor as { toDate: () => unknown }).toDate();
    return dt instanceof Date && !Number.isNaN(dt.getTime()) ? dt : null;
  }
  if (
    typeof valor === 'object' &&
    valor !== null &&
    'seconds' in valor &&
    typeof (valor as { seconds: unknown }).seconds === 'number'
  ) {
    const dt = new Date((valor as { seconds: number }).seconds * 1000);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  if (typeof valor === 'string' || typeof valor === 'number') {
    const dt = new Date(valor);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

/**
 * Evalúa el SLA en tiempo real para un reclamo individual.
 */
export function evaluarSlaReclamo(
  reclamo: ReclamoPqrs,
  ahoraMs: number = Date.now()
): ReclamoEvaluado {
  const esActivo = reclamo.estado === 'abierto' || reclamo.estado === 'en_gestion';
  const slaObjetivoMin = Math.max(1, Math.round(reclamo.slaObjetivoMin || 60));
  const creadoDate = parseFechaReclamo(reclamo.creadoEn);
  const resueltoDate = parseFechaReclamo(reclamo.resueltoEn);

  let minutosTranscurridos = 0;
  if (!esActivo && typeof reclamo.tiempoResolucionMin === 'number') {
    minutosTranscurridos = Math.max(0, Math.round(reclamo.tiempoResolucionMin));
  } else if (creadoDate) {
    const finMs = !esActivo && resueltoDate ? resueltoDate.getTime() : ahoraMs;
    minutosTranscurridos = Math.max(0, Math.round((finMs - creadoDate.getTime()) / 60000));
  }

  const minutosRestantes = slaObjetivoMin - minutosTranscurridos;
  const porcentajeSlaConsumido = Math.max(
    0,
    Math.round((minutosTranscurridos / slaObjetivoMin) * 100)
  );

  let semaforoSla: EstadoSemaforoSlaReclamo;
  if (reclamo.estado === 'descartado') {
    semaforoSla = 'cumplido';
  } else if (!esActivo) {
    const cumplio =
      typeof reclamo.cumplioSla === 'boolean'
        ? reclamo.cumplioSla
        : minutosTranscurridos <= slaObjetivoMin;
    semaforoSla = cumplio ? 'cumplido' : 'incumplido';
  } else if (minutosRestantes < 0) {
    semaforoSla = 'vencido';
  } else if (porcentajeSlaConsumido >= 75) {
    semaforoSla = 'por_vencer';
  } else {
    semaforoSla = 'en_tiempo';
  }

  return {
    reclamo,
    semaforoSla,
    minutosTranscurridos,
    minutosRestantes,
    porcentajeSlaConsumido,
    esActivo,
  };
}

/**
 * Evalúa y ordena reclamos priorizando los activos con SLA vencido/crítico.
 */
export function evaluarReclamos(
  reclamos: ReclamoPqrs[],
  ahoraMs: number = Date.now()
): ReclamoEvaluado[] {
  return reclamos
    .map((r) => evaluarSlaReclamo(r, ahoraMs))
    .sort((a, b) => {
      if (a.esActivo !== b.esActivo) return a.esActivo ? -1 : 1;

      const slaDiff =
        SLA_RECLAMO_META[b.semaforoSla].prioridadOrden -
        SLA_RECLAMO_META[a.semaforoSla].prioridadOrden;
      if (slaDiff !== 0) return slaDiff;

      const prioDiff =
        PRIORIDAD_RECLAMO_META[b.reclamo.prioridad].pesoOrden -
        PRIORIDAD_RECLAMO_META[a.reclamo.prioridad].pesoOrden;
      if (prioDiff !== 0) return prioDiff;

      const fechaA = parseFechaReclamo(a.reclamo.creadoEn)?.getTime() ?? 0;
      const fechaB = parseFechaReclamo(b.reclamo.creadoEn)?.getTime() ?? 0;
      return fechaB - fechaA;
    });
}

/**
 * Consolida KPIs ejecutivos, tasa de reclamos, cumplimiento SLA y desglose de causas raíz.
 */
export function calcularResumenReclamos(
  reclamosEvaluados: ReclamoEvaluado[],
  totalPedidosMes: number = 0,
  fechaHoyIso?: string
): ResumenReclamos {
  const hoyIso =
    fechaHoyIso && esFechaIsoValida(fechaHoyIso)
      ? fechaHoyIso
      : obtenerFechaIsoColombia();
  const mesActualPrefix = hoyIso.slice(0, 7);

  let abiertosCount = 0;
  let enGestionCount = 0;
  let resueltosCount = 0;
  let descartadosCount = 0;
  let criticosAbiertosCount = 0;
  let slaVencidosCount = 0;
  let slaPorVencerCount = 0;

  let resueltosEvaluablesSla = 0;
  let resueltosCumplieronSla = 0;
  let sumaTiempoResolucionMin = 0;
  let countTiempoResolucion = 0;

  let costoCompensacionesMesCOP = 0;
  let costoCompensacionesTotalCOP = 0;
  let bonosCortesiaEmitidosCount = 0;
  let devolucionesCajaCount = 0;
  let reenviosGarantiaCount = 0;
  let reclamosMesValidos = 0;

  const porCanal: Record<CanalIncidenteReclamo, number> = {
    domicilio: 0,
    salon: 0,
    mostrador: 0,
    whatsapp: 0,
    web: 0,
    kiosco: 0,
  };

  const mapaCausas = new Map<
    CausaRaizReclamo,
    { cantidad: number; compensacionCOP: number }
  >();

  for (const item of reclamosEvaluados) {
    const r = item.reclamo;
    porCanal[r.canal] = (porCanal[r.canal] || 0) + 1;

    if (r.estado === 'abierto') abiertosCount += 1;
    else if (r.estado === 'en_gestion') enGestionCount += 1;
    else if (r.estado === 'resuelto' || r.estado === 'cerrado') resueltosCount += 1;
    else if (r.estado === 'descartado') descartadosCount += 1;

    if (item.esActivo) {
      if (r.prioridad === 'critica') criticosAbiertosCount += 1;
      if (item.semaforoSla === 'vencido') slaVencidosCount += 1;
      else if (item.semaforoSla === 'por_vencer') slaPorVencerCount += 1;
    }

    if (r.estado === 'resuelto' || r.estado === 'cerrado') {
      resueltosEvaluablesSla += 1;
      if (item.semaforoSla === 'cumplido') {
        resueltosCumplieronSla += 1;
      }
      sumaTiempoResolucionMin += item.minutosTranscurridos;
      countTiempoResolucion += 1;
    }

    const compensacion = sanitizarMontoReclamoCOP(r.montoCompensacionCOP ?? 0);
    costoCompensacionesTotalCOP += compensacion;
    if (r.fechaIso?.startsWith(mesActualPrefix)) {
      costoCompensacionesMesCOP += compensacion;
      if (r.estado !== 'descartado') {
        reclamosMesValidos += 1;
      }
    }

    if (r.tipoResolucion === 'bono_cortesia') bonosCortesiaEmitidosCount += 1;
    if (r.tipoResolucion === 'devolucion_caja') devolucionesCajaCount += 1;
    if (r.tipoResolucion === 'reenvio_domicilio') reenviosGarantiaCount += 1;

    if (r.estado !== 'descartado') {
      const prev = mapaCausas.get(r.causaRaiz) || { cantidad: 0, compensacionCOP: 0 };
      mapaCausas.set(r.causaRaiz, {
        cantidad: prev.cantidad + 1,
        compensacionCOP: prev.compensacionCOP + compensacion,
      });
    }
  }

  const activosCount = abiertosCount + enGestionCount;
  const totalValidos = Math.max(0, reclamosEvaluados.length - descartadosCount);

  const topCausasRaiz: DesgloseCausaRaizReclamo[] = Array.from(mapaCausas.entries())
    .map(([causaRaiz, stats]) => ({
      causaRaiz,
      label: CAUSA_RAIZ_META[causaRaiz]?.label || causaRaiz,
      cantidad: stats.cantidad,
      porcentaje:
        totalValidos > 0 ? Math.round((stats.cantidad / totalValidos) * 100) : 0,
      compensacionCOP: stats.compensacionCOP,
    }))
    .sort((a, b) => b.cantidad - a.cantidad || b.compensacionCOP - a.compensacionCOP);

  const tasaCumplimientoSlaPct =
    resueltosEvaluablesSla > 0
      ? Math.round((resueltosCumplieronSla / resueltosEvaluablesSla) * 100)
      : 100;

  const tiempoPromedioResolucionMin =
    countTiempoResolucion > 0
      ? Math.round(sumaTiempoResolucionMin / countTiempoResolucion)
      : 0;

  const pedidosRef = Math.max(0, Math.round(totalPedidosMes || 0));
  const tasaReclamosSobrePedidosPct =
    pedidosRef > 0
      ? Number(((reclamosMesValidos / pedidosRef) * 100).toFixed(1))
      : 0;

  const estadoGlobal: EstadoGlobalReclamos =
    slaVencidosCount > 0 || criticosAbiertosCount > 0
      ? 'critico'
      : activosCount > 0 || slaPorVencerCount > 0
      ? 'atencion'
      : 'al_dia';

  return {
    totalReclamos: reclamosEvaluados.length,
    abiertosCount,
    enGestionCount,
    activosCount,
    resueltosCount,
    descartadosCount,
    criticosAbiertosCount,
    slaVencidosCount,
    slaPorVencerCount,
    tasaCumplimientoSlaPct,
    tiempoPromedioResolucionMin,
    tasaReclamosSobrePedidosPct,
    totalPedidosReferencia: pedidosRef,
    costoCompensacionesMesCOP,
    costoCompensacionesTotalCOP,
    bonosCortesiaEmitidosCount,
    devolucionesCajaCount,
    reenviosGarantiaCount,
    topCausasRaiz,
    causaRaizPrincipal: topCausasRaiz[0] ?? null,
    porCanal,
    estadoGlobal,
  };
}

/**
 * Filtra los reclamos evaluados por búsqueda, tipo, canal, causa raíz, prioridad, estado y SLA.
 */
export function filtrarReclamos(
  reclamosEvaluados: ReclamoEvaluado[],
  filtros: FiltrosReclamos
): ReclamoEvaluado[] {
  const q = filtros.busqueda.trim().toLowerCase();

  return reclamosEvaluados.filter((item) => {
    const r = item.reclamo;
    if (filtros.tipo !== 'todos' && r.tipo !== filtros.tipo) return false;
    if (filtros.canal !== 'todos' && r.canal !== filtros.canal) return false;
    if (filtros.causaRaiz !== 'todos' && r.causaRaiz !== filtros.causaRaiz) return false;
    if (filtros.prioridad !== 'todos' && r.prioridad !== filtros.prioridad) return false;

    if (filtros.estado === 'activos') {
      if (!item.esActivo) return false;
    } else if (filtros.estado !== 'todos' && r.estado !== filtros.estado) {
      return false;
    }

    if (filtros.semaforoSla !== 'todos' && item.semaforoSla !== filtros.semaforoSla) {
      return false;
    }

    if (q) {
      const texto = [
        r.codigoRadicado,
        r.clienteNombre,
        r.clienteTelefono || '',
        r.descripcion,
        r.barrioEntrega || '',
        r.direccionEntrega || '',
        r.repartidorNombre || '',
        r.mesaNombre || '',
        r.bonoCortesiaCodigo || '',
        r.movimientoCajaCodigo || '',
        CAUSA_RAIZ_META[r.causaRaiz]?.label || '',
      ]
        .join(' ')
        .toLowerCase();
      if (!texto.includes(q)) return false;
    }

    return true;
  });
}

/**
 * Construye el enlace de WhatsApp para responder al cliente con acuse o resolución formal.
 */
export function construirUrlWhatsAppReclamo(
  reclamo: ReclamoPqrs,
  nombreNegocio: string = 'La Parada',
  modo: 'acuse' | 'resolucion' = 'resolucion'
): string {
  const nombreLocal = nombreNegocio.trim() || 'La Parada';
  const causaLabel = CAUSA_RAIZ_META[reclamo.causaRaiz]?.shortLabel || reclamo.causaRaiz;

  let mensaje = '';
  if (modo === 'acuse' || (reclamo.estado !== 'resuelto' && reclamo.estado !== 'cerrado')) {
    mensaje =
      `Hola ${reclamo.clienteNombre}, te saludamos de *${nombreLocal}* 👋.\n` +
      `Recibimos tu reporte *${reclamo.codigoRadicado}* (${causaLabel}) y nuestro equipo ya lo está gestionando con prioridad.\n` +
      `En breve te confirmamos la solución. ¡Gracias por ayudarnos a mejorar!`;
  } else {
    const resLabel = reclamo.tipoResolucion
      ? TIPO_RESOLUCION_META[reclamo.tipoResolucion]?.label
      : 'Resolución operativa';
    const extras: string[] = [];
    if (reclamo.bonoCortesiaCodigo) {
      extras.push(
        `🎁 Bono de Cortesía: *${reclamo.bonoCortesiaCodigo}* por *${formatCOP(reclamo.montoCompensacionCOP ?? 0)}*`
      );
    }
    if (reclamo.movimientoCajaCodigo) {
      extras.push(
        `💵 Comprobante de devolución: *${reclamo.movimientoCajaCodigo}* por *${formatCOP(reclamo.montoCompensacionCOP ?? 0)}*`
      );
    }
    if (reclamo.reenvioDomicilioId) {
      extras.push('🛵 Ya despachamos tu reenvío de garantía sin costo.');
    }

    mensaje =
      `Hola ${reclamo.clienteNombre}, te saludamos de *${nombreLocal}* 🙌.\n` +
      `Tu caso *${reclamo.codigoRadicado}* ha sido *resuelto* mediante: *${resLabel}*.\n` +
      (reclamo.resolucionNotas ? `Detalle: ${reclamo.resolucionNotas}\n` : '') +
      (extras.length > 0 ? `${extras.join('\n')}\n` : '') +
      `Valoramos mucho tu confianza.`;
  }

  const telNorm = normalizarTelefono(reclamo.clienteTelefono || '');
  const encoded = encodeURIComponent(mensaje);
  if (telNorm.length >= 10) {
    const numeroCompleto = telNorm.startsWith('57') ? telNorm : `57${telNorm}`;
    return `https://wa.me/${numeroCompleto}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

/**
 * Genera un resumen ejecutivo de PQRS y garantías listo para compartir por WhatsApp.
 */
export function generarResumenReclamosWhatsApp(
  nombreNegocio: string,
  resumen: ResumenReclamos
): string {
  const icono =
    resumen.estadoGlobal === 'al_dia'
      ? '🟢'
      : resumen.estadoGlobal === 'atencion'
      ? '🟡'
      : '🔴';

  let texto = `*🛡️ REPORTE PQRS & GARANTÍAS — ${(nombreNegocio || 'La Parada').toUpperCase()}*\n`;
  texto += `📅 Fecha: ${obtenerFechaIsoColombia()}\n`;
  texto += `${icono} Cumplimiento SLA: *${resumen.tasaCumplimientoSlaPct}%*\n\n`;
  texto += `• Casos activos: *${resumen.activosCount}* (${resumen.slaVencidosCount} SLA vencidos · ${resumen.criticosAbiertosCount} críticos)\n`;
  texto += `• Casos resueltos: *${resumen.resueltosCount}* (Prom. ${resumen.tiempoPromedioResolucionMin} min)\n`;
  texto += `• Tasa de reclamos: *${resumen.tasaReclamosSobrePedidosPct}%* sobre pedidos\n`;
  texto += `• Compensaciones mes: *${formatCOP(resumen.costoCompensacionesMesCOP)}*\n`;
  texto += `• Resoluciones: ${resumen.reenviosGarantiaCount} reenvíos · ${resumen.bonosCortesiaEmitidosCount} bonos · ${resumen.devolucionesCajaCount} devoluciones caja\n`;

  if (resumen.topCausasRaiz.length > 0) {
    texto += `\n*Principales Causas Raíz:*\n`;
    resumen.topCausasRaiz.slice(0, 4).forEach((c, idx) => {
      texto += `${idx + 1}. ${c.label}: *${c.cantidad}* (${c.porcentaje}%)\n`;
    });
  }

  return encodeURIComponent(texto);
}

function escapeCsvSeguro(valor: unknown): string {
  const raw = valor === null || valor === undefined ? '' : String(valor);
  const sinSaltos = raw.replace(/\r?\n/g, ' ').trim();
  const neutralizado = /^[=+\-@\t\r]/.test(sinSaltos)
    ? `'${sinSaltos}`
    : sinSaltos;
  if (/[",]/.test(neutralizado)) {
    return `"${neutralizado.replace(/"/g, '""')}"`;
  }
  return neutralizado;
}

/**
 * Genera el CSV contable y operativo UTF-8 BOM de reclamos, PQRS y garantías.
 */
export function generarCsvReclamos(
  reclamosEvaluados: ReclamoEvaluado[],
  nombreNegocio: string = 'La Parada'
): string {
  const headers = [
    'Negocio',
    'Radicado',
    'Fecha',
    'Tipo PQRS',
    'Canal',
    'Causa Raiz',
    'Prioridad',
    'Estado',
    'Semaforo SLA',
    'SLA Objetivo (min)',
    'Tiempo Resolucion (min)',
    'Cliente',
    'Telefono',
    'Monto Pedido COP',
    'Tipo Resolucion',
    'Compensacion COP',
    'Referencia Bono/Caja/Reenvio',
    'Registrado Por',
    'Resuelto Por',
    'Descripcion',
    'Notas Resolucion',
  ];

  const filas = reclamosEvaluados.map((item) => {
    const r = item.reclamo;
    const refs = [
      r.bonoCortesiaCodigo ? `Bono:${r.bonoCortesiaCodigo}` : '',
      r.movimientoCajaCodigo ? `Caja:${r.movimientoCajaCodigo}` : '',
      r.reenvioDomicilioId ? `Reenvio:${r.reenvioDomicilioId}` : '',
    ]
      .filter(Boolean)
      .join(' | ');

    return [
      escapeCsvSeguro(nombreNegocio),
      escapeCsvSeguro(r.codigoRadicado),
      escapeCsvSeguro(r.fechaIso),
      escapeCsvSeguro(TIPO_PQRS_META[r.tipo]?.shortLabel || r.tipo),
      escapeCsvSeguro(CANAL_INCIDENTE_META[r.canal]?.shortLabel || r.canal),
      escapeCsvSeguro(CAUSA_RAIZ_META[r.causaRaiz]?.label || r.causaRaiz),
      escapeCsvSeguro(PRIORIDAD_RECLAMO_META[r.prioridad]?.label || r.prioridad),
      escapeCsvSeguro(ESTADO_RECLAMO_META[r.estado]?.label || r.estado),
      escapeCsvSeguro(SLA_RECLAMO_META[item.semaforoSla]?.label || item.semaforoSla),
      escapeCsvSeguro(r.slaObjetivoMin),
      escapeCsvSeguro(item.minutosTranscurridos),
      escapeCsvSeguro(r.clienteNombre),
      escapeCsvSeguro(r.clienteTelefono || ''),
      escapeCsvSeguro(r.montoPedidoCOP),
      escapeCsvSeguro(
        r.tipoResolucion
          ? TIPO_RESOLUCION_META[r.tipoResolucion]?.shortLabel || r.tipoResolucion
          : 'Pendiente'
      ),
      escapeCsvSeguro(r.montoCompensacionCOP ?? 0),
      escapeCsvSeguro(refs),
      escapeCsvSeguro(r.registradoPor),
      escapeCsvSeguro(r.resueltoPor || ''),
      escapeCsvSeguro(r.descripcion),
      escapeCsvSeguro(r.resolucionNotas || ''),
    ].join(',');
  });

  return `\uFEFF${[headers.map(escapeCsvSeguro).join(','), ...filas].join('\r\n')}`;
}

/**
 * Descarga en el navegador el archivo CSV UTF-8 BOM de reclamos y PQRS.
 */
export function descargarCsvReclamos(params: {
  reclamosEvaluados: ReclamoEvaluado[];
  nombreNegocio: string;
}): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const contenido = generarCsvReclamos(params.reclamosEvaluados, params.nombreNegocio);
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fechaHoy = obtenerFechaIsoColombia();
  const safeNegocio = (params.nombreNegocio || 'negocio')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  a.href = url;
  a.download = `reclamos_pqrs_${safeNegocio}_${fechaHoy}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
