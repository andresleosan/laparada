import type {
  Combo,
  CotizacionComercial,
  EstadoCotizacion,
  FiltrosCotizaciones,
  Insumo,
  ItemCotizacion,
  ItemVenta,
  MetricasCotizaciones,
  ModalidadEntregaEvento,
  MovimientoKardex,
  NivelRentabilidadEvento,
  Producto,
  SimulacionInsumoEvento,
  SimulacionMargenCotizacion,
  TipoEventoCotizacion,
} from '@/types';
import { descargarArchivoCsv } from './contabilidadUtils';
import { formatCOP } from './formatCOP';
import { construirMapaCostosInsumos } from './ingenieriaMenuUtils';
import { buildInsumosMap, calcularConsumoInsumos } from './recetasEscandallo';

export const CONDICIONES_COMERCIALES_DEFAULT =
  'Se requiere un anticipo del 50% por transferencia o efectivo para separar fecha y producción. El saldo restante se liquida al momento de la entrega o inicio del evento. Precios vigentes hasta la fecha de validez indicada.';

export interface MetaTipoEvento {
  id: TipoEventoCotizacion;
  label: string;
  emoji: string;
  descripcion: string;
}

export const TIPOS_EVENTO_CATALOGO: MetaTipoEvento[] = [
  {
    id: 'corporativo',
    label: 'Evento Corporativo',
    emoji: '🏢',
    descripcion: 'Almuerzos ejecutivos, capacitaciones, juntas y celebraciones de empresa.',
  },
  {
    id: 'coffee_break',
    label: 'Coffee Break / Refrigerio',
    emoji: '☕',
    descripcion: 'Estaciones de pasabocas, tequeños, pancerotis y bebidas para equipos.',
  },
  {
    id: 'fiesta_cumpleanos',
    label: 'Fiesta / Cumpleaños',
    emoji: '🎂',
    descripcion: 'Celebraciones familiares o con amigos con combos y picadas por volumen.',
  },
  {
    id: 'boda_aniversario',
    label: 'Boda / Aniversario',
    emoji: '🥂',
    descripcion: 'Atención especial de catering y pasabocas artesanales para invitados.',
  },
  {
    id: 'refrigerio_escolar',
    label: 'Colegio / Universidad',
    emoji: '🎓',
    descripcion: 'Refrigerios masivos para jornadas académicas, grados y ferias.',
  },
  {
    id: 'evento_privado',
    label: 'Evento Privado',
    emoji: '✨',
    descripcion: 'Reuniones en casa, finca o salón privado con logística personalizada.',
  },
  {
    id: 'otro',
    label: 'Otro Evento',
    emoji: '📋',
    descripcion: 'Propuesta gastronómica personalizada a la medida del cliente.',
  },
];

export const MODALIDADES_ENTREGA_CATALOGO: Array<{
  id: ModalidadEntregaEvento;
  label: string;
  shortLabel: string;
  descripcion: string;
}> = [
  {
    id: 'domicilio_evento',
    label: 'Catering a Domicilio / Sede del Evento',
    shortLabel: 'Domicilio Evento',
    descripcion: 'Despacho directo a la empresa, salón o dirección del evento.',
  },
  {
    id: 'recoger_local',
    label: 'Recoger en Local (Empaque Catering)',
    shortLabel: 'Recoger en Local',
    descripcion: 'El cliente recoge el pedido empacado por lotes en el punto físico.',
  },
  {
    id: 'evento_salon',
    label: 'Atención en Salón del Restaurante',
    shortLabel: 'En Salón',
    descripcion: 'Reserva de espacio y servicio servido directamente en nuestro salón.',
  },
];

export const ESTADOS_COTIZACION_META: Record<
  EstadoCotizacion,
  {
    label: string;
    badgeClass: string;
    dotClass: string;
  }
> = {
  borrador: {
    label: 'Borrador',
    badgeClass: 'border-neutral-600/60 bg-neutral-800/80 text-neutral-300',
    dotClass: 'bg-neutral-400',
  },
  enviada: {
    label: 'Enviada',
    badgeClass: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
    dotClass: 'bg-sky-400',
  },
  aprobada: {
    label: 'Aprobada',
    badgeClass: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    dotClass: 'bg-amber-400',
  },
  convertida: {
    label: 'Convertida a Venta',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    dotClass: 'bg-emerald-400',
  },
  rechazada: {
    label: 'Rechazada',
    badgeClass: 'border-red-500/40 bg-red-500/15 text-red-300',
    dotClass: 'bg-red-400',
  },
  vencida: {
    label: 'Vencida',
    badgeClass: 'border-orange-500/40 bg-orange-500/15 text-orange-300',
    dotClass: 'bg-orange-400',
  },
};

export interface ServicioExtraRapido {
  nombre: string;
  precioSugerido: number;
  costoEstimado: number;
}

