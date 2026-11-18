import type {
  Combo,
  CuadranteBCG,
  DesgloseCostoIngrediente,
  Insumo,
  InsumoReceta,
  ItemIngenieriaMenu,
  MetaCuadranteBCG,
  MovimientoKardex,
  Producto,
  RangoFechaReporte,
  RedondeoPrecioCOP,
  ResultadoSimulacionPrecio,
  ResumenIngenieriaMenu,
  TipoItemMenuIngenieria,
  Venta,
} from '@/types';
import { calcularCostosUnitariosRecientes } from './kardexInventarioUtils';
import { formatCOP } from './formatCOP';

export const FOOD_COST_OBJETIVO_DEFAULT_PCT = 30;
export const PRESETS_FOOD_COST_PCT = [25, 30, 35, 40] as const;

export const METAS_CUADRANTES_BCG: Record<CuadranteBCG, MetaCuadranteBCG> = {
  estrella: {
    id: 'estrella',
    titulo: 'Platos Estrella',
    tituloCorto: 'Estrella',
    emoji: '⭐',
    subtitulo: 'Alta popularidad · Alto margen',
    estrategia:
      'Protege la receta estándar y gramajes. Dales máxima visibilidad en menú, POS y destacados en tienda.',
    badgeClasses: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    borderClasses: 'border-amber-500/40',
    bgClasses: 'bg-amber-500/10',
    textClasses: 'text-amber-300',
    hexColor: '#F59E0B',
  },
  caballo_batalla: {
    id: 'caballo_batalla',
    titulo: 'Caballos de Batalla',
    tituloCorto: 'Caballo',
    emoji: '🐴',
    subtitulo: 'Alta popularidad · Bajo margen',
    estrategia:
      'Atraen tráfico pero dejan menos utilidad por unidad. Prueba micro-subidas de precio o combos con bebidas de alto margen.',
    badgeClasses: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
    borderClasses: 'border-sky-500/40',
    bgClasses: 'bg-sky-500/10',
    textClasses: 'text-sky-300',
    hexColor: '#0EA5E9',
  },
  rompecabezas: {
    id: 'rompecabezas',
    titulo: 'Rompecabezas',
    tituloCorto: 'Enigma',
    emoji: '🧩',
    subtitulo: 'Baja popularidad · Alto margen',
    estrategia:
      'Muy rentables pero poco pedidos. Impúlsalos con fotografía gourmet, recomendación en mesa, Happy Hour o destacados.',
    badgeClasses: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
    borderClasses: 'border-purple-500/40',
    bgClasses: 'bg-purple-500/10',
    textClasses: 'text-purple-300',
    hexColor: '#A855F7',
  },
  perro: {
    id: 'perro',
    titulo: 'Platos Perro',
    tituloCorto: 'Perro',
    emoji: '🐕',
    subtitulo: 'Baja popularidad · Bajo margen',
    estrategia:
      'Consumen tiempo de cocina con poca rotación y bajo margen. Evalúa retirar del menú, reformular receta o reajustar precio.',
    badgeClasses: 'border-red-500/40 bg-red-500/15 text-red-300',
    borderClasses: 'border-red-500/40',
    bgClasses: 'bg-red-500/10',
    textClasses: 'text-red-300',
    hexColor: '#EF4444',
  },
  sin_costeo: {
    id: 'sin_costeo',
    titulo: 'Por Costear',
    tituloCorto: 'Sin costo',
    emoji: '⚠️',
    subtitulo: 'Sin receta o costo unitario',
    estrategia:
      'Asigna un escandallo de insumos (con costo unitario en bodega) o un costo directo de referencia para ubicarlos en la matriz.',
    badgeClasses: 'border-neutral-600 bg-neutral-800/80 text-neutral-300',
    borderClasses: 'border-neutral-700',
    bgClasses: 'bg-neutral-800/50',
    textClasses: 'text-neutral-300',
    hexColor: '#737373',
  },
};

export interface CostoInsumoFuente {
  costoUnitario: number;
  fuente: 'kardex' | 'insumo' | 'sin_costo';
}

function safeNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Construye un mapa O(1) con el costo unitario más confiable por insumo:
 * prioriza compras recientes del Kardex y hace fallback al costoUnitario del catálogo de insumos.
 */
export function construirMapaCostosInsumos(
  insumos: Insumo[],
  movimientosKardex: MovimientoKardex[] = []
): Map<string, CostoInsumoFuente> {
  const kardexCostos = calcularCostosUnitariosRecientes(movimientosKardex);
  const resultado = new Map<string, CostoInsumoFuente>();

  for (const ins of insumos) {
    const costoKardex = safeNumber(kardexCostos[ins.id]);
    if (costoKardex > 0) {
      resultado.set(ins.id, { costoUnitario: costoKardex, fuente: 'kardex' });
      continue;
    }

    const costoCatalogo = safeNumber(ins.costoUnitario);
    if (costoCatalogo > 0) {
      resultado.set(ins.id, { costoUnitario: costoCatalogo, fuente: 'insumo' });
      continue;
    }

    resultado.set(ins.id, { costoUnitario: 0, fuente: 'sin_costo' });
  }

  for (const [insumoId, costo] of Object.entries(kardexCostos)) {
    if (!resultado.has(insumoId) && safeNumber(costo) > 0) {
      resultado.set(insumoId, { costoUnitario: safeNumber(costo), fuente: 'kardex' });
    }
  }

  return resultado;
}

export interface ResultadoCostoReceta {
  costoTotalCOP: number;
  desglose: DesgloseCostoIngrediente[];
  insumosSinCosto: string[];
  tieneInsumos: boolean;
  costeoIncompleto: boolean;
}

/**
 * Calcula el costo unitario de un escandallo / lista de ingredientes con precisión decimal
 * antes de redondear el total del plato a pesos COP enteros.
 */
