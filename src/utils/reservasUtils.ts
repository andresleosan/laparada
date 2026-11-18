import type { Mesa } from '@/types/mesa';
import type {
  ConflictoHorarioMesaReserva,
  EstadoDisponibilidadMesaReserva,
  MetricasLibroReservas,
  OcasionReserva,
  ReservaNegocio,
} from '@/types/reserva';
import { descargarArchivoCsv } from './contabilidadUtils';
import { formatCOP } from './formatCOP';

/**
 * Ventana estándar de ocupación estimada por reserva (2 horas = 120 minutos).
 */
export const VENTANA_CONFLICTO_RESERVA_MIN = 120;

const OCASIONES_META: Record<
  Exclude<OcasionReserva, 'ninguna'>,
  { label: string; emoji: string }
> = {
  cumpleanos: { label: 'Cumpleaños', emoji: '🎂' },
  aniversario: { label: 'Aniversario', emoji: '🥂' },
  reunion_empresarial: { label: 'Reunión Empresarial', emoji: '💼' },
  cita: { label: 'Cita Especial', emoji: '✨' },
  otro: { label: 'Ocasión Especial', emoji: '🎉' },
};

/**
 * Convierte una cadena de fecha/hora de reserva a milisegundos epoch de forma segura.
 */
export function parsearFechaHoraReservaMs(fechaHoraStr?: string): number | null {
  if (!fechaHoraStr || typeof fechaHoraStr !== 'string') return null;
  const limpia = fechaHoraStr.trim();
  if (!limpia) return null;

  // Normalizar formato "YYYY-MM-DD HH:mm" a ISO local "YYYY-MM-DDTHH:mm"
  const normalizada = /^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(limpia)
    ? limpia.replace(/\s+/, 'T')
    : limpia;

  const parsed = new Date(normalizada);
  const ms = parsed.getTime();
  return Number.isFinite(ms) ? ms : null;
}

function obtenerFechaLocalYYYYMMDD(ms: number): string {
  const d = new Date(ms);
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

function obtenerClaveFechaReserva(fechaHoraStr?: string): string {
  const ms = parsearFechaHoraReservaMs(fechaHoraStr);
  if (ms !== null) {
    return obtenerFechaLocalYYYYMMDD(ms);
  }
  return (fechaHoraStr || '').trim().slice(0, 10);
}

function formatearFechaHoraLegible(fechaHoraStr: string): { fecha: string; hora: string } {
  const ms = parsearFechaHoraReservaMs(fechaHoraStr);
  if (ms === null) {
    return { fecha: fechaHoraStr || 'Por definir', hora: '' };
  }
  const d = new Date(ms);
  const fecha = d.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });
  const hora = d.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return { fecha, hora };
}

/**
 * Detecta si una mesa tiene conflicto con otra reserva activa dentro de la ventana horaria indicada.
 */
