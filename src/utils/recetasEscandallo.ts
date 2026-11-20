// src/utils/recetasEscandallo.ts
import type {
  AlertaStockItem,
  CanalEmpaque,
  Combo,
  EleccionComboSeleccionada,
  Insumo,
  InsumoReceta,
  ItemVenta,
  OpcionEleccionCombo,
  Producto,
} from '@/types';
import { calcularConsumoEmpaques, canalRequiereEmpaque } from './empaquesUtils';

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
  combos: Combo[],
  opciones?: {
    canalServicio?: CanalEmpaque;
    incluirEmpaques?: boolean;
  }
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

        // Insumos de los productos fijos que componen el combo
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

      // Insumos de los grupos de elección personalizados del combo
      if (item.eleccionesCombo && Array.isArray(item.eleccionesCombo) && item.eleccionesCombo.length > 0) {
        const opcionesCatalogoMap = new Map<string, OpcionEleccionCombo>();
        if (combo?.gruposEleccion) {
          for (const grupo of combo.gruposEleccion) {
            for (const op of grupo.opciones || []) {
              opcionesCatalogoMap.set(`${grupo.id}:${op.id}`, op);
            }
          }
        }

        for (const eleccion of item.eleccionesCombo) {
          const cantEleccion =
            (eleccion.cantidad && eleccion.cantidad > 0 ? eleccion.cantidad : 1) * item.cantidad;
          const opcionCatalogo = opcionesCatalogoMap.get(`${eleccion.grupoId}:${eleccion.opcionId}`);
          const prodId = eleccion.productoId || opcionCatalogo?.productoId;
          const cantProd =
            opcionCatalogo?.cantidadProducto && opcionCatalogo.cantidadProducto > 0
              ? opcionCatalogo.cantidadProducto
              : 1;

          if (prodId) {
            const prodEleccion = productosMap.get(prodId);
            if (prodEleccion?.receta && Array.isArray(prodEleccion.receta)) {
              for (const ing of prodEleccion.receta) {
                acumular(
                  ing.insumoId,
                  ing.nombreSnapshot,
                  ing.cantidad * cantProd * cantEleccion,
                  ing.unidadSnapshot
                );
              }
            }
          }

          const recetaExtra = eleccion.recetaExtra ?? opcionCatalogo?.recetaExtra;
          if (Array.isArray(recetaExtra)) {
            for (const ing of recetaExtra) {
              acumular(
                ing.insumoId,
                ing.nombreSnapshot,
                ing.cantidad * cantEleccion,
                ing.unidadSnapshot
              );
            }
          }
        }
      } else if (combo?.gruposEleccion && Array.isArray(combo.gruposEleccion)) {
        // Fallback: si un combo personalizable se registra sin elecciones explícitas, usar opciones por defecto
        for (const grupo of combo.gruposEleccion) {
          const opcionesDefecto = (grupo.opciones || []).filter((op) => op.porDefecto);
          for (const opcionDefecto of opcionesDefecto) {
            const cantProd =
              opcionDefecto.cantidadProducto && opcionDefecto.cantidadProducto > 0
                ? opcionDefecto.cantidadProducto
                : 1;
            if (opcionDefecto.productoId) {
              const prodDef = productosMap.get(opcionDefecto.productoId);
              if (prodDef?.receta && Array.isArray(prodDef.receta)) {
                for (const ing of prodDef.receta) {
                  acumular(
                    ing.insumoId,
                    ing.nombreSnapshot,
                    ing.cantidad * cantProd * item.cantidad,
                    ing.unidadSnapshot
                  );
                }
              }
            }
            if (Array.isArray(opcionDefecto.recetaExtra)) {
              for (const ing of opcionDefecto.recetaExtra) {
                acumular(
                  ing.insumoId,
                  ing.nombreSnapshot,
                  ing.cantidad * item.cantidad,
                  ing.unidadSnapshot
                );
              }
            }
          }
        }
      }
    }
  }

  if (
    opciones?.incluirEmpaques &&
    opciones.canalServicio &&
    canalRequiereEmpaque(opciones.canalServicio)
  ) {
    const empaques = calcularConsumoEmpaques(items, productos, combos, opciones.canalServicio);
    for (const emp of empaques) {
      acumular(emp.insumoId, emp.nombreSnapshot, emp.cantidadTotal, emp.unidadSnapshot);
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
 * Evalúa el estado preventivo de stock para una opción individual dentro de un grupo de combo personalizable.
 */
export function evaluarEstadoStockOpcionCombo(
  opcion: OpcionEleccionCombo,
  productos: Producto[],
  insumos: Insumo[] | Map<string, Insumo>
): AlertaStockItem {
  if (opcion.disponible === false) {
    return {
      estado: 'agotado',
      insumoCritico: 'Opción no disponible',
      porcionesDisponibles: 0,
    };
  }

  const ingredientesOpcion: InsumoReceta[] = [];
  const cantProd =
    opcion.cantidadProducto && opcion.cantidadProducto > 0 ? opcion.cantidadProducto : 1;

  if (opcion.productoId) {
    const prod = productos.find((p) => p.id === opcion.productoId);
    if (prod && prod.disponible === false) {
      return {
        estado: 'agotado',
        insumoCritico: prod.nombre,
        porcionesDisponibles: 0,
      };
    }
    if (prod?.receta && Array.isArray(prod.receta)) {
      for (const ing of prod.receta) {
        ingredientesOpcion.push({
          insumoId: ing.insumoId,
          nombreSnapshot: ing.nombreSnapshot,
          cantidad: ing.cantidad * cantProd,
          unidadSnapshot: ing.unidadSnapshot,
        });
      }
    }
  }

  if (opcion.recetaExtra && Array.isArray(opcion.recetaExtra)) {
    ingredientesOpcion.push(...opcion.recetaExtra);
  }

  return evaluarEstadoStockProducto(ingredientesOpcion, insumos);
}

/**
 * Evalúa el estado preventivo de stock para un combo según sus insumos directos,
 * los de sus productos fijos y opcionalmente sus elecciones o grupos obligatorios.
 */
export function evaluarEstadoStockCombo(
  combo: Combo,
  productos: Producto[],
  insumos: Insumo[] | Map<string, Insumo>,
  eleccionesSeleccionadas?: EleccionComboSeleccionada[]
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

  if (eleccionesSeleccionadas && eleccionesSeleccionadas.length > 0) {
    const opcionesCatalogoMap = new Map<string, OpcionEleccionCombo>();
    if (combo.gruposEleccion) {
      for (const grupo of combo.gruposEleccion) {
        for (const op of grupo.opciones || []) {
          opcionesCatalogoMap.set(`${grupo.id}:${op.id}`, op);
        }
      }
    }

    for (const eleccion of eleccionesSeleccionadas) {
      const opcionCatalogo = opcionesCatalogoMap.get(`${eleccion.grupoId}:${eleccion.opcionId}`);
      if (opcionCatalogo?.disponible === false) {
        return {
          estado: 'agotado',
          insumoCritico: eleccion.opcionNombre || opcionCatalogo.nombre,
          porcionesDisponibles: 0,
        };
      }

      const prodId = eleccion.productoId || opcionCatalogo?.productoId;
      const cantEleccion = eleccion.cantidad && eleccion.cantidad > 0 ? eleccion.cantidad : 1;
      const cantProd =
        opcionCatalogo?.cantidadProducto && opcionCatalogo.cantidadProducto > 0
          ? opcionCatalogo.cantidadProducto
          : 1;

      if (prodId) {
        const prod = productosMap.get(prodId);
        if (prod && prod.disponible === false) {
          return {
            estado: 'agotado',
            insumoCritico: prod.nombre,
            porcionesDisponibles: 0,
          };
        }
        if (prod?.receta && Array.isArray(prod.receta)) {
          for (const ing of prod.receta) {
            ingredientesTotales.push({
              insumoId: ing.insumoId,
              nombreSnapshot: ing.nombreSnapshot,
              cantidad: ing.cantidad * cantProd * cantEleccion,
              unidadSnapshot: ing.unidadSnapshot,
            });
          }
        }
      }

      const recetaExtra = eleccion.recetaExtra ?? opcionCatalogo?.recetaExtra;
      if (Array.isArray(recetaExtra)) {
        for (const ing of recetaExtra) {
          ingredientesTotales.push({
            insumoId: ing.insumoId,
            nombreSnapshot: ing.nombreSnapshot,
            cantidad: ing.cantidad * cantEleccion,
            unidadSnapshot: ing.unidadSnapshot,
          });
        }
      }
    }

    return evaluarEstadoStockProducto(ingredientesTotales, insumosMap);
  }

  const baseAlerta = evaluarEstadoStockProducto(ingredientesTotales, insumosMap);
  if (baseAlerta.estado === 'agotado') {
    return baseAlerta;
  }

  if (combo.gruposEleccion && combo.gruposEleccion.length > 0) {
    for (const grupo of combo.gruposEleccion) {
      if (grupo.obligatorio && grupo.opciones && grupo.opciones.length > 0) {
        const evaluaciones = grupo.opciones.map((op) =>
          evaluarEstadoStockOpcionCombo(op, productos, insumosMap)
        );
        const disponiblesCount = evaluaciones.filter((ev) => ev.estado !== 'agotado').length;
        const minRequerido = Math.max(1, grupo.minSelecciones || 1);
        if (disponiblesCount < minRequerido) {
          const primeraAgotada = evaluaciones.find((ev) => ev.estado === 'agotado');
          return {
            estado: 'agotado',
            insumoCritico: primeraAgotada?.insumoCritico || grupo.nombre,
            porcionesDisponibles: 0,
          };
        }
      }
    }
  }

  return baseAlerta;
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