export function calcularCostoReceta(
  receta: InsumoReceta[] | undefined,
  insumosMap: Map<string, Insumo>,
  costosInsumosMap: Map<string, CostoInsumoFuente>
): ResultadoCostoReceta {
  if (!receta || receta.length === 0) {
    return {
      costoTotalCOP: 0,
      desglose: [],
      insumosSinCosto: [],
      tieneInsumos: false,
      costeoIncompleto: false,
    };
  }

  const desgloseBruto: Array<DesgloseCostoIngrediente & { subtotalExacto: number }> = [];
  const insumosSinCosto: string[] = [];
  let sumaExacta = 0;

  for (const ing of receta) {
    const cantidad = safeNumber(ing.cantidad);
    if (!ing.insumoId || cantidad <= 0) continue;

    const insumo = insumosMap.get(ing.insumoId);
    const costoInfo = costosInsumosMap.get(ing.insumoId);
    const costoUnitarioInsumo = costoInfo?.costoUnitario ?? 0;
    const fuenteCosto = costoInfo?.fuente ?? 'sin_costo';
    const nombre = insumo?.nombre || ing.nombreSnapshot || 'Insumo';
    const unidad = insumo?.unidad || ing.unidadSnapshot || 'unidad';
    const tieneCosto = costoUnitarioInsumo > 0;
    const subtotalExacto = cantidad * costoUnitarioInsumo;

    if (!tieneCosto) {
      insumosSinCosto.push(nombre);
    }

    sumaExacta += subtotalExacto;
    desgloseBruto.push({
      insumoId: ing.insumoId,
      nombre,
      cantidad,
      unidad,
      costoUnitarioInsumo,
      fuenteCosto,
      subtotalCostoCOP: Math.round(subtotalExacto),
      participacionCostoPct: 0,
      tieneCosto,
      subtotalExacto,
    });
  }

  const costoTotalCOP = Math.round(sumaExacta);
  const desglose: DesgloseCostoIngrediente[] = desgloseBruto.map(({ subtotalExacto, ...rest }) => ({
    ...rest,
    participacionCostoPct:
      sumaExacta > 0 ? Number(((subtotalExacto / sumaExacta) * 100).toFixed(1)) : 0,
  }));

  return {
    costoTotalCOP,
    desglose,
    insumosSinCosto,
    tieneInsumos: desglose.length > 0,
    costeoIncompleto: desglose.length > 0 && insumosSinCosto.length > 0,
  };
}

/**
 * Calcula la base neta del precio de venta descontando el impuesto incluido (INC 8% / IVA 19%) si aplica.
 */
export function calcularPrecioBaseNeta(
  precioBrutoCOP: number,
  tasaImpuestoIncluidoPct = 0
): number {
  const bruto = Math.max(0, safeNumber(precioBrutoCOP));
  const tasa = Math.max(0, safeNumber(tasaImpuestoIncluidoPct));
  if (bruto <= 0) return 0;
  if (tasa <= 0) return Math.round(bruto);
  return Math.round(bruto / (1 + tasa / 100));
}

/**
 * Redondeo comercial en pesos colombianos hacia arriba para proteger el Food Cost objetivo.
 */
export function redondearPrecioComercialCOP(
  precioExacto: number,
  redondeo: RedondeoPrecioCOP = '500'
): number {
  if (!Number.isFinite(precioExacto) || precioExacto <= 0) return 0;

  switch (redondeo) {
    case '100':
      return Math.ceil(Number((precioExacto / 100).toFixed(6))) * 100;
    case '500':
      return Math.ceil(Number((precioExacto / 500).toFixed(6))) * 500;
    case '1000':
      return Math.ceil(Number((precioExacto / 1000).toFixed(6))) * 1000;
    case 'exacto':
    default:
      return Math.round(precioExacto);
  }
}

/**
 * Calcula el precio de venta sugerido al público según el costo unitario y Food Cost objetivo (%).
 */
export function calcularPrecioSugeridoFoodCost(
  costoUnitarioCOP: number,
  foodCostObjetivoPct: number,
  redondeo: RedondeoPrecioCOP = '500',
  tasaImpuestoIncluidoPct = 0
): number {
  const costo = safeNumber(costoUnitarioCOP);
  const objetivo = safeNumber(foodCostObjetivoPct);
  const tasa = Math.max(0, safeNumber(tasaImpuestoIncluidoPct));

  if (costo <= 0 || objetivo <= 0 || objetivo >= 100) return 0;

  const baseNetaRequerida = costo / (objetivo / 100);
  const precioBrutoRequerido =
    tasa > 0 ? baseNetaRequerida * (1 + tasa / 100) : baseNetaRequerida;

  return redondearPrecioComercialCOP(precioBrutoRequerido, redondeo);
}

export function clasificarCuadranteBCG(params: {
  tieneCosteo: boolean;
  unidadesVendidas: number;
  margenContribucionUnitario: number;
  umbralPopularidadUnidades: number;
  umbralMargenContribucionCOP: number;
}): {
  cuadrante: CuadranteBCG;
  popularidadAlta: boolean;
  rentabilidadAlta: boolean;
} {
  if (!params.tieneCosteo) {
    return { cuadrante: 'sin_costeo', popularidadAlta: false, rentabilidadAlta: false };
  }

  const popularidadAlta =
    params.unidadesVendidas > 0 && params.unidadesVendidas >= params.umbralPopularidadUnidades;
  const rentabilidadAlta =
    params.margenContribucionUnitario >= params.umbralMargenContribucionCOP;

  if (popularidadAlta && rentabilidadAlta) {
    return { cuadrante: 'estrella', popularidadAlta, rentabilidadAlta };
  }
  if (popularidadAlta && !rentabilidadAlta) {
    return { cuadrante: 'caballo_batalla', popularidadAlta, rentabilidadAlta };
  }
  if (!popularidadAlta && rentabilidadAlta) {
    return { cuadrante: 'rompecabezas', popularidadAlta, rentabilidadAlta };
  }
  return { cuadrante: 'perro', popularidadAlta, rentabilidadAlta };
}

