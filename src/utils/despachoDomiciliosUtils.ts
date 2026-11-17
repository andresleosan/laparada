import type {
  ConfiguracionZonasDomicilio,
  Domicilio,
  FiltrosDespachoDomicilios,
  InfoSlaDomicilio,
  KpisDespachoDomicilios,
  ResolucionTarifaBarrio,
  ZonaDomicilio,
} from '@/types';
import { toValidAdminDate } from './adminAnalytics';
import { descargarArchivoCsv } from './contabilidadUtils';
import { buildGoogleMapsUrl, cleanPhoneNumber } from './deliveryNavigation';
import { formatCOP } from './formatCOP';

/**
 * Zonas predeterminadas para operación gastronómica en Cúcuta y su Área Metropolitana.
 */
export const ZONAS_DOMICILIO_CUCUTA_DEFAULT: ZonaDomicilio[] = [
  {
    id: 'zona-cercana',
    nombre: 'Cercana (Centro - Caobos)',
    barrios: ['Centro', 'Caobos', 'La Playa', 'El Contento', 'Latino', 'Blanco'],
    tarifaEnvio: 4000,
    tiempoEstimadoMin: 25,
    pedidoMinimo: 15000,
    activa: true,
  },
  {
    id: 'zona-norte-oriente',
    nombre: 'Norte y Oriente',
    barrios: [
      'Los Pinos',
      'Quinta Oriental',
      'San Luis',
      'La Riviera',
      'Niza',
      'Prados del Este',
      'Ceiba',
      'Guaimaral',
    ],
    tarifaEnvio: 5000,
    tiempoEstimadoMin: 30,
    pedidoMinimo: 20000,
    activa: true,
  },
  {
    id: 'zona-occidente-sur',
    nombre: 'Occidente y Sur',
    barrios: [
      'Atalaya',
      'Libertad',
      'San Martín',
      'Belén',
      'Aeropuerto',
      'Salado',
      'Trigal del Norte',
      'San Mateo',
    ],
    tarifaEnvio: 6000,
    tiempoEstimadoMin: 35,
    pedidoMinimo: 22000,
    activa: true,
  },
  {
    id: 'zona-los-patios',
    nombre: 'Los Patios',
    barrios: ['Los Patios', 'Pinar del Río', 'La Sabana', 'Chaparral', 'Tierra Linda', 'Videlso'],
    tarifaEnvio: 8000,
    tiempoEstimadoMin: 40,
    pedidoMinimo: 28000,
    activa: true,
  },
  {
    id: 'zona-villa-rosario',
    nombre: 'Villa del Rosario / La Parada',
    barrios: ['La Parada', 'Villa del Rosario', 'Lomitas', 'Gramalote', 'Montevideo', 'Boconó'],
    tarifaEnvio: 8000,
    tiempoEstimadoMin: 40,
    pedidoMinimo: 25000,
    activa: true,
  },
];

export function getConfiguracionZonasDefault(negocioId: string): ConfiguracionZonasDomicilio {
  return {
    id: negocioId,
    negocioId,
    habilitarTarifaAutomatica: true,
    tarifaPorDefecto: 5000,
    tiempoEstimadoPorDefectoMin: 30,
    envioGratisDesdeMonto: 0,
    zonas: ZONAS_DOMICILIO_CUCUTA_DEFAULT.map((zona) => ({
      ...zona,
      barrios: [...zona.barrios],
    })),
  };
}

