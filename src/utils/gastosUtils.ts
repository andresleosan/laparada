import type {
  CategoriaGasto,
  DesgloseCategoriaGasto,
  Gasto,
  MetodoPagoGasto,
  MovimientoCaja,
  OrigenFondoGasto,
  RangoFechaGastos,
  ResumenCajaMenor,
  ResumenGastosOperativos,
} from '@/types';
import { toValidAdminDate } from './adminAnalytics';
import { formatCOP } from './formatCOP';

export interface CategoriaGastoMeta {
  categoria: CategoriaGasto;
  etiqueta: string;
  descripcion: string;
  tipoCosto: 'fijo' | 'variable';
  badgeClass: string;
  barClass: string;
}

export const CATEGORIAS_GASTO_META: CategoriaGastoMeta[] = [
  {
    categoria: 'servicios',
    etiqueta: 'Servicios Públicos',
    descripcion: 'Energía, agua, internet, telefonía y alcantarillado del local',
    tipoCosto: 'fijo',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    barClass: 'bg-sky-400',
  },
  {
    categoria: 'arriendo',
    etiqueta: 'Arriendo',
    descripcion: 'Canon de arrendamiento del local, bodega o punto de venta',
    tipoCosto: 'fijo',
    badgeClass: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    barClass: 'bg-violet-400',
  },
  {
    categoria: 'aseo',
    etiqueta: 'Aseo',
    descripcion: 'Detergentes, desinfectantes, bolsas de basura e implementos de limpieza',
    tipoCosto: 'variable',
    badgeClass: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
    barClass: 'bg-teal-400',
  },
  {
    categoria: 'mantenimiento',
    etiqueta: 'Mantenimiento',
    descripcion: 'Reparaciones de freidoras, neveras, plomería y equipos de cocina',
    tipoCosto: 'fijo',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    barClass: 'bg-amber-400',
  },
  {
    categoria: 'transporte',
    etiqueta: 'Transporte',
    descripcion: 'Fletes, taxis, gasolina de diligencias y acarreos de insumos',
    tipoCosto: 'variable',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
    barClass: 'bg-cyan-400',
  },
  {
    categoria: 'gas',
    etiqueta: 'Gas y Combustible',
    descripcion: 'Pipetas de gas propano, gas natural o carbón de cocina',
    tipoCosto: 'variable',
    badgeClass: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
    barClass: 'bg-orange-400',
  },
  {
    categoria: 'insumos',
    etiqueta: 'Insumos y Empaques',
    descripcion: 'Compras rápidas de materia prima, servilletas y descartables',
    tipoCosto: 'variable',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    barClass: 'bg-emerald-400',
  },
  {
    categoria: 'salarios',
    etiqueta: 'Salarios y Turnos',
    descripcion: 'Nómina, turnos extra, honorarios y liquidaciones del personal',
    tipoCosto: 'fijo',
    badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    barClass: 'bg-indigo-400',
  },
  {
    categoria: 'domiciliario',
    etiqueta: 'Domicilios',
    descripcion: 'Pagos por carreras a repartidores externos y mensajería',
    tipoCosto: 'variable',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    barClass: 'bg-blue-400',
  },
  {
    categoria: 'varios',
    etiqueta: 'Varios',
    descripcion: 'Papelería, botiquín y gastos menores de operación diaria',
    tipoCosto: 'variable',
    badgeClass: 'bg-neutral-700/40 text-neutral-300 border-neutral-600/40',
    barClass: 'bg-neutral-400',
  },
  {
    categoria: 'otros',
    etiqueta: 'Otros Gastos',
    descripcion: 'Publicidad local, comisiones bancarias u otros egresos',
    tipoCosto: 'variable',
    badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    barClass: 'bg-rose-400',
  },
];

export interface OrigenFondoGastoMeta {
  origen: OrigenFondoGasto;
  etiqueta: string;
  etiquetaCorta: string;
  descripcion: string;
  impactaCajaTurno: boolean;
  impactaCajaMenor: boolean;
  metodoDefault: MetodoPagoGasto;
  badgeClass: string;
}