function construirRecomendacionItem(params: {
  cuadrante: CuadranteBCG;
  precioVenta: number;
  precioSugeridoObjetivoCOP: number;
  foodCostPct: number;
  foodCostObjetivoPct: number;
  tieneReceta: boolean;
  insumosSinCosto: string[];
}): string {
  const {
    cuadrante,
    precioVenta,
    precioSugeridoObjetivoCOP,
    foodCostPct,
    foodCostObjetivoPct,
    tieneReceta,
    insumosSinCosto,
  } = params;

  if (cuadrante === 'sin_costeo') {
    if (tieneReceta && insumosSinCosto.length > 0) {
      return `Falta asignar costo unitario a ${insumosSinCosto.slice(0, 2).join(', ')}.`;
    }
    return 'Configura el escandallo de receta o un costo directo de referencia.';
  }

  if (cuadrante === 'estrella') {
    if (foodCostPct > foodCostObjetivoPct + 3 && precioSugeridoObjetivoCOP > precioVenta) {
      return `Líder en ventas y margen. Puedes optimizar ${formatCOP(precioSugeridoObjetivoCOP - precioVenta)} para cumplir ${foodCostObjetivoPct}% FC.`;
    }
    return 'Mantén gramaje estándar y promociónalo como producto principal.';
  }

  if (cuadrante === 'caballo_batalla') {
    if (precioSugeridoObjetivoCOP > precioVenta) {
      return `Muy pedido pero margen ajustado. Simula subir a ${formatCOP(precioSugeridoObjetivoCOP)} (+${formatCOP(precioSugeridoObjetivoCOP - precioVenta)}).`;
    }
    return 'Alta rotación. Combínalo con bebidas o extras de alto margen para elevar el ticket.';
  }

  if (cuadrante === 'rompecabezas') {
    return 'Excelente margen por unidad, baja salida. Destácalo en tienda o crea una campaña de impulso.';
  }

  if (precioSugeridoObjetivoCOP > precioVenta) {
    return `Baja rotación y bajo margen. Evalúa retirar del menú o ajustar precio hacia ${formatCOP(precioSugeridoObjetivoCOP)}.`;
  }
  return 'Baja rotación y bajo margen. Revisa si conviene simplificar o retirar del catálogo.';
}

export interface ConstruirMatrizIngenieriaParams {
  productos: Producto[];
  combos: Combo[];
  ventas: Venta[];
  insumos: Insumo[];
  movimientosKardex: MovimientoKardex[];
  periodo: RangoFechaReporte;
  foodCostObjetivoPct?: number;
  redondeo?: RedondeoPrecioCOP;
  tasaImpuestoIncluidoPct?: number;
  tipoFiltro?: 'todos' | TipoItemMenuIngenieria;
  categoriaFiltro?: string;
  incluirNoDisponibles?: boolean;
}

/**
 * Construye el análisis completo de Ingeniería de Menú (Matriz BCG Gastronómica)
 * combinando catálogo, escandallos, costos del Kardex y ventas reales del período.
 */