export const SERVICIOS_EXTRA_CATERING_CATALOGO: ServicioExtraRapido[] = [
  { nombre: 'Empaque térmico y menaje desechable', precioSugerido: 35000, costoEstimado: 18000 },
  { nombre: 'Estación de salsas artesanales x 1L', precioSugerido: 28000, costoEstimado: 11000 },
  { nombre: 'Personal mesero de apoyo (turno evento)', precioSugerido: 90000, costoEstimado: 60000 },
  { nombre: 'Montaje mesa catering y chafing dish', precioSugerido: 120000, costoEstimado: 45000 },
];

function safeNonNegativeInt(valor: unknown): number {
  const num = Number(valor);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.round(num);
}

function safePositiveQty(valor: unknown): number {
  const num = Number(valor);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.max(1, Math.floor(num));
}

export function formatearTipoEvento(tipo: TipoEventoCotizacion): MetaTipoEvento {
  return (
    TIPOS_EVENTO_CATALOGO.find((item) => item.id === tipo) ||
    TIPOS_EVENTO_CATALOGO[TIPOS_EVENTO_CATALOGO.length - 1]
  );
}

export function formatearModalidadEntrega(modalidad: ModalidadEntregaEvento): string {
  return (
    MODALIDADES_ENTREGA_CATALOGO.find((m) => m.id === modalidad)?.label ||
    'Catering a Domicilio / Sede del Evento'
  );
}

