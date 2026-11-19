import type {
  BonoPrepago,
  EstadoEfectivoBono,
  EvaluacionEstadoBono,
  EvaluacionRedencionBono,
  FilaAuditoriaBono,
  FiltrosBonos,
  MetricasBonos,
  MovimientoBono,
  TipoBonoPrepago,
  TipoMovimientoBono,
} from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { normalizarTelefono } from '@/utils/clienteUtils';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ALFABETO_BONO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const MONTOS_RAPIDOS_BONO_COP = [20000, 50000, 100000, 150000, 200000] as const;
export const VIGENCIAS_RAPIDAS_BONO_DIAS = [30, 60, 90, 180, 365] as const;

/**
 * Convierte cualquier valor de fecha (Timestamp de Firestore, Date, string o number) a Date válido.
 */
export function parseFechaBono(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) {
    return Number.isNaN(val.getTime()) ? null : val;
  }
  if (
    typeof val === 'object' &&
    val !== null &&
    'toDate' in val &&
    typeof (val as { toDate: () => Date }).toDate === 'function'
  ) {
    const parsed = (val as { toDate: () => Date }).toDate();
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (typeof val === 'string' || typeof val === 'number') {
    const parsed = new Date(val);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/**
 * Normaliza un monto monetario en COP a entero >= 0.
 */
export function sanitizarMontoBonoCOP(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) return 0;
  return Math.round(valor);
}

/**
 * Normaliza un código alfanumérico de bono (mayúsculas, sin espacios externos).
 */
export function normalizarCodigoBono(codigo: string): string {
  return codigo
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/[^A-Z0-9_-]/g, '');
}

/**
 * Construye el payload estándar codificado dentro del Código QR de un bono/tarjeta prepago.
 */
export function construirPayloadQrBono(codigo: string): string {
  return `LAPARADA:BONO:${normalizarCodigoBono(codigo)}`;
}

/**
 * Extrae el código canónico de un bono desde una lectura QR (`LAPARADA:BONO:...`),
 * un enlace (`?codigo=...`) o un ingreso manual.
 */