export function construirMatrizIngenieriaMenu(
  params: ConstruirMatrizIngenieriaParams
): ResumenIngenieriaMenu {
  const {
    productos,
    combos,
    ventas,
    insumos,
    movimientosKardex,
    periodo,
    foodCostObjetivoPct = FOOD_COST_OBJETIVO_DEFAULT_PCT,
    redondeo = '500',
    tasaImpuestoIncluidoPct = 0,
    tipoFiltro = 'todos',
    categoriaFiltro = 'todas',
    incluirNoDisponibles = true,
  } = params;

  const objetivoSeguro = Math.min(95, Math.max(5, safeNumber(foodCostObjetivoPct) || 30));
  const tasaSegura = Math.max(0, safeNumber(tasaImpuestoIncluidoPct));

  const insumosMap = new Map<string, Insumo>();
  insumos.forEach((ins) => insumosMap.set(ins.id, ins));

  const productosMap = new Map<string, Producto>();
  productos.forEach((p) => productosMap.set(p.id, p));

  const costosInsumosMap = construirMapaCostosInsumos(insumos, movimientosKardex);

  // 1. Agregar ventas válidas (excluir anuladas) por producto/combo
  const ventasValidas = ventas.filter((v) => v.estado !== 'anulada');
  const statsPorId = new Map<string, { unidades: number; ingresos: number }>();
  const statsPorNombre = new Map<string, { unidades: number; ingresos: number }>();

  for (const venta of ventasValidas) {
    for (const item of venta.items || []) {
      const cantidad = safeNumber(item.cantidad);
      if (cantidad <= 0) continue;
      const tipoItem: TipoItemMenuIngenieria = item.tipo === 'combo' ? 'combo' : 'producto';
      const ingresoLinea =
        safeNumber(item.subtotal) > 0
          ? safeNumber(item.subtotal)
          : Math.round(safeNumber(item.precioUnitario) * cantidad);

      const refId = (item.referenciaId || '').trim();
      if (refId) {
        const keyId = `${tipoItem}:${refId}`;
        const prev = statsPorId.get(keyId) || { unidades: 0, ingresos: 0 };
        prev.unidades += cantidad;
        prev.ingresos += ingresoLinea;
        statsPorId.set(keyId, prev);
      } else if (item.nombre) {
        const keyNombre = `${tipoItem}:${item.nombre.trim().toLowerCase()}`;
        const prev = statsPorNombre.get(keyNombre) || { unidades: 0, ingresos: 0 };
        prev.unidades += cantidad;
        prev.ingresos += ingresoLinea;
        statsPorNombre.set(keyNombre, prev);
      }
    }
  }

  interface ItemBorrador {
    id: string;
    tipo: TipoItemMenuIngenieria;
    nombre: string;
    categoria: string;
    disponible: boolean;
    destacado: boolean;
    precioVenta: number;
    costoUnitarioCOP: number;
    origenCosteo: ItemIngenieriaMenu['origenCosteo'];
    tieneCosteo: boolean;
    costeoIncompleto: boolean;
    insumosSinCosto: string[];
    desgloseIngredientes: DesgloseCostoIngrediente[];
    costoReferenciaActual?: number;
    margenContribucionUnitario: number;
    foodCostPct: number;
    margenBrutoPct: number;
    unidadesVendidas: number;
    ingresosRealesCOP: number;
    costoTotalPeriodoCOP: number;
    contribucionTotalCOP: number;
    precioSugeridoObjetivoCOP: number;
    diferenciaPrecioSugeridoCOP: number;
    tieneReceta: boolean;
  }

  const borradores: ItemBorrador[] = [];

  const calcularProductoBase = (prod: Producto) => {
    const resReceta = calcularCostoReceta(prod.receta, insumosMap, costosInsumosMap);
    const costoRef = safeNumber(prod.costoReferencia);

    if (resReceta.tieneInsumos && resReceta.costoTotalCOP > 0) {
      return {
        costoUnitarioCOP: resReceta.costoTotalCOP,
        origenCosteo: 'receta' as const,
        tieneCosteo: true,
        costeoIncompleto: resReceta.costeoIncompleto,
        insumosSinCosto: resReceta.insumosSinCosto,
        desgloseIngredientes: resReceta.desglose,
        tieneReceta: true,
      };
    }

    if (costoRef > 0) {
      return {
        costoUnitarioCOP: Math.round(costoRef),
        origenCosteo: 'referencia_manual' as const,
        tieneCosteo: true,
        costeoIncompleto: resReceta.tieneInsumos,
        insumosSinCosto: resReceta.insumosSinCosto,
        desgloseIngredientes: resReceta.desglose,
        tieneReceta: resReceta.tieneInsumos,
      };
    }

    return {
      costoUnitarioCOP: 0,
      origenCosteo: 'sin_costeo' as const,
      tieneCosteo: false,
      costeoIncompleto: resReceta.tieneInsumos,
      insumosSinCosto: resReceta.insumosSinCosto,
      desgloseIngredientes: resReceta.desglose,
      tieneReceta: resReceta.tieneInsumos,
    };
  };

  // 2. Evaluar Productos
  if (tipoFiltro === 'todos' || tipoFiltro === 'producto') {
    for (const prod of productos) {
      if (!incluirNoDisponibles && !prod.disponible) continue;
      const categoria = (prod.categoria || 'Sin categoría').trim();
      if (
        categoriaFiltro !== 'todas' &&
        categoria.toLowerCase() !== categoriaFiltro.toLowerCase().trim()
      ) {
        continue;
      }

      const precioVenta = Math.max(0, Math.round(safeNumber(prod.precio)));
      const baseNeta = calcularPrecioBaseNeta(precioVenta, tasaSegura);
      const costeo = calcularProductoBase(prod);

      const stats =
        statsPorId.get(`producto:${prod.id}`) ||
        statsPorNombre.get(`producto:${prod.nombre.trim().toLowerCase()}`) || {
          unidades: 0,
          ingresos: 0,
        };

      const margenUnit = baseNeta - costeo.costoUnitarioCOP;
      const foodCostPct =
        costeo.tieneCosteo && baseNeta > 0
          ? Number(((costeo.costoUnitarioCOP / baseNeta) * 100).toFixed(1))
          : 0;
      const margenBrutoPct =
        costeo.tieneCosteo && baseNeta > 0
          ? Number(((margenUnit / baseNeta) * 100).toFixed(1))
          : 0;

      const precioSugeridoObjetivoCOP = costeo.tieneCosteo
        ? calcularPrecioSugeridoFoodCost(
            costeo.costoUnitarioCOP,
            objetivoSeguro,
            redondeo,
            tasaSegura
          )
        : 0;

      borradores.push({
        id: prod.id,
        tipo: 'producto',
        nombre: prod.nombre,
        categoria,
        disponible: prod.disponible !== false,
        destacado: Boolean(prod.destacado),
        precioVenta,
        costoUnitarioCOP: costeo.costoUnitarioCOP,
        origenCosteo: costeo.origenCosteo,
        tieneCosteo: costeo.tieneCosteo,
        costeoIncompleto: costeo.costeoIncompleto,
        insumosSinCosto: costeo.insumosSinCosto,
        desgloseIngredientes: costeo.desgloseIngredientes,
        costoReferenciaActual:
          typeof prod.costoReferencia === 'number' && prod.costoReferencia > 0
            ? prod.costoReferencia
            : undefined,
        margenContribucionUnitario: costeo.tieneCosteo ? margenUnit : 0,
        foodCostPct,
        margenBrutoPct,
        unidadesVendidas: stats.unidades,
        ingresosRealesCOP: Math.round(stats.ingresos),
        costoTotalPeriodoCOP: costeo.tieneCosteo
          ? Math.round(costeo.costoUnitarioCOP * stats.unidades)
          : 0,
        contribucionTotalCOP: costeo.tieneCosteo
          ? Math.round(margenUnit * stats.unidades)
          : 0,
        precioSugeridoObjetivoCOP,
        diferenciaPrecioSugeridoCOP:
          precioSugeridoObjetivoCOP > 0 ? precioSugeridoObjetivoCOP - precioVenta : 0,
        tieneReceta: costeo.tieneReceta,
      });
    }
  }

  // 3. Evaluar Combos
  if (tipoFiltro === 'todos' || tipoFiltro === 'combo') {
    for (const combo of combos) {
      if (!incluirNoDisponibles && !combo.disponible) continue;
      const categoria = (combo.categoria || 'Combos').trim();
      if (
        categoriaFiltro !== 'todas' &&
        categoria.toLowerCase() !== categoriaFiltro.toLowerCase().trim()
      ) {
        continue;
      }

      const precioVenta = Math.max(0, Math.round(safeNumber(combo.precioEspecial)));
      const baseNeta = calcularPrecioBaseNeta(precioVenta, tasaSegura);

      const ingredientesExpandidos: InsumoReceta[] = [];
      if (Array.isArray(combo.receta)) {
        ingredientesExpandidos.push(...combo.receta);
      }

      const extrasReferencia: DesgloseCostoIngrediente[] = [];
      const insumosSinCostoExtras: string[] = [];
      let sumaReferenciaProductos = 0;

      const agregarProductoComponente = (prodComp: Producto, cantComp: number) => {
        if (cantComp <= 0) return;
        if (prodComp.receta && prodComp.receta.length > 0) {
          for (const ing of prodComp.receta) {
            ingredientesExpandidos.push({
              insumoId: ing.insumoId,
              nombreSnapshot: ing.nombreSnapshot,
              cantidad: safeNumber(ing.cantidad) * cantComp,
              unidadSnapshot: ing.unidadSnapshot,
            });
          }
        } else if (safeNumber(prodComp.costoReferencia) > 0) {
          const costoUnitComp = Math.round(safeNumber(prodComp.costoReferencia));
          const subComp = Math.round(costoUnitComp * cantComp);
          sumaReferenciaProductos += subComp;
          extrasReferencia.push({
            insumoId: `prod-ref:${prodComp.id}`,
            nombre: `${prodComp.nombre} (costo ref.)`,
            cantidad: cantComp,
            unidad: 'porción',
            costoUnitarioInsumo: costoUnitComp,
            fuenteCosto: 'insumo',
            subtotalCostoCOP: subComp,
            participacionCostoPct: 0,
            tieneCosto: true,
          });
        } else {
          insumosSinCostoExtras.push(`${prodComp.nombre} (sin receta)`);
        }
      };

      for (const comboItem of combo.items || []) {
        const cantComp = safeNumber(comboItem.cantidad);
        if (cantComp <= 0) continue;
        const prodComp = productosMap.get(comboItem.productoId);
        if (!prodComp) continue;
        agregarProductoComponente(prodComp, cantComp);
      }

      if (combo.esPersonalizable && Array.isArray(combo.gruposEleccion)) {
        for (const grupo of combo.gruposEleccion) {
          if (!grupo.obligatorio || !grupo.opciones || grupo.opciones.length === 0) continue;
          const opcionBase =
            grupo.opciones.find((op) => op.disponible !== false && op.porDefecto) ||
            grupo.opciones.find((op) => op.disponible !== false);
          if (!opcionBase) continue;

          if (opcionBase.productoId) {
            const prodOpc = productosMap.get(opcionBase.productoId);
            if (prodOpc) {
              const cantOpc =
                opcionBase.cantidadProducto && opcionBase.cantidadProducto > 0
                  ? opcionBase.cantidadProducto
                  : 1;
              agregarProductoComponente(prodOpc, cantOpc);
            }
          }
          if (Array.isArray(opcionBase.recetaExtra)) {
            ingredientesExpandidos.push(...opcionBase.recetaExtra);
          }
        }
      }

      const resRecetaCombo = calcularCostoReceta(
        ingredientesExpandidos,
        insumosMap,
        costosInsumosMap
      );
      const sumaCombinadaReceta = resRecetaCombo.costoTotalCOP + sumaReferenciaProductos;
      const costoRefCombo = safeNumber(combo.costoReferencia);

      let costoUnitarioCOP = 0;
      let origenCosteo: ItemIngenieriaMenu['origenCosteo'] = 'sin_costeo';
      let tieneCosteo = false;
      let costeoIncompleto = false;
      const insumosSinCosto = [...resRecetaCombo.insumosSinCosto, ...insumosSinCostoExtras];

      const desgloseCombinado = [...resRecetaCombo.desglose, ...extrasReferencia].map((d) => ({
        ...d,
        participacionCostoPct:
          sumaCombinadaReceta > 0
            ? Number(((d.subtotalCostoCOP / sumaCombinadaReceta) * 100).toFixed(1))
            : 0,
      }));

      if (sumaCombinadaReceta > 0) {
        costoUnitarioCOP = sumaCombinadaReceta;
        origenCosteo = 'receta_combo';
        tieneCosteo = true;
        costeoIncompleto = insumosSinCosto.length > 0;
      } else if (costoRefCombo > 0) {
        costoUnitarioCOP = Math.round(costoRefCombo);
        origenCosteo = 'referencia_manual';
        tieneCosteo = true;
        costeoIncompleto = ingredientesExpandidos.length > 0;
      }

      const stats =
        statsPorId.get(`combo:${combo.id}`) ||
        statsPorNombre.get(`combo:${combo.nombre.trim().toLowerCase()}`) || {
          unidades: 0,
          ingresos: 0,
        };

      const margenUnit = baseNeta - costoUnitarioCOP;
      const foodCostPct =
        tieneCosteo && baseNeta > 0
          ? Number(((costoUnitarioCOP / baseNeta) * 100).toFixed(1))
          : 0;
      const margenBrutoPct =
        tieneCosteo && baseNeta > 0 ? Number(((margenUnit / baseNeta) * 100).toFixed(1)) : 0;

      const precioSugeridoObjetivoCOP = tieneCosteo
        ? calcularPrecioSugeridoFoodCost(costoUnitarioCOP, objetivoSeguro, redondeo, tasaSegura)
        : 0;

      borradores.push({
        id: combo.id,
        tipo: 'combo',
        nombre: combo.nombre,
        categoria,
        disponible: combo.disponible !== false,
        destacado: Boolean(combo.destacado),
        precioVenta,
        costoUnitarioCOP,
        origenCosteo,
        tieneCosteo,
        costeoIncompleto,
        insumosSinCosto,
        desgloseIngredientes: desgloseCombinado,
        costoReferenciaActual: costoRefCombo > 0 ? costoRefCombo : undefined,
        margenContribucionUnitario: tieneCosteo ? margenUnit : 0,
        foodCostPct,
        margenBrutoPct,
        unidadesVendidas: stats.unidades,
        ingresosRealesCOP: Math.round(stats.ingresos),
        costoTotalPeriodoCOP: tieneCosteo ? Math.round(costoUnitarioCOP * stats.unidades) : 0,
        contribucionTotalCOP: tieneCosteo ? Math.round(margenUnit * stats.unidades) : 0,
        precioSugeridoObjetivoCOP,
        diferenciaPrecioSugeridoCOP:
          precioSugeridoObjetivoCOP > 0 ? precioSugeridoObjetivoCOP - precioVenta : 0,
        tieneReceta: desgloseCombinado.length > 0 || insumosSinCosto.length > 0,
      });
    }
  }

  // 4. Calcular Umbrales BCG sobre ítems costeados (Kasavana & Smith)
  const itemsCosteadosLista = borradores.filter((item) => item.tieneCosteo);
  const itemsCosteados = itemsCosteadosLista.length;
  const itemsSinCosteo = borradores.length - itemsCosteados;
  const itemsCosteoIncompleto = borradores.filter((i) => i.costeoIncompleto).length;

  const totalUnidadesVendidas = borradores.reduce((sum, item) => sum + item.unidadesVendidas, 0);
  const totalUnidadesCosteadas = itemsCosteadosLista.reduce(
    (sum, item) => sum + item.unidadesVendidas,
    0
  );

  // Regla del 70% de popularidad gastronómica
  const umbralPopularidadUnidades =
    itemsCosteados > 0 && totalUnidadesCosteadas > 0
      ? Number(((totalUnidadesCosteadas / itemsCosteados) * 0.7).toFixed(2))
      : 0;

  const umbralMenuMixPct =
    itemsCosteados > 0 ? Number(((100 / itemsCosteados) * 0.7).toFixed(1)) : 0;

  const sumaContribucionCosteados = itemsCosteadosLista.reduce(
    (sum, item) => sum + item.contribucionTotalCOP,
    0
  );
  const umbralMargenContribucionCOP =
    totalUnidadesCosteadas > 0
      ? Math.round(sumaContribucionCosteados / totalUnidadesCosteadas)
      : itemsCosteados > 0
      ? Math.round(
          itemsCosteadosLista.reduce((sum, item) => sum + item.margenContribucionUnitario, 0) /
            itemsCosteados
        )
      : 0;

  // 5. Clasificar y enriquecer ítems finales
  const conteoCuadrantes: Record<CuadranteBCG, number> = {
    estrella: 0,
    caballo_batalla: 0,
    rompecabezas: 0,
    perro: 0,
    sin_costeo: 0,
  };

  const items: ItemIngenieriaMenu[] = borradores.map((item) => {
    const { cuadrante, popularidadAlta, rentabilidadAlta } = clasificarCuadranteBCG({
      tieneCosteo: item.tieneCosteo,
      unidadesVendidas: item.unidadesVendidas,
      margenContribucionUnitario: item.margenContribucionUnitario,
      umbralPopularidadUnidades,
      umbralMargenContribucionCOP,
    });

    conteoCuadrantes[cuadrante] += 1;

    const menuMixPct =
      totalUnidadesVendidas > 0
        ? Number(((item.unidadesVendidas / totalUnidadesVendidas) * 100).toFixed(1))
        : 0;

    const recomendacionAccion = construirRecomendacionItem({
      cuadrante,
      precioVenta: item.precioVenta,
      precioSugeridoObjetivoCOP: item.precioSugeridoObjetivoCOP,
      foodCostPct: item.foodCostPct,
      foodCostObjetivoPct: objetivoSeguro,
      tieneReceta: item.tieneReceta,
      insumosSinCosto: item.insumosSinCosto,
    });

    return {
      id: item.id,
      tipo: item.tipo,
      nombre: item.nombre,
      categoria: item.categoria,
      disponible: item.disponible,
      destacado: item.destacado,
      precioVenta: item.precioVenta,
      costoUnitarioCOP: item.costoUnitarioCOP,
      origenCosteo: item.origenCosteo,
      tieneCosteo: item.tieneCosteo,
      costeoIncompleto: item.costeoIncompleto,
      insumosSinCosto: item.insumosSinCosto,
      desgloseIngredientes: item.desgloseIngredientes,
      costoReferenciaActual: item.costoReferenciaActual,
      margenContribucionUnitario: item.margenContribucionUnitario,
      foodCostPct: item.foodCostPct,
      margenBrutoPct: item.margenBrutoPct,
      unidadesVendidas: item.unidadesVendidas,
      menuMixPct,
      ingresosRealesCOP: item.ingresosRealesCOP,
      costoTotalPeriodoCOP: item.costoTotalPeriodoCOP,
      contribucionTotalCOP: item.contribucionTotalCOP,
      cuadrante,
      popularidadAlta,
      rentabilidadAlta,
      precioSugeridoObjetivoCOP: item.precioSugeridoObjetivoCOP,
      diferenciaPrecioSugeridoCOP: item.diferenciaPrecioSugeridoCOP,
      recomendacionAccion,
    };
  });

  // Ordenar por contribución total descendente, luego unidades vendidas, luego nombre
  items.sort(
    (a, b) =>
      b.contribucionTotalCOP - a.contribucionTotalCOP ||
      b.unidadesVendidas - a.unidadesVendidas ||
      a.nombre.localeCompare(b.nombre, 'es-CO')
  );

  const ingresosTotalesCOP = items.reduce((sum, i) => sum + i.ingresosRealesCOP, 0);
  const ingresosItemsCosteadosCOP = itemsCosteadosLista.reduce(
    (sum, i) => sum + i.ingresosRealesCOP,
    0
  );
  const ingresosNetosCosteadosCOP = calcularPrecioBaseNeta(ingresosItemsCosteadosCOP, tasaSegura);
  const costoTotalPeriodoCOP = itemsCosteadosLista.reduce(
    (sum, i) => sum + i.costoTotalPeriodoCOP,
    0
  );
  const contribucionTotalPeriodoCOP = itemsCosteadosLista.reduce(
    (sum, i) => sum + i.contribucionTotalCOP,
    0
  );

  // Food cost promedio ponderado: sobre ventas reales de ítems costeados, o promedio simple si no hay ventas
  const foodCostPromedioPonderadoPct =
    ingresosNetosCosteadosCOP > 0
      ? Number(((costoTotalPeriodoCOP / ingresosNetosCosteadosCOP) * 100).toFixed(1))
      : itemsCosteados > 0
      ? Number(
          (
            itemsCosteadosLista.reduce((sum, i) => sum + i.foodCostPct, 0) / itemsCosteados
          ).toFixed(1)
        )
      : 0;

  return {
    periodo,
    foodCostObjetivoPct: objetivoSeguro,
    redondeo,
    tasaImpuestoIncluidoPct: tasaSegura,
    totalItemsCatalogo: items.length,
    itemsCosteados,
    itemsSinCosteo,
    itemsCosteoIncompleto,
    totalUnidadesVendidas,
    ingresosTotalesCOP,
    costoTotalPeriodoCOP,
    contribucionTotalPeriodoCOP,
    foodCostPromedioPonderadoPct,
    margenContribucionPromedioPonderadoCOP: umbralMargenContribucionCOP,
    umbralPopularidadUnidades,
    umbralMenuMixPct,
    umbralMargenContribucionCOP,
    conteoCuadrantes,
    items,
  };
}

