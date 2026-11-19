import type {
  BucketMoraCartera,
  CuentaCorriente,
  EstadoCarteraCliente,
  EvaluacionCupoResultado,
  EvaluacionEstadoCartera,
  FilaCarteraVencida,
  FiltrosCartera,
  MetricasCartera,
  MovimientoCartera,
  TipoMovimientoCartera,
} from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { normalizarTelefono } from '@/utils/clienteUtils';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Convierte cualquier valor de fecha (Timestamp de Firestore, Date, string o number) a Date válido.
 */
export function parseFechaCartera(val: unknown): Date | null {
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
export function sanitizarMontoCOP(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) return 0;
  return Math.round(valor);
}

/**
 * Genera código legible de comprobante de cartera (ej: "FIA-2026-A3F9" o "ABN-2026-K2P1").
 */
export function generarCodigoMovimientoCartera(
  tipo: TipoMovimientoCartera,
  ahora: Date = new Date()
): string {
  const prefijo =
    tipo === 'consumo_credito'
      ? 'FIA'
      : tipo === 'abono'
        ? 'ABN'
        : tipo === 'ajuste_cargo'
          ? 'AJC'
          : 'AJA';
  const anio = ahora.getFullYear();
  const sufijo = Math.random().toString(36).slice(2, 6).toUpperCase().padEnd(4, '0');
  return `${prefijo}-${anio}-${sufijo}`;
}

/**
 * Calcula la fecha de vencimiento a partir de una fecha base y los días de plazo configurados.
 */
export function calcularFechaVencimiento(fechaBase: Date, plazoDias: number): Date {
  const dias = Number.isFinite(plazoDias) && plazoDias >= 1 ? Math.round(plazoDias) : 15;
  return new Date(fechaBase.getTime() + dias * MS_PER_DAY);
}

/**
 * Evalúa preventivamente si un cliente puede recibir un consumo a crédito (fiado controlado)
 * sin superar su cupo autorizado ni estar bloqueado.
 */
export function evaluarDisponibilidadCupo(
  cuenta: Pick<CuentaCorriente, 'cupoCredito' | 'saldoActual' | 'estado' | 'bloqueoMotivo'>,
  montoSolicitado: number
): EvaluacionCupoResultado {
  const cupoCredito = sanitizarMontoCOP(cuenta.cupoCredito);
  const saldoActual = sanitizarMontoCOP(cuenta.saldoActual);
  const monto = sanitizarMontoCOP(montoSolicitado);
  const cupoDisponible = Math.max(0, cupoCredito - saldoActual);
  const saldoProyectado = saldoActual + monto;
  const porcentajeUsoActual =
    cupoCredito > 0 ? Math.min(999, Math.round((saldoActual / cupoCredito) * 100)) : 0;
  const porcentajeUsoProyectado =
    cupoCredito > 0 ? Math.min(999, Math.round((saldoProyectado / cupoCredito) * 100)) : 0;
  const excedente = Math.max(0, saldoProyectado - cupoCredito);

  if (cuenta.estado === 'bloqueada') {
    return {
      puedeFiarse: false,
      cupoCredito,
      saldoActual,
      cupoDisponible,
      saldoProyectado,
      porcentajeUsoActual,
      porcentajeUsoProyectado,
      excedente,
      motivoRechazo: cuenta.bloqueoMotivo
        ? `Cuenta bloqueada: ${cuenta.bloqueoMotivo}`
        : 'La cuenta corriente del cliente se encuentra bloqueada.',
    };
  }

  if (cupoCredito <= 0) {
    return {
      puedeFiarse: false,
      cupoCredito,
      saldoActual,
      cupoDisponible: 0,
      saldoProyectado,
      porcentajeUsoActual: 0,
      porcentajeUsoProyectado: 0,
      excedente: monto,
      motivoRechazo: 'El cliente no tiene cupo de crédito asignado.',
    };
  }

  if (monto <= 0) {
    return {
      puedeFiarse: false,
      cupoCredito,
      saldoActual,
      cupoDisponible,
      saldoProyectado: saldoActual,
      porcentajeUsoActual,
      porcentajeUsoProyectado: porcentajeUsoActual,
      excedente: 0,
      motivoRechazo: 'El monto del consumo debe ser mayor a $0.',
    };
  }

  if (monto > cupoDisponible) {
    return {
      puedeFiarse: false,
      cupoCredito,
      saldoActual,
      cupoDisponible,
      saldoProyectado,
      porcentajeUsoActual,
      porcentajeUsoProyectado,
      excedente,
      motivoRechazo: `Cupo insuficiente: disponible ${formatCOP(cupoDisponible)}, faltan ${formatCOP(excedente)}.`,
    };
  }

  return {
    puedeFiarse: true,
    cupoCredito,
    saldoActual,
    cupoDisponible,
    saldoProyectado,
    porcentajeUsoActual,
    porcentajeUsoProyectado,
    excedente: 0,
  };
}

