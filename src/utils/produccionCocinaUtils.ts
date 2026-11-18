import type {
  CategoriaSubReceta,
  Combo,
  DesgloseConsumoProduccionItem,
  GuardarSubRecetaInput,
  InfoCategoriaSubReceta,
  Insumo,
  MetricasProduccionCocina,
  MovimientoKardex,
  PlantillaSubRecetaSugerida,
  Producto,
  ResumenLoteHistoricoKardex,
  SimulacionLoteProduccion,
  ValidacionSubReceta,
} from '@/types';
import { toValidAdminDate } from '@/utils/adminAnalytics';
import { construirMapaCostosInsumos } from '@/utils/ingenieriaMenuUtils';
import { isInventoryLowStock } from '@/utils/inventoryStock';
import { calcularCostosUnitariosRecientes, determinarTipoMovimiento } from '@/utils/kardexInventarioUtils';
import { buildInsumosMap } from '@/utils/recetasEscandallo';

export const CATEGORIAS_SUB_RECETA: InfoCategoriaSubReceta[] = [
  {
    id: 'salsas_casa',
    label: 'Salsas de la Casa',
    descripcion: 'Ajo, tártara, piña, BBQ, picantes y salsas insignia.',
    emoji: '🥣',
  },
  {
    id: 'carnes_marinadas',
    label: 'Carnes Marinadas & Cocidas',
    descripcion: 'Desmechada, pollo desmenuzado, cerdo adobado y proteínas listas.',
    emoji: '🥩',
  },
  {
    id: 'masas_panaderia',
    label: 'Masas & Panadería',
    descripcion: 'Masas de tequeños, pancerotis, pastelitos y bases horneadas.',
    emoji: '🥐',
  },
  {
    id: 'rellenos_quesos',
    label: 'Rellenos & Quesos',
    descripcion: 'Mezclas de quesos, guisos, jamón picado y porcionados.',
    emoji: '🧀',
  },
  {
    id: 'aderezos_toppings',
    label: 'Aderezos & Toppings',
    descripcion: 'Cebolla caramelizada, tocineta crocante, encurtidos.',
    emoji: '🧅',
  },
  {
    id: 'otro',
    label: 'Otra Preparación Base',
    descripcion: 'Bebidas base, caldos, fondos o preparaciones de cocina.',
    emoji: '🍳',
  },
];

export const CATEGORIAS_SUB_RECETA_MAP: Record<CategoriaSubReceta, InfoCategoriaSubReceta> =
  CATEGORIAS_SUB_RECETA.reduce(
    (acc, cat) => {
      acc[cat.id] = cat;
      return acc;
    },
    {} as Record<CategoriaSubReceta, InfoCategoriaSubReceta>
  );

export const PLANTILLAS_SUB_RECETAS_LA_PARADA: PlantillaSubRecetaSugerida[] = [
  {
    id: 'plantilla-salsa-ajo',
    nombre: 'Salsa de Ajo de la Casa',
    categoriaSubReceta: 'salsas_casa',
    unidad: 'litros',
    rendimientoLote: 5,
    stockMinimo: 2,
    tiempoPreparacionMin: 25,
    vidaUtilHoras: 72,
    instruccionesPreparacion:
      'Licuar ajos pelados con cilantro fresco, aceite vegetal en hilo fino, sal y toque cítrico hasta emulsionar.',
    ingredientesSugeridos: [
      { nombreSugerido: 'Aceite vegetal', cantidad: 3.5, unidad: 'litros' },
      { nombreSugerido: 'Ajo pelado', cantidad: 0.5, unidad: 'kg' },
      { nombreSugerido: 'Cilantro fresco', cantidad: 0.3, unidad: 'kg' },
    ],
  },
  {
    id: 'plantilla-carne-desmechada',
    nombre: 'Carne Desmechada Marinada',
    categoriaSubReceta: 'carnes_marinadas',
    unidad: 'kg',
    rendimientoLote: 4,
    stockMinimo: 2,
    tiempoPreparacionMin: 90,
    vidaUtilHoras: 48,
    instruccionesPreparacion:
      'Cocer carne de res en olla a presión con aliños, desmechar en caliente y sofreír en su reducción marinada.',
    ingredientesSugeridos: [
      { nombreSugerido: 'Carne de res para desmechar', cantidad: 5.5, unidad: 'kg' },
      { nombreSugerido: 'Cebolla cabezona', cantidad: 0.8, unidad: 'kg' },
      { nombreSugerido: 'Pimentón rojo', cantidad: 0.4, unidad: 'kg' },
    ],
  },
  {
    id: 'plantilla-masa-tequenos',
    nombre: 'Masa Artesanal de Tequeños y Pancerotis',
    categoriaSubReceta: 'masas_panaderia',
    unidad: 'kg',
    rendimientoLote: 6,
    stockMinimo: 3,
    tiempoPreparacionMin: 45,
    vidaUtilHoras: 48,
    instruccionesPreparacion:
      'Amasar harina de trigo con mantequilla, huevo, sal y agua fría hasta textura lisa. Reposar 20 min refrigerada.',
    ingredientesSugeridos: [
      { nombreSugerido: 'Harina de trigo', cantidad: 4, unidad: 'kg' },
      { nombreSugerido: 'Mantequilla / Margarina', cantidad: 0.8, unidad: 'kg' },
      { nombreSugerido: 'Huevos', cantidad: 12, unidad: 'unidades' },
    ],
  },
  {
    id: 'plantilla-mezcla-quesos',
    nombre: 'Mezcla de Quesos Fundidos para Relleno',
    categoriaSubReceta: 'rellenos_quesos',
    unidad: 'kg',
    rendimientoLote: 3,
    stockMinimo: 1.5,
    tiempoPreparacionMin: 20,
    vidaUtilHoras: 72,
    instruccionesPreparacion:
      'Rallar y homogenizar queso costeño y queso mozzarella en proporción balanceada; empacar al vacío por kilo.',
    ingredientesSugeridos: [
      { nombreSugerido: 'Queso Mozzarella', cantidad: 2, unidad: 'kg' },
      { nombreSugerido: 'Queso Costeño', cantidad: 1, unidad: 'kg' },
    ],
  },
];

