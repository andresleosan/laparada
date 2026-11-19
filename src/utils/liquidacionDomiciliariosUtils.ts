import type {
  Domicilio,
  EstadoCuadreDomiciliario,
  LiquidacionDomiciliario,
  ResumenBasesRutaTurno,
} from '@/types';
import { formatCOP } from './formatCOP';
import { toValidAdminDate } from './adminAnalytics';

export const MONTOS_BASE_RAPIDOS_RUTA = [20000, 30000, 50000, 100000] as const;

export interface CalculoLiquidacionConBase {
  totalEntregas: number;
  totalEfectivo: number;
  totalTransferencia: number;
  granTotal: number;
  montoBaseInicial: number;
  efectivoEsperadoRendir: number;
  entregas: Domicilio[];
  domicilioIds: string[];
}

/**
 * Sanitiza montos financieros de base o efectivo en COP a enteros >= 0
 */
export function sanitizarMontoRuta(valor: unknown): number {
  const num = Number(valor);
  if (!Number.isFinite(num) || isNaN(num) || num <= 0) return 0;
  return Math.round(num);
}

/**
 * Genera código consecutivo legible para actas de liquidación de domiciliarios (`LQ-0001`)
 */
export function generarCodigoActaLiquidacion(
  existentes: Pick<LiquidacionDomiciliario, 'codigoActa'>[] = []
): string {
  let maxNum = 0;
  for (const liq of existentes) {
    const code = (liq.codigoActa || '').trim().toUpperCase();
    if (!code.startsWith('LQ-')) continue;
    const parsed = parseInt(code.slice(3), 10);
    if (Number.isFinite(parsed) && parsed > maxNum) {
      maxNum = parsed;
    }
  }
  return `LQ-${String(maxNum + 1).padStart(4, '0')}`;
}

/**
 * Calcula la liquidación pendiente por rendir de un repartidor integrando
 * su base inicial en ruta y excluyendo carreras ya conciliadas en actas previas.
 */
export function calcularLiquidacionConBase(
  domiciliosEntregados: Domicilio[],
  options?: {
    domiciliarioId?: string;
    montoBaseInicial?: number;
    idsYaLiquidados?: Set<string>;
  }
): CalculoLiquidacionConBase {
  const domiciliarioId = options?.domiciliarioId;
  const montoBaseInicial = sanitizarMontoRuta(options?.montoBaseInicial || 0);
  const idsYaLiquidados = options?.idsYaLiquidados;

  const entregas = (domiciliosEntregados || []).filter((d) => {
    if (d.estado !== 'entregado') return false;
    if (idsYaLiquidados?.has(d.id)) return false;
    if (domiciliarioId && d.domiciliarioId && d.domiciliarioId !== domiciliarioId) {
      return false;
    }
    return true;
  });

  let totalEfectivo = 0;
  let totalTransferencia = 0;

  for (const dom of entregas) {
    const monto = sanitizarMontoRuta(dom.total);
    if (dom.metodoPago === 'transferencia') {
      totalTransferencia += monto;
    } else {
      totalEfectivo += monto;
    }
  }

  return {
    totalEntregas: entregas.length,
    totalEfectivo,
    totalTransferencia,
    granTotal: totalEfectivo + totalTransferencia,
    montoBaseInicial,
    efectivoEsperadoRendir: montoBaseInicial + totalEfectivo,
    entregas,
    domicilioIds: entregas.map((e) => e.id),
  };
}

/**
 * Evalúa la diferencia física entre lo esperado a rendir y lo entregado por el domiciliario
 */
export function calcularDiferenciaRendicion(
  efectivoEsperadoRendir: number,
  efectivoEntregadoFisico: number
): { diferencia: number; estadoCuadre: EstadoCuadreDomiciliario } {
  const esperado = sanitizarMontoRuta(efectivoEsperadoRendir);
  const entregado = sanitizarMontoRuta(efectivoEntregadoFisico);
  const diferencia = entregado - esperado;

  if (diferencia === 0) {
    return { diferencia: 0, estadoCuadre: 'cuadrado' };
  }
  return {
    diferencia,
    estadoCuadre: diferencia > 0 ? 'sobrante' : 'faltante',
  };
}

/**
 * Resume el estado consolidado de bases activas en ruta y liquidaciones del turno
 */
export function calcularResumenBasesRutaTurno(
  liquidaciones: LiquidacionDomiciliario[]
): ResumenBasesRutaTurno {
  let cantidadBasesActivas = 0;
  let totalBaseEnRutaActiva = 0;
  let cantidadLiquidadasHoy = 0;
  let totalEfectivoRendidoHoy = 0;
  let totalTransferenciasValidadasHoy = 0;
  let totalDiferenciasHoy = 0;

  for (const item of liquidaciones || []) {
    if (item.estado === 'activa') {
      cantidadBasesActivas += 1;
      totalBaseEnRutaActiva += sanitizarMontoRuta(item.montoBaseInicial);
    } else if (item.estado === 'liquidada') {
      cantidadLiquidadasHoy += 1;
      totalEfectivoRendidoHoy += sanitizarMontoRuta(item.efectivoEntregadoFisico);
      totalTransferenciasValidadasHoy += sanitizarMontoRuta(item.totalTransferencias);
      totalDiferenciasHoy += Math.round(Number.isFinite(item.diferencia) ? item.diferencia : 0);
    }
  }

  return {
    cantidadBasesActivas,
    totalBaseEnRutaActiva,
    cantidadLiquidadasHoy,
    totalEfectivoRendidoHoy,
    totalTransferenciasValidadasHoy,
    totalDiferenciasHoy,
  };
}

