import type {
  AnaliticaMermasOperativas,
  Combo,
  EstacionCocinaMerma,
  EstadoUmbralMerma,
  InfoEstacionCocinaMerma,
  InfoMotivoMermaCatalogo,
  InfoOrigenMerma,
  Insumo,
  ItemDesgloseMermaProducto,
  ItemVenta,
  MovimientoKardex,
  OrigenMermaOperativa,
  Producto,
  ResumenInsumoMermaRanking,
  ResumenMotivoMerma,
  SimulacionMermaProducto,
} from '@/types';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import { formatCOP } from '@/utils/formatCOP';
import { construirMapaCostosInsumos } from '@/utils/ingenieriaMenuUtils';
import {
  determinarTipoMovimiento,
  MOTIVOS_MERMA,
} from '@/utils/kardexInventarioUtils';
import { esInsumoSubReceta } from '@/utils/produccionCocinaUtils';
import { buildInsumosMap, calcularConsumoInsumos } from '@/utils/recetasEscandallo';

export const UMBRAL_MERMA_DEFAULT_PCT = 3.0;
export const UMBRAL_MERMA_DIARIO_FALLBACK_COP = 50000;

export const ORIGENES_MERMA_CATALOGO: InfoOrigenMerma[] = [
  {
    id: 'cocina_kds',
    label: 'Cocina / KDS',
    shortLabel: 'Cocina',
    descripcion: 'Desperdicio durante cocción, fritura, parrilla o armado de comanda.',
    badgeClass: 'border-orange-500/40 bg-orange-500/15 text-orange-300',
  },
  {
    id: 'devolucion_cliente',
    label: 'Devolución de Cliente',
    shortLabel: 'Devolución',
    descripcion: 'Producto devuelto por cliente en mesa, mostrador o domicilio.',
    badgeClass: 'border-rose-500/40 bg-rose-500/15 text-rose-300',
  },
  {
    id: 'bodega',
    label: 'Bodega / Almacenamiento',
    shortLabel: 'Bodega',
    descripcion: 'Vencimiento, daño por cadena de frío o deterioro en almacenamiento.',
    badgeClass: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  },
  {
    id: 'salon_mostrador',
    label: 'Salón / Mostrador',
    shortLabel: 'Salón',
    descripcion: 'Caída, derrame en servicio o consumo interno autorizado.',
    badgeClass: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
  },
];

export const ORIGENES_MERMA_MAP: Record<OrigenMermaOperativa, InfoOrigenMerma> =
  ORIGENES_MERMA_CATALOGO.reduce(
    (acc, item) => {
      acc[item.id] = item;
      return acc;
    },
    {} as Record<OrigenMermaOperativa, InfoOrigenMerma>
  );

export const ESTACIONES_COCINA_MERMA_CATALOGO: InfoEstacionCocinaMerma[] = [
  {
    id: 'parrilla_plancha',
    label: 'Parrilla / Plancha',
    descripcion: 'Carnes, hamburguesas y proteínas a la plancha.',
  },
  {
    id: 'freidora',
    label: 'Freidora / Vitrina',
    descripcion: 'Tequeños, pancerotis, papas y fritos.',
  },
  {
    id: 'armado_emplatado',
    label: 'Armado y Emplatado',
    descripcion: 'Salsas, panes, quesos y despacho final.',
  },
  {
    id: 'bodega_frio',
    label: 'Bodega / Cuarto Frío',
    descripcion: 'Neveras, congeladores y despensa seca.',
  },
  {
    id: 'entrega_domicilio',
    label: 'Domicilio / Empaque',
    descripcion: 'Pedidos devueltos o dañados durante el traslado.',
  },
  {
    id: 'general',
    label: 'Área General',
    descripcion: 'Otra área operativa del local.',
  },
];

function safeNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Clasifica y entrega etiquetas legibles para cualquier motivo de merma
 */