export function detectarConflictoHorarioMesa(params: {
  mesaId: string;
  mesaNumero?: number;
  fechaHoraReserva: string;
  reservas: ReservaNegocio[];
  excluirReservaId?: string;
  ventanaMinutos?: number;
}): ConflictoHorarioMesaReserva {
  const objetivoMs = parsearFechaHoraReservaMs(params.fechaHoraReserva);
  if (objetivoMs === null || (!params.mesaId && typeof params.mesaNumero !== 'number')) {
    return { hayConflicto: false };
  }

  const ventana = Math.max(15, params.ventanaMinutos ?? VENTANA_CONFLICTO_RESERVA_MIN);
  let conflictoMasCercano: ReservaNegocio | undefined;
  let menorDiferenciaMin = Number.POSITIVE_INFINITY;

  for (const res of params.reservas || []) {
    if (!res) continue;
    if (params.excluirReservaId && res.id === params.excluirReservaId) continue;
    if (res.estado !== 'pendiente' && res.estado !== 'confirmada') continue;

    const coincidePorId = Boolean(params.mesaId && res.mesaId && res.mesaId === params.mesaId);
    const coincidePorNumero =
      !res.mesaId &&
      typeof params.mesaNumero === 'number' &&
      typeof res.mesaNumero === 'number' &&
      res.mesaNumero === params.mesaNumero;

    if (!coincidePorId && !coincidePorNumero) continue;

    const resMs = parsearFechaHoraReservaMs(res.fechaHoraReserva);
    if (resMs === null) continue;

    const diffMin = Math.round(Math.abs(objetivoMs - resMs) / 60_000);
    if (diffMin < ventana && diffMin < menorDiferenciaMin) {
      menorDiferenciaMin = diffMin;
      conflictoMasCercano = res;
    }
  }

  if (!conflictoMasCercano) {
    return { hayConflicto: false };
  }

  const { hora } = formatearFechaHoraLegible(conflictoMasCercano.fechaHoraReserva);
  return {
    hayConflicto: true,
    reservaConflicto: conflictoMasCercano,
    diferenciaMinutos: menorDiferenciaMin,
    mensaje: `Ocupada por reserva de ${conflictoMasCercano.clienteNombre}${hora ? ` (${hora})` : ''}`,
  };
}

/**
 * Evalúa y ordena todas las mesas del salón para una reserva según horario, capacidad y zona.
 * Marca una única mesa óptima disponible como recomendada.
 */
export function evaluarDisponibilidadMesasParaReserva(params: {
  mesas: Mesa[];
  reservas: ReservaNegocio[];
  fechaHoraReserva: string;
  personas: number;
  zonaPreferida?: string;
  excluirReservaId?: string;
}): EstadoDisponibilidadMesaReserva[] {
  const numPersonas = Math.max(1, Math.floor(Number(params.personas) || 1));
  const zonaNormalizada = (params.zonaPreferida || '').trim().toLowerCase();
  const exigirZona = Boolean(
    zonaNormalizada && zonaNormalizada !== 'todas' && zonaNormalizada !== 'cualquiera'
  );

  const evaluaciones: EstadoDisponibilidadMesaReserva[] = (params.mesas || []).map((mesa) => {
    const conflicto = detectarConflictoHorarioMesa({
      mesaId: mesa.id,
      mesaNumero: mesa.numero,
      fechaHoraReserva: params.fechaHoraReserva,
      reservas: params.reservas,
      excluirReservaId: params.excluirReservaId,
    });

    const capacidadSuficiente = (mesa.capacidad || 0) >= numPersonas;
    const coincideZona = exigirZona
      ? (mesa.zona || '').trim().toLowerCase() === zonaNormalizada
      : true;

    return {
      mesa,
      disponibleEnHorario: !conflicto.hayConflicto,
      capacidadSuficiente,
      coincideZona,
      ...(conflicto.reservaConflicto ? { conflicto: conflicto.reservaConflicto } : {}),
      recomendada: false,
    };
  });

  evaluaciones.sort((a, b) => {
    if (a.disponibleEnHorario !== b.disponibleEnHorario) {
      return a.disponibleEnHorario ? -1 : 1;
    }
    if (a.capacidadSuficiente !== b.capacidadSuficiente) {
      return a.capacidadSuficiente ? -1 : 1;
    }
    if (exigirZona && a.coincideZona !== b.coincideZona) {
      return a.coincideZona ? -1 : 1;
    }
    if (a.capacidadSuficiente && b.capacidadSuficiente) {
      const diffA = (a.mesa.capacidad || 0) - numPersonas;
      const diffB = (b.mesa.capacidad || 0) - numPersonas;
      if (diffA !== diffB) return diffA - diffB;
    } else if (!a.capacidadSuficiente && !b.capacidadSuficiente) {
      if ((a.mesa.capacidad || 0) !== (b.mesa.capacidad || 0)) {
        return (b.mesa.capacidad || 0) - (a.mesa.capacidad || 0);
      }
    }
    return (a.mesa.numero || 0) - (b.mesa.numero || 0);
  });

  const mejorConZona = evaluaciones.find(
    (item) => item.disponibleEnHorario && item.capacidadSuficiente && item.coincideZona
  );
  const mejorGeneral =
    mejorConZona ||
    evaluaciones.find((item) => item.disponibleEnHorario && item.capacidadSuficiente);

  if (mejorGeneral) {
    mejorGeneral.recomendada = true;
  }

  return evaluaciones;
}