export function extraerCodigoDesdeQrOEntrada(entrada: string): string {
  const raw = entrada.trim();
  if (!raw) return '';

  const prefijoQr = /^LAPARADA:BONO:/i;
  if (prefijoQr.test(raw)) {
    return normalizarCodigoBono(raw.replace(prefijoQr, ''));
  }

  if (raw.includes('codigo=')) {
    try {
      const match = raw.match(/[?&]codigo=([^&#]+)/i);
      if (match?.[1]) {
        return normalizarCodigoBono(decodeURIComponent(match[1]));
      }
    } catch {
      // Fallback a normalización directa
    }
  }

  return normalizarCodigoBono(raw);
}

/**
 * Genera un código único legible para emisión de bonos/prepago/vales (sin caracteres ambiguos 0/O, 1/I).
 */
export function generarCodigoUnicoBono(
  tipo: TipoBonoPrepago,
  ahora: Date = new Date()
): string {
  const prefijo =
    tipo === 'bono_regalo' ? 'BON' : tipo === 'tarjeta_prepago' ? 'PRE' : 'VAL';
  const anio = ahora.getFullYear();
  let sufijo = '';
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * ALFABETO_BONO.length);
    sufijo += ALFABETO_BONO[idx];
  }
  return `${prefijo}-${anio}-${sufijo}`;
}

/**
 * Genera el código de comprobante del movimiento inmutable en `movimientos_bonos`.
 */
export function generarCodigoComprobanteBono(
  tipo: TipoMovimientoBono,
  ahora: Date = new Date()
): string {
  const prefijoMap: Record<TipoMovimientoBono, string> = {
    emision: 'EMI',
    recarga: 'REC',
    redencion: 'RED',
    ajuste_saldo: 'AJU',
    bloqueo: 'BLO',
    desbloqueo: 'DES',
    anulacion: 'ANU',
  };
  const prefijo = prefijoMap[tipo];
  const anio = ahora.getFullYear();
  let sufijo = '';
  for (let i = 0; i < 4; i++) {
    const idx = Math.floor(Math.random() * ALFABETO_BONO.length);
    sufijo += ALFABETO_BONO[idx];
  }
  return `${prefijo}-${anio}-${sufijo}`;
}

/**
 * Calcula la fecha de vencimiento (fin del día correspondiente) o `null` si no expira.
 */
export function calcularFechaVencimientoBono(
  fechaBase: Date,
  vigenciaDias: number | null | undefined
): Date | null {
  if (vigenciaDias === null || vigenciaDias === undefined) return null;
  if (!Number.isFinite(vigenciaDias) || vigenciaDias <= 0) return null;
  const dias = Math.min(3650, Math.round(vigenciaDias));
  const venc = new Date(fechaBase.getTime() + dias * MS_PER_DAY);
  venc.setHours(23, 59, 59, 999);
  return venc;
}

/**
 * Evalúa el estado efectivo, vigencia y capacidades operativas de un bono/tarjeta.
 */
export function evaluarEstadoBono(
  bono: Pick<
    BonoPrepago,
    'estado' | 'saldoActual' | 'totalCargadoHistorico' | 'totalRedimidoHistorico' | 'recargable' | 'fechaVencimiento' | 'motivoBloqueo'
  >,
  ahora: Date = new Date()
): EvaluacionEstadoBono {
  const saldo = sanitizarMontoBonoCOP(bono.saldoActual);
  const cargado = Math.max(saldo, sanitizarMontoBonoCOP(bono.totalCargadoHistorico));
  const redimido = sanitizarMontoBonoCOP(bono.totalRedimidoHistorico);
  const porcentajeConsumido =
    cargado > 0 ? Math.min(100, Math.round((redimido / cargado) * 100)) : 0;
  const porcentajeDisponible =
    cargado > 0 ? Math.min(100, Math.round((saldo / cargado) * 100)) : 0;

  const fechaVenc = parseFechaBono(bono.fechaVencimiento);
  let diasParaVencer: number | null = null;
  let diasVencido = 0;
  let estaVencido = false;

  if (fechaVenc) {
    const diffMs = fechaVenc.getTime() - ahora.getTime();
    if (diffMs < 0) {
      estaVencido = true;
      diasParaVencer = 0;
      diasVencido = Math.max(1, Math.ceil(Math.abs(diffMs) / MS_PER_DAY));
    } else {
      diasParaVencer = Math.ceil(diffMs / MS_PER_DAY);
    }
  }

  let estadoEfectivo: EstadoEfectivoBono = 'activo';
  let motivoInhabilitacion: string | undefined;

  if (bono.estado === 'anulado') {
    estadoEfectivo = 'anulado';
    motivoInhabilitacion = 'Este bono fue anulado y no admite redenciones ni recargas.';
  } else if (bono.estado === 'bloqueado') {
    estadoEfectivo = 'bloqueado';
    motivoInhabilitacion = bono.motivoBloqueo
      ? `Bono bloqueado: ${bono.motivoBloqueo}`
      : 'El bono se encuentra bloqueado preventivamente.';
  } else if (estaVencido) {
    estadoEfectivo = 'vencido';
    motivoInhabilitacion = `El bono venció hace ${diasVencido} día(s).`;
  } else if (saldo <= 0 || bono.estado === 'agotado') {
    estadoEfectivo = 'agotado';
    motivoInhabilitacion = 'El saldo del bono está agotado ($0).';
  } else if (diasParaVencer !== null && diasParaVencer <= 7) {
    estadoEfectivo = 'por_vencer';
  }

  const puedeRedimir =
    (estadoEfectivo === 'activo' || estadoEfectivo === 'por_vencer') && saldo > 0;
  const puedeRecargar =
    Boolean(bono.recargable) &&
    estadoEfectivo !== 'anulado' &&
    estadoEfectivo !== 'bloqueado';

  return {
    estadoEfectivo,
    estaVencido,
    diasParaVencer,
    diasVencido,
    fechaVencimiento: fechaVenc,
    porcentajeConsumido,
    porcentajeDisponible,
    puedeRedimir,
    puedeRecargar,
    motivoInhabilitacion,
  };
}

/**
 * Evalúa si un bono puede redimirse en una compra/cuenta de mesa y calcula excedente y saldo restante.
 */
export function evaluarRedencionBono(
  bono: Pick<
    BonoPrepago,
    'estado' | 'saldoActual' | 'totalCargadoHistorico' | 'totalRedimidoHistorico' | 'recargable' | 'fechaVencimiento' | 'motivoBloqueo'
  >,
  totalOrden: number,
  montoPersonalizado?: number,
  ahora: Date = new Date()
): EvaluacionRedencionBono {
  const evaluacion = evaluarEstadoBono(bono, ahora);
  const saldoDisponible = sanitizarMontoBonoCOP(bono.saldoActual);
  const totalSeguro = sanitizarMontoBonoCOP(totalOrden);

  if (!evaluacion.puedeRedimir) {
    return {
      valido: false,
      saldoDisponible,
      montoAplicable: 0,
      saldoRestanteBono: saldoDisponible,
      excedentePorPagar: totalSeguro,
      cubreTotal: false,
      motivoRechazo: evaluacion.motivoInhabilitacion || 'El bono no se encuentra disponible para redención.',
    };
  }

  if (totalSeguro <= 0) {
    return {
      valido: false,
      saldoDisponible,
      montoAplicable: 0,
      saldoRestanteBono: saldoDisponible,
      excedentePorPagar: 0,
      cubreTotal: false,
      motivoRechazo: 'El total del pedido debe ser mayor a $0 para redimir un bono.',
    };
  }

  const maximoAplicable = Math.min(saldoDisponible, totalSeguro);
  let montoAplicable = maximoAplicable;

  if (montoPersonalizado !== undefined) {
    const personalizado = sanitizarMontoBonoCOP(montoPersonalizado);
    if (personalizado <= 0) {
      return {
        valido: false,
        saldoDisponible,
        montoAplicable: 0,
        saldoRestanteBono: saldoDisponible,
        excedentePorPagar: totalSeguro,
        cubreTotal: false,
        motivoRechazo: 'El monto a redimir debe ser mayor a $0.',
      };
    }
    if (personalizado > saldoDisponible) {
      return {
        valido: false,
        saldoDisponible,
        montoAplicable: 0,
        saldoRestanteBono: saldoDisponible,
        excedentePorPagar: totalSeguro,
        cubreTotal: false,
        motivoRechazo: `El monto (${formatCOP(personalizado)}) supera el saldo del bono (${formatCOP(saldoDisponible)}).`,
      };
    }
    if (personalizado > totalSeguro) {
      return {
        valido: false,
        saldoDisponible,
        montoAplicable: 0,
        saldoRestanteBono: saldoDisponible,
        excedentePorPagar: totalSeguro,
        cubreTotal: false,
        motivoRechazo: `El monto a redimir (${formatCOP(personalizado)}) no puede superar el total de la venta (${formatCOP(totalSeguro)}).`,
      };
    }
    montoAplicable = personalizado;
  }

  const saldoRestanteBono = Math.max(0, saldoDisponible - montoAplicable);
  const excedentePorPagar = Math.max(0, totalSeguro - montoAplicable);

  return {
    valido: true,
    saldoDisponible,
    montoAplicable,
    saldoRestanteBono,
    excedentePorPagar,
    cubreTotal: excedentePorPagar === 0,
  };
}

/**
 * Retorna etiqueta legible y clases visuales para cada estado efectivo del bono.
 */
export function getBadgeEstadoBono(estado: EstadoEfectivoBono): {
  label: string;
  badgeCls: string;
} {
  switch (estado) {
    case 'activo':
      return {
        label: 'Activo',
        badgeCls: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
      };
    case 'por_vencer':
      return {
        label: 'Por Vencer',
        badgeCls: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
      };
    case 'agotado':
      return {
        label: 'Saldo Agotado',
        badgeCls: 'border-neutral-600/50 bg-neutral-800 text-neutral-300',
      };
    case 'vencido':
      return {
        label: 'Vencido',
        badgeCls: 'border-red-500/40 bg-red-500/15 text-red-300',
      };
    case 'bloqueado':
      return {
        label: 'Bloqueado',
        badgeCls: 'border-rose-500/40 bg-rose-950/60 text-rose-300',
      };
    case 'anulado':
      return {
        label: 'Anulado',
        badgeCls: 'border-red-700/50 bg-red-950/70 text-red-400',
      };
  }
}

/**
 * Etiqueta legible para la modalidad de bono/tarjeta/vale.
 */
export function getEtiquetaTipoBono(tipo: TipoBonoPrepago): string {
  switch (tipo) {
    case 'bono_regalo':
      return 'Bono de Regalo';
    case 'tarjeta_prepago':
      return 'Tarjeta Prepago';
    case 'vale_consumo':
      return 'Vale de Consumo';
  }
}

/**
 * Calcula métricas consolidadas y auditoría de saldos para el panel `/bonos`.
 */
export function calcularMetricasBonos(
  bonos: BonoPrepago[],
  movimientos: MovimientoBono[],
  ahora: Date = new Date()
): MetricasBonos {
  let bonosActivosConSaldo = 0;
  let bonosPorVencer = 0;
  let bonosVencidosConSaldo = 0;
  let bonosAgotados = 0;
  let bonosBloqueadosOAnulados = 0;
  let saldoCirculanteActivo = 0;
  let saldoVencidoNoRedimido = 0;
  let saldoBloqueadoOAnulado = 0;
  let totalCargadoHistorico = 0;
  let totalRedimidoHistorico = 0;

  for (const bono of bonos) {
    const saldo = sanitizarMontoBonoCOP(bono.saldoActual);
    totalCargadoHistorico += sanitizarMontoBonoCOP(bono.totalCargadoHistorico);
    totalRedimidoHistorico += sanitizarMontoBonoCOP(bono.totalRedimidoHistorico);

    const evalEstado = evaluarEstadoBono(bono, ahora);
    if (evalEstado.estadoEfectivo === 'por_vencer') {
      bonosPorVencer += 1;
      bonosActivosConSaldo += 1;
      saldoCirculanteActivo += saldo;
    } else if (evalEstado.estadoEfectivo === 'activo') {
      bonosActivosConSaldo += 1;
      saldoCirculanteActivo += saldo;
    } else if (evalEstado.estadoEfectivo === 'vencido') {
      if (saldo > 0) {
        bonosVencidosConSaldo += 1;
        saldoVencidoNoRedimido += saldo;
      }
    } else if (evalEstado.estadoEfectivo === 'agotado') {
      bonosAgotados += 1;
    } else {
      bonosBloqueadosOAnulados += 1;
      saldoBloqueadoOAnulado += saldo;
    }
  }

  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();
  let recaudadoMesEfectivo = 0;
  let recaudadoMesTransferencia = 0;
  let redimidoMesTotal = 0;

  for (const mov of movimientos) {
    const fechaMov = parseFechaBono(mov.fecha);
    if (!fechaMov || fechaMov.getTime() < inicioMes) continue;
    const monto = sanitizarMontoBonoCOP(mov.monto);
    if (mov.tipo === 'emision' || mov.tipo === 'recarga') {
      if (mov.metodoPago === 'transferencia') {
        recaudadoMesTransferencia += monto;
      } else {
        recaudadoMesEfectivo += monto;
      }
    } else if (mov.tipo === 'redencion') {
      redimidoMesTotal += monto;
    }
  }

  const tasaRedencionPorcentaje =
    totalCargadoHistorico > 0
      ? Math.min(100, Math.round((totalRedimidoHistorico / totalCargadoHistorico) * 100))
      : 0;

  return {
    totalBonosEmitidos: bonos.length,
    bonosActivosConSaldo,
    bonosPorVencer,
    bonosVencidosConSaldo,
    bonosAgotados,
    bonosBloqueadosOAnulados,
    saldoCirculanteActivo,
    saldoVencidoNoRedimido,
    saldoBloqueadoOAnulado,
    totalCargadoHistorico,
    totalRedimidoHistorico,
    recaudadoMesTotal: recaudadoMesEfectivo + recaudadoMesTransferencia,
    recaudadoMesEfectivo,
    recaudadoMesTransferencia,
    redimidoMesTotal,
    tasaRedencionPorcentaje,
  };
}

/**
 * Construye las filas ordenadas de auditoría priorizando bonos por vencer y activos con saldo.
 */
export function construirFilasAuditoriaBonos(
  bonos: BonoPrepago[],
  ahora: Date = new Date()
): FilaAuditoriaBono[] {
  const prioridad: Record<EstadoEfectivoBono, number> = {
    por_vencer: 5,
    activo: 4,
    vencido: 3,
    bloqueado: 2,
    agotado: 1,
    anulado: 0,
  };

  return bonos
    .map((bono) => ({
      bono,
      evaluacion: evaluarEstadoBono(bono, ahora),
    }))
    .sort((a, b) => {
      const pDiff =
        prioridad[b.evaluacion.estadoEfectivo] - prioridad[a.evaluacion.estadoEfectivo];
      if (pDiff !== 0) return pDiff;
      return b.bono.saldoActual - a.bono.saldoActual;
    });
}

/**
 * Filtra las filas de bonos por búsqueda textual, modalidad y estado efectivo.
 */
export function filtrarFilasBonos(
  filas: FilaAuditoriaBono[],
  filtros: FiltrosBonos
): FilaAuditoriaBono[] {
  const term = filtros.busqueda.trim().toLowerCase();

  return filas.filter(({ bono, evaluacion }) => {
    if (filtros.tipo !== 'todos' && bono.tipo !== filtros.tipo) {
      return false;
    }

    if (filtros.estado === 'con_saldo') {
      if (bono.saldoActual <= 0) return false;
    } else if (filtros.estado !== 'todos' && evaluacion.estadoEfectivo !== filtros.estado) {
      return false;
    }

    if (!term) return true;
    const haystack = [
      bono.codigo,
      bono.titularNombre,
      bono.titularTelefono || '',
      bono.compradorNombre || '',
      bono.mensajeRegalo || '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(term);
  });
}

function formatearFechaCortaBono(fecha: Date | null): string {
  if (!fecha) return 'Sin vencimiento';
  return fecha.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Mensaje formal por WhatsApp al emitir o compartir un bono digital (100% offline).
 */
export function generarMensajeBonoWhatsApp(
  bono: BonoPrepago,
  negocioNombre: string
): string {
  const fechaVenc = parseFechaBono(bono.fechaVencimiento);
  const vigenciaTexto = fechaVenc ? formatearFechaCortaBono(fechaVenc) : 'Sin fecha de vencimiento';

  return [
    `🎁 *${getEtiquetaTipoBono(bono.tipo).toUpperCase()} — ${negocioNombre || 'La Parada'}*`,
    '',
    `Hola *${bono.titularNombre}* 👋`,
    bono.compradorNombre
      ? `¡*${bono.compradorNombre}* te obsequió saldo para disfrutar en *${negocioNombre || 'La Parada'}*!`
      : `Tienes disponible tu instrumento de consumo en *${negocioNombre || 'La Parada'}*.`,
    bono.mensajeRegalo ? `💌 _"${bono.mensajeRegalo}"_` : null,
    '',
    `🔑 *Código Único:* ${bono.codigo}`,
    `💰 *Saldo Disponible:* ${formatCOP(bono.saldoActual)} COP`,
    `📅 *Vigencia:* ${vigenciaTexto}`,
    bono.recargable ? '🔄 *Modalidad:* Tarjeta recargable en efectivo o transferencia en caja' : null,
    '',
    'Presenta este código o su QR en caja o mesa para redimir parcial o totalmente tu saldo. ¡Te esperamos!',
  ]
    .filter((l): l is string => l !== null)
    .join('\n');
}

/**
 * Mensaje de confirmación de recarga offline por WhatsApp.
 */
export function generarMensajeRecargaBonoWhatsApp(
  bono: BonoPrepago,
  movimiento: MovimientoBono,
  negocioNombre: string
): string {
  const metodo = movimiento.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo';
  return [
    `Hola ${bono.titularNombre} 👋`,
    `Confirmamos la recarga de tu *${getEtiquetaTipoBono(bono.tipo)}* en *${negocioNombre || 'La Parada'}*:`,
    '',
    `🔑 Bono: *${bono.codigo}*`,
    `🧾 Comprobante: *${movimiento.codigoComprobante}*`,
    `💵 Monto recargado: *+${formatCOP(movimiento.monto)}* (${metodo})`,
    movimiento.referenciaTransferencia ? `🔖 Referencia: ${movimiento.referenciaTransferencia}` : null,
    `✅ *Nuevo saldo disponible: ${formatCOP(movimiento.saldoResultante)} COP*`,
    '',
    '¡Gracias por preferirnos!',
  ]
    .filter((l): l is string => l !== null)
    .join('\n');
}

/**
 * Mensaje de notificación de consumo/redención de bono por WhatsApp.
 */
export function generarMensajeRedencionBonoWhatsApp(
  bono: BonoPrepago,
  movimiento: MovimientoBono,
  negocioNombre: string
): string {
  return [
    `Hola ${bono.titularNombre} 👋`,
    `Registramos una redención en tu *${getEtiquetaTipoBono(bono.tipo)}* en *${negocioNombre || 'La Parada'}*:`,
    '',
    `🔑 Bono: *${bono.codigo}*`,
    `🧾 Comprobante: *${movimiento.codigoComprobante}*`,
    `🍽️ Valor redimido: *-${formatCOP(movimiento.monto)} COP*`,
    `💰 *Saldo restante en bono: ${formatCOP(movimiento.saldoResultante)} COP*`,
    '',
    '¡Gracias por visitarnos!',
  ].join('\n');
}

/**
 * Construye URL segura `wa.me` con prefijo Colombia (+57) si el teléfono tiene 10 dígitos.
 */
export function generarUrlWhatsAppBono(telefono: string | undefined, mensaje: string): string {
  const limpio = normalizarTelefono(telefono || '').replace(/\D/g, '');
  const conPais = limpio.length === 10 ? `57${limpio}` : limpio;
  const encoded = encodeURIComponent(mensaje);
  return conPais ? `https://wa.me/${conPais}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

/**
 * Sanitiza celdas CSV contra inyección de fórmulas en Excel (`=`, `+`, `-`, `@`, tab, CR).
 */
export function escaparCeldaCsvBono(valor: string | number | undefined | null): string {
  const str = valor === undefined || valor === null ? '' : String(valor);
  const protegido = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (/[",\n\r;]/.test(protegido)) {
    return `"${protegido.replace(/"/g, '""')}"`;
  }
  return protegido;
}

