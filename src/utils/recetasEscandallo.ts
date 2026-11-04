// src/utils/recetasEscandallo.ts
import type {
  AlertaStockItem,
  Combo,
  Insumo,
  InsumoReceta,
  ItemVenta,
  Producto,
} from '@/types';

export interface ConsumoInsumoCalculado {
  insumoId: string;
  nombreSnapshot: string;
  cantidadTotal: number;
  unidadSnapshot?: string;
}

export interface InsumoShortageWarning {
  insumoId: string;
  nombre: string;
  cantidadRequerida: number;
  stockActual: number;
  faltante: number;
  unidad?: string;
}

/**
 * Normaliza una lista o mapa de insumos en un Map para acceso O(1) por insumoId.
 */
export function buildInsumosMap(insumos: Insumo[] | Map<string, Insumo>): Map<string, Insumo> {
  if (insumos instanceof Map) return insumos;
  const map = new Map<string, Insumo>();
  insumos.forEach((ins) => map.set(ins.id, ins));
  return map;
}

/**
 * Calcula el consumo consolidado de insumos para una lista de ítems de venta (POS o domicilio).
 * Desglosa tanto productos con receta como combos con insumos directos y productos incluidos.
 */
export function calcularConsumoInsumos(
  items: ItemVenta[],
  productos: Producto[],
  combos: Combo[]
): ConsumoInsumoCalculado[] {
  const productosMap = new Map<string, Producto>();
  productos.forEach((p) => productosMap.set(p.id, p));

  const combosMap = new Map<string, Combo>();
  combos.forEach((c) => combosMap.set(c.id, c));

  const consumoMap = new Map<string, ConsumoInsumoCalculado>();

  const acumular = (
    insumoId: string,
    nombreSnapshot: string,
    cantidad: number,
    unidadSnapshot?: string
  ) => {
    if (!insumoId || cantidad <= 0) return;
    const existente = consumoMap.get(insumoId);
    if (existente) {
      existente.cantidadTotal = Number((existente.cantidadTotal + cantidad).toFixed(4));
    } else {
      consumoMap.set(insumoId, {
        insumoId,
        nombreSnapshot,
        cantidadTotal: Number(cantidad.toFixed(4)),
        unidadSnapshot,
      });
    }
  };

  for (const item of items) {
    if (item.cantidad <= 0) continue;

    if (item.tipo === 'producto') {
      const prod = productosMap.get(item.referenciaId);
      if (prod?.receta && Array.isArray(prod.receta)) {
        for (const ing of prod.receta) {
          acumular(
            ing.insumoId,
            ing.nombreSnapshot,
            ing.cantidad * item.cantidad,
            ing.unidadSnapshot
          );
        }
      }
    } else if (item.tipo === 'combo') {
      const combo = combosMap.get(item.referenciaId);
      if (combo) {
        // Insumos directos configurados en el combo
        if (combo.receta && Array.isArray(combo.receta)) {
          for (const ing of combo.receta) {
            acumular(
              ing.insumoId,
              ing.nombreSnapshot,
              ing.cantidad * item.cantidad,
              ing.unidadSnapshot
            );
          }
        }

        // Insumos de los productos que componen el combo
        if (combo.items && Array.isArray(combo.items)) {
          for (const comboItem of combo.items) {
            const prodComponente = productosMap.get(comboItem.productoId);
            if (prodComponente?.receta && Array.isArray(prodComponente.receta)) {
              for (const ing of prodComponente.receta) {
                acumular(
                  ing.insumoId,
                  ing.nombreSnapshot,
                  ing.cantidad * comboItem.cantidad * item.cantidad,
                  ing.unidadSnapshot
                );
              }
            }
          }
        }
      }
    }
  }

  return Array.from(consumoMap.values());
}

/**
 * Evalúa el estado preventivo de stock para un producto individual según su receta.
 */
