import type {
  ModuloNotificacion,
  NotificacionOperativa,
  UrgenciaNotificacion,
  FiltrosNotificaciones,
  MetricasNotificaciones,
  CrearNotificacionInput,
} from '@/types/notificacion';

export const NOTIFICACIONES_SONIDO_STORAGE_KEY = 'laparada_notificaciones_sonido';

/**
 * Consulta la preferencia del usuario sobre si las alertas sonoras están activas.
 */
export function getNotificacionesSonidoHabilitado(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return true;
  }
  try {
    const val = window.localStorage.getItem(NOTIFICACIONES_SONIDO_STORAGE_KEY);
    return val !== 'off';
  } catch {
    return true;
  }
}

/**
 * Persiste la preferencia del usuario sobre alertas sonoras.
 */
export function setNotificacionesSonidoHabilitado(habilitado: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(
      NOTIFICACIONES_SONIDO_STORAGE_KEY,
      habilitado ? 'on' : 'off'
    );
  } catch (err) {
    console.warn('Error guardando preferencia de sonido:', err);
  }
}

/**
 * Helper para obtener o instanciar AudioContext con fallback para WebKit.
 */
function getAudioContext(custom?: AudioContext): AudioContext | null {
  if (custom) return custom;
  if (typeof window === 'undefined') return null;
  const AudioContextClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return null;
  try {
    return new AudioContextClass();
  } catch {
    return null;
  }
}

/**
 * Alerta auditiva de URGENCIA CRÍTICA:
 * Tono doble pulsante de emergencia rápida (880 Hz -> 1046 Hz).
 */