function safeNumber(value: unknown): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Indica si un documento de `inventario` corresponde a una Sub-Receta / Preparación Base
 */
export function esInsumoSubReceta(insumo: Partial<Insumo> | null | undefined): boolean {
  return Boolean(insumo?.esSubReceta);
}

/**
 * Filtra únicamente las preparaciones base / sub-recetas del catálogo de inventario
 */
export function filtrarSubRecetas(insumos: Insumo[]): Insumo[] {
  return insumos.filter((ins) => esInsumoSubReceta(ins));
}

/**
 * Filtra únicamente los insumos primarios (materias primas compradas) del inventario
 */
export function filtrarInsumosPrimarios(insumos: Insumo[]): Insumo[] {
  return insumos.filter((ins) => !esInsumoSubReceta(ins));
}

/**
 * Valida la configuración de una Sub-Receta antes de persistirla en Firestore
 */
export function validarConfiguracionSubReceta(
  input: Partial<GuardarSubRecetaInput>
): ValidacionSubReceta {
  const errores: string[] = [];

  const nombre = (input.nombre || '').trim();
  if (nombre.length < 2) {
    errores.push('El nombre de la preparación base debe tener al menos 2 caracteres.');
  }

  const unidad = (input.unidad || '').trim();
  if (!unidad) {
    errores.push('Debes indicar la unidad de medida resultante (ej: litros, kg, porciones).');
  }

  const rendimiento = safeNumber(input.rendimientoLote);
  if (rendimiento <= 0) {
    errores.push('El rendimiento por lote estándar debe ser mayor a 0.');
  }

  if (input.stockMinimo !== undefined) {
    const stockMin = safeNumber(input.stockMinimo);
    if (!Number.isFinite(input.stockMinimo) || stockMin < 0) {
      errores.push('El stock mínimo de alerta no puede ser negativo.');
    }
  }

  if (input.stockActual !== undefined) {
    const stockAct = safeNumber(input.stockActual);
    if (!Number.isFinite(input.stockActual) || stockAct < 0) {
      errores.push('El stock inicial no puede ser negativo.');
    }
  }

  const ingredientes = Array.isArray(input.recetaInsumos) ? input.recetaInsumos : [];
  if (ingredientes.length === 0) {
    errores.push('Agrega al menos un insumo primario para fabricar esta preparación base.');
  }

  const idsVistos = new Set<string>();
  for (const ing of ingredientes) {
    const insumoId = (ing.insumoId || '').trim();
    if (!insumoId) {
      errores.push('Cada ingrediente debe estar vinculado a un insumo válido del inventario.');
      continue;
    }
    if (input.id && insumoId === input.id) {
      errores.push('Una preparación base no puede incluirse a sí misma como ingrediente.');
    }
    if (idsVistos.has(insumoId)) {
      errores.push(`El insumo "${ing.nombreSnapshot || insumoId}" está repetido en la fórmula.`);
    }
    idsVistos.add(insumoId);

    const cant = safeNumber(ing.cantidad);
    if (cant <= 0) {
      errores.push(
        `La cantidad de "${ing.nombreSnapshot || insumoId}" por lote debe ser mayor a 0.`
      );
    }
  }

  return {
    valida: errores.length === 0,
    errores,
  };
}