/**
 * Exporta la auditoría de saldos y vigencias de bonos en CSV con UTF-8 BOM.
 */
export function generarCsvAuditoriaBonos(filas: FilaAuditoriaBono[]): string {
  const encabezados = [
    'Codigo',
    'Modalidad',
    'Titular',
    'Telefono',
    'Estado',
    'Monto_Inicial_COP',
    'Total_Cargado_COP',
    'Total_Redimido_COP',
    'Saldo_Actual_COP',
    'Recargable',
    'Metodo_Emision',
    'Fecha_Emision',
    'Fecha_Vencimiento',
  ];

  const lineas = filas.map(({ bono, evaluacion }) => {
    const fEmision = parseFechaBono(bono.fechaEmision)?.toISOString().slice(0, 10) || '';
    const fVenc = evaluacion.fechaVencimiento
      ? evaluacion.fechaVencimiento.toISOString().slice(0, 10)
      : 'Sin vencimiento';

    return [
      bono.codigo,
      getEtiquetaTipoBono(bono.tipo),
      bono.titularNombre,
      bono.titularTelefono || '',
      getBadgeEstadoBono(evaluacion.estadoEfectivo).label,
      bono.montoInicial,
      bono.totalCargadoHistorico,
      bono.totalRedimidoHistorico,
      bono.saldoActual,
      bono.recargable ? 'Si' : 'No',
      bono.metodoPagoEmision,
      fEmision,
      fVenc,
    ]
      .map(escaparCeldaCsvBono)
      .join(',');
  });

  return `\uFEFF${[encabezados.join(','), ...lineas].join('\n')}`;
}