export function playAlertaCriticaAudio(customAudioContext?: AudioContext): boolean {
  try {
    const ctx = getAudioContext(customAudioContext);
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const t = ctx.currentTime;

    // Primer pulso (A5: 880 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(880, t);
    gain1.gain.setValueAtTime(0, t);
    gain1.gain.linearRampToValueAtTime(0.2, t + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.15);

    // Segundo pulso (C6: 1046.5 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(1046.5, t + 0.16);
    gain2.gain.setValueAtTime(0, t + 0.16);
    gain2.gain.linearRampToValueAtTime(0.25, t + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t + 0.16);
    osc2.stop(t + 0.36);

    if (!customAudioContext) {
      setTimeout(() => {
        void ctx.close().catch(() => {});
      }, 500);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Alerta auditiva de URGENCIA ALTA:
 * Campana armónica brillante de cocina / nuevo pedido (E5: 659.25 Hz -> G5: 783.99 Hz).
 */
export function playAlertaAltaAudio(customAudioContext?: AudioContext): boolean {
  try {
    const ctx = getAudioContext(customAudioContext);
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const t = ctx.currentTime;

    // Nota 1: E5
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, t);
    gain1.gain.setValueAtTime(0, t);
    gain1.gain.linearRampToValueAtTime(0.22, t + 0.015);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(t);
    osc1.stop(t + 0.19);

    // Nota 2: G5
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, t + 0.12);
    gain2.gain.setValueAtTime(0, t + 0.12);
    gain2.gain.linearRampToValueAtTime(0.26, t + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(t + 0.12);
    osc2.stop(t + 0.43);

    if (!customAudioContext) {
      setTimeout(() => {
        void ctx.close().catch(() => {});
      }, 550);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Alerta auditiva INFORMATIVA / MEDIA / BAJA:
 * Ding sutil y suave con decaimiento natural (C5: 523.25 Hz).
 */
export function playAlertaInformativaAudio(customAudioContext?: AudioContext): boolean {
  try {
    const ctx = getAudioContext(customAudioContext);
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.29);

    if (!customAudioContext) {
      setTimeout(() => {
        void ctx.close().catch(() => {});
      }, 400);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Despachador de alertas de sonido según la severidad/urgencia indicada.
 * Respeta la preferencia guardada en localStorage (`laparada_notificaciones_sonido`).
 */
export function reproducirAlertaPorUrgencia(
  urgencia: UrgenciaNotificacion,
  customAudioContext?: AudioContext,
  ignorarPreferencia = false
): boolean {
  if (!ignorarPreferencia && !getNotificacionesSonidoHabilitado()) {
    return false;
  }

  switch (urgencia) {
    case 'critica':
      return playAlertaCriticaAudio(customAudioContext);
    case 'alta':
      return playAlertaAltaAudio(customAudioContext);
    case 'media':
    case 'baja':
    default:
      return playAlertaInformativaAudio(customAudioContext);
  }
}

/**
 * Filtra notificaciones según módulo, urgencia, estado de lectura y búsqueda textual.
 */
export function filtrarNotificaciones(
  notificaciones: NotificacionOperativa[],
  filtros: FiltrosNotificaciones
): NotificacionOperativa[] {
  const query = (filtros.busqueda || '').trim().toLowerCase();

  return notificaciones.filter((notif) => {
    // Filtro por módulo
    if (filtros.modulo && filtros.modulo !== 'todos' && notif.modulo !== filtros.modulo) {
      return false;
    }

    // Filtro por urgencia
    if (filtros.urgencia && filtros.urgencia !== 'todas' && notif.urgencia !== filtros.urgencia) {
      return false;
    }

    // Filtro por estado de lectura
    if (filtros.estado === 'no_leidas' && notif.leida) {
      return false;
    }
    if (filtros.estado === 'leidas' && !notif.leida) {
      return false;
    }

    // Filtro de búsqueda textual
    if (query) {
      const coincide =
        notif.titulo.toLowerCase().includes(query) ||
        notif.mensaje.toLowerCase().includes(query) ||
        notif.modulo.toLowerCase().includes(query) ||
        notif.tipo.toLowerCase().includes(query) ||
        (notif.creadaPor && notif.creadaPor.toLowerCase().includes(query));
      if (!coincide) return false;
    }

    return true;
  });
}

/**
 * Calcula métricas agregadas de notificaciones operativas.
 */
export function calcularMetricasNotificaciones(
  notificaciones: NotificacionOperativa[]
): MetricasNotificaciones {
  const conteoModulos: Record<ModuloNotificacion, number> = {
    pedidos: 0,
    cocina: 0,
    inventario: 0,
    salon: 0,
    caja: 0,
    sistema: 0,
  };

  let noLeidas = 0;
  let criticas = 0;
  let altas = 0;
  let medias = 0;
  let bajas = 0;

  for (const n of notificaciones) {
    if (!n.leida) {
      noLeidas++;
      if (n.urgencia === 'critica') criticas++;
      if (n.urgencia === 'alta') altas++;
      if (n.urgencia === 'media') medias++;
      if (n.urgencia === 'baja') bajas++;
    }

    if (conteoModulos[n.modulo] !== undefined) {
      conteoModulos[n.modulo]++;
    } else {
      conteoModulos.sistema++;
    }
  }

  return {
    total: notificaciones.length,
    noLeidas,
    criticas,
    altas,
    medias,
    bajas,
    porModulo: conteoModulos,
  };
}

/**
 * Formatea una fecha ISO a tiempo relativo legible en español ("Hace 5 min", "Hace 2 h", etc.).
 */
export function formatearTiempoRelativoNotificacion(
  fechaIso: string,
  fechaReferencia = new Date()
): string {
  try {
    const fecha = new Date(fechaIso);
    if (isNaN(fecha.getTime())) return 'Reciente';

    const diffMs = fechaReferencia.getTime() - fecha.getTime();
    if (diffMs < 0) return 'Ahora mismo';

    const diffSeg = Math.floor(diffMs / 1000);
    if (diffSeg < 60) return 'Hace un momento';

    const diffMin = Math.floor(diffSeg / 60);
    if (diffMin < 60) return `Hace ${diffMin} min`;

    const diffHoras = Math.floor(diffMin / 60);
    if (diffHoras < 24) return `Hace ${diffHoras} h`;

    const diffDias = Math.floor(diffHoras / 24);
    if (diffDias === 1) return 'Ayer';
    if (diffDias < 7) return `Hace ${diffDias} d`;

    return fecha.toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return 'Reciente';
  }
}

/**
 * Retorna configuraciones semánticas de color para badges de urgencia.
 */
export function getBadgeUrgenciaInfo(urgencia: UrgenciaNotificacion): {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
} {
  switch (urgencia) {
    case 'critica':
      return {
        label: 'Crítica',
        bgClass: 'bg-rose-950/60',
        textClass: 'text-rose-400',
        borderClass: 'border-rose-500/40',
        dotClass: 'bg-rose-500',
      };
    case 'alta':
      return {
        label: 'Alta',
        bgClass: 'bg-amber-950/60',
        textClass: 'text-amber-400',
        borderClass: 'border-amber-500/40',
        dotClass: 'bg-amber-500',
      };
    case 'media':
      return {
        label: 'Media',
        bgClass: 'bg-sky-950/60',
        textClass: 'text-sky-400',
        borderClass: 'border-sky-500/40',
        dotClass: 'bg-sky-400',
      };
    case 'baja':
    default:
      return {
        label: 'Informativa',
        bgClass: 'bg-neutral-800/80',
        textClass: 'text-neutral-300',
        borderClass: 'border-neutral-700',
        dotClass: 'bg-neutral-400',
      };
  }
}

/**
 * Retorna información y ruta de navegación sugerida para cada módulo.
 */
export function getModuloInfo(modulo: ModuloNotificacion): {
  label: string;
  defaultRoute: string;
} {
  switch (modulo) {
    case 'pedidos':
      return { label: 'Pedidos Web / Kiosco', defaultRoute: '/pedidos' };
    case 'cocina':
      return { label: 'Cocina & KDS', defaultRoute: '/cocina' };
    case 'inventario':
      return { label: 'Bodega & Inventario', defaultRoute: '/inventario' };
    case 'salon':
      return { label: 'Salón & Mesas', defaultRoute: '/mesas' };
    case 'caja':
      return { label: 'Caja & Ventas', defaultRoute: '/admin' };
    case 'sistema':
    default:
      return { label: 'Sistema', defaultRoute: '/notificaciones' };
  }
}

/**
 * Genera alertas reactivas automáticas basadas en el estado operativo actual
 * (stock mínimo en inventario y comandas demoradas en cocina).
 */
export function sintetizarAlertasOperativasEnVivo(params: {
  inventario?: Array<{
    id: string;
    nombre: string;
    stockActual: number;
    stockMinimo: number;
    unidadMedida?: string;
  }>;
  comandasKds?: Array<{
    id: string;
    creadoEn?: string | number | { seconds: number };
    clienteNombre?: string;
    codigoTurno?: string;
    mesa?: string;
    estado?: string;
  }>;
  tiempoLimiteMinutos?: number;
  ahora?: Date;
}): CrearNotificacionInput[] {
  const alertas: CrearNotificacionInput[] = [];
  const ahoraMs = (params.ahora || new Date()).getTime();
  const limiteMin = params.tiempoLimiteMinutos || 15;

  // 1. Detección de stock crítico o mínimo en bodega
  if (params.inventario && params.inventario.length > 0) {
    for (const item of params.inventario) {
      if (item.stockActual <= 0) {
        alertas.push({
          modulo: 'inventario',
          tipo: 'stock_agotado',
          titulo: `¡Stock Agotado: ${item.nombre}!`,
          mensaje: `El insumo ${item.nombre} se encuentra en 0 ${item.unidadMedida || 'uds'}. Reponer de inmediato para evitar bloqueos en cocina.`,
          urgencia: 'critica',
          enlace: '/inventario',
          origen: 'automatico',
          metadata: { insumoId: item.id, stockActual: item.stockActual },
        });
      } else if (item.stockActual <= item.stockMinimo) {
        alertas.push({
          modulo: 'inventario',
          tipo: 'stock_minimo',
          titulo: `Stock Bajo: ${item.nombre}`,
          mensaje: `Quedan ${item.stockActual} ${item.unidadMedida || 'uds'} (mínimo configurado: ${item.stockMinimo}).`,
          urgencia: 'alta',
          enlace: '/inventario',
          origen: 'automatico',
          metadata: { insumoId: item.id, stockActual: item.stockActual, stockMinimo: item.stockMinimo },
        });
      }
    }
  }

  // 2. Detección de comandas demoradas en cocina
  if (params.comandasKds && params.comandasKds.length > 0) {
    for (const comanda of params.comandasKds) {
      if (comanda.estado === 'entregado' || comanda.estado === 'cancelado') {
        continue;
      }

      let creadoEnMs = ahoraMs;
      if (typeof comanda.creadoEn === 'string') {
        creadoEnMs = new Date(comanda.creadoEn).getTime();
      } else if (typeof comanda.creadoEn === 'number') {
        creadoEnMs = comanda.creadoEn;
      } else if (comanda.creadoEn && typeof comanda.creadoEn.seconds === 'number') {
        creadoEnMs = comanda.creadoEn.seconds * 1000;
      }

      const minutosTranscurridos = Math.max(0, Math.floor((ahoraMs - creadoEnMs) / 60000));

      if (minutosTranscurridos >= 20) {
        alertas.push({
          modulo: 'cocina',
          tipo: 'comanda_muy_demorada',
          titulo: `¡Comanda Crítica: ${minutosTranscurridos} min en cocina!`,
          mensaje: `La comanda ${comanda.codigoTurno || comanda.id.slice(0, 6)} (${comanda.clienteNombre || comanda.mesa || 'Cliente'}) supera los 20 minutos de espera.`,
          urgencia: 'critica',
          enlace: '/cocina',
          origen: 'automatico',
          metadata: { comandaId: comanda.id, minutosTranscurridos },
        });
      } else if (minutosTranscurridos >= limiteMin) {
        alertas.push({
          modulo: 'cocina',
          tipo: 'comanda_demorada',
          titulo: `Comanda demorada: ${minutosTranscurridos} min`,
          mensaje: `Comanda ${comanda.codigoTurno || comanda.id.slice(0, 6)} lleva ${minutosTranscurridos} minutos en preparación.`,
          urgencia: 'alta',
          enlace: '/cocina',
          origen: 'automatico',
          metadata: { comandaId: comanda.id, minutosTranscurridos },
        });
      }
    }
  }

  return alertas;
}

/**
 * Genera un resumen estructurado para compartir por WhatsApp al equipo o administrador.
 */
export function generarResumenNotificacionesWhatsApp(
  notificaciones: NotificacionOperativa[],
  nombreNegocio = 'La Parada'
): string {
  const metricas = calcularMetricasNotificaciones(notificaciones);
  const noLeidas = notificaciones.filter((n) => !n.leida);

  let texto = `*🔔 REPORTE DE ALERTAS OPERATIVAS — ${nombreNegocio.toUpperCase()}*\n`;
  texto += `📅 Fecha: ${new Date().toLocaleDateString('es-CO', { dateStyle: 'medium' })} | ⏰ ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}\n\n`;

  texto += `*📊 Resumen de Alertas:*\n`;
  texto += `• Total pendientes: *${metricas.noLeidas}*\n`;
  if (metricas.criticas > 0) {
    texto += `• 🚨 Críticas en fuego: *${metricas.criticas}*\n`;
  }
  if (metricas.altas > 0) {
    texto += `• ⚠️ Altas urgencias: *${metricas.altas}*\n`;
  }
  texto += `\n*Desglose por Módulo:*\n`;
  if (metricas.porModulo.cocina > 0) texto += `🍳 Cocina / KDS: ${metricas.porModulo.cocina}\n`;
  if (metricas.porModulo.inventario > 0) texto += `📦 Bodega / Stock: ${metricas.porModulo.inventario}\n`;
  if (metricas.porModulo.pedidos > 0) texto += `🛵 Pedidos / Kiosco: ${metricas.porModulo.pedidos}\n`;
  if (metricas.porModulo.salon > 0) texto += `🍽️ Salón / Mesas: ${metricas.porModulo.salon}\n`;
  if (metricas.porModulo.caja > 0) texto += `💵 Caja / Ventas: ${metricas.porModulo.caja}\n`;

  if (noLeidas.length > 0) {
    texto += `\n*Últimas Alertas Pendientes:*\n`;
    const top5 = noLeidas.slice(0, 5);
    top5.forEach((item, idx) => {
      const emoji = item.urgencia === 'critica' ? '🚨' : item.urgencia === 'alta' ? '⚠️' : 'ℹ️';
      texto += `${idx + 1}. ${emoji} *${item.titulo}*\n   _${item.mensaje}_\n`;
    });
  } else {
    texto += `\n✅ *Todo el sistema opera en verde y sin alertas pendientes.*`;
  }

  return encodeURIComponent(texto);
}