export interface SimularPrecioParams {
  item: ItemIngenieriaMenu;
  precioSimuladoCOP: number;
  costoSimuladoCOP?: number;
  foodCostObjetivoPct: number;
  redondeo?: RedondeoPrecioCOP;
  tasaImpuestoIncluidoPct?: number;
  umbralPopularidadUnidades: number;
  umbralMargenContribucionCOP: number;
}

/**
 * Simula el impacto de ajustar el precio de venta y/o el costo unitario de un plato o combo.
 */
export function simularPrecioYCostoItem(
  params: SimularPrecioParams
): ResultadoSimulacionPrecio {
  const {
    item,
    precioSimuladoCOP,
    costoSimuladoCOP = item.costoUnitarioCOP,
    foodCostObjetivoPct,
    redondeo = '500',
    tasaImpuestoIncluidoPct = 0,
    umbralPopularidadUnidades,
    umbralMargenContribucionCOP,
  } = params;

  const precioActualCOP = Math.max(0, Math.round(safeNumber(item.precioVenta)));
  const precioSimulado = Math.max(0, Math.round(safeNumber(precioSimuladoCOP)));
  const costoActualCOP = Math.max(0, Math.round(safeNumber(item.costoUnitarioCOP)));
  const costoSimulado = Math.max(0, Math.round(safeNumber(costoSimuladoCOP)));

  const precioBaseNetaActualCOP = calcularPrecioBaseNeta(precioActualCOP, tasaImpuestoIncluidoPct);
  const precioBaseNetaSimuladoCOP = calcularPrecioBaseNeta(precioSimulado, tasaImpuestoIncluidoPct);

  const margenUnitarioActualCOP = precioBaseNetaActualCOP - costoActualCOP;
  const margenUnitarioSimuladoCOP = precioBaseNetaSimuladoCOP - costoSimulado;

  const foodCostActualPct =
    precioBaseNetaActualCOP > 0 && costoActualCOP > 0
      ? Number(((costoActualCOP / precioBaseNetaActualCOP) * 100).toFixed(1))
      : 0;
  const foodCostSimuladoPct =
    precioBaseNetaSimuladoCOP > 0 && costoSimulado > 0
      ? Number(((costoSimulado / precioBaseNetaSimuladoCOP) * 100).toFixed(1))
      : 0;
  const margenBrutoSimuladoPct =
    precioBaseNetaSimuladoCOP > 0
      ? Number(((margenUnitarioSimuladoCOP / precioBaseNetaSimuladoCOP) * 100).toFixed(1))
      : 0;

  const precioSugeridoObjetivoCOP = calcularPrecioSugeridoFoodCost(
    costoSimulado,
    foodCostObjetivoPct,
    redondeo,
    tasaImpuestoIncluidoPct
  );

  const deltaPrecioCOP = precioSimulado - precioActualCOP;
  const deltaPrecioPct =
    precioActualCOP > 0 ? Number(((deltaPrecioCOP / precioActualCOP) * 100).toFixed(1)) : 0;
  const deltaUtilidadPeriodoCOP = Math.round(
    (margenUnitarioSimuladoCOP - margenUnitarioActualCOP) * item.unidadesVendidas
  );

  const { cuadrante: nuevoCuadranteProyectado } = clasificarCuadranteBCG({
    tieneCosteo: costoSimulado > 0,
    unidadesVendidas: item.unidadesVendidas,
    margenContribucionUnitario: margenUnitarioSimuladoCOP,
    umbralPopularidadUnidades,
    umbralMargenContribucionCOP,
  });

  const cumpleObjetivoFoodCost =
    costoSimulado > 0 && precioBaseNetaSimuladoCOP > 0
      ? foodCostSimuladoPct <= foodCostObjetivoPct + 0.1
      : false;

  return {
    precioActualCOP,
    precioSimuladoCOP: precioSimulado,
    costoActualCOP,
    costoSimuladoCOP: costoSimulado,
    precioBaseNetaActualCOP,
    precioBaseNetaSimuladoCOP,
    foodCostActualPct,
    foodCostSimuladoPct,
    margenUnitarioActualCOP,
    margenUnitarioSimuladoCOP,
    margenBrutoSimuladoPct,
    precioSugeridoObjetivoCOP,
    deltaPrecioCOP,
    deltaPrecioPct,
    deltaUtilidadPeriodoCOP,
    nuevoCuadranteProyectado,
    cumpleObjetivoFoodCost,
  };
}

