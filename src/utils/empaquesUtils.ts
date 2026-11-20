import type {
  CanalEmpaque,
  CategoriaEmpaque,
  Combo,
  Insumo,
  InsumoReceta,
  ItemVenta,
  MovimientoKardex,
  OpcionEleccionCombo,
  Producto,
  ResumenEmpaqueCalculado,
  TipoEntrega,
} from '@/types';
import type { ConsumoInsumoCalculado } from './recetasEscandallo';
import { calcularCostosUnitariosRecientes } from './kardexInventarioUtils';

export interface CategoriaEmpaqueMeta {
  id: CategoriaEmpaque;
  label: string;
  ejemplos: string;
}

export const CATEGORIAS_EMPAQUE_META: Record<CategoriaEmpaque, CategoriaEmpaqueMeta> = {
  caja_contenedor: {
    id: 'caja_contenedor',
    label: 'Cajas / Contenedores',
    ejemplos: 'Caja hamburguesa, porta comidas, aluminio',
  },
  bolsa: {
    id: 'bolsa',
    label: 'Bolsas',
    ejemplos: 'Bolsa kraft, bolsa camiseta, bolsa domicilio',
  },
  vaso_tapa: {
    id: 'vaso_tapa',
    label: 'Vasos / Tapas',
    ejemplos: 'Vaso 12oz, tapa domo, pitillo',
  },
  cubiertos_servilletas: {
    id: 'cubiertos_servilletas',
    label: 'Cubiertos / Servilletas',
    ejemplos: 'Tenedor desechable, servilletas, salseros',
  },
  papel_aluminio: {
    id: 'papel_aluminio',
    label: 'Papel / Envolturas',
    ejemplos: 'Papel antigrasa, papel aluminio, vinipel',
  },
  otro: {
    id: 'otro',
    label: 'Otros Desechables',
    ejemplos: 'Stickers de seguridad, palillos',
  },
};

export const CATEGORIAS_EMPAQUE_ORDEN: CategoriaEmpaque[] = [
  'caja_contenedor',
  'bolsa',
  'vaso_tapa',
  'cubiertos_servilletas',
  'papel_aluminio',
  'otro',
];

/**
 * Determina si un insumo de bodega está clasificado como empaque o desechable.
 */
export function esInsumoEmpaque(insumo?: Partial<Insumo> | null): boolean {
  return Boolean(insumo?.esEmpaque);
}

/**
 * Filtra únicamente los insumos marcados como empaques, bolsas o desechables.
 */
export function filtrarInsumosEmpaque(insumos: Insumo[]): Insumo[] {
  return insumos.filter((ins) => esInsumoEmpaque(ins));
}

/**
 * Determina si un canal de servicio consume empaques y desechables.
 * - `salon`: no consume empaques por canal.
 * - `para_llevar` / `domicilio`: sí consume empaques.
 */
export function canalRequiereEmpaque(
  canal?: CanalEmpaque | null,
  tipoEntrega?: TipoEntrega
): boolean {
  if (canal === 'domicilio' || canal === 'para_llevar') return true;
  if (canal === 'salon') return false;
  return tipoEntrega === 'domicilio';
}

/**
 * Resuelve el canal de servicio efectivo a partir del tipo de entrega y tipo de servicio.
 */
export function resolverCanalServicio(
  tipoEntrega?: TipoEntrega,
  tipoServicio?: CanalEmpaque
): CanalEmpaque {
  if (tipoEntrega === 'domicilio' || tipoServicio === 'domicilio') {
    return 'domicilio';
  }
  if (tipoServicio === 'para_llevar') {
    return 'para_llevar';
  }
  return 'salon';
}

/**
 * Calcula el consumo consolidado de empaques, bolsas y desechables para una lista de ítems
 * en un canal dado. Si el canal es `salon`, retorna arreglo vacío.
 */