export function evaluarEstadoStockProducto(
  receta: InsumoReceta[] | undefined,
  insumos: Insumo[] | Map<string, Insumo>
): AlertaStockItem {
  if (!receta || receta.length === 0) {
    return { estado: 'disponible' };
  }

  const insumosMap = buildInsumosMap(insumos);
  let porcionesMinimas = Infinity;
  let peorEstado: 'disponible' | 'bajo_stock' | 'agotado' = 'disponible';
  let insumoCriticoInfo: {
    nombre: string;
    stockActual: number;
    stockMinimo: number;
    unidad?: string;
  } | null = null;

  for (const ing of receta) {
    const insumo = insumosMap.get(ing.insumoId);
    if (!insumo) continue;

    const stockActual = insumo.stockActual ?? 0;
    const stockMinimo = insumo.stockMinimo ?? 0;
    const porciones = ing.cantidad > 0 ? Math.floor(stockActual / ing.cantidad) : Infinity;

    if (porciones < porcionesMinimas) {
      porcionesMinimas = porciones;
    }

    if (stockActual <= 0) {
      peorEstado = 'agotado';
      insumoCriticoInfo = {
        nombre: insumo.nombre || ing.nombreSnapshot,
        stockActual,
        stockMinimo,
        unidad: insumo.unidad || ing.unidadSnapshot,
      };
      break; // Agotado es el estado más grave, salimos de inmediato
    }

    if (stockActual <= stockMinimo) {
      peorEstado = 'bajo_stock';
      insumoCriticoInfo = {
        nombre: insumo.nombre || ing.nombreSnapshot,
        stockActual,
        stockMinimo,
        unidad: insumo.unidad || ing.unidadSnapshot,
      };
    }
  }

  const porcionesFinales = porcionesMinimas === Infinity ? undefined : Math.max(0, porcionesMinimas);

  return {
    estado: peorEstado,
    insumoCritico: insumoCriticoInfo?.nombre,
    stockActual: insumoCriticoInfo?.stockActual,
    stockMinimo: insumoCriticoInfo?.stockMinimo,
    unidad: insumoCriticoInfo?.unidad,
    porcionesDisponibles: porcionesFinales,
  };
}

/**
 * Evalúa el estado preventivo de stock para un combo según sus insumos directos y los de sus productos.
 */
export function evaluarEstadoStockCombo(
  combo: Combo,
  productos: Producto[],
  insumos: Insumo[] | Map<string, Insumo>
): AlertaStockItem {
  const productosMap = new Map<string, Producto>();
  productos.forEach((p) => productosMap.set(p.id, p));

  const insumosMap = buildInsumosMap(insumos);

  // Recolectar todas las recetas que aplican a 1 unidad del combo
  const ingredientesTotales: Array<{
    insumoId: string;
    nombreSnapshot: string;
    cantidad: number;
    unidadSnapshot?: string;
  }> = [];

  if (combo.receta && Array.isArray(combo.receta)) {
    ingredientesTotales.push(...combo.receta);
  }

  if (combo.items && Array.isArray(combo.items)) {
    for (const item of combo.items) {
      const prod = productosMap.get(item.productoId);
      if (prod?.receta && Array.isArray(prod.receta)) {
        for (const ing of prod.receta) {
          ingredientesTotales.push({
            insumoId: ing.insumoId,
            nombreSnapshot: ing.nombreSnapshot,
            cantidad: ing.cantidad * item.cantidad,
            unidadSnapshot: ing.unidadSnapshot,
          });
        }
      }
    }
  }

  return evaluarEstadoStockProducto(ingredientesTotales, insumosMap);
}

/**
 * Verifica si los insumos alcanzan para la cantidad de ítems solicitados en el carrito/pedido.
 * Retorna las alertas de insumos que se agotarían o con déficit.
 */
export function verificarStockSuficiente(
  items: ItemVenta[],
  productos: Producto[],
  combos: Combo[],
  insumos: Insumo[] | Map<string, Insumo>
): InsumoShortageWarning[] {
  const consumos = calcularConsumoInsumos(items, productos, combos);
  const insumosMap = buildInsumosMap(insumos);
  const alertas: InsumoShortageWarning[] = [];

  for (const c of consumos) {
    const insumo = insumosMap.get(c.insumoId);
    if (!insumo) continue;

    const stockActual = insumo.stockActual ?? 0;
    if (stockActual < c.cantidadTotal) {
      alertas.push({
        insumoId: c.insumoId,
        nombre: insumo.nombre || c.nombreSnapshot,
        cantidadRequerida: c.cantidadTotal,
        stockActual,
        faltante: Number((c.cantidadTotal - stockActual).toFixed(4)),
        unidad: insumo.unidad || c.unidadSnapshot,
      });
    }
  }

  return alertas;
}