/**
 * Simula la producción de N lotes de una Sub-Receta:
 * - Calcula consumo exacto de insumos primarios
 * - Detecta disponibilidad y faltantes en bodega
 * - Calcula lotes máximos fabricables con el stock actual
 * - Calcula merma de cocción y costo unitario resultante en COP
 */
export function simularProduccionLoteSubReceta(params: {
  subReceta: Insumo;
  insumos: Insumo[];
  movimientosKardex?: MovimientoKardex[];
  multiplicadorLotes: number;
  cantidadProducidaReal?: number;
}): SimulacionLoteProduccion {
  const { subReceta, insumos, movimientosKardex = [] } = params;
  const multiplicadorLotes =
    Number.isFinite(params.multiplicadorLotes) && params.multiplicadorLotes > 0
      ? Number(params.multiplicadorLotes.toFixed(4))
      : 1;

  const rendimientoBase =
    typeof subReceta.rendimientoLote === 'number' &&
    Number.isFinite(subReceta.rendimientoLote) &&
    subReceta.rendimientoLote > 0
      ? subReceta.rendimientoLote
      : 1;

  const rendimientoEsperado = Number((rendimientoBase * multiplicadorLotes).toFixed(4));
  const cantidadProducidaReal =
    typeof params.cantidadProducidaReal === 'number' &&
    Number.isFinite(params.cantidadProducidaReal) &&
    params.cantidadProducidaReal > 0
      ? Number(params.cantidadProducidaReal.toFixed(4))
      : rendimientoEsperado;

  const mermaCoccionCantidad = Number((rendimientoEsperado - cantidadProducidaReal).toFixed(4));
  const mermaCoccionPct =
    rendimientoEsperado > 0
      ? Number(((mermaCoccionCantidad / rendimientoEsperado) * 100).toFixed(1))
      : 0;

  const insumosMap = buildInsumosMap(insumos);
  const costosMap = construirMapaCostosInsumos(insumos, movimientosKardex);

  const receta = Array.isArray(subReceta.recetaInsumos) ? subReceta.recetaInsumos : [];
  const desgloseInsumos: DesgloseConsumoProduccionItem[] = [];
  const insumosFaltantes: DesgloseConsumoProduccionItem[] = [];
  let minLotesPosibles = receta.length > 0 ? Infinity : 0;
  let sumaCostoExacta = 0;
  let insumosSinCostoCount = 0;

  for (const ing of receta) {
    const cantidadBasePorLote = safeNumber(ing.cantidad);
    if (!ing.insumoId || cantidadBasePorLote <= 0) continue;

    const insumoLive = insumosMap.get(ing.insumoId);
    const nombre = insumoLive?.nombre || ing.nombreSnapshot || 'Insumo';
    const unidad = insumoLive?.unidad || ing.unidadSnapshot || 'unid';
    const stockActual =
      typeof insumoLive?.stockActual === 'number' && Number.isFinite(insumoLive.stockActual)
        ? Math.max(0, insumoLive.stockActual)
        : 0;

    const cantidadRequerida = Number((cantidadBasePorLote * multiplicadorLotes).toFixed(4));
    const diferencia = Number((stockActual - cantidadRequerida).toFixed(4));
    const alcanzaStock = diferencia >= 0;
    const faltante = alcanzaStock ? 0 : Number((cantidadRequerida - stockActual).toFixed(4));
    const stockPosterior = Number(Math.max(0, stockActual - cantidadRequerida).toFixed(4));

    const lotesConInsumo = stockActual / cantidadBasePorLote;
    if (lotesConInsumo < minLotesPosibles) {
      minLotesPosibles = lotesConInsumo;
    }

    const costoUnitarioCOP = costosMap.get(ing.insumoId)?.costoUnitario ?? 0;
    const sinCostoRegistrado = costoUnitarioCOP <= 0;
    if (sinCostoRegistrado) {
      insumosSinCostoCount += 1;
    }

    const subtotalExacto = cantidadRequerida * costoUnitarioCOP;
    sumaCostoExacta += subtotalExacto;

    const item: DesgloseConsumoProduccionItem = {
      insumoId: ing.insumoId,
      nombre,
      unidad,
      cantidadBasePorLote,
      cantidadRequerida,
      stockActual,
      stockPosterior,
      alcanzaStock,
      faltante,
      costoUnitarioCOP,
      subtotalCostoCOP: Math.round(subtotalExacto),
      sinCostoRegistrado,
    };

    desgloseInsumos.push(item);
    if (!alcanzaStock) {
      insumosFaltantes.push(item);
    }
  }

  const lotesMaximosPosibles =
    minLotesPosibles === Infinity
      ? 0
      : Math.max(0, Math.floor(minLotesPosibles * 100) / 100);

  const costoTotalLoteCOP = Math.round(sumaCostoExacta);
  const costoUnitarioResultanteCOP =
    cantidadProducidaReal > 0 && costoTotalLoteCOP > 0
      ? Math.round(costoTotalLoteCOP / cantidadProducidaReal)
      : 0;

  return {
    subRecetaId: subReceta.id,
    subRecetaNombre: subReceta.nombre,
    unidadSalida: subReceta.unidad || 'unid',
    multiplicadorLotes,
    rendimientoEsperado,
    cantidadProducidaReal,
    mermaCoccionCantidad,
    mermaCoccionPct,
    desgloseInsumos,
    insumosFaltantes,
    todosInsumosDisponibles: desgloseInsumos.length > 0 && insumosFaltantes.length === 0,
    lotesMaximosPosibles,
    costoTotalLoteCOP,
    costoUnitarioResultanteCOP,
    insumosSinCostoCount,
  };
}