/**
 * Exporta el libro completo de movimientos de bonos en CSV con UTF-8 BOM.
 */
export function generarCsvMovimientosBonos(movimientos: MovimientoBono[]): string {
  const encabezados = [
    'Fecha',
    'Comprobante',
    'Codigo_Bono',
    'Titular',
    'Tipo_Movimiento',
    'Origen_o_Metodo',
    'Monto_COP',
    'Saldo_Previo_COP',
    'Saldo_Resultante_COP',
    'Referencia',
    'Notas',
    'Responsable',
  ];

  const lineas = movimientos.map((mov) => {
    const fechaStr =
      parseFechaBono(mov.fecha)?.toISOString().slice(0, 16).replace('T', ' ') || '';
    const canal =
      mov.metodoPago
        ? mov.metodoPago === 'transferencia'
          ? 'Transferencia'
          : 'Efectivo'
        : mov.mesaNombre
          ? `Mesa ${mov.mesaNombre}`
          : mov.origen || 'Sistema';

    return [
      fechaStr,
      mov.codigoComprobante,
      mov.bonoCodigo,
      mov.titularNombre,
      mov.tipo,
      canal,
      mov.monto,
      mov.saldoPrevio,
      mov.saldoResultante,
      mov.referenciaTransferencia || '',
      mov.notas || '',
      mov.responsableNombre || '',
    ]
      .map(escaparCeldaCsvBono)
      .join(',');
  });

  return `\uFEFF${[encabezados.join(','), ...lineas].join('\n')}`;
}
