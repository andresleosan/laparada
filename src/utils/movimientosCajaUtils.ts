import type {
  CorteXParcial,
  MovimientoCaja,
  ResumenMovimientosCajaTurno,
  TipoMovimientoCaja,
} from '@/types';
import { formatCOP } from './formatCOP';
import { toValidAdminDate } from './adminAnalytics';

export const UMBRAL_ALERTA_SANGRIA_DEFAULT = 500000;

export interface InfoTipoMovimientoCaja {
  id: TipoMovimientoCaja;
  label: string;
  shortLabel: string;
  descripcion: string;
  prefijo: string;
  signo: 1 | -1;
  badgeClass: string;
  amountClass: string;
}

export const CATALOGO_TIPOS_MOVIMIENTO_CAJA: Record<
  TipoMovimientoCaja,
  InfoTipoMovimientoCaja
> = {
  ingreso_sencillo: {
    id: 'ingreso_sencillo',
    label: 'Ingreso de Sencillo / Base',
    shortLabel: 'Sencillo (+)',
    descripcion: 'Entrada de moneda fraccionaria, cambio o base adicional al cajón.',
    prefijo: 'SEN',
    signo: 1,
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    amountClass: 'text-emerald-400',
  },
  sangria_caja_fuerte: {
    id: 'sangria_caja_fuerte',
    label: 'Sangría / Retiro a Caja Fuerte',
    shortLabel: 'Sangría (-)',
    descripcion: 'Retiro parcial de efectivo por seguridad hacia caja fuerte, banco o dueño.',
    prefijo: 'SNG',
    signo: -1,
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    amountClass: 'text-amber-400',
  },
  egreso_caja_menor: {
    id: 'egreso_caja_menor',
    label: 'Egreso de Caja Menor',
    shortLabel: 'Caja Menor (-)',
    descripcion: 'Salida rápida en efectivo para insumos menores, hielo, aseo o domicilios.',
    prefijo: 'CMN',
    signo: -1,
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    amountClass: 'text-rose-400',
  },
};

export const MOTIVOS_FRECUENTES_CAJA: Record<TipoMovimientoCaja, readonly string[]> = {
  ingreso_sencillo: [
    'Ingreso de sencillo y monedas para vueltas',
    'Base adicional de refuerzo en turno',
    'Cambio de billetes grandes por denominación menor',
  ],
  sangria_caja_fuerte: [
    'Retiro preventivo a caja fuerte por exceso de efectivo',
    'Entrega parcial de recaudo al propietario',
    'Sobre sellado para consignación bancaria',
  ],
  egreso_caja_menor: [
    'Compra urgente de hielo o insumos menores',
    'Pago de domicilio eventual / mensajería',
    'Insumos de aseo, servilletas o empaques',
  ],
};

/**
 * Sanitiza montos financieros en COP a enteros >= 0
 */
export function sanitizarMontoMovimientoCaja(valor: unknown): number {
  const num = Number(valor);
  if (!Number.isFinite(num) || isNaN(num) || num <= 0) return 0;
  return Math.round(num);
}

/**
 * Genera un código consecutivo legible para comprobantes de movimiento de caja
 */
export function generarCodigoComprobanteCaja(
  tipo: TipoMovimientoCaja,
  existentes: Pick<MovimientoCaja, 'codigoComprobante' | 'tipo'>[] = []
): string {
  const prefijo = CATALOGO_TIPOS_MOVIMIENTO_CAJA[tipo]?.prefijo || 'CAJ';
  let maxNum = 0;
  for (const mov of existentes) {
    const code = (mov.codigoComprobante || '').trim().toUpperCase();
    if (!code.startsWith(`${prefijo}-`)) continue;
    const parsed = parseInt(code.slice(prefijo.length + 1), 10);
    if (Number.isFinite(parsed) && parsed > maxNum) {
      maxNum = parsed;
    }
  }
  const siguiente = String(maxNum + 1).padStart(4, '0');
  return `${prefijo}-${siguiente}`;
}

/**
 * Genera un código consecutivo legible para actas de Corte X
 */