export const ORIGENES_FONDO_GASTO_META: OrigenFondoGastoMeta[] = [
  {
    origen: 'caja_turno',
    etiqueta: 'Caja del Turno (Efectivo)',
    etiquetaCorta: 'Caja Turno',
    descripcion: 'Sale del efectivo físico del cajón POS. Se descuenta del efectivo esperado al cierre.',
    impactaCajaTurno: true,
    impactaCajaMenor: false,
    metodoDefault: 'efectivo',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  {
    origen: 'caja_menor',
    etiqueta: 'Fondo de Caja Menor',
    etiquetaCorta: 'Caja Menor',
    descripcion: 'Sale del sobre/fondo de caja menor. No descuenta del efectivo de ventas del cajón.',
    impactaCajaTurno: false,
    impactaCajaMenor: true,
    metodoDefault: 'efectivo',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    origen: 'banco_transferencia',
    etiqueta: 'Banco / Transferencia',
    etiquetaCorta: 'Banco / Transf.',
    descripcion: 'Pagado desde cuenta bancaria, Nequi o Daviplata. Impacta el P&L, no el cajón físico.',
    impactaCajaTurno: false,
    impactaCajaMenor: false,
    metodoDefault: 'transferencia',
    badgeClass: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  },
  {
    origen: 'efectivo_externo',
    etiqueta: 'Efectivo Externo / Socio',
    etiquetaCorta: 'Efectivo Externo',
    descripcion: 'Pagado por gerencia o socio fuera de caja. Impacta el P&L, no el cajón físico.',
    impactaCajaTurno: false,
    impactaCajaMenor: false,
    metodoDefault: 'efectivo',
    badgeClass: 'bg-neutral-700/40 text-neutral-300 border-neutral-600/40',
  },
];

export const FONDO_CAJA_MENOR_DEFAULT_COP = 300000;
export const UMBRAL_ALERTA_CAJA_MENOR_PCT = 80;

export function getCategoriaGastoMeta(categoria: string): CategoriaGastoMeta {
  const normalizada = (categoria || 'otros').toLowerCase().trim() as CategoriaGasto;
  return (
    CATEGORIAS_GASTO_META.find((item) => item.categoria === normalizada) ||
    CATEGORIAS_GASTO_META[CATEGORIAS_GASTO_META.length - 1]
  );
}

export function getOrigenFondoGastoMeta(origen?: OrigenFondoGasto): OrigenFondoGastoMeta {
  const target = origen || 'caja_turno';
  return (
    ORIGENES_FONDO_GASTO_META.find((item) => item.origen === target) ||
    ORIGENES_FONDO_GASTO_META[0]
  );
}

export function sanitizarMontoGasto(valor: unknown): number {
  const num = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num);
}

/**
 * Determina si un gasto descuenta efectivo físico del cajón en el cierre de turno.
 * Por compatibilidad retroactiva, gastos históricos sin `origenFondo` se asumen de `caja_turno`.
 */
export function esGastoQueDescuentaCajaTurno(gasto: Pick<Gasto, 'origenFondo'>): boolean {
  const origen = gasto.origenFondo || 'caja_turno';
  return origen === 'caja_turno';
}

/**
 * Suma únicamente los gastos que salieron del efectivo de la caja del turno
 */
export function calcularGastosQueDescuentanCajaTurno(gastos: Gasto[]): number {
  return gastos.reduce((acc, gasto) => {
    if (!esGastoQueDescuentaCajaTurno(gasto)) return acc;
    return acc + sanitizarMontoGasto(gasto.monto);
  }, 0);
}

/**
 * Calcula el resumen consolidado de gastos operativos y desglose por categoría y origen
 */
export function calcularResumenGastosOperativos(gastos: Gasto[]): ResumenGastosOperativos {
  let totalGastos = 0;
  let totalCajaTurno = 0;
  let totalCajaMenor = 0;
  let totalBancoTransferencia = 0;
  let totalEfectivoExterno = 0;
  let totalDeducible = 0;

  const mapaCategorias = new Map<CategoriaGasto, { monto: number; cantidad: number }>();

  for (const gasto of gastos) {
    const monto = sanitizarMontoGasto(gasto.monto);
    if (monto <= 0) continue;

    totalGastos += monto;
    const origen = gasto.origenFondo || 'caja_turno';

    if (origen === 'caja_turno') totalCajaTurno += monto;
    else if (origen === 'caja_menor') totalCajaMenor += monto;
    else if (origen === 'banco_transferencia') totalBancoTransferencia += monto;
    else totalEfectivoExterno += monto;

    if (gasto.deducible) {
      totalDeducible += monto;
    }

    const catMeta = getCategoriaGastoMeta(gasto.categoria);
    const actual = mapaCategorias.get(catMeta.categoria) || { monto: 0, cantidad: 0 };
    actual.monto += monto;
    actual.cantidad += 1;
    mapaCategorias.set(catMeta.categoria, actual);
  }

  const desgloseCategorias: DesgloseCategoriaGasto[] = Array.from(mapaCategorias.entries())
    .map(([categoria, data]) => {
      const meta = getCategoriaGastoMeta(categoria);
      return {
        categoria,
        etiqueta: meta.etiqueta,
        monto: data.monto,
        cantidad: data.cantidad,
        porcentaje: totalGastos > 0 ? Number(((data.monto / totalGastos) * 100).toFixed(1)) : 0,
        tipoCosto: meta.tipoCosto,
      };
    })
    .sort((a, b) => b.monto - a.monto || a.etiqueta.localeCompare(b.etiqueta));

  const cantidadGastos = gastos.filter((g) => sanitizarMontoGasto(g.monto) > 0).length;

  return {
    totalGastos,
    cantidadGastos,
    gastoPromedio: cantidadGastos > 0 ? Math.round(totalGastos / cantidadGastos) : 0,
    totalCajaTurno,
    totalCajaMenor,
    totalBancoTransferencia,
    totalEfectivoExterno,
    totalDeducible,
    desgloseCategorias,
  };
}