export function obtenerFechaLocalYYYYMMDD(fecha: Date = new Date()): string {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

export function sumarDiasFechaYYYYMMDD(dias: number, fechaBase: Date = new Date()): string {
  const copia = new Date(fechaBase.getTime());
  copia.setDate(copia.getDate() + Math.trunc(dias));
  return obtenerFechaLocalYYYYMMDD(copia);
}

export function parsearFechaCortaMs(fechaStr?: string): number | null {
  if (!fechaStr || typeof fechaStr !== 'string') return null;
  const limpia = fechaStr.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(limpia)) return null;
  const [anio, mes, dia] = limpia.split('-').map(Number);
  const d = new Date(anio, mes - 1, dia, 23, 59, 59, 999);
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Genera el siguiente código comercial correlativo (ej: COT-2026-001).
 */
export function generarCodigoCotizacion(
  cotizacionesExistentes: Array<Pick<CotizacionComercial, 'codigo'>>,
  fechaRef: Date = new Date()
): string {
  const anio = fechaRef.getFullYear();
  const prefijo = `COT-${anio}-`;
  let maximo = 0;

  for (const cot of cotizacionesExistentes || []) {
    const codigo = (cot.codigo || '').trim().toUpperCase();
    if (!codigo.startsWith(prefijo)) continue;
    const numero = Number.parseInt(codigo.slice(prefijo.length), 10);
    if (Number.isInteger(numero) && numero > maximo) {
      maximo = numero;
    }
  }

  return `${prefijo}${String(maximo + 1).padStart(3, '0')}`;
}

/**
 * Evalúa si una cotización en borrador o enviada ya superó su fecha de vencimiento.
 */
export function estaCotizacionVencida(
  cotizacion: Pick<CotizacionComercial, 'estado' | 'fechaVencimiento'>,
  ahoraMs: number = Date.now()
): boolean {
  if (cotizacion.estado === 'vencida') return true;
  if (cotizacion.estado !== 'borrador' && cotizacion.estado !== 'enviada') return false;
  const limiteMs = parsearFechaCortaMs(cotizacion.fechaVencimiento);
  if (limiteMs === null) return false;
  return ahoraMs > limiteMs;
}

/**
 * Devuelve el estado efectivo visible (detecta vencimiento automáticamente sin mutar Firestore).
 */
export function obtenerEstadoEfectivoCotizacion(
  cotizacion: Pick<CotizacionComercial, 'estado' | 'fechaVencimiento'>,
  ahoraMs: number = Date.now()
): EstadoCotizacion {
  if (estaCotizacionVencida(cotizacion, ahoraMs)) {
    return 'vencida';
  }
  return cotizacion.estado;
}

/**
 * Normaliza un arreglo de ítems de cotización asegurando enteros positivos y subtotales consistentes.
 */
export function normalizarItemsCotizacion(items: ItemCotizacion[]): ItemCotizacion[] {
  if (!Array.isArray(items)) return [];

  return items
    .filter((item) => item && typeof item.nombre === 'string' && item.nombre.trim().length > 0)
    .map((item, idx) => {
      const cantidad = safePositiveQty(item.cantidad);
      const precioUnitario = safeNonNegativeInt(item.precioUnitario);
      const subtotal = cantidad * precioUnitario;
      const costoUnitarioEstimado =
        typeof item.costoUnitarioEstimado === 'number' &&
        Number.isFinite(item.costoUnitarioEstimado) &&
        item.costoUnitarioEstimado >= 0
          ? Math.round(item.costoUnitarioEstimado)
          : undefined;
      const modificadores = Array.isArray(item.modificadores)
        ? item.modificadores.map((m) => m.trim()).filter(Boolean)
        : undefined;
      const notas = item.notas?.trim() || undefined;

      return {
        id: item.id?.trim() || `cot_item_${idx + 1}`,
        tipo: item.tipo || 'producto',
        ...(item.referenciaId?.trim() ? { referenciaId: item.referenciaId.trim() } : {}),
        nombre: item.nombre.trim(),
        cantidad,
        precioUnitario,
        subtotal,
        ...(costoUnitarioEstimado !== undefined ? { costoUnitarioEstimado } : {}),
        ...(modificadores && modificadores.length > 0 ? { modificadores } : {}),
        ...(notas ? { notas } : {}),
        ...(Array.isArray(item.eleccionesCombo) && item.eleccionesCombo.length > 0
          ? { eleccionesCombo: item.eleccionesCombo }
          : {}),
      };
    });
}

export interface TotalesCotizacionCalculados {
  subtotalProductos: number;
  subtotalServiciosExtras: number;
  subtotal: number;
  descuento: number;
  costoLogistica: number;
  totalCotizado: number;
  anticipoAplicable: number;
  saldoPendiente: number;
}

/**
 * Calcula totales comerciales defensivos: ningún monto puede ser negativo ni el descuento superar el subtotal.
 */
export function calcularTotalesCotizacion(params: {
  items: ItemCotizacion[];
  descuento?: number;
  descuentoPorcentaje?: number;
  costoLogistica?: number;
  anticipoMonto?: number;
  anticipoEstado?: CotizacionComercial['anticipoEstado'];
}): TotalesCotizacionCalculados {
  const itemsLimpios = normalizarItemsCotizacion(params.items);
  let subtotalProductos = 0;
  let subtotalServiciosExtras = 0;

  for (const item of itemsLimpios) {
    if (item.tipo === 'servicio_extra') {
      subtotalServiciosExtras += item.subtotal;
    } else {
      subtotalProductos += item.subtotal;
    }
  }

  const subtotal = subtotalProductos + subtotalServiciosExtras;

  let descuentoCalculado = 0;
  if (
    typeof params.descuentoPorcentaje === 'number' &&
    Number.isFinite(params.descuentoPorcentaje) &&
    params.descuentoPorcentaje > 0
  ) {
    const pctClamped = Math.min(100, Math.max(0, params.descuentoPorcentaje));
    descuentoCalculado = Math.round((subtotal * pctClamped) / 100);
  } else {
    descuentoCalculado = safeNonNegativeInt(params.descuento);
  }

  const descuento = Math.min(subtotal, descuentoCalculado);
  const costoLogistica = safeNonNegativeInt(params.costoLogistica);
  const totalCotizado = Math.max(0, subtotal - descuento + costoLogistica);

  const anticipoRaw = safeNonNegativeInt(params.anticipoMonto);
  const anticipoAplicable =
    params.anticipoEstado === 'sin_anticipo'
      ? 0
      : Math.min(totalCotizado, anticipoRaw);
  const saldoPendiente = Math.max(0, totalCotizado - anticipoAplicable);

  return {
    subtotalProductos,
    subtotalServiciosExtras,
    subtotal,
    descuento,
    costoLogistica,
    totalCotizado,
    anticipoAplicable,
    saldoPendiente,
  };
}

/**
 * Convierte ítems de cotización en `ItemVenta[]` listos para POS, Venta en Firestore y Comanda KDS.
 */
export function construirItemsVentaDesdeCotizacion(
  items: ItemCotizacion[],
  costoLogistica = 0
): ItemVenta[] {
  const limpios = normalizarItemsCotizacion(items);
  const resultado: ItemVenta[] = limpios.map((item) => ({
    tipo: item.tipo === 'combo' ? 'combo' : 'producto',
    referenciaId: item.referenciaId || `catering_${item.id}`,
    nombre: item.nombre,
    cantidad: item.cantidad,
    precioUnitario: item.precioUnitario,
    subtotal: item.subtotal,
    ...(item.modificadores && item.modificadores.length > 0
      ? { modificadores: item.modificadores }
      : {}),
    ...(item.notas ? { notas: item.notas } : {}),
    ...(item.eleccionesCombo && item.eleccionesCombo.length > 0
      ? { eleccionesCombo: item.eleccionesCombo }
      : {}),
  }));

  const logistica = safeNonNegativeInt(costoLogistica);
  if (logistica > 0) {
    resultado.push({
      tipo: 'producto',
      referenciaId: 'servicio_logistica_catering',
      nombre: 'Logística y Transporte Catering',
      cantidad: 1,
      precioUnitario: logistica,
      subtotal: logistica,
    });
  }

  return resultado;
}

/**
 * Motor interno de simulación de costo de insumos (por escandallo real + costo de referencia),
 * verificación de stock en bodega y cálculo de margen bruto del evento.
 */
export function simularCostosYMargenCotizacion(params: {
  items: ItemCotizacion[];
  productos: Producto[];
  combos: Combo[];
  insumos: Insumo[];
  movimientosKardex?: MovimientoKardex[];
  descuento?: number;
  descuentoPorcentaje?: number;
  costoLogistica?: number;
  invitados?: number;
}): SimulacionMargenCotizacion {
  const itemsLimpios = normalizarItemsCotizacion(params.items);
  const totales = calcularTotalesCotizacion({
    items: itemsLimpios,
    descuento: params.descuento,
    descuentoPorcentaje: params.descuentoPorcentaje,
    costoLogistica: params.costoLogistica,
  });

  const productosMap = new Map<string, Producto>();
  for (const prod of params.productos || []) {
    productosMap.set(prod.id, prod);
  }
  const combosMap = new Map<string, Combo>();
  for (const combo of params.combos || []) {
    combosMap.set(combo.id, combo);
  }

  const insumosMap = buildInsumosMap(params.insumos || []);
  const costosInsumosMap = construirMapaCostosInsumos(
    params.insumos || [],
    params.movimientosKardex || []
  );

  // 1. Separar ítems del catálogo que tienen receta/escandallo para explosión de bodega
  const itemsCatalogoVenta: ItemVenta[] = [];
  const itemsSinCosteoSet = new Set<string>();
  let costoReferenciaCatalogoCOP = 0;
  let costoServiciosEstimadoCOP = 0;
  let itemsConCosteoCount = 0;

  for (const item of itemsLimpios) {
    if (item.tipo === 'servicio_extra') {
      const costoUnit = safeNonNegativeInt(item.costoUnitarioEstimado);
      if (costoUnit > 0) {
        costoServiciosEstimadoCOP += costoUnit * item.cantidad;
        itemsConCosteoCount += 1;
      } else {
        itemsSinCosteoSet.add(item.nombre);
      }
      continue;
    }

    if (item.tipo === 'producto' && item.referenciaId) {
      const prod = productosMap.get(item.referenciaId);
      const tieneReceta = Boolean(prod?.receta && prod.receta.length > 0);
      if (tieneReceta) {
        itemsCatalogoVenta.push({
          tipo: 'producto',
          referenciaId: item.referenciaId,
          nombre: item.nombre,
          cantidad: item.cantidad,
          precioUnitario: item.precioUnitario,
          subtotal: item.subtotal,
        });
        itemsConCosteoCount += 1;
      } else {
        const costoRef =
          safeNonNegativeInt(item.costoUnitarioEstimado) ||
          safeNonNegativeInt(prod?.costoReferencia);
        if (costoRef > 0) {
          costoReferenciaCatalogoCOP += costoRef * item.cantidad;
          itemsConCosteoCount += 1;
        } else {
          itemsSinCosteoSet.add(item.nombre);
        }
      }
      continue;
    }

    if (item.tipo === 'combo' && item.referenciaId) {
      const combo = combosMap.get(item.referenciaId);
      const itemVentaCombo: ItemVenta = {
        tipo: 'combo',
        referenciaId: item.referenciaId,
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        subtotal: item.subtotal,
        ...(item.eleccionesCombo ? { eleccionesCombo: item.eleccionesCombo } : {}),
      };

      const consumosCombo = calcularConsumoInsumos(
        [itemVentaCombo],
        params.productos || [],
        params.combos || []
      );
      if (consumosCombo.length > 0) {
        itemsCatalogoVenta.push(itemVentaCombo);
        itemsConCosteoCount += 1;
      } else {
        const costoRefCombo =
          safeNonNegativeInt(item.costoUnitarioEstimado) ||
          safeNonNegativeInt(combo?.costoReferencia);
        if (costoRefCombo > 0) {
          costoReferenciaCatalogoCOP += costoRefCombo * item.cantidad;
          itemsConCosteoCount += 1;
        } else {
          itemsSinCosteoSet.add(item.nombre);
        }
      }
      continue;
    }

    // Ítem manual de producto sin referencia en catálogo
    const costoManual = safeNonNegativeInt(item.costoUnitarioEstimado);
    if (costoManual > 0) {
      costoReferenciaCatalogoCOP += costoManual * item.cantidad;
      itemsConCosteoCount += 1;
    } else {
      itemsSinCosteoSet.add(item.nombre);
    }
  }

  // 2. Explotar escandallos consolidados para todo el evento
  const consumosTotales = calcularConsumoInsumos(
    itemsCatalogoVenta,
    params.productos || [],
    params.combos || []
  );

  let costoInsumosRecetasExacto = 0;
  const insumosRequeridos: SimulacionInsumoEvento[] = consumosTotales
    .map((consumo) => {
      const insumo = insumosMap.get(consumo.insumoId);
      const stockActual =
        typeof insumo?.stockActual === 'number' && Number.isFinite(insumo.stockActual)
          ? Math.max(0, insumo.stockActual)
          : 0;
      const faltante = Number(Math.max(0, consumo.cantidadTotal - stockActual).toFixed(4));
      const costoUnitarioInsumo = costosInsumosMap.get(consumo.insumoId)?.costoUnitario ?? 0;
      const costoExacto = consumo.cantidadTotal * costoUnitarioInsumo;
      costoInsumosRecetasExacto += costoExacto;

      return {
        insumoId: consumo.insumoId,
        nombre: insumo?.nombre || consumo.nombreSnapshot,
        unidad: insumo?.unidad || consumo.unidadSnapshot || 'unid',
        cantidadRequerida: consumo.cantidadTotal,
        stockActual,
        faltante,
        costoUnitarioInsumo: Math.round(costoUnitarioInsumo),
        costoTotalCOP: Math.round(costoExacto),
        tieneStockSuficiente: faltante <= 0,
      };
    })
    .sort((a, b) => Number(a.tieneStockSuficiente) - Number(b.tieneStockSuficiente) || b.costoTotalCOP - a.costoTotalCOP);

  const insumosConDeficit = insumosRequeridos.filter((ins) => !ins.tieneStockSuficiente);

  const costoInsumosCOP = Math.round(costoInsumosRecetasExacto) + costoReferenciaCatalogoCOP;
  const costoTotalEstimadoCOP = costoInsumosCOP + costoServiciosEstimadoCOP;
  const utilidadBrutaCOP = totales.totalCotizado - costoTotalEstimadoCOP;

  const margenBrutoPct =
    totales.totalCotizado > 0
      ? Number(((utilidadBrutaCOP / totales.totalCotizado) * 100).toFixed(1))
      : 0;

  const ingresoNetoProductos = Math.max(0, totales.subtotalProductos - totales.descuento);
  const foodCostPct =
    ingresoNetoProductos > 0
      ? Number(((costoInsumosCOP / ingresoNetoProductos) * 100).toFixed(1))
      : totales.totalCotizado > 0 && costoInsumosCOP > 0
        ? Number(((costoInsumosCOP / totales.totalCotizado) * 100).toFixed(1))
        : 0;

  const invitadosSeguros = Math.max(1, safePositiveQty(params.invitados || 1));
  const precioPorInvitadoCOP =
    totales.totalCotizado > 0 ? Math.round(totales.totalCotizado / invitadosSeguros) : 0;
  const costoPorInvitadoCOP =
    costoTotalEstimadoCOP > 0 ? Math.round(costoTotalEstimadoCOP / invitadosSeguros) : 0;

  const coberturaCosteoPct =
    itemsLimpios.length > 0
      ? Math.round((itemsConCosteoCount / itemsLimpios.length) * 100)
      : 0;

  let nivelRentabilidad: NivelRentabilidadEvento = 'sin_costeo';
  if (totales.totalCotizado > 0 && costoTotalEstimadoCOP > 0) {
    if (margenBrutoPct >= 55) {
      nivelRentabilidad = 'optimo';
    } else if (margenBrutoPct >= 35) {
      nivelRentabilidad = 'aceptable';
    } else {
      nivelRentabilidad = 'riesgo';
    }
  }

  return {
    subtotalProductosCOP: totales.subtotalProductos,
    subtotalServiciosExtrasCOP: totales.subtotalServiciosExtras,
    descuentoCOP: totales.descuento,
    costoLogisticaCOP: totales.costoLogistica,
    totalCotizadoCOP: totales.totalCotizado,
    costoInsumosCOP,
    costoServiciosEstimadoCOP,
    costoTotalEstimadoCOP,
    utilidadBrutaCOP,
    margenBrutoPct,
    foodCostPct,
    costoPorInvitadoCOP,
    precioPorInvitadoCOP,
    nivelRentabilidad,
    insumosRequeridos,
    insumosConDeficit,
    itemsSinCosteo: Array.from(itemsSinCosteoSet),
    coberturaCosteoPct,
  };
}

/**
 * Calcula los KPIs ejecutivos del Centro de Cotizaciones, Eventos y Catering.
 */
export function calcularMetricasCotizaciones(
  cotizaciones: CotizacionComercial[],
  ahoraMs: number = Date.now()
): MetricasCotizaciones {
  let borradores = 0;
  let enviadas = 0;
  let aprobadas = 0;
  let convertidas = 0;
  let rechazadasOVencidas = 0;
  let pipelineActivoCOP = 0;
  let totalConvertidoCOP = 0;
  let totalAnticiposVerificadosCOP = 0;
  let totalSaldoPorCobrarCOP = 0;
  let eventosProximos7Dias = 0;
  let sumaMargen = 0;
  let conteoMargen = 0;

  const inicioHoy = new Date(ahoraMs);
  inicioHoy.setHours(0, 0, 0, 0);
  const inicioHoyMs = inicioHoy.getTime();
  const limite7DiasMs = inicioHoyMs + 7 * 86_400_000 + 86_399_999;

  for (const cot of cotizaciones || []) {
    const estadoEfectivo = obtenerEstadoEfectivoCotizacion(cot, ahoraMs);
    const total = safeNonNegativeInt(cot.totalCotizado);
    const anticipo = safeNonNegativeInt(cot.anticipoMonto);
    const saldo = safeNonNegativeInt(cot.saldoPendiente);

    if (estadoEfectivo === 'borrador') {
      borradores += 1;
      pipelineActivoCOP += total;
    } else if (estadoEfectivo === 'enviada') {
      enviadas += 1;
      pipelineActivoCOP += total;
    } else if (estadoEfectivo === 'aprobada') {
      aprobadas += 1;
      pipelineActivoCOP += total;
      totalSaldoPorCobrarCOP += saldo;
    } else if (estadoEfectivo === 'convertida') {
      convertidas += 1;
      totalConvertidoCOP += total;
    } else {
      rechazadasOVencidas += 1;
    }

    if (
      cot.anticipoEstado === 'verificado' &&
      anticipo > 0 &&
      estadoEfectivo !== 'rechazada'
    ) {
      totalAnticiposVerificadosCOP += anticipo;
    }

    if (estadoEfectivo === 'enviada' || estadoEfectivo === 'aprobada') {
      const eventoMs = parsearFechaCortaMs(cot.fechaEvento);
      if (eventoMs !== null && eventoMs >= inicioHoyMs && eventoMs <= limite7DiasMs) {
        eventosProximos7Dias += 1;
      }
    }

    if (
      typeof cot.margenEstimadoPct === 'number' &&
      Number.isFinite(cot.margenEstimadoPct) &&
      cot.costoEstimadoInsumos > 0
    ) {
      sumaMargen += cot.margenEstimadoPct;
      conteoMargen += 1;
    }
  }

  const total = cotizaciones?.length || 0;
  const cerrables = enviadas + aprobadas + convertidas + rechazadasOVencidas;
  const tasaConversionPct =
    cerrables > 0 ? Number(((convertidas / cerrables) * 100).toFixed(1)) : 0;
  const margenPromedioPct =
    conteoMargen > 0 ? Number((sumaMargen / conteoMargen).toFixed(1)) : 0;

  return {
    total,
    borradores,
    enviadas,
    aprobadas,
    convertidas,
    rechazadasOVencidas,
    pipelineActivoCOP,
    totalConvertidoCOP,
    totalAnticiposVerificadosCOP,
    totalSaldoPorCobrarCOP,
    eventosProximos7Dias,
    tasaConversionPct,
    margenPromedioPct,
  };
}

/**
 * Filtra cotizaciones por estado efectivo, tipo de evento y búsqueda libre.
 */
export function filtrarCotizaciones(
  cotizaciones: CotizacionComercial[],
  filtros: FiltrosCotizaciones,
  ahoraMs: number = Date.now()
): CotizacionComercial[] {
  const termino = (filtros.busqueda || '').trim().toLowerCase();

  return (cotizaciones || []).filter((cot) => {
    const estadoEfectivo = obtenerEstadoEfectivoCotizacion(cot, ahoraMs);
    if (filtros.estado !== 'todas' && estadoEfectivo !== filtros.estado) {
      return false;
    }
    if (filtros.tipoEvento !== 'todos' && cot.tipoEvento !== filtros.tipoEvento) {
      return false;
    }
    if (termino) {
      const objetivo = [
        cot.codigo,
        cot.clienteNombre,
        cot.empresa || '',
        cot.nitEmpresa || '',
        cot.clienteTelefono,
        cot.barrioEvento || '',
        cot.direccionEvento || '',
        cot.notasEvento || '',
      ]
        .join(' ')
        .toLowerCase();
      if (!objetivo.includes(termino)) {
        return false;
      }
    }
    return true;
  });
}

export function normalizarTelefonoCotizacionWhatsApp(telefono?: string): string {
  const digitos = (telefono || '').replace(/\D/g, '');
  if (!digitos) return '';
  if (digitos.startsWith('57') && digitos.length >= 12) return digitos;
  if (digitos.length === 10 && digitos.startsWith('3')) return `57${digitos}`;
  return digitos;
}

/**
 * Construye el texto formal de Propuesta Comercial / Catering para enviar por WhatsApp.
 * REGLA DE NEGOCIO: Jamás incluye costos internos de insumos ni márgenes de ganancia.
 */
export function construirMensajeCotizacionWhatsApp(
  cotizacion: CotizacionComercial,
  negocio: {
    nombre?: string;
    telefono?: string;
    direccion?: string;
  } = {}
): string {
  const nombreNegocio = (negocio.nombre || 'LA PARADA').toUpperCase();
  const tipoEventoMeta = formatearTipoEvento(cotizacion.tipoEvento);
  const modalidadLabel = formatearModalidadEntrega(cotizacion.modalidadEntrega);
  const lineas: string[] = [];

  lineas.push(`📋 *PROPUESTA COMERCIAL & CATERING — ${nombreNegocio}*`);
  lineas.push(`🔖 *Cotización:* ${cotizacion.codigo}`);
  if (negocio.direccion) lineas.push(`📍 ${negocio.direccion}`);
  if (negocio.telefono) lineas.push(`📞 Tel: ${negocio.telefono}`);
  lineas.push('────────────────────────');
  lineas.push(`👤 *Cliente:* ${cotizacion.clienteNombre}`);
  if (cotizacion.empresa) {
    lineas.push(
      `🏢 *Empresa:* ${cotizacion.empresa}${cotizacion.nitEmpresa ? ` (NIT ${cotizacion.nitEmpresa})` : ''}`
    );
  }
  lineas.push(`${tipoEventoMeta.emoji} *Evento:* ${tipoEventoMeta.label}`);
  lineas.push(
    `📅 *Fecha del Evento:* ${cotizacion.fechaEvento}${cotizacion.horaEvento ? ` · ${cotizacion.horaEvento}` : ''}`
  );
  lineas.push(`👥 *Invitados estimados:* ${cotizacion.invitados} personas`);
  lineas.push(`🚚 *Modalidad:* ${modalidadLabel}`);
  if (cotizacion.direccionEvento) {
    lineas.push(
      `🏠 *Lugar:* ${cotizacion.direccionEvento}${cotizacion.barrioEvento ? ` (${cotizacion.barrioEvento})` : ''}`
    );
  }
  lineas.push('────────────────────────');
  lineas.push('*DETALLE DE LA PROPUESTA:*');

  for (const item of cotizacion.items || []) {
    const notaItem = item.notas ? ` _(${item.notas})_` : '';
    lineas.push(
      `• ${item.cantidad}× ${item.nombre}${notaItem} · ${formatCOP(item.precioUnitario)} c/u → *${formatCOP(item.subtotal)}*`
    );
  }

  lineas.push('────────────────────────');
  lineas.push(`💵 *Subtotal:* ${formatCOP(cotizacion.subtotal)} COP`);
  if (cotizacion.descuento > 0) {
    lineas.push(
      `🏷️ *Descuento comercial${cotizacion.descuentoMotivo ? ` (${cotizacion.descuentoMotivo})` : ''}:* -${formatCOP(cotizacion.descuento)} COP`
    );
  }
  if (cotizacion.costoLogistica > 0) {
    lineas.push(`🚚 *Logística / Servicio catering:* ${formatCOP(cotizacion.costoLogistica)} COP`);
  }
  lineas.push(`💰 *TOTAL PROPUESTA:* *${formatCOP(cotizacion.totalCotizado)} COP*`);

  if (cotizacion.invitados > 0) {
    const porPersona = Math.round(cotizacion.totalCotizado / cotizacion.invitados);
    lineas.push(`🍽️ _Inversión estimada por invitado: ${formatCOP(porPersona)} COP_`);
  }

  if (cotizacion.anticipoMonto > 0) {
    const etiquetaEstado =
      cotizacion.anticipoEstado === 'verificado'
        ? 'Verificado ✅'
        : 'Pendiente de confirmación ⏳';
    const metodo =
      cotizacion.anticipoMetodo === 'efectivo' ? 'Efectivo' : 'Transferencia';
    lineas.push('');
    lineas.push(
      `🏦 *Anticipo (${metodo} - ${etiquetaEstado}):* ${formatCOP(cotizacion.anticipoMonto)} COP`
    );
    if (cotizacion.anticipoReferencia) {
      lineas.push(`🧾 *Comprobante / Ref:* ${cotizacion.anticipoReferencia}`);
    }
    lineas.push(`💳 *Saldo pendiente:* *${formatCOP(cotizacion.saldoPendiente)} COP*`);
  }

  lineas.push('────────────────────────');
  lineas.push(`⏳ *Cotización válida hasta:* ${cotizacion.fechaVencimiento}`);
  if (cotizacion.condicionesComerciales?.trim()) {
    lineas.push(`📌 *Condiciones:* ${cotizacion.condicionesComerciales.trim()}`);
  }
  if (cotizacion.notasEvento?.trim()) {
    lineas.push(`📝 *Observaciones:* ${cotizacion.notasEvento.trim()}`);
  }
  lineas.push('');
  lineas.push('💳 *Medios de pago:* Transferencia bancaria / Nequi / Daviplata o Efectivo.');
  lineas.push('Responde *APROBADA* para confirmar fecha y separar producción. ¡Será un gusto atender tu evento! 🔥');

  return lineas.join('\n');
}

export function generarUrlWhatsAppCotizacion(
  cotizacion: CotizacionComercial,
  negocio: {
    nombre?: string;
    telefono?: string;
    direccion?: string;
  } = {},
  telefonoAlternativo?: string
): string {
  const texto = construirMensajeCotizacionWhatsApp(cotizacion, negocio);
  const encoded = encodeURIComponent(texto);
  const telefono = normalizarTelefonoCotizacionWhatsApp(
    telefonoAlternativo || cotizacion.clienteTelefono
  );

  if (telefono) {
    return `https://wa.me/${telefono}?text=${encoded}`;
  }
  return `https://wa.me/?text=${encoded}`;
}

export function construirMensajeAnticipoCotizacionWhatsApp(
  cotizacion: CotizacionComercial,
  nombreNegocio = 'La Parada'
): string {
  const lineas: string[] = [
    `✅ *CONFIRMACIÓN DE ANTICIPO — ${nombreNegocio.toUpperCase()}*`,
    `🔖 *Cotización:* ${cotizacion.codigo}`,
    `👤 *Cliente:* ${cotizacion.clienteNombre}${cotizacion.empresa ? ` (${cotizacion.empresa})` : ''}`,
    `📅 *Fecha del Evento:* ${cotizacion.fechaEvento}${cotizacion.horaEvento ? ` · ${cotizacion.horaEvento}` : ''}`,
    '────────────────────────',
    `🏦 *Anticipo Recibido:* ${formatCOP(cotizacion.anticipoMonto)} COP (${cotizacion.anticipoMetodo === 'efectivo' ? 'Efectivo' : 'Transferencia'})`,
    ...(cotizacion.anticipoReferencia
      ? [`🧾 *Referencia:* ${cotizacion.anticipoReferencia}`]
      : []),
    `💰 *Total Evento:* ${formatCOP(cotizacion.totalCotizado)} COP`,
    `⏳ *Saldo Pendiente:* ${formatCOP(cotizacion.saldoPendiente)} COP`,
    '────────────────────────',
    '¡Tu fecha y producción han quedado reservadas! Cualquier ajuste adicional escríbenos por este medio. 🙌',
  ];
  return lineas.join('\n');
}

function escapeCsvSeguro(valor: string | number | undefined | null): string {
  let texto = String(valor ?? '');
  if (/^[=+\-@\t\r]/.test(texto) && !/^-\d+(\.\d+)?$/.test(texto)) {
    texto = `'${texto}`;
  }
  return `"${texto.replace(/"/g, '""')}"`;
}

/**
 * Genera reporte contable/comercial en CSV (UTF-8 BOM) con protección contra inyección de fórmulas.
 */
export function generarCotizacionesCsv(
  cotizaciones: CotizacionComercial[],
  nombreNegocio = 'La Parada'
): string {
  const headers = [
    'Codigo',
    'Negocio',
    'Estado',
    'Cliente',
    'Empresa',
    'NIT',
    'Telefono',
    'Tipo Evento',
    'Modalidad',
    'Fecha Evento',
    'Hora Evento',
    'Invitados',
    'Validez',
    'Subtotal COP',
    'Descuento COP',
    'Logistica COP',
    'Total Cotizado COP',
    'Costo Insumos Estimado COP',
    'Utilidad Bruta Estimada COP',
    'Margen Bruto %',
    'Anticipo COP',
    'Estado Anticipo',
    'Metodo Anticipo',
    'Referencia Anticipo',
    'Saldo Pendiente COP',
    'Venta ID',
    'Comanda KDS ID',
  ];

  const filas = (cotizaciones || []).map((cot) => {
    const estadoEfectivo = obtenerEstadoEfectivoCotizacion(cot);
    return [
      escapeCsvSeguro(cot.codigo),
      escapeCsvSeguro(nombreNegocio),
      escapeCsvSeguro(ESTADOS_COTIZACION_META[estadoEfectivo]?.label || estadoEfectivo),
      escapeCsvSeguro(cot.clienteNombre),
      escapeCsvSeguro(cot.empresa || ''),
      escapeCsvSeguro(cot.nitEmpresa || ''),
      escapeCsvSeguro(cot.clienteTelefono),
      escapeCsvSeguro(formatearTipoEvento(cot.tipoEvento).label),
      escapeCsvSeguro(formatearModalidadEntrega(cot.modalidadEntrega)),
      escapeCsvSeguro(cot.fechaEvento),
      escapeCsvSeguro(cot.horaEvento || ''),
      escapeCsvSeguro(cot.invitados),
      escapeCsvSeguro(cot.fechaVencimiento),
      escapeCsvSeguro(cot.subtotal),
      escapeCsvSeguro(cot.descuento),
      escapeCsvSeguro(cot.costoLogistica),
      escapeCsvSeguro(cot.totalCotizado),
      escapeCsvSeguro(cot.costoEstimadoInsumos),
      escapeCsvSeguro(cot.utilidadEstimada),
      escapeCsvSeguro(cot.margenEstimadoPct),
      escapeCsvSeguro(cot.anticipoMonto),
      escapeCsvSeguro(cot.anticipoEstado),
      escapeCsvSeguro(cot.anticipoMetodo || ''),
      escapeCsvSeguro(cot.anticipoReferencia || ''),
      escapeCsvSeguro(cot.saldoPendiente),
      escapeCsvSeguro(cot.ventaId || ''),
      escapeCsvSeguro(cot.comandaId || ''),
    ].join(',');
  });

  return `\uFEFF${[headers.map(escapeCsvSeguro).join(','), ...filas].join('\r\n')}`;
}

export function descargarCotizacionesCsv(
  cotizaciones: CotizacionComercial[],
  nombreNegocio = 'La Parada'
): void {
  const contenido = generarCotizacionesCsv(cotizaciones, nombreNegocio);
  const fechaHoy = obtenerFechaLocalYYYYMMDD();
  const safeNegocio = (nombreNegocio || 'negocio').toLowerCase().replace(/[^a-z0-9]/g, '_');
  descargarArchivoCsv(contenido, `cotizaciones_eventos_${safeNegocio}_${fechaHoy}.csv`);
}