export function obtenerInfoMotivoMerma(motivo: string): InfoMotivoMermaCatalogo {
  const normalizado = (motivo || 'otro').trim().toLowerCase();
  const catalogo = MOTIVOS_MERMA.find((m) => m.id === normalizado);

  const esDevolucion =
    normalizado === 'devolucion_cliente' ||
    normalizado === 'comanda_cancelada' ||
    /devoluci|cancelad/.test(normalizado);

  const esCocina =
    normalizado === 'desperdicio_cocina' ||
    normalizado === 'error_preparacion' ||
    normalizado === 'accidente_caida' ||
    /cocina|preparaci|quemad|fritura|plancha/.test(normalizado);

  const esBodega =
    normalizado === 'vencimiento' ||
    normalizado === 'dañado_almacenamiento' ||
    /venc|almacen|bodega|dañad|descompos/.test(normalizado);

  if (catalogo) {
    return {
      id: catalogo.id,
      label: catalogo.label,
      descripcion: catalogo.descripcion,
      esDevolucion,
      esCocina,
      esBodega,
    };
  }

  return {
    id: normalizado || 'otro',
    label: motivo?.trim() || 'Otro Desperdicio',
    descripcion: 'Merma operativa registrada',
    esDevolucion,
    esCocina,
    esBodega,
  };
}

/**
 * Simula la explosión de receta de un producto o combo terminado para calcular
 * exactamente qué insumos se descontarán de bodega y cuál es el costo real de la merma en P&L.
 */
export function simularMermaProductoTerminado(params: {
  referenciaId: string;
  tipoReferencia: 'producto' | 'combo';
  cantidad: number;
  productos: Producto[];
  combos: Combo[];
  insumos: Insumo[];
  movimientosKardex?: MovimientoKardex[];
}): SimulacionMermaProducto {
  const {
    referenciaId,
    tipoReferencia,
    cantidad,
    productos,
    combos,
    insumos,
    movimientosKardex = [],
  } = params;

  const cantidadValida =
    Number.isFinite(cantidad) && cantidad > 0 ? Number(cantidad.toFixed(4)) : 1;

  const prod =
    tipoReferencia === 'producto'
      ? productos.find((p) => p.id === referenciaId)
      : undefined;
  const combo =
    tipoReferencia === 'combo'
      ? combos.find((c) => c.id === referenciaId)
      : undefined;

  if (!prod && !combo) {
    return {
      referenciaId,
      referenciaNombre: 'Ítem no encontrado',
      tipoReferencia,
      cantidadUnidades: cantidadValida,
      precioVentaPerdidoCOP: 0,
      costoTotalInsumosCOP: 0,
      desgloseInsumos: [],
      tieneEscandallo: false,
    };
  }

  const referenciaNombre = prod ? prod.nombre : (combo?.nombre || 'Combo');
  const precioUnitario = prod
    ? Math.max(0, safeNumber(prod.precio))
    : Math.max(0, safeNumber(combo?.precioEspecial));
  const precioVentaPerdidoCOP = Math.round(precioUnitario * cantidadValida);

  const itemVenta: ItemVenta = {
    tipo: tipoReferencia,
    referenciaId,
    nombre: referenciaNombre,
    cantidad: cantidadValida,
    precioUnitario,
    subtotal: precioVentaPerdidoCOP,
  };

  const consumos = calcularConsumoInsumos([itemVenta], productos, combos);
  const insumosMap = buildInsumosMap(insumos);
  const costosMap = construirMapaCostosInsumos(insumos, movimientosKardex);

  const desgloseInsumos: ItemDesgloseMermaProducto[] = consumos.map((c) => {
    const insumoLive = insumosMap.get(c.insumoId);
    const stockActual = Math.max(0, safeNumber(insumoLive?.stockActual));
    const cantidadTotalMerma = Number(c.cantidadTotal.toFixed(4));
    const cantidadPorUnidadProducto = Number((cantidadTotalMerma / cantidadValida).toFixed(4));
    const stockPosterior = Number(Math.max(0, stockActual - cantidadTotalMerma).toFixed(4));
    const costoUnitarioCOP = costosMap.get(c.insumoId)?.costoUnitario ?? 0;
    const costoTotalMermaCOP = Math.round(cantidadTotalMerma * costoUnitarioCOP);

    return {
      insumoId: c.insumoId,
      insumoNombre: insumoLive?.nombre || c.nombreSnapshot || 'Insumo',
      unidad: insumoLive?.unidad || c.unidadSnapshot || 'unid',
      cantidadPorUnidadProducto,
      cantidadTotalMerma,
      stockActual,
      stockPosterior,
      costoUnitarioCOP,
      costoTotalMermaCOP,
      esSubReceta: esInsumoSubReceta(insumoLive),
    };
  });

  const tieneEscandallo = desgloseInsumos.length > 0;
  let costoTotalInsumosCOP = 0;

  if (tieneEscandallo) {
    costoTotalInsumosCOP = desgloseInsumos.reduce((acc, it) => acc + it.costoTotalMermaCOP, 0);
  } else {
    const costoRef = prod
      ? safeNumber(prod.costoReferencia)
      : safeNumber(combo?.costoReferencia);
    costoTotalInsumosCOP = costoRef > 0 ? Math.round(costoRef * cantidadValida) : 0;
  }

  return {
    referenciaId,
    referenciaNombre,
    tipoReferencia,
    cantidadUnidades: cantidadValida,
    precioVentaPerdidoCOP,
    costoTotalInsumosCOP: Math.round(costoTotalInsumosCOP),
    desgloseInsumos,
    tieneEscandallo,
  };
}

