import type {
  DesgloseDenominaciones,
  ArqueoEfectivo,
  EstadoCuadreCaja,
  CierreCaja,
} from '@/types/cierreCaja';
import { formatCOP } from './formatCOP';

export interface DenominacionInfo {
  key: keyof DesgloseDenominaciones;
  tipo: 'billete' | 'moneda';
  valor: number;
  etiqueta: string;
}

/**
 * Denominaciones oficiales de la moneda colombiana (COP)
 */
export const DENOMINACIONES_COP: readonly DenominacionInfo[] = [
  // Billetes
  { key: 'b100k', tipo: 'billete', valor: 100000, etiqueta: '$100.000' },
  { key: 'b50k',  tipo: 'billete', valor: 50000,  etiqueta: '$50.000' },
  { key: 'b20k',  tipo: 'billete', valor: 20000,  etiqueta: '$20.000' },
  { key: 'b10k',  tipo: 'billete', valor: 10000,  etiqueta: '$10.000' },
  { key: 'b5k',   tipo: 'billete', valor: 5000,   etiqueta: '$5.000' },
  { key: 'b2k',   tipo: 'billete', valor: 2000,   etiqueta: '$2.000' },
  // Monedas
  { key: 'm1000', tipo: 'moneda',  valor: 1000,   etiqueta: '$1.000' },
  { key: 'm500',  tipo: 'moneda',  valor: 500,    etiqueta: '$500' },
  { key: 'm200',  tipo: 'moneda',  valor: 200,    etiqueta: '$200' },
  { key: 'm100',  tipo: 'moneda',  valor: 100,    etiqueta: '$100' },
  { key: 'm50',   tipo: 'moneda',  valor: 50,     etiqueta: '$50' },
] as const;

export const BILLETES_COP = DENOMINACIONES_COP.filter((d) => d.tipo === 'billete');
export const MONEDAS_COP = DENOMINACIONES_COP.filter((d) => d.tipo === 'moneda');

/**
 * Sanitiza cualquier valor de entrada asegurando un entero >= 0
 */
export function sanitizarCantidadDenominacion(valor: unknown): number {
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor) || isNaN(valor) || valor <= 0) return 0;
    return Math.floor(valor);
  }
  if (typeof valor === 'string') {
    const clean = valor.trim().replace(/[^0-9]/g, '');
    const num = parseInt(clean, 10);
    return isNaN(num) || num < 0 ? 0 : num;
  }
  return 0;
}

/**
 * Evalúa el estado del cuadre entre lo contado y lo esperado
 */
export function evaluarEstadoCuadre(diferencia: number): EstadoCuadreCaja {
  if (diferencia === 0) return 'cuadrado';
  if (diferencia > 0) return 'sobrante';
  return 'faltante';
}

/**
 * Calcula los totales consolidados del arqueo de caja
 */
export function calcularTotalesArqueo(
  denominaciones: Partial<DesgloseDenominaciones> = {},
  efectivoEsperado: number = 0
): ArqueoEfectivo {
  const safeEsperado = Math.max(0, Math.round(Number.isFinite(efectivoEsperado) ? efectivoEsperado : 0));

  const safeDesglose: DesgloseDenominaciones = {};
  let totalBilletes = 0;
  let totalMonedas = 0;

  for (const item of DENOMINACIONES_COP) {
    const cantidad = sanitizarCantidadDenominacion(denominaciones[item.key]);
    if (cantidad > 0) {
      safeDesglose[item.key] = cantidad;
    }
    const subtotal = cantidad * item.valor;
    if (item.tipo === 'billete') {
      totalBilletes += subtotal;
    } else {
      totalMonedas += subtotal;
    }
  }

  const totalFisico = totalBilletes + totalMonedas;
  const diferencia = totalFisico - safeEsperado;
  const estadoCuadre = evaluarEstadoCuadre(diferencia);

  return {
    denominaciones: safeDesglose,
    totalBilletes,
    totalMonedas,
    totalFisico,
    efectivoEsperado: safeEsperado,
    diferencia,
    estadoCuadre,
  };
}

/**
 * Convierte una fecha a string legible para el acta
 */