/**
 * Reconstruye el historial de lotes producidos a partir de los movimientos del Kardex
 */
export function reconstruirHistorialLotesProduccion(
  movimientos: MovimientoKardex[]
): ResumenLoteHistoricoKardex[] {
  const mapaLotes = new Map<
    string,
    {
      entrada?: MovimientoKardex;
      salidas: MovimientoKardex[];
    }
  >();

  for (const mov of movimientos) {
    const tipo = determinarTipoMovimiento(mov);
    if (tipo !== 'entrada_produccion' && tipo !== 'salida_produccion') continue;

    const loteId = (mov.loteProduccionId || '').trim();
    if (!loteId) continue;

    const bucket = mapaLotes.get(loteId) || { salidas: [] };
    if (tipo === 'entrada_produccion') {
      bucket.entrada = mov;
    } else {
      bucket.salidas.push(mov);
    }
    mapaLotes.set(loteId, bucket);
  }

  const lotes: ResumenLoteHistoricoKardex[] = [];

  for (const [loteProduccionId, bucket] of mapaLotes.entries()) {
    const entrada = bucket.entrada;
    if (!entrada) continue;

    const cantidadProducida = Math.max(0, safeNumber(entrada.cantidad));
    const costoTotalLoteCOP = Math.max(0, Math.round(safeNumber(entrada.costo)));
    const costoUnitarioCOP =
      typeof entrada.costoUnitario === 'number' && entrada.costoUnitario > 0
        ? Math.round(entrada.costoUnitario)
        : cantidadProducida > 0 && costoTotalLoteCOP > 0
          ? Math.round(costoTotalLoteCOP / cantidadProducida)
          : 0;

    lotes.push({
      loteProduccionId,
      subRecetaId: entrada.subRecetaId || entrada.insumoId,
      subRecetaNombre: entrada.subRecetaNombre || entrada.insumoNombre,
      cantidadProducida,
      unidadSalida: entrada.unidadMedida || 'unid',
      costoTotalLoteCOP,
      costoUnitarioCOP,
      multiplicadorLotes:
        typeof entrada.multiplicadorLotes === 'number' && entrada.multiplicadorLotes > 0
          ? entrada.multiplicadorLotes
          : 1,
      insumosConsumidos: bucket.salidas.map((s) => ({
        insumoId: s.insumoId,
        insumoNombre: s.insumoNombre,
        cantidad: Number(Math.abs(safeNumber(s.cantidad)).toFixed(4)),
        unidadMedida: s.unidadMedida || 'unid',
      })),
      responsable: entrada.responsable || 'Cocina',
      notas: entrada.notas || '',
      fecha: entrada.fecha,
    });
  }

  return lotes.sort((a, b) => {
    const ta = toValidAdminDate(a.fecha)?.getTime() || 0;
    const tb = toValidAdminDate(b.fecha)?.getTime() || 0;
    return tb - ta;
  });
}

/**
 * Calcula los indicadores ejecutivos de producción de cocina y sub-recetas
 */