function normalizarTextoGeografico(texto: string): string {
  return (texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizarTelefonoColombia(telefono: string): string {
  let limpio = cleanPhoneNumber(telefono);
  if (limpio.startsWith('0')) {
    limpio = limpio.replace(/^0+/, '');
  }
  if (limpio.length === 10 && limpio.startsWith('3')) {
    limpio = `57${limpio}`;
  }
  return limpio;
}

function parseFechaDomicilio(valor: unknown): Date | null {
  const fechaAdmin = toValidAdminDate(valor);
  if (fechaAdmin) return fechaAdmin;

  if (typeof valor === 'string' || typeof valor === 'number') {
    const parsed = new Date(valor);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  if (
    valor &&
    typeof valor === 'object' &&
    'seconds' in valor &&
    typeof (valor as { seconds?: unknown }).seconds === 'number'
  ) {
    const parsed = new Date((valor as { seconds: number }).seconds * 1000);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  return null;
}

/**
 * Resuelve la zona, tarifa y tiempo estimado para un barrio dado.
 */
export function resolverTarifaPorBarrio(
  barrio: string,
  config: ConfiguracionZonasDomicilio,
  subtotalPedido?: number
): ResolucionTarifaBarrio {
  const consulta = normalizarTextoGeografico(barrio);
  const zonasActivas = (config.zonas || []).filter((zona) => zona.activa);

  let zonaEncontrada: ZonaDomicilio | null = null;

  if (consulta) {
    // 1. Coincidencia exacta por barrio o nombre de zona
    zonaEncontrada =
      zonasActivas.find((zona) => {
        const nombreZona = normalizarTextoGeografico(zona.nombre);
        if (nombreZona === consulta) return true;
        return zona.barrios.some((b) => normalizarTextoGeografico(b) === consulta);
      }) || null;

    // 2. Coincidencia parcial segura (>= 3 caracteres)
    if (!zonaEncontrada && consulta.length >= 3) {
      zonaEncontrada =
        zonasActivas.find((zona) => {
          const nombreZona = normalizarTextoGeografico(zona.nombre);
          if (nombreZona.includes(consulta) || consulta.includes(nombreZona)) return true;
          return zona.barrios.some((b) => {
            const bNorm = normalizarTextoGeografico(b);
            return bNorm.includes(consulta) || (bNorm.length >= 3 && consulta.includes(bNorm));
          });
        }) || null;
    }
  }

  const tarifaPorDefecto = Math.max(0, Math.round(Number(config.tarifaPorDefecto) || 0));
  const tiempoPorDefecto = Math.max(
    10,
    Math.round(Number(config.tiempoEstimadoPorDefectoMin) || 30)
  );

  const tarifaZona = zonaEncontrada
    ? Math.max(0, Math.round(Number(zonaEncontrada.tarifaEnvio) || 0))
    : tarifaPorDefecto;

  const tiempoEstimadoMin = zonaEncontrada
    ? Math.max(10, Math.round(Number(zonaEncontrada.tiempoEstimadoMin) || tiempoPorDefecto))
    : tiempoPorDefecto;

  const pedidoMinimo = zonaEncontrada
    ? Math.max(0, Math.round(Number(zonaEncontrada.pedidoMinimo) || 0))
    : 0;

  const montoEnvioGratis = Math.max(0, Math.round(Number(config.envioGratisDesdeMonto) || 0));
  const esEnvioGratis =
    montoEnvioGratis > 0 &&
    typeof subtotalPedido === 'number' &&
    Number.isFinite(subtotalPedido) &&
    subtotalPedido >= montoEnvioGratis;

  const tarifaBase = config.habilitarTarifaAutomatica ? tarifaZona : tarifaPorDefecto;

  return {
    zona: zonaEncontrada,
    tarifaEnvio: esEnvioGratis ? 0 : tarifaBase,
    tiempoEstimadoMin,
    pedidoMinimo,
    esEnvioGratis,
  };
}

/**
 * Lista todos los barrios configurados en zonas activas para autocompletado en POS y storefront.
 */
export function listarBarriosDisponibles(
  config: ConfiguracionZonasDomicilio
): Array<{ barrio: string; zonaNombre: string; tarifaEnvio: number; tiempoEstimadoMin: number }> {
  const vistos = new Set<string>();
  const resultado: Array<{
    barrio: string;
    zonaNombre: string;
    tarifaEnvio: number;
    tiempoEstimadoMin: number;
  }> = [];

  for (const zona of config.zonas || []) {
    if (!zona.activa) continue;
    for (const barrio of zona.barrios || []) {
      const limpio = barrio.trim();
      const clave = normalizarTextoGeografico(limpio);
      if (!limpio || vistos.has(clave)) continue;
      vistos.add(clave);
      resultado.push({
        barrio: limpio,
        zonaNombre: zona.nombre,
        tarifaEnvio: Math.max(0, Math.round(Number(zona.tarifaEnvio) || 0)),
        tiempoEstimadoMin: Math.max(10, Math.round(Number(zona.tiempoEstimadoMin) || 30)),
      });
    }
  }

  return resultado;
}

/**
 * Excluye comandas internas de mesas en salón para mantener aislado el despacho de domicilios reales.
 */
export function esPedidoDomicilioReal(domicilio: Domicilio): boolean {
  if (domicilio.tipoServicio === 'salon') return false;
  if (domicilio.mesaNumero && domicilio.mesaNumero.trim().length > 0) return false;
  return true;
}

/**
 * Calcula los minutos transcurridos y el semáforo SLA de entrega.
 */
export function calcularSlaDomicilio(
  creadoEn: unknown,
  entregadoEn?: unknown,
  ahoraMs: number = Date.now()
): InfoSlaDomicilio {
  const fechaInicio = parseFechaDomicilio(creadoEn);
  if (!fechaInicio) {
    return {
      minutosTranscurridos: 0,
      estadoSla: 'en_tiempo',
      etiqueta: '0 min · A tiempo',
    };
  }

  const fechaFin = entregadoEn ? parseFechaDomicilio(entregadoEn) : null;
  const finMs = fechaFin ? fechaFin.getTime() : ahoraMs;
  const minutosTranscurridos = Math.max(0, Math.floor((finMs - fechaInicio.getTime()) / 60000));

  if (minutosTranscurridos <= 20) {
    return {
      minutosTranscurridos,
      estadoSla: 'en_tiempo',
      etiqueta: `${minutosTranscurridos} min · A tiempo`,
    };
  }

  if (minutosTranscurridos <= 35) {
    return {
      minutosTranscurridos,
      estadoSla: 'atencion',
      etiqueta: `${minutosTranscurridos} min · En límite`,
    };
  }

  return {
    minutosTranscurridos,
    estadoSla: 'demorado',
    etiqueta: `${minutosTranscurridos} min · ¡Demorado!`,
  };
}

/**
 * Consolida los KPIs operativos del centro de despacho de domicilios.
 */
export function calcularKpisDespachoDomicilios(
  activos: Domicilio[],
  entregadosHoy: Domicilio[],
  ahoraMs: number = Date.now()
): KpisDespachoDomicilios {
  const activosReales = (activos || []).filter(esPedidoDomicilioReal);
  const entregadosReales = (entregadosHoy || []).filter(esPedidoDomicilioReal);

  let pendientesCocina = 0;
  let enRuta = 0;
  let demoradosCriticos = 0;
  let efectivoEnCalle = 0;

  for (const dom of activosReales) {
    if (dom.estado === 'pendiente' || dom.estado === 'en_preparacion') {
      pendientesCocina += 1;
    } else if (dom.estado === 'en_camino') {
      enRuta += 1;
      if (dom.metodoPago === 'efectivo') {
        efectivoEnCalle += Math.max(0, Math.round(Number.isFinite(dom.total) ? dom.total : 0));
      }
    }

    if (calcularSlaDomicilio(dom.creadoEn, undefined, ahoraMs).estadoSla === 'demorado') {
      demoradosCriticos += 1;
    }
  }

  let facturacionEntregadosHoy = 0;
  let sumaMinutosEntrega = 0;
  let conteoConTiempo = 0;

  for (const dom of entregadosReales) {
    facturacionEntregadosHoy += Math.max(
      0,
      Math.round(Number.isFinite(dom.total) ? dom.total : 0)
    );
    const fechaInicio = parseFechaDomicilio(dom.creadoEn);
    if (fechaInicio) {
      const sla = calcularSlaDomicilio(
        dom.creadoEn,
        dom.entregadoEn ?? dom.actualizadoEn,
        ahoraMs
      );
      sumaMinutosEntrega += sla.minutosTranscurridos;
      conteoConTiempo += 1;
    }
  }

  return {
    totalActivos: activosReales.length,
    pendientesCocina,
    enRuta,
    demoradosCriticos,
    entregadosHoy: entregadosReales.length,
    facturacionEntregadosHoy,
    efectivoEnCalle,
    tiempoPromedioMinutos:
      conteoConTiempo > 0 ? Math.round(sumaMinutosEntrega / conteoConTiempo) : 0,
  };
}

/**
 * Filtra la lista de domicilios por búsqueda, estado, canal de origen y repartidor.
 */
export function filtrarDomiciliosDespacho(
  domicilios: Domicilio[],
  filtros: FiltrosDespachoDomicilios
): Domicilio[] {
  const termino = normalizarTextoGeografico(filtros.busqueda);

  return (domicilios || []).filter((dom) => {
    if (!esPedidoDomicilioReal(dom)) return false;

    if (filtros.estado !== 'todos' && dom.estado !== filtros.estado) {
      return false;
    }

    if (filtros.origen !== 'todos' && dom.origen !== filtros.origen) {
      return false;
    }

    if (filtros.repartidor && filtros.repartidor !== 'todos') {
      if (filtros.repartidor === 'sin_asignar') {
        if (dom.domiciliarioId || dom.domiciliarioNombre) return false;
      } else if (
        dom.domiciliarioId !== filtros.repartidor &&
        dom.domiciliarioNombre !== filtros.repartidor
      ) {
        return false;
      }
    }

    if (termino) {
      const textoObjetivo = normalizarTextoGeografico(
        [
          dom.id,
          dom.clienteNombre,
          dom.clienteTelefono,
          dom.direccion,
          dom.barrio,
          dom.domiciliarioNombre || '',
          dom.zonaDomicilioNombre || '',
        ].join(' ')
      );
      if (!textoObjetivo.includes(termino)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Genera un token hexadecimal aleatorio de 128 bits compatible con `rastreo_pedidos/{token}`.
 */
export function generarTokenRastreoCliente(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

const ETIQUETA_ESTADO_CLIENTE: Record<Domicilio['estado'], string> = {
  pendiente: 'Recibido y en cola',
  en_preparacion: 'En preparación en cocina',
  en_camino: 'En camino con nuestro repartidor',
  entregado: 'Entregado',
};

/**
 * Genera el mensaje estructurado de WhatsApp para actualizar al cliente sobre su domicilio.
 */
export function generarMensajeWhatsAppClienteDespacho(
  domicilio: Domicilio,
  negocioNombre: string,
  originUrl?: string
): string {
  const local = (negocioNombre || 'La Parada').trim();
  const cliente = (domicilio.clienteNombre || 'cliente').trim();
  const estadoTexto = ETIQUETA_ESTADO_CLIENTE[domicilio.estado] || domicilio.estado;
  const codigo = `LP-${domicilio.id.slice(-6).toUpperCase()}`;

  const lineas = [
    `¡Hola *${cliente}*! Te saludamos de *${local}*.`,
    `Tu pedido *#${codigo}* se encuentra: *${estadoTexto}*.`,
  ];

  if (domicilio.domiciliarioNombre) {
    lineas.push(`🛵 Repartidor asignado: *${domicilio.domiciliarioNombre}*`);
  }

  if (domicilio.tiempoEstimadoMin && domicilio.estado !== 'entregado') {
    lineas.push(`⏱️ Tiempo estimado: ~${domicilio.tiempoEstimadoMin} min`);
  }

  lineas.push(
    `💰 Total: *${formatCOP(domicilio.total)}* (${
      domicilio.metodoPago === 'transferencia' ? 'Transferencia' : 'Efectivo'
    })`
  );

  if (domicilio.rastreoToken) {
    const base = (originUrl || 'https://laparada.pages.dev').replace(/\/+$/, '');
    lineas.push(`📍 Sigue tu pedido en vivo aquí: ${base}/rastreo/${domicilio.rastreoToken}`);
  }

  return lineas.join('\n');
}

export function construirUrlWhatsAppClienteDespacho(
  domicilio: Domicilio,
  negocioNombre: string,
  originUrl?: string
): string {
  const telefono = normalizarTelefonoColombia(domicilio.clienteTelefono);
  const mensaje = generarMensajeWhatsAppClienteDespacho(domicilio, negocioNombre, originUrl);
  if (!telefono) {
    return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  }
  return `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Genera la hoja de ruta de paradas y cobro para enviar por WhatsApp al domiciliario.
 */
export function generarHojaRutaRepartidorWhatsApp(
  domicilios: Domicilio[],
  repartidorNombre: string,
  negocioNombre: string
): string {
  const local = (negocioNombre || 'La Parada').trim();
  const nombreRep = (repartidorNombre || 'Repartidor').trim();
  const lista = (domicilios || []).filter(esPedidoDomicilioReal);

  let totalEfectivoRecaudar = 0;

  const bloques = lista.map((dom, idx) => {
    const monto = Math.max(0, Math.round(Number.isFinite(dom.total) ? dom.total : 0));
    const esEfectivo = dom.metodoPago !== 'transferencia';
    if (esEfectivo) totalEfectivoRecaudar += monto;
    const mapsUrl = buildGoogleMapsUrl(dom.direccion, dom.barrio);
    const pagoTexto = esEfectivo ? `Efectivo (Cobrar ${formatCOP(monto)})` : `Transferencia (${formatCOP(monto)})`;

    return [
      `*${idx + 1}. ${dom.clienteNombre}* (${dom.clienteTelefono})`,
      `📍 ${dom.direccion}${dom.barrio ? ` · Barrio ${dom.barrio}` : ''}`,
      `💵 ${pagoTexto}`,
      `🗺️ Mapa: ${mapsUrl}`,
    ].join('\n');
  });

  return [
    `🛵 *HOJA DE RUTA — ${local}*`,
    `Repartidor: *${nombreRep}*`,
    `Paradas asignadas: *${lista.length}*`,
    '',
    ...bloques,
    '',
    `💼 *Efectivo total a recaudar:* ${formatCOP(totalEfectivoRecaudar)}`,
  ].join('\n');
}

export function construirUrlWhatsAppHojaRutaRepartidor(
  telefonoRepartidor: string,
  domicilios: Domicilio[],
  repartidorNombre: string,
  negocioNombre: string
): string {
  const telefono = normalizarTelefonoColombia(telefonoRepartidor);
  const mensaje = generarHojaRutaRepartidorWhatsApp(domicilios, repartidorNombre, negocioNombre);
  if (!telefono) {
    return `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
  }
  return `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
}

function escapeCsvSeguro(valor: string | number | undefined | null): string {
  let texto = String(valor ?? '');
  if (/^[=+\-@\t\r]/.test(texto) && !/^-\d+(\.\d+)?$/.test(texto)) {
    texto = `'${texto}`;
  }
  return `"${texto.replace(/"/g, '""')}"`;
}

/**
 * Genera el archivo CSV contable y logístico de domicilios con BOM UTF-8.
 */
export function generarDomiciliosCsv(domicilios: Domicilio[]): string {
  const headers = [
    'ID Pedido',
    'Fecha',
    'Hora',
    'Cliente',
    'Teléfono',
    'Dirección',
    'Barrio',
    'Zona',
    'Canal',
    'Estado',
    'Repartidor',
    'Método Pago',
    'Costo Envío COP',
    'Total COP',
    'Tiempo SLA (min)',
    'Detalle Productos',
  ];

  const filas = (domicilios || []).filter(esPedidoDomicilioReal).map((dom) => {
    const fecha = parseFechaDomicilio(dom.creadoEn) || new Date();
    const fechaStr = fecha.toLocaleDateString('es-CO');
    const horaStr = fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const sla = calcularSlaDomicilio(
      dom.creadoEn,
      dom.estado === 'entregado' ? dom.entregadoEn ?? dom.actualizadoEn : undefined
    );
    const detalle = (dom.items || [])
      .map((item) => `${item.cantidad}x ${item.nombre} (${formatCOP(item.subtotal)})`)
      .join(' | ');

    return [
      escapeCsvSeguro(dom.id),
      escapeCsvSeguro(fechaStr),
      escapeCsvSeguro(horaStr),
      escapeCsvSeguro(dom.clienteNombre),
      escapeCsvSeguro(dom.clienteTelefono),
      escapeCsvSeguro(dom.direccion),
      escapeCsvSeguro(dom.barrio),
      escapeCsvSeguro(dom.zonaDomicilioNombre || ''),
      escapeCsvSeguro(dom.origen),
      escapeCsvSeguro(dom.estado),
      escapeCsvSeguro(dom.domiciliarioNombre || 'Sin asignar'),
      escapeCsvSeguro(dom.metodoPago),
      escapeCsvSeguro(dom.costoEnvio ?? 0),
      escapeCsvSeguro(dom.total ?? 0),
      escapeCsvSeguro(sla.minutosTranscurridos),
      escapeCsvSeguro(detalle),
    ].join(',');
  });

  return `\uFEFF${[headers.map(escapeCsvSeguro).join(','), ...filas].join('\r\n')}`;
}

export function descargarDomiciliosCsv(domicilios: Domicilio[], filename?: string): void {
  const contenido = generarDomiciliosCsv(domicilios);
  const fechaIso = new Date().toISOString().split('T')[0];
  descargarArchivoCsv(contenido, filename || `domicilios_despacho_${fechaIso}.csv`);
}