export function calcularConsumoEmpaques(
  items: ItemVenta[],
  productos: Producto[],
  combos: Combo[],
  canal: CanalEmpaque
): ConsumoInsumoCalculado[] {
  if (!canalRequiereEmpaque(canal) || !items || items.length === 0) {
    return [];
  }

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
      if (prod?.recetaEmpaque && Array.isArray(prod.recetaEmpaque)) {
        for (const emp of prod.recetaEmpaque) {
          acumular(
            emp.insumoId,
            emp.nombreSnapshot,
            emp.cantidad * item.cantidad,
            emp.unidadSnapshot
          );
        }
      }
    } else if (item.tipo === 'combo') {
      const combo = combosMap.get(item.referenciaId);
      if (combo) {
        if (combo.recetaEmpaque && Array.isArray(combo.recetaEmpaque)) {
          for (const emp of combo.recetaEmpaque) {
            acumular(
              emp.insumoId,
              emp.nombreSnapshot,
              emp.cantidad * item.cantidad,
              emp.unidadSnapshot
            );
          }
        }

        if (combo.items && Array.isArray(combo.items)) {
          for (const comboItem of combo.items) {
            const prodComp = productosMap.get(comboItem.productoId);
            if (prodComp?.recetaEmpaque && Array.isArray(prodComp.recetaEmpaque)) {
              for (const emp of prodComp.recetaEmpaque) {
                acumular(
                  emp.insumoId,
                  emp.nombreSnapshot,
                  emp.cantidad * comboItem.cantidad * item.cantidad,
                  emp.unidadSnapshot
                );
              }
            }
          }
        }
      }

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
            if (prodEleccion?.recetaEmpaque && Array.isArray(prodEleccion.recetaEmpaque)) {
              for (const emp of prodEleccion.recetaEmpaque) {
                acumular(
                  emp.insumoId,
                  emp.nombreSnapshot,
                  emp.cantidad * cantProd * cantEleccion,
                  emp.unidadSnapshot
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
 * Calcula el costo unitario efectivo de un insumo usando el último movimiento del Kardex
 * o el costoUnitario configurado en bodega.
 */
export function resolverCostoUnitarioInsumo(
  insumoId: string,
  insumosMap: Map<string, Insumo>,
  costosKardex: Record<string, number>
): number {
  const costoKardex = costosKardex[insumoId];
  if (typeof costoKardex === 'number' && Number.isFinite(costoKardex) && costoKardex > 0) {
    return costoKardex;
  }
  const ins = insumosMap.get(insumoId);
  if (ins && typeof ins.costoUnitario === 'number' && Number.isFinite(ins.costoUnitario) && ins.costoUnitario > 0) {
    return ins.costoUnitario;
  }
  return 0;
}

/**
 * Calcula el costo total de una lista de insumos de empaque (`recetaEmpaque`) por unidad de producto/combo.
 */
export function calcularCostoRecetaEmpaque(
  recetaEmpaque: InsumoReceta[] | undefined,
  insumos: Insumo[],
  movimientosKardex: MovimientoKardex[] = []
): number {
  if (!recetaEmpaque || recetaEmpaque.length === 0) return 0;
  const insumosMap = new Map(insumos.map((i) => [i.id, i]));
  const costosKardex = movimientosKardex.length > 0 ? calcularCostosUnitariosRecientes(movimientosKardex) : {};

  let total = 0;
  for (const emp of recetaEmpaque) {
    if (emp.cantidad <= 0) continue;
    const costoUnit = resolverCostoUnitarioInsumo(emp.insumoId, insumosMap, costosKardex);
    total += emp.cantidad * costoUnit;
  }
  return Math.round(total);
}

/**
 * Calcula el resumen completo de consumo y costo automático de empaques para un pedido según el canal.
 */
export function calcularCostoEmpaquesPedido(
  items: ItemVenta[],
  productos: Producto[],
  combos: Combo[],
  insumos: Insumo[],
  canal: CanalEmpaque,
  movimientosKardex: MovimientoKardex[] = []
): ResumenEmpaqueCalculado {
  const aplicaEmpaque = canalRequiereEmpaque(canal);
  if (!aplicaEmpaque || !items || items.length === 0) {
    return {
      canal,
      aplicaEmpaque,
      consumos: [],
      costoTotalCOP: 0,
      cantidadUnidadesEmpaque: 0,
    };
  }

  const consumos = calcularConsumoEmpaques(items, productos, combos, canal);
  const insumosMap = new Map(insumos.map((i) => [i.id, i]));
  const costosKardex = movimientosKardex.length > 0 ? calcularCostosUnitariosRecientes(movimientosKardex) : {};

  let costoTotal = 0;
  let cantidadUnidades = 0;
  for (const c of consumos) {
    const costoUnit = resolverCostoUnitarioInsumo(c.insumoId, insumosMap, costosKardex);
    costoTotal += c.cantidadTotal * costoUnit;
    cantidadUnidades += c.cantidadTotal;
  }

  return {
    canal,
    aplicaEmpaque: true,
    consumos,
    costoTotalCOP: Math.round(costoTotal),
    cantidadUnidadesEmpaque: Number(cantidadUnidades.toFixed(2)),
  };
}