/**
 * Infiere el origen operativo de un movimiento de merma del Kardex
 */
export function inferirOrigenMerma(mov: Partial<MovimientoKardex>): OrigenMermaOperativa {
  if (mov.origenMerma) {
    return mov.origenMerma;
  }
  const info = obtenerInfoMotivoMerma(mov.motivo || 'otro');
  if (info.esDevolucion || /devoluci/i.test(mov.proveedor || '')) {
    return 'devolucion_cliente';
  }
  if (info.esCocina || /cocina|kds/i.test(mov.proveedor || '')) {
    return 'cocina_kds';
  }
  if (mov.motivo === 'degustacion_personal') {
    return 'salon_mostrador';
  }
  return 'bodega';
}

/**
 * Calcula analítica consolidada de mermas operativas, ranking de insumos afectados,
 * desglose por origen/motivo y evaluación de umbral frente a Ventas Netas y CMV.
 */
export function calcularAnaliticaMermasOperativas(params: {
  movimientosKardex: MovimientoKardex[];
  insumos: Insumo[];
  ventasNetas?: number;
  cmvInsumos?: number;
  umbralMaximoPct?: number;
  ahora?: Date;
}): AnaliticaMermasOperativas {
  const {
    movimientosKardex,
    insumos,
    ventasNetas = 0,
    cmvInsumos = 0,
    umbralMaximoPct: umbralRaw,
    ahora = new Date(),
  } = params;

  const umbralMaximoPct =
    typeof umbralRaw === 'number' && Number.isFinite(umbralRaw) && umbralRaw > 0
      ? Number(umbralRaw.toFixed(1))
      : UMBRAL_MERMA_DEFAULT_PCT;

  const costosMap = construirMapaCostosInsumos(insumos, movimientosKardex);
  const insumosMap = buildInsumosMap(insumos);

  const inicioHoyMs = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate(),
    0,
    0,
    0,
    0
  ).getTime();

  let totalMermasCOP = 0;
  let cantidadRegistrosMerma = 0;
  let mermasHoyCOP = 0;
  let registrosHoyCount = 0;
  let mermasCocinaCOP = 0;
  let mermasDevolucionesCOP = 0;
  let mermasBodegaCOP = 0;

  const mapaInsumos = new Map<
    string,
    {
      insumoId: string;
      insumoNombre: string;
      unidad: string;
      cantidadTotal: number;
      costoTotalCOP: number;
      registrosCount: number;
      motivosConteo: Map<string, number>;
    }
  >();

  const mapaMotivos = new Map<
    string,
    {
      motivo: string;
      label: string;
      cantidadRegistros: number;
      costoTotalCOP: number;
    }
  >();

  for (const mov of movimientosKardex) {
    if (determinarTipoMovimiento(mov) !== 'merma') continue;

    cantidadRegistrosMerma += 1;
    const cantAbs = Math.abs(safeNumber(mov.cantidad));
    const costoGuardado = safeNumber(mov.costo);
    const costoUnitKardex = safeNumber(mov.costoUnitario);
    const costoUnitFallback = costosMap.get(mov.insumoId)?.costoUnitario ?? 0;
    const costoUnitRef = costoUnitKardex > 0 ? costoUnitKardex : costoUnitFallback;

    const costoMovimientoCOP =
      costoGuardado > 0
        ? Math.round(costoGuardado)
        : Math.round(cantAbs * costoUnitRef);

    totalMermasCOP += costoMovimientoCOP;

    const fechaMs = toValidAdminDate(mov.fecha)?.getTime() || 0;
    if (fechaMs >= inicioHoyMs) {
      mermasHoyCOP += costoMovimientoCOP;
      registrosHoyCount += 1;
    }

    const origen = inferirOrigenMerma(mov);
    if (origen === 'devolucion_cliente') {
      mermasDevolucionesCOP += costoMovimientoCOP;
    } else if (origen === 'cocina_kds' || origen === 'salon_mostrador') {
      mermasCocinaCOP += costoMovimientoCOP;
    } else {
      mermasBodegaCOP += costoMovimientoCOP;
    }

    const insumoLive = insumosMap.get(mov.insumoId);
    const insNombre = mov.insumoNombre || insumoLive?.nombre || 'Insumo';
    const insUnidad = mov.unidadMedida || insumoLive?.unidad || 'unid';
    const motivoKey = (mov.motivo || 'otro').trim().toLowerCase() || 'otro';
    const infoMotivo = obtenerInfoMotivoMerma(motivoKey);

    const insBucket = mapaInsumos.get(mov.insumoId) || {
      insumoId: mov.insumoId,
      insumoNombre: insNombre,
      unidad: insUnidad,
      cantidadTotal: 0,
      costoTotalCOP: 0,
      registrosCount: 0,
      motivosConteo: new Map<string, number>(),
    };

    insBucket.cantidadTotal = Number((insBucket.cantidadTotal + cantAbs).toFixed(4));
    insBucket.costoTotalCOP += costoMovimientoCOP;
    insBucket.registrosCount += 1;
    insBucket.motivosConteo.set(
      infoMotivo.label,
      (insBucket.motivosConteo.get(infoMotivo.label) || 0) + 1
    );
    mapaInsumos.set(mov.insumoId, insBucket);

    const motBucket = mapaMotivos.get(motivoKey) || {
      motivo: motivoKey,
      label: infoMotivo.label,
      cantidadRegistros: 0,
      costoTotalCOP: 0,
    };
    motBucket.cantidadRegistros += 1;
    motBucket.costoTotalCOP += costoMovimientoCOP;
    mapaMotivos.set(motivoKey, motBucket);
  }

  totalMermasCOP = Math.round(totalMermasCOP);
  mermasHoyCOP = Math.round(mermasHoyCOP);
  mermasCocinaCOP = Math.round(mermasCocinaCOP);
  mermasDevolucionesCOP = Math.round(mermasDevolucionesCOP);
  mermasBodegaCOP = Math.round(mermasBodegaCOP);

  const ventasSafe = Math.max(0, safeNumber(ventasNetas));
  const cmvSafe = Math.max(0, safeNumber(cmvInsumos));

  const porcentajeSobreVentasNetas =
    ventasSafe > 0
      ? Number(((totalMermasCOP / ventasSafe) * 100).toFixed(1))
      : 0;

  const porcentajeSobreCMV =
    cmvSafe > 0
      ? Number(((totalMermasCOP / cmvSafe) * 100).toFixed(1))
      : 0;

  const presupuestoMaximoMermaCOP =
    ventasSafe > 0
      ? Math.round((ventasSafe * umbralMaximoPct) / 100)
      : UMBRAL_MERMA_DIARIO_FALLBACK_COP;

  const excesoSobreUmbralCOP = Math.max(0, totalMermasCOP - presupuestoMaximoMermaCOP);

  let estadoUmbral: EstadoUmbralMerma = 'optimo';
  let mensajeAlertaUmbral = '';

  if (ventasSafe > 0) {
    if (porcentajeSobreVentasNetas <= 1.5) {
      estadoUmbral = 'optimo';
      mensajeAlertaUmbral = `Merma bajo control (${porcentajeSobreVentasNetas}% de ventas netas, dentro del rango óptimo <= 1.5%).`;
    } else if (porcentajeSobreVentasNetas <= 2.5) {
      estadoUmbral = 'preventivo';
      mensajeAlertaUmbral = `Merma en zona preventiva (${porcentajeSobreVentasNetas}% vs meta máxima ${umbralMaximoPct}%). Revisa porciones en cocina.`;
    } else if (porcentajeSobreVentasNetas <= umbralMaximoPct) {
      estadoUmbral = 'alerta';
      mensajeAlertaUmbral = `Alerta temprana: la merma alcanzó ${porcentajeSobreVentasNetas}% de las ventas netas (cerca del tope ${umbralMaximoPct}%).`;
    } else {
      estadoUmbral = 'critico';
      mensajeAlertaUmbral = `Umbral crítico superado (${porcentajeSobreVentasNetas}% vs tope ${umbralMaximoPct}%). Exceso de ${formatCOP(excesoSobreUmbralCOP)} impactando directamente la utilidad neta.`;
    }
  } else {
    if (totalMermasCOP >= UMBRAL_MERMA_DIARIO_FALLBACK_COP) {
      estadoUmbral = 'critico';
      mensajeAlertaUmbral = `Las mermas registradas alcanzan ${formatCOP(totalMermasCOP)} y superan el tope operativo de referencia (${formatCOP(UMBRAL_MERMA_DIARIO_FALLBACK_COP)}).`;
    } else if (totalMermasCOP >= Math.round(UMBRAL_MERMA_DIARIO_FALLBACK_COP * 0.6)) {
      estadoUmbral = 'alerta';
      mensajeAlertaUmbral = `Mermas acumuladas en ${formatCOP(totalMermasCOP)}, acercándose al tope de referencia (${formatCOP(UMBRAL_MERMA_DIARIO_FALLBACK_COP)}).`;
    } else if (totalMermasCOP > 0) {
      estadoUmbral = 'preventivo';
      mensajeAlertaUmbral = `Se han registrado ${cantidadRegistrosMerma} mermas por ${formatCOP(totalMermasCOP)} en el período.`;
    } else {
      estadoUmbral = 'optimo';
      mensajeAlertaUmbral = 'Sin pérdidas por mermas o devoluciones registradas en este período.';
    }
  }

  const topInsumosMerma: ResumenInsumoMermaRanking[] = Array.from(mapaInsumos.values())
    .map((bucket) => {
      let motivoPrincipal = 'Otro Desperdicio';
      let maxCount = -1;
      for (const [label, count] of bucket.motivosConteo.entries()) {
        if (count > maxCount) {
          maxCount = count;
          motivoPrincipal = label;
        }
      }
      const costoRedondeado = Math.round(bucket.costoTotalCOP);
      return {
        insumoId: bucket.insumoId,
        insumoNombre: bucket.insumoNombre,
        unidad: bucket.unidad,
        cantidadTotal: Number(bucket.cantidadTotal.toFixed(4)),
        costoTotalCOP: costoRedondeado,
        registrosCount: bucket.registrosCount,
        porcentajeDelTotalMerma:
          totalMermasCOP > 0
            ? Number(((costoRedondeado / totalMermasCOP) * 100).toFixed(1))
            : 0,
        motivoPrincipal,
      };
    })
    .sort((a, b) => {
      if (b.costoTotalCOP !== a.costoTotalCOP) return b.costoTotalCOP - a.costoTotalCOP;
      return b.cantidadTotal - a.cantidadTotal;
    });

  const desglosePorMotivo: ResumenMotivoMerma[] = Array.from(mapaMotivos.values())
    .map((m) => {
      const costoRedondeado = Math.round(m.costoTotalCOP);
      return {
        motivo: m.motivo,
        label: m.label,
        cantidadRegistros: m.cantidadRegistros,
        costoTotalCOP: costoRedondeado,
        porcentajeCosto:
          totalMermasCOP > 0
            ? Number(((costoRedondeado / totalMermasCOP) * 100).toFixed(1))
            : 0,
      };
    })
    .sort((a, b) => {
      if (b.costoTotalCOP !== a.costoTotalCOP) return b.costoTotalCOP - a.costoTotalCOP;
      return b.cantidadRegistros - a.cantidadRegistros;
    });

  return {
    totalMermasCOP,
    cantidadRegistrosMerma,
    mermasHoyCOP,
    registrosHoyCount,
    mermasCocinaCOP,
    mermasDevolucionesCOP,
    mermasBodegaCOP,
    porcentajeSobreVentasNetas,
    porcentajeSobreCMV,
    umbralMaximoPct,
    presupuestoMaximoMermaCOP,
    excesoSobreUmbralCOP,
    estadoUmbral,
    mensajeAlertaUmbral,
    topInsumosMerma,
    desglosePorMotivo,
  };
}