/**
 * Clasifica los días de mora en buckets de antigüedad estándar de cartera.
 */
export function clasificarBucketMora(diasMora: number): BucketMoraCartera {
  if (diasMora <= 0) return 'al_dia';
  if (diasMora <= 7) return '1_7_dias';
  if (diasMora <= 15) return '8_15_dias';
  if (diasMora <= 30) return '16_30_dias';
  return 'mas_30_dias';
}

/**
 * Etiqueta legible para cada bucket de mora.
 */
export function getEtiquetaBucketMora(bucket: BucketMoraCartera): string {
  switch (bucket) {
    case 'al_dia':
      return 'Al día';
    case '1_7_dias':
      return '1 a 7 días vencida';
    case '8_15_dias':
      return '8 a 15 días vencida';
    case '16_30_dias':
      return '16 a 30 días vencida';
    case 'mas_30_dias':
      return 'Más de 30 días vencida';
  }
}

/**
 * Evalúa el estado de mora, vencimiento y uso de cupo de una cuenta corriente.
 */
export function evaluarEstadoCartera(
  cuenta: CuentaCorriente,
  movimientosCuenta: MovimientoCartera[] = [],
  ahora: Date = new Date()
): EvaluacionEstadoCartera {
  const cupo = sanitizarMontoCOP(cuenta.cupoCredito);
  const saldo = sanitizarMontoCOP(cuenta.saldoActual);
  const cupoDisponible = Math.max(0, cupo - saldo);
  const porcentajeUso = cupo > 0 ? Math.min(999, Math.round((saldo / cupo) * 100)) : 0;

  if (saldo <= 0) {
    return {
      estadoCartera: cuenta.estado === 'bloqueada' ? 'bloqueada' : 'sin_deuda',
      diasParaVencer: null,
      diasMora: 0,
      bucketMora: 'al_dia',
      fechaVencimientoReferencia: null,
      cupoDisponible,
      porcentajeUso: 0,
    };
  }

  // Determinar fecha de vencimiento de referencia:
  // 1) fechaVencimientoMasAntiguo almacenada en cuenta
  // 2) consumo más reciente con fechaVencimiento en movimientos
  // 3) ultimoConsumoEn + plazoDias
  let fechaVencRef = parseFechaCartera(cuenta.fechaVencimientoMasAntiguo);

  if (!fechaVencRef && movimientosCuenta.length > 0) {
    const consumos = movimientosCuenta
      .filter((m) => m.tipo === 'consumo_credito' || m.tipo === 'ajuste_cargo')
      .map((m) => parseFechaCartera(m.fechaVencimiento))
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());
    if (consumos.length > 0) {
      fechaVencRef = consumos[0];
    }
  }

  if (!fechaVencRef) {
    const ultimoConsumo = parseFechaCartera(cuenta.ultimoConsumoEn) || parseFechaCartera(cuenta.actualizadoEn);
    if (ultimoConsumo) {
      fechaVencRef = calcularFechaVencimiento(ultimoConsumo, cuenta.plazoDias || 15);
    }
  }

  if (!fechaVencRef) {
    return {
      estadoCartera: cuenta.estado === 'bloqueada' ? 'bloqueada' : 'al_dia',
      diasParaVencer: null,
      diasMora: 0,
      bucketMora: 'al_dia',
      fechaVencimientoReferencia: null,
      cupoDisponible,
      porcentajeUso,
    };
  }

  const diffMs = fechaVencRef.getTime() - ahora.getTime();
  const diasDiff = Math.ceil(diffMs / MS_PER_DAY);
  const diasMora = diasDiff < 0 ? Math.abs(diasDiff) : 0;
  const diasParaVencer = diasDiff >= 0 ? diasDiff : 0;
  const bucketMora = clasificarBucketMora(diasMora);

  let estadoCartera: EstadoCarteraCliente = 'al_dia';
  if (cuenta.estado === 'bloqueada') {
    estadoCartera = 'bloqueada';
  } else if (diasMora > 0) {
    estadoCartera = 'vencida';
  } else if (diasParaVencer <= 3) {
    estadoCartera = 'por_vencer';
  }

  return {
    estadoCartera,
    diasParaVencer,
    diasMora,
    bucketMora,
    fechaVencimientoReferencia: fechaVencRef,
    cupoDisponible,
    porcentajeUso,
  };
}

