import type { Domicilio, ItemKioscoCustomizado, TurnoDisplay } from '@/types';
import { formatCOP } from '@/utils/formatCOP';

/**
 * Genera una cadena formateada para el número de turno (ej. K-001, K-015, K-120).
 */
export function generarNumeroTurno(secuencial: number, prefijo: string = 'K'): string {
  const numSeguro = Math.max(1, Math.floor(Math.abs(secuencial || 1)));
  const pad = numSeguro < 1000 ? String(numSeguro).padStart(3, '0') : String(numSeguro);
  return `${prefijo.trim().toUpperCase()}-${pad}`;
}

/**
 * Extrae el código corto numérico o visual de un turno para visualización compacta.
 */
export function extraerCodigoCortoTurno(numeroTurno: string): string {
  if (!numeroTurno) return '001';
  const clean = numeroTurno.replace(/[^0-9]/g, '');
  if (clean.length > 0) {
    return clean.slice(-3).padStart(3, '0');
  }
  return numeroTurno.slice(-3).toUpperCase();
}

/**
 * Calcula el total en COP de un pedido de kiosco de forma segura.
 */
export function calcularTotalKiosco(items: ItemKioscoCustomizado[]): number {
  if (!Array.isArray(items) || items.length === 0) return 0;
  return items.reduce((acc, item) => {
    const qty = Math.max(0, Math.floor(item.cantidad || 0));
    const price = Math.max(0, Math.round(item.precioUnitario || 0));
    return acc + (qty * price);
  }, 0);
}

/**
 * Formatea los modificadores y notas de un ítem para comanda o ticket.
 */
export function formatearModificadores(modificadores?: string[], notas?: string): string {
  const modsValidos = (modificadores || []).map((m) => m.trim()).filter(Boolean);
  const notaValida = (notas || '').trim();

  if (modsValidos.length === 0 && !notaValida) return '';
  if (modsValidos.length > 0 && notaValida) {
    return `${modsValidos.join(', ')} · Nota: "${notaValida}"`;
  }
  if (modsValidos.length > 0) {
    return modsValidos.join(', ');
  }
  return `Nota: "${notaValida}"`;
}

/**
 * Genera el texto con formato para compartir el ticket de turno por WhatsApp.
 */
export function generarMensajeWhatsAppTurno(params: {
  numeroTurno: string;
  clienteNombre: string;
  items: Array<{ cantidad: number; nombre: string; subtotal: number; modificadores?: string[] }>;
  total: number;
  negocioNombre: string;
  tipoServicio?: string;
  mesaNumero?: string;
}): string {
  const modalidadStr = params.tipoServicio === 'salon'
    ? (params.mesaNumero ? `🍽️ Salón (Mesa ${params.mesaNumero})` : '🍽️ Salón (Para comer aquí)')
    : '🛍️ Para Llevar';

  const lineasItems = (params.items || []).map((item) => {
    let str = `• ${item.cantidad}x ${item.nombre} - ${formatCOP(item.subtotal)}`;
    if (item.modificadores && item.modificadores.length > 0) {
      str += `\n  ↳ _(${item.modificadores.join(', ')})_`;
    }
    return str;
  }).join('\n');

  return `*${params.negocioNombre.toUpperCase()}* 🍔
*TICKET DE TURNO: ${params.numeroTurno}*
------------------------------
👤 *Cliente:* ${params.clienteNombre}
📍 *Modalidad:* ${modalidadStr}
------------------------------
*DETALLE DEL PEDIDO:*
${lineasItems}
------------------------------
💰 *TOTAL A PAGAR EN CAJA:* ${formatCOP(params.total)}

*Instrucciones de entrega:*
1. Acércate a la caja para realizar tu pago (Efectivo o Transferencia).
2. Conserva este turno y está atento a la pantalla de llamados en salón.

_¡Gracias por tu pedido!_`;
}

/**
 * Convierte un timestamp a milisegundos de forma tolerante.
 */
function toMillisSeguro(ts: unknown, fallbackMs: number = Date.now()): number {
  if (!ts) return fallbackMs;
  if (typeof ts === 'object' && ts !== null) {
    if ('toMillis' in ts && typeof (ts as { toMillis: () => number }).toMillis === 'function') {
      return (ts as { toMillis: () => number }).toMillis();
    }
    if ('seconds' in ts && typeof (ts as { seconds: number }).seconds === 'number') {
      return (ts as { seconds: number }).seconds * 1000;
    }
  }
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'number' && Number.isFinite(ts)) return ts;
  return fallbackMs;
}

/**
 * Filtra y categoriza pedidos en preparación y pedidos listos para la pantalla del llamador de salón.
 */