/**
 * Obtiene la reserva activa más cercana asignada a una mesa específica dentro de la ventana de atención.
 */
export function obtenerReservaProximaDeMesa(params: {
  mesa: Mesa;
  reservas: ReservaNegocio[];
  ahoraMs?: number;
  ventanaFuturaMin?: number;
  toleranciaPasadaMin?: number;
}): ReservaNegocio | null {
  const ahora = params.ahoraMs ?? Date.now();
  const minMs = ahora - (params.toleranciaPasadaMin ?? 45) * 60_000;
  const maxMs = ahora + (params.ventanaFuturaMin ?? 180) * 60_000;

  const candidatas: Array<{ reserva: ReservaNegocio; distanciaMs: number }> = [];

  for (const res of params.reservas || []) {
    if (!res) continue;
    if (res.estado !== 'pendiente' && res.estado !== 'confirmada') continue;

    const coincideId = Boolean(res.mesaId && res.mesaId === params.mesa.id);
    const coincideNumero =
      !res.mesaId &&
      typeof res.mesaNumero === 'number' &&
      res.mesaNumero === params.mesa.numero;

    if (!coincideId && !coincideNumero) continue;

    const resMs = parsearFechaHoraReservaMs(res.fechaHoraReserva);
    if (resMs === null) continue;
    if (resMs < minMs || resMs > maxMs) continue;

    candidatas.push({
      reserva: res,
      distanciaMs: Math.abs(resMs - ahora),
    });
  }

  if (candidatas.length === 0) return null;
  candidatas.sort((a, b) => a.distanciaMs - b.distanciaMs);
  return candidatas[0].reserva;
}

/**
 * Calcula las métricas consolidadas del Libro de Reservas y anticipos offline.
 */
export function calcularMetricasLibroReservas(
  reservas: ReservaNegocio[],
  ahoraMs: number = Date.now()
): MetricasLibroReservas {
  const hoyKey = obtenerFechaLocalYYYYMMDD(ahoraMs);
  const limiteProximasMs = ahoraMs + 120 * 60_000;

  let hoy = 0;
  let pendientes = 0;
  let confirmadas = 0;
  let completadas = 0;
  let canceladas = 0;
  let personasHoy = 0;
  let conMesaAsignada = 0;
  let totalAnticiposVerificadosCOP = 0;
  let totalAnticiposPendientesCOP = 0;
  let proximas2Horas = 0;

  for (const r of reservas || []) {
    if (!r) continue;
    const fechaKey = obtenerClaveFechaReserva(r.fechaHoraReserva);
    const esHoy = fechaKey === hoyKey;

    if (esHoy) {
      hoy += 1;
      if (r.estado !== 'cancelada') {
        personasHoy += Math.max(0, Number(r.personas) || 0);
      }
    }

    if (r.estado === 'pendiente') pendientes += 1;
    else if (r.estado === 'confirmada') confirmadas += 1;
    else if (r.estado === 'completada') completadas += 1;
    else if (r.estado === 'cancelada') canceladas += 1;

    if (r.estado !== 'cancelada') {
      if (r.mesaId || r.mesaNumero) {
        conMesaAsignada += 1;
      }

      const montoAnticipo = Math.max(0, Math.round(Number(r.anticipoMonto) || 0));
      if (montoAnticipo > 0) {
        if (r.anticipoEstado === 'verificado') {
          totalAnticiposVerificadosCOP += montoAnticipo;
        } else if (r.anticipoEstado === 'pendiente') {
          totalAnticiposPendientesCOP += montoAnticipo;
        }
      }
    }

    if (r.estado === 'pendiente' || r.estado === 'confirmada') {
      const ms = parsearFechaHoraReservaMs(r.fechaHoraReserva);
      if (ms !== null && ms >= ahoraMs && ms <= limiteProximasMs) {
        proximas2Horas += 1;
      }
    }
  }

  return {
    total: (reservas || []).length,
    hoy,
    pendientes,
    confirmadas,
    completadas,
    canceladas,
    personasHoy,
    conMesaAsignada,
    totalAnticiposVerificadosCOP,
    totalAnticiposPendientesCOP,
    proximas2Horas,
  };
}