export function calcularMetricasProduccionCocina(
  insumos: Insumo[],
  movimientosKardex: MovimientoKardex[],
  ahora: Date = new Date()
): MetricasProduccionCocina {
  const subRecetas = filtrarSubRecetas(insumos);
  const costosKardex = calcularCostosUnitariosRecientes(movimientosKardex);

  let subRecetasConStockBajo = 0;
  let subRecetasListasParaProducir = 0;
  let valorInventarioPreparadosCOP = 0;

  for (const sub of subRecetas) {
    if (isInventoryLowStock(sub)) {
      subRecetasConStockBajo += 1;
    }

    const sim = simularProduccionLoteSubReceta({
      subReceta: sub,
      insumos,
      movimientosKardex,
      multiplicadorLotes: 1,
    });
    if (sim.todosInsumosDisponibles) {
      subRecetasListasParaProducir += 1;
    }

    const stock = Math.max(0, safeNumber(sub.stockActual));
    const costoUnit =
      costosKardex[sub.id] > 0
        ? costosKardex[sub.id]
        : typeof sub.costoUnitario === 'number' && sub.costoUnitario > 0
          ? sub.costoUnitario
          : 0;
    valorInventarioPreparadosCOP += Math.round(stock * costoUnit);
  }

  const historialLotes = reconstruirHistorialLotesProduccion(movimientosKardex);
  const inicioHoyMs = new Date(
    ahora.getFullYear(),
    ahora.getMonth(),
    ahora.getDate(),
    0,
    0,
    0,
    0
  ).getTime();

  let lotesProducidosHoy = 0;
  let costoTotalProducidoPeriodoCOP = 0;

  for (const lote of historialLotes) {
    const fechaMs = toValidAdminDate(lote.fecha)?.getTime() || 0;
    if (fechaMs >= inicioHoyMs) {
      lotesProducidosHoy += 1;
    }
    costoTotalProducidoPeriodoCOP += lote.costoTotalLoteCOP;
  }

  return {
    totalSubRecetas: subRecetas.length,
    subRecetasConStockBajo,
    subRecetasListasParaProducir,
    subRecetasBloqueadasPorFaltaInsumo: Math.max(
      0,
      subRecetas.length - subRecetasListasParaProducir
    ),
    lotesProducidosHoy,
    lotesProducidosPeriodo: historialLotes.length,
    costoTotalProducidoPeriodoCOP: Math.round(costoTotalProducidoPeriodoCOP),
    valorInventarioPreparadosCOP: Math.round(valorInventarioPreparadosCOP),
  };
}

/**
 * Identifica cuántos productos y combos del catálogo emplean Sub-Recetas en su escandallo
 */
export function contarProductosConSubRecetas(
  insumos: Insumo[],
  productos: Producto[],
  combos: Combo[]
): {
  productosCount: number;
  combosCount: number;
  totalCount: number;
  subRecetaIdsEnUso: string[];
} {
  const subRecetaIds = new Set(filtrarSubRecetas(insumos).map((s) => s.id));
  if (subRecetaIds.size === 0) {
    return {
      productosCount: 0,
      combosCount: 0,
      totalCount: 0,
      subRecetaIdsEnUso: [],
    };
  }

  const subRecetaIdsEnUso = new Set<string>();
  let productosCount = 0;
  let combosCount = 0;

  for (const prod of productos) {
    let usaSubReceta = false;
    for (const ing of prod.receta || []) {
      if (subRecetaIds.has(ing.insumoId)) {
        usaSubReceta = true;
        subRecetaIdsEnUso.add(ing.insumoId);
      }
    }
    if (usaSubReceta) productosCount += 1;
  }

  for (const combo of combos) {
    let usaSubReceta = false;
    for (const ing of combo.receta || []) {
      if (subRecetaIds.has(ing.insumoId)) {
        usaSubReceta = true;
        subRecetaIdsEnUso.add(ing.insumoId);
      }
    }
    for (const grupo of combo.gruposEleccion || []) {
      for (const opcion of grupo.opciones || []) {
        for (const ing of opcion.recetaExtra || []) {
          if (subRecetaIds.has(ing.insumoId)) {
            usaSubReceta = true;
            subRecetaIdsEnUso.add(ing.insumoId);
          }
        }
      }
    }
    if (usaSubReceta) combosCount += 1;
  }

  return {
    productosCount,
    combosCount,
    totalCount: productosCount + combosCount,
    subRecetaIdsEnUso: Array.from(subRecetaIdsEnUso),
  };
}