export function filtrarTurnosLlamador(
  domicilios: Domicilio[],
  ahoraMs: number = Date.now(),
  maxListos: number = 8,
  maxPreparando: number = 12
): { preparando: TurnoDisplay[]; listos: TurnoDisplay[] } {
  if (!Array.isArray(domicilios)) {
    return { preparando: [], listos: [] };
  }

  const preparando: TurnoDisplay[] = [];
  const listos: TurnoDisplay[] = [];

  for (const dom of domicilios) {
    if (!dom || !dom.id) continue;

    const numTurno = dom.numeroTurno || (dom.rastreoToken ? `#${dom.rastreoToken.slice(0, 4).toUpperCase()}` : `#${dom.id.slice(-4).toUpperCase()}`);
    const codCorto = extraerCodigoCortoTurno(numTurno);
    const creadoMs = toMillisSeguro(dom.creadoEn, ahoraMs);
    const minutosEspera = Math.max(0, Math.floor((ahoraMs - creadoMs) / 60000));
    const esKiosco = dom.origen === 'kiosco';

    // Determinar si está en preparación o listo
    // Nota: 'pendiente' y 'en_preparacion' van a la columna "Preparando"
    // 'en_camino' (para mostrador/kiosco significa listo para retirar) o 'entregado' reciente
    if (dom.estado === 'pendiente' || dom.estado === 'en_preparacion') {
      preparando.push({
        id: dom.id,
        numeroTurno: numTurno,
        codigoCorto: codCorto,
        clienteNombre: dom.clienteNombre || 'Cliente',
        tipoServicio: dom.tipoServicio as any,
        mesaNumero: dom.mesaNumero,
        estado: 'preparando',
        creadoEnMs: creadoMs,
        minutosEspera,
        esKiosco,
      });
    } else if (dom.estado === 'en_camino') {
      // Pedido despachado de cocina listo en el mostrador para retiro
      listos.push({
        id: dom.id,
        numeroTurno: numTurno,
        codigoCorto: codCorto,
        clienteNombre: dom.clienteNombre || 'Cliente',
        tipoServicio: dom.tipoServicio as any,
        mesaNumero: dom.mesaNumero,
        estado: 'listo',
        creadoEnMs: creadoMs,
        minutosEspera,
        esKiosco,
      });
    } else if (dom.estado === 'entregado') {
      // Solo mostrar entregados si ocurrieron en los últimos 10 minutos
      const entregadoMs = toMillisSeguro(dom.entregadoEn || dom.actualizadoEn, ahoraMs);
      const minutosDesdeEntregado = (ahoraMs - entregadoMs) / 60000;
      if (minutosDesdeEntregado <= 10) {
        listos.push({
          id: dom.id,
          numeroTurno: numTurno,
          codigoCorto: codCorto,
          clienteNombre: dom.clienteNombre || 'Cliente',
          tipoServicio: dom.tipoServicio as any,
          mesaNumero: dom.mesaNumero,
          estado: 'listo',
          creadoEnMs: creadoMs,
          minutosEspera,
          esKiosco,
        });
      }
    }
  }

  // Ordenar preparando por orden FIFO (los que más tiempo llevan esperando primero)
  preparando.sort((a, b) => a.creadoEnMs - b.creadoEnMs);

  // Ordenar listos por los más recientes primero para captar la atención del comensal
  listos.sort((a, b) => b.creadoEnMs - a.creadoEnMs);

  return {
    preparando: preparando.slice(0, maxPreparando),
    listos: listos.slice(0, maxListos),
  };
}

/**
 * Sintetizador Web Audio API: Reproduce un gong/chime armónico de 3 notas brillantes
 * (E5: 659.25Hz -> G#5: 830.61Hz -> B5: 987.77Hz) estilo llamada de aeropuerto/pantalla.
 */
export function playTurnoLlamadorChime(customAudioContext?: AudioContext): boolean {
  try {
    let ctx = customAudioContext;
    if (!ctx) {
      if (typeof window === 'undefined') return false;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return false;
      ctx = new AudioCtx();
    }

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const t0 = ctx.currentTime;
    const notes = [
      { freq: 659.25, time: 0.00, dur: 0.5 }, // E5
      { freq: 830.61, time: 0.22, dur: 0.5 }, // G#5
      { freq: 987.77, time: 0.44, dur: 0.8 }, // B5
    ];

    notes.forEach(({ freq, time, dur }) => {
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0 + time);

      // Curva envolvente suave
      gain.gain.setValueAtTime(0.001, t0 + time);
      gain.gain.linearRampToValueAtTime(0.25, t0 + time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t0 + time);
      osc.stop(t0 + time + dur + 0.05);
    });

    return true;
  } catch {
    return false;
  }
}

/**
 * Sintetizador de voz por Web Speech API para anunciar el turno llamado en salón.
 */
export function anunciarTurnoVoz(
  numeroTurno: string,
  clienteNombre?: string,
  customSynth?: SpeechSynthesis,
  customUtteranceClass?: typeof SpeechSynthesisUtterance
): boolean {
  try {
    const synth = customSynth || (typeof window !== 'undefined' ? window.speechSynthesis : undefined);
    if (!synth || typeof synth.speak !== 'function') return false;

    // Detener cualquier locución previa
    synth.cancel();

    const UtteranceClass = customUtteranceClass || (typeof window !== 'undefined' && 'SpeechSynthesisUtterance' in window ? window.SpeechSynthesisUtterance : undefined);
    if (!UtteranceClass) return false;

    const nombreStr = clienteNombre && clienteNombre !== 'Cliente' ? `para ${clienteNombre}` : '';
    const texto = `¡Turno ${numeroTurno} ${nombreStr}, su pedido está listo para reclamar!`;

    const utterance = new UtteranceClass(texto);
    utterance.lang = 'es-CO';
    utterance.rate = 1.0;
    utterance.pitch = 1.1;

    // Buscar voz en español preferida
    const voices = synth.getVoices ? synth.getVoices() : [];
    const spanishVoice = voices.find((v) => v.lang.startsWith('es-') || v.lang.includes('es'));
    if (spanishVoice) {
      utterance.voice = spanishVoice;
    }

    synth.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
