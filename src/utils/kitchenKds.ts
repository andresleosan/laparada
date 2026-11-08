import type { Domicilio, OrigenVenta } from '@/types';

export type KitchenUrgencyLevel = 'optimo' | 'atencion' | 'critico';
export type CanalComanda = OrigenVenta;
export type CanalFiltro = 'todos' | CanalComanda;
export type EstadoComandaFiltro = 'todos' | 'pendiente' | 'en_preparacion' | 'en_camino';

export interface KitchenUrgencyInfo {
  nivel: KitchenUrgencyLevel;
  minutos: number;
  segundos: number;
  tiempoFormateado: string;
  badgeLabel: string;
  borderClass: string;
  bgCardClass: string;
  badgeClass: string;
}

/**
 * Convierte cualquier tipo de timestamp (Firestore Timestamp, objeto {seconds}, Date o number) a milisegundos.
 */
export function timestampToMillis(timestamp: unknown, defaultMs: number = Date.now()): number {
  if (!timestamp) return defaultMs;
  if (typeof timestamp === 'object' && timestamp !== null) {
    if ('toMillis' in timestamp && typeof (timestamp as { toMillis: () => number }).toMillis === 'function') {
      return (timestamp as { toMillis: () => number }).toMillis();
    }
    if ('seconds' in timestamp && typeof (timestamp as { seconds: number }).seconds === 'number') {
      return (timestamp as { seconds: number }).seconds * 1000;
    }
  }
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  if (typeof timestamp === 'number' && Number.isFinite(timestamp)) {
    return timestamp;
  }
  return defaultMs;
}

/**
 * Calcula la urgencia y tiempo transcurrido de una comanda de cocina.
 * - Óptimo (verde): < 10 minutos
 * - Atención (ámbar): 10 - 20 minutos
 * - Crítico (rojo): > 20 minutos
 */