export function generarCodigoCorteX(
  existentes: Pick<CorteXParcial, 'codigoCorte'>[] = []
): string {
  let maxNum = 0;
  for (const corte of existentes) {
    const code = (corte.codigoCorte || '').trim().toUpperCase();
    if (!code.startsWith('CX-')) continue;
    const parsed = parseInt(code.slice(3), 10);
    if (Number.isFinite(parsed) && parsed > maxNum) {
      maxNum = parsed;
    }
  }
  return `CX-${String(maxNum + 1).padStart(4, '0')}`;
}

/**
 * Calcula el resumen consolidado de movimientos de caja del turno
 */
export function calcularResumenMovimientosCaja(
  movimientos: MovimientoCaja[],
  efectivoEsperadoActual = 0,
  umbralAlertaSangria = UMBRAL_ALERTA_SANGRIA_DEFAULT
): ResumenMovimientosCajaTurno {
  let totalIngresosSencillo = 0;
  let cantidadIngresosSencillo = 0;
  let totalSangrias = 0;
  let cantidadSangrias = 0;
  let totalCajaMenor = 0;
  let cantidadCajaMenor = 0;

  for (const mov of movimientos) {
    const monto = sanitizarMontoMovimientoCaja(mov.monto);
    if (monto <= 0) continue;

    if (mov.tipo === 'ingreso_sencillo') {
      totalIngresosSencillo += monto;
      cantidadIngresosSencillo += 1;
    } else if (mov.tipo === 'sangria_caja_fuerte') {
      totalSangrias += monto;
      cantidadSangrias += 1;
    } else if (mov.tipo === 'egreso_caja_menor') {
      totalCajaMenor += monto;
      cantidadCajaMenor += 1;
    }
  }

  const impactoNetoMovimientos = totalIngresosSencillo - totalSangrias - totalCajaMenor;
  const safeUmbral = Math.max(50000, sanitizarMontoMovimientoCaja(umbralAlertaSangria) || UMBRAL_ALERTA_SANGRIA_DEFAULT);
  const safeEfectivo = Math.max(0, Math.round(Number.isFinite(efectivoEsperadoActual) ? efectivoEsperadoActual : 0));

  return {
    totalIngresosSencillo,
    cantidadIngresosSencillo,
    totalSangrias,
    cantidadSangrias,
    totalCajaMenor,
    cantidadCajaMenor,
    impactoNetoMovimientos,
    alertaExcesoEfectivo: safeEfectivo >= safeUmbral,
    umbralAlertaSangria: safeUmbral,
  };
}

export interface ParametrosEfectivoEsperado {
  montoInicialCaja: number;
  ingresosDirectosCaja?: number;
  egresosDirectosCaja?: number;
  ventasEfectivo: number;
  ventasTandasEfectivo?: number;
  totalGastos: number;
  movimientos?: MovimientoCaja[];
  basesEnRutaActivas?: number;
}

/**
 * Calcula el efectivo esperado exacto en el cajón del turno integrando base,
 * ventas en efectivo, tandas, gastos, movimientos inmutables de caja y bases en ruta activas.
 */
export function calcularEfectivoEsperadoTurno(params: ParametrosEfectivoEsperado): number {
  const base = Math.max(0, Math.round(params.montoInicialCaja || 0));
  const ingresosDirectos = Math.max(0, Math.round(params.ingresosDirectosCaja || 0));
  const egresosDirectos = Math.max(0, Math.round(params.egresosDirectosCaja || 0));
  const ventasEf = Math.max(0, Math.round(params.ventasEfectivo || 0));
  const tandasEf = Math.max(0, Math.round(params.ventasTandasEfectivo || 0));
  const gastos = Math.max(0, Math.round(params.totalGastos || 0));
  const basesActivas = Math.max(0, Math.round(params.basesEnRutaActivas || 0));
  const resumenMovs = calcularResumenMovimientosCaja(params.movimientos || []);

  const raw =
    base +
    ingresosDirectos +
    ventasEf +
    tandasEf +
    resumenMovs.totalIngresosSencillo -
    resumenMovs.totalSangrias -
    resumenMovs.totalCajaMenor -
    egresosDirectos -
    gastos -
    basesActivas;

  return Math.max(0, Math.round(raw));
}

/**
 * Filtra movimientos de caja por tipo y texto libre
 */