/**
 * Consolida el uso de Caja Menor combinando gastos etiquetados como `caja_menor`
 * y movimientos de caja de tipo `egreso_caja_menor` sin duplicar los vinculados.
 */
export function calcularResumenCajaMenor(params: {
  gastos: Gasto[];
  movimientosCaja?: MovimientoCaja[];
  fondoAsignadoCOP?: number;
}): ResumenCajaMenor {
  const fondoAsignadoCOP = Math.max(
    10000,
    sanitizarMontoGasto(params.fondoAsignadoCOP) || FONDO_CAJA_MENOR_DEFAULT_COP
  );

  const gastosCajaMenor = params.gastos.filter(
    (g) => g.origenFondo === 'caja_menor' && sanitizarMontoGasto(g.monto) > 0
  );
  const idsMovimientosVinculados = new Set(
    gastosCajaMenor
      .map((g) => g.movimientoCajaId)
      .filter((id): id is string => Boolean(id))
  );

  const totalEjecutadoGastos = gastosCajaMenor.reduce(
    (sum, g) => sum + sanitizarMontoGasto(g.monto),
    0
  );

  const egresosMovs = (params.movimientosCaja || []).filter(
    (m) =>
      m.tipo === 'egreso_caja_menor' &&
      !idsMovimientosVinculados.has(m.id) &&
      sanitizarMontoGasto(m.monto) > 0
  );
  const totalEgresosMovimientosCaja = egresosMovs.reduce(
    (sum, m) => sum + sanitizarMontoGasto(m.monto),
    0
  );

  const totalConsumidoCOP = totalEjecutadoGastos + totalEgresosMovimientosCaja;
  const saldoDisponibleCOP = Math.max(0, fondoAsignadoCOP - totalConsumidoCOP);
  const porcentajeUso = Number(
    Math.min(100, (totalConsumidoCOP / fondoAsignadoCOP) * 100).toFixed(1)
  );

  return {
    fondoAsignadoCOP,
    totalEjecutadoGastos,
    totalEgresosMovimientosCaja,
    totalConsumidoCOP,
    saldoDisponibleCOP,
    porcentajeUso,
    alertaReposicion: porcentajeUso >= UMBRAL_ALERTA_CAJA_MENOR_PCT,
    cantidadRegistros: gastosCajaMenor.length + egresosMovs.length,
  };
}

export interface FiltrosGastosOperativos {
  busqueda?: string;
  categoria?: CategoriaGasto | 'todas';
  origenFondo?: OrigenFondoGasto | 'todos';
  rango?: RangoFechaGastos;
  ahora?: Date;
}

/**
 * Filtra gastos operativos por período temporal, categoría, origen de fondo y búsqueda libre
 */