function toDateObj(fecha: unknown): Date {
  if (!fecha) return new Date();
  if (typeof (fecha as { toDate?: () => Date }).toDate === 'function') {
    return (fecha as { toDate: () => Date }).toDate();
  }
  if (fecha instanceof Date) return fecha;
  const d = new Date(fecha as string | number);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Formatea el acta de arqueo y cierre en texto monoespaciado para WhatsApp / Portapapeles
 */
export function formatearActaArqueoTexto(
  cierre: CierreCaja,
  negocio: { nombre: string; direccion?: string; telefono?: string }
): string {
  const fechaObj = toDateObj(cierre.fecha);
  const fechaTexto = fechaObj.toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const horaTexto = fechaObj.toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const arqueo =
    cierre.arqueo ??
    calcularTotalesArqueo(
      {},
      cierre.efectivoEsperado ?? cierre.totalIngresos
    );

  const separador = '--------------------------------';
  const lineas: string[] = [];

  lineas.push(`📋 *ACTA DE CIERRE Y ARQUEO DE CAJA*`);
  lineas.push(`🏛️ *${(negocio.nombre || 'LA PARADA').toUpperCase()}*`);
  if (negocio.direccion) lineas.push(`📍 ${negocio.direccion}`);
  if (negocio.telefono) lineas.push(`📞 Tel: ${negocio.telefono}`);
  lineas.push(separador);

  lineas.push(`📅 Fecha: ${fechaTexto}  ⏰ ${horaTexto}`);
  lineas.push(`🆔 Cierre ID: #${(cierre.id || 'NUEVO').slice(-6).toUpperCase()}`);
  if (cierre.cajeroNombre) {
    lineas.push(`👤 Cajero / Responsable: ${cierre.cajeroNombre}`);
  }
  lineas.push(separador);

  lineas.push(`💰 *BALANCE GENERAL DEL TURNO*`);
  lineas.push(`• Total Ingresos: ${formatCOP(cierre.totalIngresos)} COP`);
  lineas.push(`  - Ventas POS: ${formatCOP(cierre.ventasPos || 0)} COP`);
  lineas.push(`  - WhatsApp / Web: ${formatCOP(cierre.ventasWhatsapp || 0)} COP`);
  if (cierre.totalDescuentos && cierre.totalDescuentos > 0) {
    lineas.push(`• Descuentos / Cortesías: -${formatCOP(cierre.totalDescuentos)} COP (${cierre.cantidadDescuentos || 1} tickets)`);
  }
  if (cierre.totalAnuladas && cierre.totalAnuladas > 0) {
    lineas.push(`• Ventas Anuladas: ${formatCOP(cierre.totalAnuladas)} COP (${cierre.cantidadAnuladas || 1} op. auditadas)`);
  }
  lineas.push(`• Total Gastos: -${formatCOP(cierre.totalGastos)} COP`);
  const esPositivo = (cierre.utilidadNeta || 0) >= 0;
  lineas.push(`• Utilidad Neta: ${esPositivo ? '+' : ''}${formatCOP(cierre.utilidadNeta)} COP`);
  lineas.push(separador);

  lineas.push(`💵 *ARQUEO FÍSICO DE EFECTIVO*`);
  
  // Billetes con conteo > 0
  const billetesConteo = BILLETES_COP.filter((b) => (arqueo.denominaciones[b.key] ?? 0) > 0);
  if (billetesConteo.length > 0) {
    lineas.push(`*Billetes:*`);
    billetesConteo.forEach((b) => {
      const cant = arqueo.denominaciones[b.key] || 0;
      const sub = cant * b.valor;
      lineas.push(`  ${cant} × ${b.etiqueta} = ${formatCOP(sub)}`);
    });
    lineas.push(`  Subtotal Billetes: ${formatCOP(arqueo.totalBilletes)}`);
  }

  // Monedas con conteo > 0
  const monedasConteo = MONEDAS_COP.filter((m) => (arqueo.denominaciones[m.key] ?? 0) > 0);
  if (monedasConteo.length > 0) {
    lineas.push(`*Monedas:*`);
    monedasConteo.forEach((m) => {
      const cant = arqueo.denominaciones[m.key] || 0;
      const sub = cant * m.valor;
      lineas.push(`  ${cant} × ${m.etiqueta} = ${formatCOP(sub)}`);
    });
    lineas.push(`  Subtotal Monedas: ${formatCOP(arqueo.totalMonedas)}`);
  }

  if (billetesConteo.length === 0 && monedasConteo.length === 0) {
    lineas.push(`  (Sin billetes ni monedas registrados en conteo)`);
  }

  lineas.push(separador);
  lineas.push(`📊 *COMPARACIÓN Y ESTADO DE CAJA*`);
  lineas.push(`• Efectivo Físico Contado: *${formatCOP(arqueo.totalFisico)} COP*`);
  lineas.push(`• Efectivo Esperado en Sistema: *${formatCOP(arqueo.efectivoEsperado)} COP*`);

  if (arqueo.estadoCuadre === 'cuadrado') {
    lineas.push(`✅ *ESTADO: CUADRE EXACTO ($0 COP)*`);
  } else if (arqueo.estadoCuadre === 'sobrante') {
    lineas.push(`🟢 *ESTADO: SOBRANTE (+${formatCOP(arqueo.diferencia)} COP)*`);
  } else {
    lineas.push(`🔴 *ESTADO: FALTANTE (-${formatCOP(Math.abs(arqueo.diferencia))} COP)*`);
  }

  if (cierre.notas) {
    lineas.push(separador);
    lineas.push(`📝 *Notas:* ${cierre.notas}`);
  }

  lineas.push(separador);
  lineas.push(`_Comprobante emitido por Sistema La Parada_`);

  return lineas.join('\n');
}

/**
 * Genera el enlace de WhatsApp para enviar el acta de arqueo
 */
export function buildWhatsAppActaUrl(
  cierre: CierreCaja,
  negocio: { nombre: string; direccion?: string; telefono?: string },
  telefonoDestino?: string
): string {
  const texto = formatearActaArqueoTexto(cierre, negocio);
  const textoCodificado = encodeURIComponent(texto);

  if (!telefonoDestino) {
    return `https://api.whatsapp.com/send?text=${textoCodificado}`;
  }

  const telLimpio = telefonoDestino.trim().replace(/[^0-9]/g, '');
  const telFormateado = telLimpio.startsWith('57')
    ? telLimpio
    : telLimpio.length === 10
    ? `57${telLimpio}`
    : telLimpio;

  return `https://api.whatsapp.com/send?phone=${telFormateado}&text=${textoCodificado}`;
}