/**
 * Retorna clases visuales y etiqueta semántica según estado de cartera.
 */
export function getBadgeEstadoCartera(estado: EstadoCarteraCliente): {
  label: string;
  badgeCls: string;
} {
  switch (estado) {
    case 'vencida':
      return {
        label: 'Cartera Vencida',
        badgeCls: 'border-red-500/40 bg-red-500/15 text-red-300',
      };
    case 'por_vencer':
      return {
        label: 'Por Vencer',
        badgeCls: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
      };
    case 'al_dia':
      return {
        label: 'Al Día',
        badgeCls: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
      };
    case 'sin_deuda':
      return {
        label: 'Sin Deuda',
        badgeCls: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
      };
    case 'bloqueada':
      return {
        label: 'Cupo Bloqueado',
        badgeCls: 'border-rose-500/40 bg-rose-950/50 text-rose-300',
      };
  }
}

/**
 * Calcula las métricas ejecutivas de la cartera por cobrar del negocio.
 */
export function calcularMetricasCartera(
  cuentas: CuentaCorriente[],
  movimientos: MovimientoCartera[],
  ahora: Date = new Date()
): MetricasCartera {
  let totalCarteraPorCobrar = 0;
  let totalCarteraVencida = 0;
  let totalCarteraPorVencer = 0;
  let totalCarteraAlDia = 0;
  let cupoTotalAsignado = 0;
  let clientesConSaldo = 0;
  let clientesEnMora = 0;
  let clientesBloqueados = 0;

  const movimientosPorCuenta = new Map<string, MovimientoCartera[]>();
  for (const mov of movimientos) {
    const arr = movimientosPorCuenta.get(mov.cuentaCorrienteId) || [];
    arr.push(mov);
    movimientosPorCuenta.set(mov.cuentaCorrienteId, arr);
  }

  for (const cuenta of cuentas) {
    const cupo = sanitizarMontoCOP(cuenta.cupoCredito);
    const saldo = sanitizarMontoCOP(cuenta.saldoActual);
    cupoTotalAsignado += cupo;
    totalCarteraPorCobrar += saldo;

    if (cuenta.estado === 'bloqueada') {
      clientesBloqueados += 1;
    }

    if (saldo > 0) {
      clientesConSaldo += 1;
      const evalCuenta = evaluarEstadoCartera(
        cuenta,
        movimientosPorCuenta.get(cuenta.id) || [],
        ahora
      );
      if (evalCuenta.diasMora > 0) {
        totalCarteraVencida += saldo;
        clientesEnMora += 1;
      } else if (evalCuenta.estadoCartera === 'por_vencer') {
        totalCarteraPorVencer += saldo;
      } else {
        totalCarteraAlDia += saldo;
      }
    }
  }

  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();
  let recaudadoMesEfectivo = 0;
  let recaudadoMesTransferencia = 0;
  let consumosMesTotal = 0;

  for (const mov of movimientos) {
    const fechaMov = parseFechaCartera(mov.fecha);
    if (!fechaMov || fechaMov.getTime() < inicioMes) continue;
    const monto = sanitizarMontoCOP(mov.monto);
    if (mov.tipo === 'abono') {
      if (mov.metodoPago === 'transferencia') {
        recaudadoMesTransferencia += monto;
      } else {
        recaudadoMesEfectivo += monto;
      }
    } else if (mov.tipo === 'consumo_credito') {
      consumosMesTotal += monto;
    }
  }

  const cupoTotalDisponible = Math.max(0, cupoTotalAsignado - totalCarteraPorCobrar);
  const porcentajeUtilizacionGlobal =
    cupoTotalAsignado > 0
      ? Math.min(999, Math.round((totalCarteraPorCobrar / cupoTotalAsignado) * 100))
      : 0;

  return {
    totalCarteraPorCobrar,
    totalCarteraVencida,
    totalCarteraPorVencer,
    totalCarteraAlDia,
    cupoTotalAsignado,
    cupoTotalDisponible,
    porcentajeUtilizacionGlobal,
    clientesConCuenta: cuentas.length,
    clientesConSaldo,
    clientesEnMora,
    clientesBloqueados,
    recaudadoMesTotal: recaudadoMesEfectivo + recaudadoMesTransferencia,
    recaudadoMesEfectivo,
    recaudadoMesTransferencia,
    consumosMesTotal,
  };
}