export function getKitchenUrgency(creadoEn: unknown, ahoraMs: number = Date.now()): KitchenUrgencyInfo {
  const inicioMs = timestampToMillis(creadoEn, ahoraMs);
  const transcurridoMs = Math.max(0, ahoraMs - inicioMs);
  const totalSegundos = Math.floor(transcurridoMs / 1000);
  const minutos = Math.floor(totalSegundos / 60);
  const segundos = totalSegundos % 60;

  const mm = String(minutos).padStart(2, '0');
  const ss = String(segundos).padStart(2, '0');
  const tiempoFormateado = minutos >= 60 ? `${minutos} min` : `${mm}:${ss}`;

  if (minutos < 10) {
    return {
      nivel: 'optimo',
      minutos,
      segundos,
      tiempoFormateado,
      badgeLabel: 'A tiempo (< 10 min)',
      borderClass: 'border-emerald-500/50 hover:border-emerald-400',
      bgCardClass: 'bg-emerald-950/15',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    };
  }

  if (minutos < 20) {
    return {
      nivel: 'atencion',
      minutos,
      segundos,
      tiempoFormateado,
      badgeLabel: 'Demora moderada (10-20 min)',
      borderClass: 'border-amber-500/60 hover:border-amber-400',
      bgCardClass: 'bg-amber-950/20',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  }

  return {
    nivel: 'critico',
    minutos,
    segundos,
    tiempoFormateado,
    badgeLabel: 'Urgente / Demorado (> 20 min)',
    borderClass: 'border-red-500 hover:border-red-400 ring-1 ring-red-500/40',
    bgCardClass: 'bg-red-950/25',
    badgeClass: 'bg-red-500/25 text-red-300 border-red-500/50 animate-pulse',
  };
}

/**
 * Obtiene el badge descriptivo del canal de procedencia del pedido.
 */
export function getCanalComandaBadge(origen?: string): {
  label: string;
  iconName: 'whatsapp' | 'web' | 'pos' | 'kiosco';
  badgeClass: string;
} {
  switch (origen) {
    case 'whatsapp':
      return {
        label: 'WhatsApp',
        iconName: 'whatsapp',
        badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60',
      };
    case 'web':
      return {
        label: 'Tienda Web',
        iconName: 'web',
        badgeClass: 'bg-sky-950/80 text-sky-300 border-sky-600/60',
      };
    case 'kiosco':
      return {
        label: 'Kiosco',
        iconName: 'kiosco',
        badgeClass: 'bg-purple-950/80 text-purple-300 border-purple-600/60',
      };
    case 'pos':
    default:
      return {
        label: 'Mostrador / POS',
        iconName: 'pos',
        badgeClass: 'bg-amber-950/80 text-amber-300 border-amber-600/60',
      };
  }
}

/**
 * Genera el identificador amigable o código de comanda.
 */
export function getCodigoComanda(domicilio: Domicilio): string {
  if (domicilio.numeroTurno) {
    return domicilio.numeroTurno.startsWith('#')
      ? domicilio.numeroTurno
      : `#${domicilio.numeroTurno}`;
  }
  if (domicilio.rastreoToken) {
    return `#${domicilio.rastreoToken.slice(0, 6).toUpperCase()}`;
  }
  const id = (domicilio.id || '').trim();
  if (id.length > 6) {
    return `#${id.slice(-6).toUpperCase()}`;
  }
  return `#${id || 'ORD'}`;
}

/**
 * Sintetizador Web Audio API: Campana de cocina para aviso de nueva comanda.
 * Toca un tono brillante de doble campana acústica (987.77 Hz [B5] y 1318.51 Hz [E6])
 * con armónicos resonantes y decay metálico agradable.
 */
export function playKitchenComandaBell(customAudioContext?: AudioContext): boolean {
  try {
    let ctx = customAudioContext;
    if (!ctx) {
      if (typeof window === 'undefined') return false;
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextClass) return false;
      ctx = new AudioContextClass();
    }

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }

    const now = ctx.currentTime;
    // Campana de 2 tonos armónicos estilo cocina clásica: B5 (987.77 Hz) y E6 (1318.51 Hz)
    const tones = [
      { freq: 987.77, start: now, duration: 0.55, gainVal: 0.28 },
      { freq: 1318.51, start: now + 0.08, duration: 0.65, gainVal: 0.35 },
    ];

    tones.forEach(({ freq, start, duration, gainVal }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      // Envolvente de percusión metálica (ataque instantáneo y caída exponencial)
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(gainVal, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration + 0.05);
    });

    // Si creamos una instancia propia temporal, la cerramos al terminar
    if (!customAudioContext) {
      setTimeout(() => {
        void ctx.close().catch(() => undefined);
      }, 900);
    }

    return true;
  } catch (error) {
    console.warn('No se pudo reproducir campana de comanda Web Audio API:', error);
    return false;
  }
}

/**
 * Filtra la lista de comandas según canal de origen y texto de búsqueda.
 */
export function filtrarComandas(
  comandas: Domicilio[],
  canalFiltro: CanalFiltro,
  busqueda: string = ''
): Domicilio[] {
  const query = busqueda.trim().toLowerCase();

  return comandas.filter((comanda) => {
    // Filtro por canal
    if (canalFiltro !== 'todos' && comanda.origen !== canalFiltro) {
      return false;
    }

    // Filtro por texto
    if (!query) return true;

    const codigo = getCodigoComanda(comanda).toLowerCase();
    const cliente = (comanda.clienteNombre || '').toLowerCase();
    const barrio = (comanda.barrio || '').toLowerCase();
    const direccion = (comanda.direccion || '').toLowerCase();
    const notas = (comanda.notas || '').toLowerCase();
    const itemsMatch = (comanda.items || []).some((item) =>
      item.nombre.toLowerCase().includes(query)
    );

    return (
      codigo.includes(query) ||
      cliente.includes(query) ||
      barrio.includes(query) ||
      direccion.includes(query) ||
      notas.includes(query) ||
      itemsMatch
    );
  });
}