function escapeCsvSeguro(valor: string | number | undefined | null): string {
  let texto = String(valor ?? '');
  if (/^[=+\-@\t\r]/.test(texto) && !/^-\d+(\.\d+)?$/.test(texto)) {
    texto = `'${texto}`;
  }
  return `"${texto.replace(/"/g, '""')}"`;
}

/**
 * Genera el contenido CSV forense (UTF-8 BOM) para auditoría contable de mermas y devoluciones
 */
export function generarMermasOperativasCsv(
  movimientos: MovimientoKardex[],
  insumos: Insumo[],
  nombreNegocio: string
): string {
  const costosMap = construirMapaCostosInsumos(insumos, movimientos);
  const headers = [
    'ID Movimiento',
    'Lote Merma',
    'Fecha',
    'Hora',
    'Negocio',
    'Origen',
    'Estacion Cocina',
    'Producto / Combo Afectado',
    'Insumo',
    'Cantidad Perdida',
    'Unidad',
    'Costo Unitario COP',
    'Impacto P&L COP',
    'Motivo',
    'Responsable',
    'Comanda / Ref',
    'Notas',
  ];

  const mermas = movimientos.filter((mov) => determinarTipoMovimiento(mov) === 'merma');

  const filas = mermas.map((mov) => {
    const date = toValidAdminDate(mov.fecha) || new Date();
    const fechaStr = date.toLocaleDateString('es-CO');
    const horaStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const cantAbs = Math.abs(safeNumber(mov.cantidad));
    const costoUnit =
      typeof mov.costoUnitario === 'number' && mov.costoUnitario > 0
        ? Math.round(mov.costoUnitario)
        : costosMap.get(mov.insumoId)?.costoUnitario ?? 0;
    const impactoCOP =
      safeNumber(mov.costo) > 0
        ? Math.round(safeNumber(mov.costo))
        : Math.round(cantAbs * costoUnit);

    const origen = inferirOrigenMerma(mov);
    const origenLabel = ORIGENES_MERMA_MAP[origen]?.label || origen;
    const estacionLabel =
      ESTACIONES_COCINA_MERMA_CATALOGO.find((e) => e.id === mov.estacionCocina)?.label ||
      (mov.estacionCocina as EstacionCocinaMerma | undefined) ||
      'General';
    const motivoInfo = obtenerInfoMotivoMerma(mov.motivo || 'otro');

    return [
      escapeCsvSeguro(mov.id),
      escapeCsvSeguro(mov.mermaLoteId || ''),
      escapeCsvSeguro(fechaStr),
      escapeCsvSeguro(horaStr),
      escapeCsvSeguro(nombreNegocio || 'La Parada'),
      escapeCsvSeguro(origenLabel),
      escapeCsvSeguro(estacionLabel),
      escapeCsvSeguro(mov.productoMermaNombre || 'Insumo directo'),
      escapeCsvSeguro(mov.insumoNombre),
      escapeCsvSeguro(cantAbs),
      escapeCsvSeguro(mov.unidadMedida || 'unid'),
      escapeCsvSeguro(costoUnit),
      escapeCsvSeguro(impactoCOP),
      escapeCsvSeguro(motivoInfo.label),
      escapeCsvSeguro(mov.responsable || 'Sistema'),
      escapeCsvSeguro(mov.comandaMermaId || mov.proveedor || ''),
      escapeCsvSeguro(mov.notas || ''),
    ].join(',');
  });

  return `\uFEFF${[headers.map(escapeCsvSeguro).join(','), ...filas].join('\r\n')}`;
}

/**
 * Dispara la descarga en el navegador del archivo CSV de Mermas Operativas
 */
export function descargarMermasOperativasCsv(
  movimientos: MovimientoKardex[],
  insumos: Insumo[],
  nombreNegocio: string
): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }
  const contenido = generarMermasOperativasCsv(movimientos, insumos, nombreNegocio);
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fechaHoy = new Date().toISOString().split('T')[0];
  const safeNegocio = (nombreNegocio || 'negocio').toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.href = url;
  a.download = `mermas_operativas_${safeNegocio}_${fechaHoy}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