/**
 * Construye el reporte ordenado de cuentas con evaluación de cartera (priorizando mora y mayor saldo).
 */
export function construirFilasCartera(
  cuentas: CuentaCorriente[],
  movimientos: MovimientoCartera[],
  ahora: Date = new Date()
): FilaCarteraVencida[] {
  const movimientosPorCuenta = new Map<string, MovimientoCartera[]>();
  for (const mov of movimientos) {
    const arr = movimientosPorCuenta.get(mov.cuentaCorrienteId) || [];
    arr.push(mov);
    movimientosPorCuenta.set(mov.cuentaCorrienteId, arr);
  }

  return cuentas
    .map((cuenta) => ({
      cuenta,
      evaluacion: evaluarEstadoCartera(cuenta, movimientosPorCuenta.get(cuenta.id) || [], ahora),
    }))
    .sort((a, b) => {
      if (b.evaluacion.diasMora !== a.evaluacion.diasMora) {
        return b.evaluacion.diasMora - a.evaluacion.diasMora;
      }
      return b.cuenta.saldoActual - a.cuenta.saldoActual;
    });
}

/**
 * Filtra las filas de cartera por texto (nombre, teléfono, empresa, NIT) y estado.
 */
export function filtrarFilasCartera(
  filas: FilaCarteraVencida[],
  filtros: FiltrosCartera
): FilaCarteraVencida[] {
  const termino = filtros.busqueda.trim().toLowerCase();

  return filas.filter(({ cuenta, evaluacion }) => {
    if (filtros.estado === 'con_saldo' && cuenta.saldoActual <= 0) {
      return false;
    } else if (
      filtros.estado !== 'todas' &&
      filtros.estado !== 'con_saldo' &&
      evaluacion.estadoCartera !== filtros.estado
    ) {
      return false;
    }

    if (!termino) return true;
    const haystack = [
      cuenta.clienteNombre,
      cuenta.clienteTelefono,
      cuenta.empresa || '',
      cuenta.nit || '',
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(termino);
  });
}

function formatearFechaCorta(fecha: Date | null): string {
  if (!fecha) return 'Sin vencimiento';
  return fecha.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Genera el mensaje formal de Estado de Cuenta para enviar al cliente por WhatsApp (100% offline).
 */
export function generarMensajeEstadoCuentaWhatsApp(
  cuenta: CuentaCorriente,
  movimientosCuenta: MovimientoCartera[],
  negocioNombre: string,
  ahora: Date = new Date()
): string {
  const evaluacion = evaluarEstadoCartera(cuenta, movimientosCuenta, ahora);
  const ultimos = [...movimientosCuenta]
    .sort((a, b) => {
      const fa = parseFechaCartera(a.fecha)?.getTime() || 0;
      const fb = parseFechaCartera(b.fecha)?.getTime() || 0;
      return fb - fa;
    })
    .slice(0, 6);

  const lineasMovs =
    ultimos.length > 0
      ? ultimos
          .map((m) => {
            const fechaStr = formatearFechaCorta(parseFechaCartera(m.fecha));
            const signo = m.tipo === 'abono' || m.tipo === 'ajuste_abono' ? '-' : '+';
            const tipoLabel =
              m.tipo === 'abono'
                ? `Abono (${m.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo'})`
                : m.tipo === 'consumo_credito'
                  ? `Consumo${m.mesaNombre ? ` · ${m.mesaNombre}` : ''}`
                  : 'Ajuste';
            return `• ${fechaStr} | ${tipoLabel}: ${signo}${formatCOP(m.monto)} (${m.codigoComprobante})`;
          })
          .join('\n')
      : '• Sin movimientos recientes registrados.';

  const lineaEstado =
    evaluacion.diasMora > 0
      ? `⚠️ Estado: Cartera vencida (${evaluacion.diasMora} día(s) de mora)`
      : cuenta.saldoActual > 0
        ? `📅 Vencimiento estimado: ${formatearFechaCorta(evaluacion.fechaVencimientoReferencia)}`
        : '✅ Estado: Cuenta al día sin saldo pendiente';

  return [
    `Hola ${cuenta.clienteNombre}${cuenta.empresa ? ` (${cuenta.empresa})` : ''} 👋`,
    `Te compartimos tu *Estado de Cuenta* en *${negocioNombre || 'La Parada'}*:`,
    '',
    `💳 Cupo autorizado: ${formatCOP(cuenta.cupoCredito)}`,
    `🧾 *Saldo pendiente: ${formatCOP(cuenta.saldoActual)}*`,
    `✅ Cupo disponible: ${formatCOP(evaluacion.cupoDisponible)}`,
    lineaEstado,
    '',
    '*Últimos movimientos:*',
    lineasMovs,
    '',
    'Puedes realizar tu abono en *efectivo* directamente en el local o por *transferencia* enviándonos el comprobante por este medio. ¡Muchas gracias!',
  ].join('\n');
}

/**
 * Genera un recordatorio cordial de cobro por WhatsApp para cartera por vencer o vencida.
 */
export function generarMensajeRecordatorioCobroWhatsApp(
  cuenta: CuentaCorriente,
  evaluacion: EvaluacionEstadoCartera,
  negocioNombre: string
): string {
  const saludo = `Hola ${cuenta.clienteNombre}${cuenta.empresa ? ` (${cuenta.empresa})` : ''} 👋`;
  const detalleMora =
    evaluacion.diasMora > 0
      ? `presenta un saldo vencido hace *${evaluacion.diasMora} día(s)* (fecha límite ${formatearFechaCorta(evaluacion.fechaVencimientoReferencia)}).`
      : `tiene un saldo próximo a vencer el *${formatearFechaCorta(evaluacion.fechaVencimientoReferencia)}*.`;

  return [
    saludo,
    `Te escribimos de *${negocioNombre || 'La Parada'}* para recordarte amablemente que tu cuenta corriente ${detalleMora}`,
    '',
    `🧾 *Saldo por pagar: ${formatCOP(cuenta.saldoActual)}*`,
    `💳 Cupo asignado: ${formatCOP(cuenta.cupoCredito)}`,
    '',
    'Puedes cancelar total o parcialmente en *efectivo* en caja o por *transferencia* compartiéndonos el comprobante aquí mismo. ¡Quedamos atentos!',
  ].join('\n');
}

/**
 * Genera el mensaje de recibo de abono confirmado para enviar por WhatsApp.
 */
export function generarMensajeReciboAbonoWhatsApp(
  cuenta: CuentaCorriente,
  movimiento: MovimientoCartera,
  negocioNombre: string
): string {
  const metodo = movimiento.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo';
  return [
    `Hola ${cuenta.clienteNombre} 👋`,
    `Confirmamos tu abono a cuenta corriente en *${negocioNombre || 'La Parada'}*:`,
    '',
    `🧾 Comprobante: *${movimiento.codigoComprobante}*`,
    `💵 Monto abonado: *${formatCOP(movimiento.monto)}* (${metodo})`,
    movimiento.referenciaTransferencia ? `🔖 Referencia: ${movimiento.referenciaTransferencia}` : null,
    `📊 Saldo anterior: ${formatCOP(movimiento.saldoPrevio)}`,
    `✅ *Nuevo saldo pendiente: ${formatCOP(movimiento.saldoResultante)}*`,
    '',
    '¡Gracias por tu puntualidad y preferencia!',
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

/**
 * Construye la URL segura de WhatsApp `wa.me` con prefijo Colombia (+57) cuando aplica.
 */
export function generarUrlWhatsAppCartera(telefono: string, mensaje: string): string {
  const limpio = normalizarTelefono(telefono).replace(/\D/g, '');
  const conPais = limpio.length === 10 ? `57${limpio}` : limpio;
  const textoCodificado = encodeURIComponent(mensaje);
  return conPais ? `https://wa.me/${conPais}?text=${textoCodificado}` : `https://wa.me/?text=${textoCodificado}`;
}

/**
 * Sanitiza celdas CSV contra inyección de fórmulas en Excel (`=`, `+`, `-`, `@`, tab, CR).
 */
export function escaparCeldaCsvCartera(valor: string | number | undefined | null): string {
  const str = valor === undefined || valor === null ? '' : String(valor);
  const protegido = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (/[",\n\r;]/.test(protegido)) {
    return `"${protegido.replace(/"/g, '""')}"`;
  }
  return protegido;
}

/**
 * Exporta el reporte consolidado de Cartera por Cobrar y Vencida en formato CSV (UTF-8 BOM).
 */
export function generarCsvCarteraPorCobrar(
  filas: FilaCarteraVencida[]
): string {
  const encabezados = [
    'Cliente',
    'Telefono',
    'Empresa',
    'NIT',
    'Estado',
    'Cupo_COP',
    'Saldo_Pendiente_COP',
    'Cupo_Disponible_COP',
    'Uso_Porcentaje',
    'Plazo_Dias',
    'Dias_Mora',
    'Bucket_Mora',
    'Vencimiento_Referencia',
  ];

  const lineas = filas.map(({ cuenta, evaluacion }) =>
    [
      cuenta.clienteNombre,
      cuenta.clienteTelefono,
      cuenta.empresa || '',
      cuenta.nit || '',
      getBadgeEstadoCartera(evaluacion.estadoCartera).label,
      cuenta.cupoCredito,
      cuenta.saldoActual,
      evaluacion.cupoDisponible,
      `${evaluacion.porcentajeUso}%`,
      cuenta.plazoDias,
      evaluacion.diasMora,
      getEtiquetaBucketMora(evaluacion.bucketMora),
      evaluacion.fechaVencimientoReferencia
        ? evaluacion.fechaVencimientoReferencia.toISOString().slice(0, 10)
        : '',
    ]
      .map(escaparCeldaCsvCartera)
      .join(',')
  );

  return `\uFEFF${[encabezados.join(','), ...lineas].join('\n')}`;
}

/**
 * Exporta el estado de cuenta detallado de un cliente específico en CSV (UTF-8 BOM).
 */
export function generarCsvEstadoCuenta(
  cuenta: CuentaCorriente,
  movimientos: MovimientoCartera[]
): string {
  const encabezados = [
    'Fecha',
    'Comprobante',
    'Tipo',
    'Origen_o_Metodo',
    'Monto_COP',
    'Saldo_Previo_COP',
    'Saldo_Resultante_COP',
    'Referencia',
    'Notas',
    'Responsable',
  ];

  const lineas = movimientos.map((mov) => {
    const fechaIso = parseFechaCartera(mov.fecha)?.toISOString().slice(0, 16).replace('T', ' ') || '';
    const detalleMetodo =
      mov.tipo === 'abono'
        ? mov.metodoPago === 'transferencia'
          ? 'Transferencia'
          : 'Efectivo'
        : mov.mesaNombre
          ? `Mesa ${mov.mesaNombre}`
          : mov.origen || 'POS';

    return [
      fechaIso,
      mov.codigoComprobante,
      mov.tipo,
      detalleMetodo,
      mov.monto,
      mov.saldoPrevio,
      mov.saldoResultante,
      mov.referenciaTransferencia || '',
      mov.notas || '',
      mov.responsableNombre || '',
    ]
      .map(escaparCeldaCsvCartera)
      .join(',');
  });

  const resumenCliente = [
    `Cliente,${escaparCeldaCsvCartera(cuenta.clienteNombre)}`,
    `Telefono,${escaparCeldaCsvCartera(cuenta.clienteTelefono)}`,
    `Cupo_COP,${cuenta.cupoCredito}`,
    `Saldo_Actual_COP,${cuenta.saldoActual}`,
    '',
  ];

  return `\uFEFF${[...resumenCliente, encabezados.join(','), ...lineas].join('\n')}`;
}