/**
 * Obtiene el conjunto de IDs de domicilios ya conciliados en actas liquidadas
 */
export function obtenerIdsDomiciliosYaLiquidados(
  liquidaciones: LiquidacionDomiciliario[]
): Set<string> {
  const ids = new Set<string>();
  for (const liq of liquidaciones || []) {
    if (liq.estado !== 'liquidada') continue;
    for (const domId of liq.domicilioIds || []) {
      if (domId) ids.add(domId);
    }
  }
  return ids;
}

/**
 * Formatea un resumen claro del Acta de Liquidación para envío por WhatsApp offline
 */
export function formatearActaLiquidacionWhatsApp(
  acta: LiquidacionDomiciliario,
  negocioNombre: string
): string {
  const fecha = toValidAdminDate(acta.fechaLiquidacion || acta.fechaEntregaBase);
  const fechaTexto = fecha
    ? fecha.toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Hoy';

  const estadoCuadre =
    acta.diferencia === 0
      ? 'CUADRADO ($ 0)'
      : acta.diferencia > 0
      ? `SOBRANTE (+${formatCOP(acta.diferencia)})`
      : `FALTANTE (-${formatCOP(Math.abs(acta.diferencia))})`;

  return [
    `*ACTA DE LIQUIDACIÓN DE RUTA · ${acta.codigoActa}*`,
    `*Negocio:* ${negocioNombre}`,
    `*Repartidor:* ${acta.domiciliarioNombre}`,
    `*Fecha:* ${fechaTexto}`,
    `--------------------------------`,
    `• Base Sencillo Inicial: ${formatCOP(acta.montoBaseInicial)}`,
    `• Entregas Conciliadas: ${acta.totalEntregas}`,
    `• Efectivo Cobrado en Ruta: ${formatCOP(acta.totalEfectivoCobrado)}`,
    `• Transferencias Validadas: ${formatCOP(acta.totalTransferencias)}`,
    `--------------------------------`,
    `*Efectivo Esperado a Rendir:* ${formatCOP(acta.efectivoEsperadoRendir)}`,
    `*Efectivo Entregado en Caja:* ${formatCOP(acta.efectivoEntregadoFisico)}`,
    `*Resultado:* ${estadoCuadre}`,
    acta.cajeroReceptor ? `*Recibido por:* ${acta.cajeroReceptor}` : '',
    acta.notasLiquidacion ? `*Notas:* ${acta.notasLiquidacion}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

function escaparCeldaCsvSegura(valor: string | number): string {
  const str = String(valor ?? '');
  const sanitized = /^[=+\-@]/.test(str) ? `'${str}` : str;
  return `"${sanitized.replace(/"/g, '""')}"`;
}

/**
 * Genera contenido CSV UTF-8 BOM seguro para exportar liquidaciones de domiciliarios
 */
export function generarCsvLiquidacionesDomiciliarios(
  liquidaciones: LiquidacionDomiciliario[]
): string {
  const headers = [
    'Codigo Acta',
    'Estado',
    'Repartidor',
    'Fecha Base',
    'Fecha Liquidacion',
    'Base Inicial (COP)',
    'Entregas',
    'Efectivo Cobrado (COP)',
    'Transferencias (COP)',
    'Esperado a Rendir (COP)',
    'Entregado Fisico (COP)',
    'Diferencia (COP)',
    'Entregado Por',
    'Cajero Receptor',
    'Notas',
  ];

  const rows = (liquidaciones || []).map((l) => {
    const fBase = toValidAdminDate(l.fechaEntregaBase);
    const fLiq = toValidAdminDate(l.fechaLiquidacion);
    return [
      l.codigoActa,
      l.estado.toUpperCase(),
      l.domiciliarioNombre,
      fBase ? fBase.toISOString() : '',
      fLiq ? fLiq.toISOString() : '',
      l.montoBaseInicial,
      l.totalEntregas,
      l.totalEfectivoCobrado,
      l.totalTransferencias,
      l.efectivoEsperadoRendir,
      l.efectivoEntregadoFisico,
      l.diferencia,
      l.entregadoPor,
      l.cajeroReceptor || '',
      l.notasLiquidacion || l.observacionesBase || '',
    ].map(escaparCeldaCsvSegura);
  });

  return '\uFEFF' + [headers.map(escaparCeldaCsvSegura).join(','), ...rows.map((r) => r.join(','))].join('\n');
}