/**
 * Genera el contenido CSV con UTF-8 BOM del análisis de Ingeniería de Menú para Excel.
 */
export function generarIngenieriaMenuCsv(
  resumen: ResumenIngenieriaMenu,
  nombreNegocio = 'La Parada'
): string {
  const esc = (valor: string | number) => {
    const str = String(valor ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  const lineas: string[] = [
    `"INGENIERÍA DE MENÚ & CONTROL DE COSTOS - ${nombreNegocio.toUpperCase()}"`,
    `"Período:",${esc(resumen.periodo.etiqueta)}`,
    `"Food Cost Objetivo:",${esc(`${resumen.foodCostObjetivoPct}%`)},"Food Cost Ponderado:",${esc(`${resumen.foodCostPromedioPonderadoPct}%`)}`,
    `"Umbral Popularidad (unds):",${resumen.umbralPopularidadUnidades},"Umbral Margen Contribución:",${resumen.umbralMargenContribucionCOP}`,
    '',
    [
      '"Tipo"',
      '"Producto / Combo"',
      '"Categoría"',
      '"Cuadrante BCG"',
      '"Precio Venta COP"',
      '"Costo Unitario COP"',
      '"Origen Costeo"',
      '"Food Cost %"',
      '"Margen Contribución Unit COP"',
      '"Unidades Vendidas"',
      '"Menu Mix %"',
      '"Ingresos Reales COP"',
      '"Contribución Total COP"',
      '"Precio Sugerido Objetivo COP"',
      '"Recomendación"',
    ].join(','),
  ];

  for (const item of resumen.items) {
    const meta = METAS_CUADRANTES_BCG[item.cuadrante];
    lineas.push(
      [
        esc(item.tipo === 'combo' ? 'Combo' : 'Producto'),
        esc(item.nombre),
        esc(item.categoria),
        esc(meta.titulo),
        item.precioVenta,
        item.costoUnitarioCOP,
        esc(item.origenCosteo),
        `${item.foodCostPct}%`,
        item.margenContribucionUnitario,
        item.unidadesVendidas,
        `${item.menuMixPct}%`,
        item.ingresosRealesCOP,
        item.contribucionTotalCOP,
        item.precioSugeridoObjetivoCOP,
        esc(item.recomendacionAccion),
      ].join(',')
    );
  }

  return '\uFEFF' + lineas.join('\r\n');
}

export function descargarIngenieriaMenuCsv(
  resumen: ResumenIngenieriaMenu,
  nombreNegocio = 'La Parada'
): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const csv = generarIngenieriaMenuCsv(resumen, nombreNegocio);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fecha = new Date().toISOString().split('T')[0];
  const slug = (nombreNegocio || 'negocio').toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.href = url;
  a.download = `ingenieria_menu_${slug}_${fecha}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Genera un resumen ejecutivo en texto plano formateado para compartir por WhatsApp.
 */
export function generarResumenWhatsAppIngenieriaMenu(
  resumen: ResumenIngenieriaMenu,
  nombreNegocio = 'La Parada'
): string {
  const estrellas = resumen.items.filter((i) => i.cuadrante === 'estrella').slice(0, 3);
  const caballos = resumen.items.filter((i) => i.cuadrante === 'caballo_batalla').slice(0, 3);
  const enigmas = resumen.items.filter((i) => i.cuadrante === 'rompecabezas').slice(0, 3);
  const perros = resumen.items.filter((i) => i.cuadrante === 'perro').slice(0, 3);

  const lineas: string[] = [
    `📊 *Ingeniería de Menú — ${nombreNegocio}*`,
    `📅 Período: ${resumen.periodo.etiqueta}`,
    `🎯 Food Cost Promedio: *${resumen.foodCostPromedioPonderadoPct}%* (Objetivo: ${resumen.foodCostObjetivoPct}%)`,
    `💰 Contribución Bruta Período: *${formatCOP(resumen.contribucionTotalPeriodoCOP)}*`,
    `📦 Ítems costeados: ${resumen.itemsCosteados}/${resumen.totalItemsCatalogo}`,
    '',
    `⭐ *Estrellas (${resumen.conteoCuadrantes.estrella}):* ${
      estrellas.length > 0 ? estrellas.map((i) => i.nombre).join(', ') : 'Ninguno aún'
    }`,
    `🐴 *Caballos de Batalla (${resumen.conteoCuadrantes.caballo_batalla}):* ${
      caballos.length > 0
        ? caballos
            .map(
              (i) =>
                `${i.nombre} (Sug: ${formatCOP(i.precioSugeridoObjetivoCOP || i.precioVenta)})`
            )
            .join(', ')
        : 'Ninguno'
    }`,
    `🧩 *Rompecabezas (${resumen.conteoCuadrantes.rompecabezas}):* ${
      enigmas.length > 0 ? enigmas.map((i) => i.nombre).join(', ') : 'Ninguno'
    }`,
    `🐕 *Perros (${resumen.conteoCuadrantes.perro}):* ${
      perros.length > 0 ? perros.map((i) => i.nombre).join(', ') : 'Ninguno'
    }`,
  ];

  if (resumen.itemsSinCosteo > 0) {
    lineas.push(`⚠️ *Por costear:* ${resumen.itemsSinCosteo} ítems sin receta o costo directo.`);
  }

  return lineas.join('\n');
}