/**
 * Devuelve etiqueta y emoji legible de la ocasión especial de una reserva.
 */
export function formatearOcasionReserva(
  ocasion?: OcasionReserva
): { label: string; emoji: string } | null {
  if (!ocasion || ocasion === 'ninguna') return null;
  return OCASIONES_META[ocasion] || null;
}

/**
 * Normaliza un número telefónico colombiano para enlaces directos de WhatsApp (wa.me).
 */
export function normalizarTelefonoReservaWhatsApp(telefono: string): string {
  let digitos = (telefono || '').replace(/\D/g, '');
  if (!digitos) return '';
  if (digitos.startsWith('0')) {
    digitos = digitos.replace(/^0+/, '');
  }
  if (digitos.length === 10 && digitos.startsWith('3')) {
    return `57${digitos}`;
  }
  return digitos;
}

function construirBloqueDetalleReserva(reserva: ReservaNegocio): string[] {
  const { fecha, hora } = formatearFechaHoraLegible(reserva.fechaHoraReserva);
  const lineas: string[] = [
    `📅 *Fecha:* ${fecha}${hora ? ` a las ${hora}` : ''}`,
    `👥 *Comensales:* ${reserva.personas} ${reserva.personas === 1 ? 'persona' : 'personas'}`,
  ];

  if (reserva.mesaNombre || reserva.mesaNumero) {
    const mesaTexto = reserva.mesaNombre || `Mesa ${reserva.mesaNumero}`;
    const zonaTexto = reserva.zonaPreferida ? ` (${reserva.zonaPreferida})` : '';
    lineas.push(`🪑 *Mesa asignada:* ${mesaTexto}${zonaTexto}`);
  } else if (reserva.zonaPreferida) {
    lineas.push(`📍 *Zona preferida:* ${reserva.zonaPreferida}`);
  }

  const ocasion = formatearOcasionReserva(reserva.ocasionEspecial);
  if (ocasion) {
    lineas.push(`${ocasion.emoji} *Motivo:* ${ocasion.label}`);
  }

  const montoAnticipo = Math.max(0, Math.round(Number(reserva.anticipoMonto) || 0));
  if (montoAnticipo > 0) {
    const metodo = reserva.anticipoMetodo === 'efectivo' ? 'Efectivo' : 'Transferencia';
    if (reserva.anticipoEstado === 'verificado') {
      lineas.push(`✅ *Anticipo verificado (${metodo}):* ${formatCOP(montoAnticipo)}`);
    } else if (reserva.anticipoEstado === 'pendiente') {
      lineas.push(
        `💳 *Anticipo pendiente (${metodo}):* ${formatCOP(montoAnticipo)} — envíanos tu comprobante por este chat para asegurar la mesa.`
      );
    }
  }

  return lineas;
}

/**
 * Construye el mensaje oficial de confirmación de reserva para WhatsApp.
 */
export function construirMensajeConfirmacionReservaWhatsApp(params: {
  reserva: ReservaNegocio;
  negocioNombre: string;
}): string {
  const negocio = params.negocioNombre.trim() || 'La Parada';
  const nombre = params.reserva.clienteNombre.trim() || 'Hola';
  const detalle = construirBloqueDetalleReserva(params.reserva);

  return [
    `¡Hola *${nombre}*! 👋 Tu reserva en *${negocio}* está *CONFIRMADA* ✅`,
    '',
    ...detalle,
    '',
    'Si necesitas ajustar la hora o el número de personas, escríbenos por aquí. ¡Te esperamos! 🔥',
  ].join('\n');
}

