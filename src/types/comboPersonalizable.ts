import type { InsumoReceta } from './receta';

/**
 * Categorías semánticas de los grupos de elección dentro de un combo personalizable.
 */
export type CategoriaGrupoEleccion =
  | 'bebida'
  | 'acompanamiento'
  | 'salsa'
  | 'proteina'
  | 'otro';

/**
 * Opción seleccionable dentro de un grupo de elección de un combo personalizable.
 */
export interface OpcionEleccionCombo {
  /** Identificador único dentro del grupo */
  id: string;
  /** Nombre visible para cajero/cliente (ej. "Coca-Cola 400ml", "Papas Francesas") */
  nombre: string;
  /** Producto del catálogo vinculado opcionalmente (hereda su escandallo y estado disponible) */
  productoId?: string;
  /** Unidades del producto vinculado que consume esta opción (default 1) */
  cantidadProducto?: number;
  /** Insumos directos de bodega consumidos al elegir esta opción (ej. 0.03 L de salsa) */
  recetaExtra?: InsumoReceta[];
  /** Recargo adicional en COP (>= 0). 0 significa incluido en el precio base del combo */
  recargoCOP: number;
  /** Si la opción está habilitada para seleccionarse (default true) */
  disponible?: boolean;
  /** Si se preselecciona automáticamente al abrir el armador de combo */
  porDefecto?: boolean;
}

/**
 * Grupo de elección dentro de un combo personalizable ("Arma tu Combo").
 */
export interface GrupoEleccionCombo {
  /** Identificador único del grupo */
  id: string;
  /** Título del grupo (ej. "Elige tu Bebida", "Elige tu Acompañamiento") */
  nombre: string;
  /** Tipo de grupo para íconos, plantillas y formateo */
  categoriaGrupo: CategoriaGrupoEleccion;
  /** Indica si el cliente/cajero debe completar la selección mínima antes de agregar */
  obligatorio: boolean;
  /** Mínimo de opciones distintas/totales requeridas (0 si opcional, >= 1 si obligatorio) */
  minSelecciones: number;
  /** Máximo de opciones permitidas en este grupo (1 = selección única, > 1 = múltiple) */
  maxSelecciones: number;
  /** Opciones configuradas en el grupo */
  opciones: OpcionEleccionCombo[];
}

/**
 * Elección concreta realizada al armar un combo en POS o Storefront.
 */
export interface EleccionComboSeleccionada {
  grupoId: string;
  grupoNombre: string;
  opcionId: string;
  opcionNombre: string;
  cantidad: number;
  productoId?: string;
  recargoCOP: number;
  recetaExtra?: InsumoReceta[];
}

/**
 * Resultado de la validación de selecciones de un combo personalizable.
 */
export interface ValidacionSeleccionCombo {
  valido: boolean;
  erroresPorGrupo: Record<string, string>;
  gruposFaltantes: string[];
}
