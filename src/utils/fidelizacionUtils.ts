import type {
  Cliente,
  NivelFidelizacion,
  EstadoRiesgoCliente,
  CampanaWhatsAppTipo,
  ProgresoTarjetaSellos,
  KpisFidelizacion,
} from '@/types';
import { normalizarTelefono } from './clienteUtils';

export const META_SELLOS_DEFECTO = 6;

function parseDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (
    typeof val === 'object' &&
    val !== null &&
    'toDate' in val &&
    typeof (val as { toDate: () => Date }).toDate === 'function'
  ) {
    return (val as { toDate: () => Date }).toDate();
  }
  if (typeof val === 'string' || typeof val === 'number') {
    return new Date(val);
  }
  return new Date();
}

/**
 * Evalúa el nivel de fidelización VIP de un cliente según el número de pedidos completados.
 */
export function evaluarNivelFidelizacion(cliente: Pick<Cliente, 'totalPedidos' | 'totalConsumido'>): {
  nivel: NivelFidelizacion;
  label: string;
  badgeCls: string;
  icono: string;
  descripcion: string;
} {
  const pedidos = Math.max(0, cliente.totalPedidos || 0);

  if (pedidos >= 15) {
    return {
      nivel: 'diamante',
      label: 'VIP Diamante',
      badgeCls: 'bg-sky-400/20 text-sky-400 border-sky-400/40',
      icono: '💎',
      descripcion: 'Cliente de máxima lealtad (≥ 15 pedidos)',
    };
  }

  if (pedidos >= 7) {
    return {
      nivel: 'oro',
      label: 'VIP Oro',
      badgeCls: 'bg-gold-400/20 text-gold-400 border-gold-400/40',
      icono: '👑',
      descripcion: 'Cliente frecuente distinguido (7 a 14 pedidos)',
    };
  }

  if (pedidos >= 3) {
    return {
      nivel: 'plata',
      label: 'VIP Plata',
      badgeCls: 'bg-slate-300/20 text-slate-300 border-slate-400/40',
      icono: '⭐',
      descripcion: 'Cliente habitual recurrente (3 a 6 pedidos)',
    };
  }

  return {
    nivel: 'bronce',
    label: 'Bronce',
    badgeCls: 'bg-amber-600/20 text-amber-500 border-amber-600/30',
    icono: '🥉',
    descripcion: 'Cliente inicial (1 a 2 pedidos)',
  };
}

/**
 * Calcula los días transcurridos desde la última compra del cliente.
 */
