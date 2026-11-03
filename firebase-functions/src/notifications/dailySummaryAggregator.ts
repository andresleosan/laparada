// firebase-functions/src/notifications/dailySummaryAggregator.ts
import * as admin from 'firebase-admin';
import { ResumenDiarioPlantillaData } from './emailNotificationService';

export interface DailySummaryResult {
  negocioId: string;
  nombreNegocio: string;
  slug: string;
  destinatarioEmail: string;
  propietarioNombre: string;
  fechaISO: string;
  fechaTexto: string;
  plantillaData: ResumenDiarioPlantillaData;
}

/**
 * Obtiene el rango de inicio y fin en UTC correspondiente a un día específico en la zona horaria de Colombia (UTC-5).
 */
export function getColombiaDayRange(dateInput?: Date | string): {
  start: Date;
  end: Date;
  fechaTexto: string;
  fechaISO: string;
} {
  const baseDate = dateInput
    ? typeof dateInput === 'string'
      ? new Date(dateInput)
      : dateInput
    : new Date();

  // Desplazamiento fijo de Colombia UTC-5
  const utcMs = baseDate.getTime() + baseDate.getTimezoneOffset() * 60000;
  const colombiaOffsetMs = -5 * 3600000;
  const colDate = new Date(utcMs + colombiaOffsetMs);

  const year = colDate.getFullYear();
  const month = colDate.getMonth();
  const day = colDate.getDate();

  // 00:00:00 en Colombia equivale a 05:00:00 UTC del mismo día
  const start = new Date(Date.UTC(year, month, day, 5, 0, 0, 0));
  // 23:59:59.999 en Colombia equivale a 04:59:59.999 UTC del día siguiente
  const end = new Date(Date.UTC(year, month, day + 1, 4, 59, 59, 999));

  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const fechaTexto = `${diasSemana[colDate.getDay()]}, ${day} de ${meses[month]} de ${year}`;
  const mm = String(month + 1).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const fechaISO = `${year}-${mm}-${dd}`;

  return { start, end, fechaTexto, fechaISO };
}

function parseFirestoreDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: () => unknown }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate();
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value && typeof (value as { seconds: unknown }).seconds === 'number') {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Consolida las métricas del día para un negocio específico con aislamiento multi-tenant.
 */
export async function aggregateDailySummary(
  negocioId: string,
  targetDate?: Date | string,
  db: admin.firestore.Firestore = admin.firestore()
): Promise<DailySummaryResult> {
  const { start, end, fechaTexto, fechaISO } = getColombiaDayRange(targetDate);

  // 1. Obtener datos del negocio
  const negSnap = await db.collection('negocios').doc(negocioId).get();
  const negData = negSnap.data() || {};
  const nombreNegocio = (negData.nombre as string) || (negocioId === 'laparada' ? 'La Parada' : negocioId);
  const slug = (negData.slug as string) || negocioId;
  const propietarioEmail = (negData.propietarioEmail as string) || 'andres.san1404@gmail.com';
  const propietarioNombre = (negData.propietarioNombre as string) || 'Administrador';
  const emailConfigurado = (negData.emailNotificacionesResumen as string)?.trim();
  const destinatarioEmail = emailConfigurado && emailConfigurado.length > 3 ? emailConfigurado : propietarioEmail;

  // 2. Consultar ventas del día
  const ventasSnap = await db
    .collection('ventas')
    .where('negocioId', '==', negocioId)
    .get();

  let totalVentasCOP = 0;
  let cantidadVentas = 0;
  let ventasPosCOP = 0;
  let ventasWhatsappWebCOP = 0;
  let ventasEfectivoCOP = 0;
  let ventasTransferenciaCOP = 0;

  const productosMap = new Map<string, { cantidad: number; subtotal: number }>();

  ventasSnap.forEach((doc) => {
    const v = doc.data();
    const fDate = parseFirestoreDate(v.fecha);
    if (!fDate) return;
    if (fDate.getTime() < start.getTime() || fDate.getTime() > end.getTime()) {
      return;
    }

    const total = typeof v.total === 'number' && Number.isFinite(v.total) && v.total > 0 ? v.total : 0;
    totalVentasCOP += total;
    cantidadVentas += 1;

    const origen = typeof v.origen === 'string' ? v.origen.toLowerCase() : 'pos';
    if (origen === 'whatsapp' || origen === 'web') {
      ventasWhatsappWebCOP += total;
    } else {
      ventasPosCOP += total;
    }

    const metodo = typeof v.metodoPago === 'string' ? v.metodoPago.toLowerCase() : 'efectivo';
    if (metodo === 'transferencia') {
      ventasTransferenciaCOP += total;
    } else {
      ventasEfectivoCOP += total;
    }

    if (Array.isArray(v.items)) {
      for (const item of v.items) {
        if (!item || typeof item !== 'object') continue;
        const nombre = typeof item.nombre === 'string' ? item.nombre.trim() : 'Producto';
        const cant = typeof item.cantidad === 'number' && Number.isFinite(item.cantidad) ? item.cantidad : 1;
        const sub = typeof item.subtotal === 'number' && Number.isFinite(item.subtotal)
          ? item.subtotal
          : typeof item.precioUnitario === 'number' && Number.isFinite(item.precioUnitario)
            ? item.precioUnitario * cant
            : 0;

        const actual = productosMap.get(nombre) || { cantidad: 0, subtotal: 0 };
        productosMap.set(nombre, {
          cantidad: actual.cantidad + cant,
          subtotal: actual.subtotal + sub,
        });
      }
    }
  });

  const ticketPromedioCOP = cantidadVentas > 0 ? Math.round(totalVentasCOP / cantidadVentas) : 0;

  const topProductos = Array.from(productosMap.entries())
    .map(([nombre, val]) => ({ nombre, cantidad: val.cantidad, subtotal: val.subtotal }))
    .sort((a, b) => b.cantidad - a.cantidad || b.subtotal - a.subtotal)
    .slice(0, 3);

  // 3. Consultar domicilios entregados hoy
  let domiciliosEntregados = 0;
  try {
    const domSnap = await db
      .collection('domicilios')
      .where('negocioId', '==', negocioId)
      .where('estado', '==', 'entregado')
      .get();

    domSnap.forEach((doc) => {
      const d = doc.data();
      const fDate = parseFirestoreDate(d.fecha);
      if (fDate && fDate.getTime() >= start.getTime() && fDate.getTime() <= end.getTime()) {
        domiciliosEntregados += 1;
      }
    });
  } catch (err) {
    console.warn(`[dailySummaryAggregator] Error leyendo domicilios para ${negocioId}:`, err);
  }

  // 4. Consultar reservas agendadas hoy
  let reservasAgendadas = 0;
  try {
    const resSnap = await db
      .collection('reservas')
      .where('negocioId', '==', negocioId)
      .get();

    resSnap.forEach((doc) => {
      const r = doc.data();
      if (r.fecha === fechaISO) {
        reservasAgendadas += 1;
        return;
      }
      const cDate = parseFirestoreDate(r.creadoEn);
      if (cDate && cDate.getTime() >= start.getTime() && cDate.getTime() <= end.getTime()) {
        reservasAgendadas += 1;
      }
    });
  } catch (err) {
    console.warn(`[dailySummaryAggregator] Error leyendo reservas para ${negocioId}:`, err);
  }

  // 5. Consultar cierre de caja del día
  let cierreCajaData: ResumenDiarioPlantillaData['cierreCaja'] = { cerrado: false };
  try {
    const cierreSnap = await db
      .collection('cierres_caja')
      .where('negocioId', '==', negocioId)
      .get();

    let cierreHoyDoc: admin.firestore.DocumentData | null = null;
    cierreSnap.forEach((doc) => {
      const c = doc.data();
      const cDate = parseFirestoreDate(c.fecha);
      if (cDate && cDate.getTime() >= start.getTime() && cDate.getTime() <= end.getTime()) {
        cierreHoyDoc = c;
      }
    });

    if (cierreHoyDoc) {
      const ch = cierreHoyDoc as {
        utilidadNeta?: number;
        totalIngresos?: number;
        totalGastos?: number;
        notas?: string;
      };
      cierreCajaData = {
        cerrado: true,
        utilidadNetaCOP: typeof ch.utilidadNeta === 'number' ? ch.utilidadNeta : 0,
        totalIngresosCOP: typeof ch.totalIngresos === 'number' ? ch.totalIngresos : 0,
        totalGastosCOP: typeof ch.totalGastos === 'number' ? ch.totalGastos : 0,
        notas: typeof ch.notas === 'string' ? ch.notas : undefined,
      };
    }
  } catch (err) {
    console.warn(`[dailySummaryAggregator] Error leyendo cierre_caja para ${negocioId}:`, err);
  }

  // 6. Sarin IA: respuestas consumidas hoy
  const respuestasIAUsadasHoy = typeof negData.respuestasIAUsadas === 'number' ? negData.respuestasIAUsadas : 0;

  const plantillaData: ResumenDiarioPlantillaData = {
    nombreNegocio,
    slug,
    fechaTexto,
    totalVentasCOP,
    cantidadVentas,
    ticketPromedioCOP,
    ventasPosCOP,
    ventasWhatsappWebCOP,
    ventasEfectivoCOP,
    ventasTransferenciaCOP,
    topProductos,
    domiciliosEntregados,
    reservasAgendadas,
    respuestasIAUsadasHoy,
    cierreCaja: cierreCajaData,
  };

  return {
    negocioId,
    nombreNegocio,
    slug,
    destinatarioEmail,
    propietarioNombre,
    fechaISO,
    fechaTexto,
    plantillaData,
  };
}