export function filtrarMovimientosCaja(
  movimientos: MovimientoCaja[],
  filtros: { tipo?: TipoMovimientoCaja | 'todos'; busqueda?: string }
): MovimientoCaja[] {
  const q = (filtros.busqueda || '').trim().toLowerCase();
  return movimientos.filter((m) => {
    if (filtros.tipo && filtros.tipo !== 'todos' && m.tipo !== filtros.tipo) {
      return false;
    }
    if (q) {
      const haystack = [
        m.codigoComprobante,
        m.motivo,
        m.responsableNombre,
        m.autorizadoPor || '',
        m.referencia || '',
        m.notas || '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function formatFechaHoraCO(fecha: unknown): { fechaTexto: string; horaTexto: string } {
  const d = toValidAdminDate(fecha) || new Date();
  return {
    fechaTexto: d.toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    horaTexto: d.toLocaleTimeString('es-CO', {
      timeZone: 'America/Bogota',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }),
  };
}

/**
 * Formatea comprobante de movimiento de caja para WhatsApp / Portapapeles
 */
export function formatearComprobanteMovimientoTexto(
  mov: MovimientoCaja,
  negocio: { nombre: string; direccion?: string; telefono?: string }
): string {
  const info = CATALOGO_TIPOS_MOVIMIENTO_CAJA[mov.tipo];
  const { fechaTexto, horaTexto } = formatFechaHoraCO(mov.fecha);
  const signo = info.signo > 0 ? '+' : '-';
  const sep = '--------------------------------';

  const lineas = [
    `💵 *COMPROBANTE DE MOVIMIENTO DE CAJA*`,
    `🏛️ *${(negocio.nombre || 'LA PARADA').toUpperCase()}*`,
    sep,
    `🆔 Comprobante: *${mov.codigoComprobante}*`,
    `📌 Tipo: *${info.label}*`,
    `📅 Fecha: ${fechaTexto}  ⏰ ${horaTexto}`,
    `💰 Monto: *${signo}${formatCOP(mov.monto)} COP*`,
    `📝 Motivo: ${mov.motivo}`,
    `👤 Responsable: ${mov.responsableNombre}`,
  ];

  if (mov.autorizadoPor) {
    lineas.push(`✅ Autorizado por: ${mov.autorizadoPor}`);
  }
  if (mov.referencia) {
    lineas.push(`🔖 Referencia / Sobre: ${mov.referencia}`);
  }
  if (mov.notas) {
    lineas.push(`🗒️ Notas: ${mov.notas}`);
  }
  lineas.push(sep);
  lineas.push(`_Registro inmutable · Sistema La Parada POS_`);

  return lineas.join('\n');
}

export function buildWhatsAppMovimientoCajaUrl(
  mov: MovimientoCaja,
  negocio: { nombre: string; direccion?: string; telefono?: string },
  telefonoDestino?: string
): string {
  const texto = encodeURIComponent(formatearComprobanteMovimientoTexto(mov, negocio));
  if (!telefonoDestino) {
    return `https://api.whatsapp.com/send?text=${texto}`;
  }
  const clean = telefonoDestino.trim().replace(/[^0-9]/g, '');
  const phone = clean.startsWith('57') ? clean : clean.length === 10 ? `57${clean}` : clean;
  return `https://api.whatsapp.com/send?phone=${phone}&text=${texto}`;
}

/**
 * Formatea acta de Corte X (arqueo parcial de relevo) para WhatsApp / Portapapeles
 */
export function formatearActaCorteXTexto(
  corte: CorteXParcial,
  negocio: { nombre: string; direccion?: string; telefono?: string }
): string {
  const { fechaTexto, horaTexto } = formatFechaHoraCO(corte.fecha);
  const sep = '--------------------------------';
  const lineas = [
    `🔄 *ACTA DE CORTE X (RELEVO PARCIAL DE CAJA)*`,
    `🏛️ *${(negocio.nombre || 'LA PARADA').toUpperCase()}*`,
    sep,
    `🆔 Corte X: *${corte.codigoCorte}*`,
    `📅 Fecha: ${fechaTexto}  ⏰ ${horaTexto}`,
    `👤 Cajero Saliente: *${corte.cajeroSaliente}*`,
  ];

  if (corte.cajeroEntrante) {
    lineas.push(`🤝 Cajero Entrante: *${corte.cajeroEntrante}*`);
  }
  lineas.push(sep);
  lineas.push(`📊 *DETALLE DEL EFECTIVO EN TURNO*`);
  lineas.push(`• Base Inicial: ${formatCOP(corte.efectivoInicial)}`);
  lineas.push(`• Ventas Efectivo: +${formatCOP(corte.ventasEfectivo)}`);
  lineas.push(`• Ingresos Sencillo: +${formatCOP(corte.ingresosSencillo)}`);
  lineas.push(`• Sangrías Caja Fuerte: -${formatCOP(corte.sangriasCajaFuerte)}`);
  lineas.push(`• Caja Menor: -${formatCOP(corte.egresosCajaMenor)}`);
  lineas.push(`• Gastos Operativos: -${formatCOP(corte.gastosOperativos)}`);
  lineas.push(sep);
  lineas.push(`💵 Efectivo Esperado: *${formatCOP(corte.efectivoEsperado)}*`);
  lineas.push(`🧮 Efectivo Físico Contado: *${formatCOP(corte.arqueo.totalFisico)}*`);

  if (corte.arqueo.estadoCuadre === 'cuadrado') {
    lineas.push(`✅ *ESTADO: CUADRE EXACTO ($0)*`);
  } else if (corte.arqueo.estadoCuadre === 'sobrante') {
    lineas.push(`🟢 *ESTADO: SOBRANTE (+${formatCOP(corte.arqueo.diferencia)})*`);
  } else {
    lineas.push(`🔴 *ESTADO: FALTANTE (-${formatCOP(Math.abs(corte.arqueo.diferencia))})*`);
  }

  if (corte.notas) {
    lineas.push(`📝 Notas: ${corte.notas}`);
  }
  lineas.push(sep);
  lineas.push(`_Corte X Parcial · Sistema La Parada POS_`);
  return lineas.join('\n');
}

export function buildWhatsAppCorteXUrl(
  corte: CorteXParcial,
  negocio: { nombre: string; direccion?: string; telefono?: string },
  telefonoDestino?: string
): string {
  const texto = encodeURIComponent(formatearActaCorteXTexto(corte, negocio));
  if (!telefonoDestino) {
    return `https://api.whatsapp.com/send?text=${texto}`;
  }
  const clean = telefonoDestino.trim().replace(/[^0-9]/g, '');
  const phone = clean.startsWith('57') ? clean : clean.length === 10 ? `57${clean}` : clean;
  return `https://api.whatsapp.com/send?phone=${phone}&text=${texto}`;
}

function escaparCeldaCsv(valor: string | number | undefined): string {
  const raw = String(valor ?? '').replace(/\r?\n/g, ' ').trim();
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Genera archivo CSV UTF-8 BOM para auditoría de movimientos de caja
 */
export function generarCsvMovimientosCaja(movimientos: MovimientoCaja[]): string {
  const headers = [
    'Comprobante',
    'Fecha',
    'Hora',
    'Tipo',
    'Signo',
    'Monto COP',
    'Motivo',
    'Responsable',
    'Autorizado Por',
    'Referencia / Sobre',
    'Notas',
  ];

  const rows = movimientos.map((m) => {
    const info = CATALOGO_TIPOS_MOVIMIENTO_CAJA[m.tipo];
    const { fechaTexto, horaTexto } = formatFechaHoraCO(m.fecha);
    return [
      escaparCeldaCsv(m.codigoComprobante),
      escaparCeldaCsv(fechaTexto),
      escaparCeldaCsv(horaTexto),
      escaparCeldaCsv(info.label),
      escaparCeldaCsv(info.signo > 0 ? '+' : '-'),
      escaparCeldaCsv(m.monto),
      escaparCeldaCsv(m.motivo),
      escaparCeldaCsv(m.responsableNombre),
      escaparCeldaCsv(m.autorizadoPor || ''),
      escaparCeldaCsv(m.referencia || ''),
      escaparCeldaCsv(m.notas || ''),
    ].join(',');
  });

  return `\uFEFF${[headers.map((h) => escaparCeldaCsv(h)).join(','), ...rows].join('\n')}`;
}

export function descargarCsvMovimientosCaja(
  movimientos: MovimientoCaja[],
  negocioId: string
): void {
  const csv = generarCsvMovimientosCaja(movimientos);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const fechaHoy = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `movimientos-caja-${negocioId}-${fechaHoy}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