export function calcularDiasDesdeUltimaCompra(
  cliente: Pick<Cliente, 'ultimoPedidoEn'>,
  fechaReferencia: Date = new Date()
): number {
  if (!cliente.ultimoPedidoEn) return 0;
  const fechaUltimo = parseDate(cliente.ultimoPedidoEn);
  const diffMs = fechaReferencia.getTime() - fechaUltimo.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Evalúa el semáforo y estado de retención / riesgo de inactividad de un cliente.
 */
export function evaluarEstadoRiesgoCliente(
  cliente: Pick<Cliente, 'totalPedidos' | 'ultimoPedidoEn'>,
  fechaReferencia: Date = new Date()
): {
  estado: EstadoRiesgoCliente;
  diasInactivo: number;
  label: string;
  badgeCls: string;
  dotCls: string;
  descripcion: string;
} {
  const dias = calcularDiasDesdeUltimaCompra(cliente, fechaReferencia);
  const totalPedidos = Math.max(0, cliente.totalPedidos || 0);

  if (totalPedidos <= 1 && dias <= 14) {
    return {
      estado: 'nuevo',
      diasInactivo: dias,
      label: 'Nuevo',
      badgeCls: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
      dotCls: 'bg-sky-400',
      descripcion: 'Cliente reciente de primera visita',
    };
  }

  if (dias <= 14) {
    return {
      estado: 'activo',
      diasInactivo: dias,
      label: 'Activo',
      badgeCls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      dotCls: 'bg-emerald-400',
      descripcion: `Compró hace ${dias === 0 ? 'hoy' : `${dias}d`}`,
    };
  }

  if (dias <= 30) {
    return {
      estado: 'en_riesgo',
      diasInactivo: dias,
      label: 'En Riesgo',
      badgeCls: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      dotCls: 'bg-amber-400 animate-pulse',
      descripcion: `Sin compra hace ${dias} días (alerta de retención)`,
    };
  }

  return {
    estado: 'inactivo',
    diasInactivo: dias,
    label: 'Inactivo',
    badgeCls: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    dotCls: 'bg-rose-400',
    descripcion: `Inactivo hace más de ${dias} días (dormido)`,
  };
}

/**
 * Calcula las métricas de la tarjeta digital de sellos para un cliente.
 */
export function calcularProgresoTarjetaSellos(
  sellosActuales: number = 0,
  metaSellos: number = META_SELLOS_DEFECTO,
  recompensasDisponibles: number = 0,
  recompensasRedimidas: number = 0
): ProgresoTarjetaSellos {
  const meta = Math.max(1, Math.round(Number.isFinite(metaSellos) ? metaSellos : META_SELLOS_DEFECTO));
  const sellosSanitizados = Math.max(0, Math.round(Number.isFinite(sellosActuales) ? sellosActuales : 0));
  const sellosEnTarjeta = sellosSanitizados % meta;
  const faltantes = sellosEnTarjeta === 0 && sellosSanitizados > 0 ? 0 : meta - sellosEnTarjeta;
  const porcentaje = Math.min(100, Math.round((sellosEnTarjeta / meta) * 100));

  const disp = Math.max(0, Math.round(Number.isFinite(recompensasDisponibles) ? recompensasDisponibles : 0));
  const redim = Math.max(0, Math.round(Number.isFinite(recompensasRedimidas) ? recompensasRedimidas : 0));

  return {
    sellosActuales: sellosEnTarjeta,
    metaSellos: meta,
    faltantesParaRecompensa: faltantes,
    porcentajeProgreso: porcentaje,
    tarjetaCompletada: disp > 0,
    recompensasDisponibles: disp,
    recompensasRedimidas: redim,
  };
}

/**
 * Genera el texto del mensaje para campañas de WhatsApp con formato enriquecido.
 */
export function generarMensajeCampanaWhatsApp(
  tipo: CampanaWhatsAppTipo,
  cliente: Cliente,
  nombreNegocio: string = 'La Parada',
  extra?: { beneficio?: string; mensajeLibre?: string }
): string {
  const nombre = cliente.nombre ? cliente.nombre.trim() : 'amigo/a';
  const negocio = nombreNegocio.trim() || 'La Parada';
  const meta = cliente.metaSellos || META_SELLOS_DEFECTO;
  const sellos = (cliente.sellosActuales || 0) % meta;
  const faltantes = meta - sellos;
  const nivel = evaluarNivelFidelizacion(cliente).label;

  switch (tipo) {
    case 'reactivacion_riesgo': {
      const beneficioTexto = extra?.beneficio
        ? `\n\n🎁 *¡Tenemos un regalo para ti!* Muestra este mensaje y recibe *${extra.beneficio}* en tu próximo pedido.`
        : '\n\n🍔 ¿Te antojamos hoy? Pide en nuestro mostrador o a domicilio.';
      return `¡Hola *${nombre}*! 👋 En *${negocio}* hace días que no te vemos y te extrañamos mucho.${beneficioTexto}\n\n¿Te marchamos tu orden hoy? 🔥`;
    }

    case 'recompensa_lista': {
      return `🎉 *¡Felicidades ${nombre}!* Has completado tu tarjeta de sellos en *${negocio}*.\n\nTienes *1 Recompensa de Cortesía* lista para disfrutar en tu próxima visita o pedido. 🍔✨\n\n¡Solo muéstrale este mensaje al cajero para redimirla! Te esperamos con el mejor sabor.`;
    }

    case 'sellos_progreso': {
      return `👋 ¡Hola *${nombre}*! Ya llevas *${sellos}/${meta} sellos* acumulados en tu tarjeta de fidelización de *${negocio}*. 🎯\n\n¡Solo te falta(n) *${faltantes} sello(s)* para desbloquear tu recompensa de la casa! 🎁🔥\n\n¿Pasas hoy por tu próximo sello?`;
    }

    case 'agradecimiento_vip': {
      return `👑 *¡Hola ${nombre}!* Queremos agradecerte de corazón por ser cliente *${nivel}* en *${negocio}*. ✨\n\nTu preferencia y lealtad hacen grande nuestra cocina. Siempre será un placer atenderte.\n\n¡Feliz día y gracias por elegirnos! 🍔❤️`;
    }

    case 'recordar_lo_de_siempre': {
      const itemsTexto =
        cliente.loDeSiempre && cliente.loDeSiempre.items.length > 0
          ? cliente.loDeSiempre.items.map((it) => `${it.cantidad}x ${it.nombre}`).join(', ')
          : 'tu plato favorito';
      return `🍔 ¿Con antojo de lo de siempre, *${nombre}*?\n\nEn *${negocio}* tenemos tus favoritos en la plancha: *${itemsTexto}*.\n\n¡Escríbenos o visítanos y te lo preparamos al instante! 🔥`;
    }

    case 'personalizado':
    default:
      return (
        extra?.mensajeLibre?.trim() ||
        `¡Hola *${nombre}*! Te saludamos desde *${negocio}*. Siempre es un placer tenerte con nosotros. 🍔🔥`
      );
  }
}

/**
 * Calcula los KPIs ejecutivos del Centro de Fidelización y Retención.
 */
export function calcularKpisFidelizacion(
  clientes: Cliente[],
  fechaReferencia: Date = new Date()
): KpisFidelizacion {
  const totalClientes = clientes.length;
  let clientesActivos = 0;
  let clientesEnRiesgo = 0;
  let clientesInactivos = 0;
  let clientesNuevos = 0;
  let clientesVip = 0;
  let recompensasDisponiblesTotal = 0;
  let recompensasRedimidasTotal = 0;

  for (const c of clientes) {
    const estado = evaluarEstadoRiesgoCliente(c, fechaReferencia).estado;
    if (estado === 'activo') clientesActivos += 1;
    else if (estado === 'en_riesgo') clientesEnRiesgo += 1;
    else if (estado === 'inactivo') clientesInactivos += 1;
    else if (estado === 'nuevo') clientesNuevos += 1;

    const nivel = evaluarNivelFidelizacion(c).nivel;
    if (nivel !== 'bronce') clientesVip += 1;

    recompensasDisponiblesTotal += Math.max(0, c.recompensasDisponibles || 0);
    recompensasRedimidasTotal += Math.max(0, c.recompensasRedimidas || 0);
  }

  const clientesConConsumo = clientesActivos + clientesEnRiesgo + clientesInactivos + clientesNuevos;
  const tasaRetencion =
    clientesConConsumo > 0 ? Math.round((clientesActivos / clientesConConsumo) * 100) : 0;

  return {
    totalClientes,
    clientesActivos,
    clientesEnRiesgo,
    clientesInactivos,
    clientesNuevos,
    clientesVip,
    recompensasDisponiblesTotal,
    recompensasRedimidasTotal,
    tasaRetencion,
  };
}

/**
 * Exporta un segmento de clientes para campañas a formato CSV compatible con Excel.
 */
export function exportarCampanaClientesCsv(
  clientes: Cliente[],
  _tituloFiltro: string = 'todos',
  fechaReferencia: Date = new Date()
): string {
  const headers = [
    'Nombre',
    'Teléfono',
    'Nivel VIP',
    'Estado Retención',
    'Días Inactivo',
    'Total Pedidos',
    'Total Consumido COP',
    'Sellos Actuales',
    'Recompensas Disponibles',
    'Recompensas Redimidas',
    'Barrio',
    'Lo de Siempre',
  ];

  const rows = clientes.map((c) => {
    const nivel = evaluarNivelFidelizacion(c).label;
    const riesgo = evaluarEstadoRiesgoCliente(c, fechaReferencia);
    const sellosProg = calcularProgresoTarjetaSellos(
      c.sellosActuales,
      c.metaSellos,
      c.recompensasDisponibles,
      c.recompensasRedimidas
    );
    const loDeSiempre = c.loDeSiempre?.items
      ? c.loDeSiempre.items.map((i) => `${i.cantidad}x ${i.nombre}`).join(' + ')
      : 'N/A';

    return [
      `"${c.nombre.replace(/"/g, '""')}"`,
      `"${normalizarTelefono(c.telefono)}"`,
      `"${nivel}"`,
      `"${riesgo.label}"`,
      riesgo.diasInactivo,
      c.totalPedidos || 0,
      c.totalConsumido || 0,
      `${sellosProg.sellosActuales}/${sellosProg.metaSellos}`,
      sellosProg.recompensasDisponibles,
      sellosProg.recompensasRedimidas,
      `"${(c.barrio || '').replace(/"/g, '""')}"`,
      `"${loDeSiempre.replace(/"/g, '""')}"`,
    ].join(';');
  });

  // UTF-8 BOM para apertura perfecta en Excel
  return `\uFEFF${headers.join(';')}\n${rows.join('\n')}`;
}