export function filtrarGastosOperativos(
  gastos: Gasto[],
  filtros: FiltrosGastosOperativos
): Gasto[] {
  const ahora = filtros.ahora ? new Date(filtros.ahora) : new Date();
  const rango = filtros.rango || '30dias';
  const q = (filtros.busqueda || '').trim().toLowerCase();

  let inicioMs: number | null = null;
  if (rango === 'hoy') {
    const inicio = new Date(ahora);
    inicio.setHours(0, 0, 0, 0);
    inicioMs = inicio.getTime();
  } else if (rango === '7dias') {
    const inicio = new Date(ahora);
    inicio.setDate(inicio.getDate() - 6);
    inicio.setHours(0, 0, 0, 0);
    inicioMs = inicio.getTime();
  } else if (rango === '30dias') {
    const inicio = new Date(ahora);
    inicio.setDate(inicio.getDate() - 29);
    inicio.setHours(0, 0, 0, 0);
    inicioMs = inicio.getTime();
  } else if (rango === 'mes_actual') {
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
    inicioMs = inicio.getTime();
  }

  return gastos.filter((g) => {
    if (inicioMs !== null) {
      const fecha = toValidAdminDate(g.fecha);
      if (!fecha || fecha.getTime() < inicioMs) {
        return false;
      }
    }

    if (filtros.categoria && filtros.categoria !== 'todas' && g.categoria !== filtros.categoria) {
      return false;
    }

    if (filtros.origenFondo && filtros.origenFondo !== 'todos') {
      const origenReal = g.origenFondo || 'caja_turno';
      if (origenReal !== filtros.origenFondo) return false;
    }

    if (q) {
      const catMeta = getCategoriaGastoMeta(g.categoria);
      const haystack = [
        g.concepto,
        g.categoria,
        catMeta.etiqueta,
        g.proveedorNombre || '',
        g.numeroComprobante || '',
        g.responsableNombre || '',
        g.notas || '',
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }

    return true;
  });
}

function sanitizarCeldaCsv(valor: string | number): string {
  const str = String(valor ?? '');
  const trimmed = str.replace(/"/g, '""');
  const safe = /^[=+\-@]/.test(trimmed) ? `'${trimmed}` : trimmed;
  return `"${safe}"`;
}

/**
 * Genera archivo CSV UTF-8 BOM para auditoría contable de gastos operativos
 */
export function generarCsvGastosOperativos(gastos: Gasto[], negocioNombre: string): string {
  const headers = [
    'Negocio',
    'Fecha',
    'Hora',
    'Concepto',
    'Categoria',
    'Tipo Costo',
    'Origen Fondo',
    'Metodo Pago',
    'Proveedor',
    'Comprobante',
    'Deducible',
    'Responsable',
    'Monto COP',
    'Notas',
  ];

  const rows = gastos.map((g) => {
    const fecha = toValidAdminDate(g.fecha);
    const fechaStr = fecha ? fecha.toLocaleDateString('es-CO') : 'Sin fecha';
    const horaStr = fecha
      ? fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      : '--:--';
    const catMeta = getCategoriaGastoMeta(g.categoria);
    const origenMeta = getOrigenFondoGastoMeta(g.origenFondo);
    const metodo = g.metodoPago || origenMeta.metodoDefault;

    return [
      sanitizarCeldaCsv(negocioNombre),
      sanitizarCeldaCsv(fechaStr),
      sanitizarCeldaCsv(horaStr),
      sanitizarCeldaCsv(g.concepto),
      sanitizarCeldaCsv(catMeta.etiqueta),
      sanitizarCeldaCsv(catMeta.tipoCosto.toUpperCase()),
      sanitizarCeldaCsv(origenMeta.etiquetaCorta),
      sanitizarCeldaCsv(metodo === 'transferencia' ? 'Transferencia' : 'Efectivo'),
      sanitizarCeldaCsv(g.proveedorNombre || ''),
      sanitizarCeldaCsv(g.numeroComprobante || ''),
      sanitizarCeldaCsv(g.deducible ? 'SI' : 'NO'),
      sanitizarCeldaCsv(g.responsableNombre || ''),
      sanitizarCeldaCsv(sanitizarMontoGasto(g.monto)),
      sanitizarCeldaCsv(g.notas || ''),
    ].join(',');
  });

  return '\uFEFF' + [headers.map(sanitizarCeldaCsv).join(','), ...rows].join('\n');
}

export function descargarGastosOperativosCsv(
  gastos: Gasto[],
  negocioNombre: string,
  rangoEtiqueta = 'periodo'
): void {
  const csv = generarCsvGastosOperativos(gastos, negocioNombre);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const fechaSlug = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.setAttribute('download', `gastos_operativos_${rangoEtiqueta}_${fechaSlug}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Formatea resumen de gastos operativos para compartir por WhatsApp (100% offline)
 */
export function generarResumenGastosWhatsApp(
  resumen: ResumenGastosOperativos,
  negocioNombre: string,
  etiquetaPeriodo: string
): string {
  const lineas: string[] = [
    `*RESUMEN DE GASTOS OPERATIVOS — ${negocioNombre.toUpperCase()}*`,
    `Período: ${etiquetaPeriodo}`,
    `Total Gastos: *${formatCOP(resumen.totalGastos)}* (${resumen.cantidadGastos} registros)`,
    '',
    '*Por Origen de Fondo:*',
    `• Caja del Turno: ${formatCOP(resumen.totalCajaTurno)}`,
    `• Caja Menor: ${formatCOP(resumen.totalCajaMenor)}`,
    `• Banco / Transferencia: ${formatCOP(resumen.totalBancoTransferencia)}`,
    `• Efectivo Externo: ${formatCOP(resumen.totalEfectivoExterno)}`,
  ];

  if (resumen.desgloseCategorias.length > 0) {
    lineas.push('', '*Top Categorías:*');
    resumen.desgloseCategorias.slice(0, 6).forEach((cat) => {
      lineas.push(`• ${cat.etiqueta}: ${formatCOP(cat.monto)} (${cat.porcentaje}%)`);
    });
  }

  return lineas.join('\n');
}