/**
 * Construye el mensaje de recordatorio previo de reserva para WhatsApp.
 */
export function construirMensajeRecordatorioReservaWhatsApp(params: {
  reserva: ReservaNegocio;
  negocioNombre: string;
}): string {
  const negocio = params.negocioNombre.trim() || 'La Parada';
  const nombre = params.reserva.clienteNombre.trim() || 'Hola';
  const detalle = construirBloqueDetalleReserva(params.reserva);

  return [
    `¡Hola *${nombre}*! ⏰ Te recordamos tu reserva en *${negocio}*`,
    '',
    ...detalle,
    '',
    'Por favor confírmanos tu asistencia respondiendo este mensaje. ¡Nos vemos pronto! 🍽️',
  ].join('\n');
}

/**
 * Genera la URL completa de WhatsApp con el teléfono normalizado y el mensaje precargado.
 */
export function generarUrlWhatsAppReserva(telefono: string, mensaje: string): string {
  const telNormalizado = normalizarTelefonoReservaWhatsApp(telefono);
  if (telNormalizado.length >= 10) {
    return `https://wa.me/${telNormalizado}?text=${encodeURIComponent(mensaje)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
}

function escapeCsvSeguro(valor: string | number | undefined | null): string {
  let texto = String(valor ?? '');
  if (/^[=+\-@\t\r]/.test(texto) && !/^-\d+(\.\d+)?$/.test(texto)) {
    texto = `'${texto}`;
  }
  return `"${texto.replace(/"/g, '""')}"`;
}

/**
 * Genera el contenido CSV con UTF-8 BOM para exportar el Libro de Reservas y anticipos.
 */
export function generarReservasCsv(reservas: ReservaNegocio[]): string {
  const headers = [
    'ID Reserva',
    'Fecha y Hora',
    'Cliente',
    'Teléfono',
    'Personas',
    'Estado',
    'Canal',
    'Mesa',
    'Zona',
    'Ocasión',
    'Estado Anticipo',
    'Método Anticipo',
    'Anticipo COP',
    'Referencia Anticipo',
    'Notas',
  ];

  const filas = (reservas || []).map((r) => {
    const ocasion = formatearOcasionReserva(r.ocasionEspecial);
    const mesa = r.mesaNombre || (r.mesaNumero ? `Mesa ${r.mesaNumero}` : 'Sin asignar');
    return [
      escapeCsvSeguro(r.id),
      escapeCsvSeguro(r.fechaHoraReserva),
      escapeCsvSeguro(r.clienteNombre),
      escapeCsvSeguro(r.clienteTelefono),
      escapeCsvSeguro(r.personas),
      escapeCsvSeguro(r.estado),
      escapeCsvSeguro(r.origen),
      escapeCsvSeguro(mesa),
      escapeCsvSeguro(r.zonaPreferida || ''),
      escapeCsvSeguro(ocasion?.label || ''),
      escapeCsvSeguro(r.anticipoEstado || 'sin_anticipo'),
      escapeCsvSeguro(r.anticipoMetodo || ''),
      escapeCsvSeguro(r.anticipoMonto ?? 0),
      escapeCsvSeguro(r.anticipoReferencia || ''),
      escapeCsvSeguro(r.notas || ''),
    ].join(',');
  });

  return `\uFEFF${[headers.map(escapeCsvSeguro).join(','), ...filas].join('\r\n')}`;
}

/**
 * Descarga en el navegador el archivo CSV del Libro de Reservas.
 */
export function descargarReservasCsv(reservas: ReservaNegocio[], nombreArchivo?: string): void {
  const contenido = generarReservasCsv(reservas);
  const fechaIso = new Date().toISOString().split('T')[0];
  descargarArchivoCsv(contenido, nombreArchivo || `libro_reservas_${fechaIso}.csv`);
}
