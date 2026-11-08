// src/types/promocion.ts

export type TipoPromocion =
  | 'happy_hour'
  | 'dos_por_uno'
  | 'descuento_categoria'
  | 'cupon_descuento'
  | 'descuento_general';

export type CanalPromocion = 'todos' | 'pos' | 'storefront';

export type TipoDescuentoPromocion = 'porcentaje' | 'monto_fijo' | 'dos_por_uno';

export interface Promocion {
  id: string;
  negocioId: string;
  nombre: string;
  descripcion?: string;
  tipo: TipoPromocion;
  canales: CanalPromocion[];
  activo: boolean;

  // Vigencia temporal
  diasSemana: number[]; // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
  horaInicio?: string; // Formato "HH:mm" (ej. "17:00")
  horaFin?: string; // Formato "HH:mm" (ej. "20:00")
  fechaInicio?: string; // Formato "YYYY-MM-DD"
  fechaFin?: string; // Formato "YYYY-MM-DD"

  // Ámbito de aplicación
  categoriaIds?: string[];
  productoIds?: string[];

  // Descuento
  tipoDescuento: TipoDescuentoPromocion;
  valorDescuento: number; // Porcentaje (ej. 20 para 20%) o Monto COP (ej. 5000) o 100 para 2x1
  montoMinimoSubtotal?: number; // COP mínimo para aplicar
  topeDescuentoMaximoCOP?: number; // Límite máximo de descuento en COP

  // Cupones digitales
  codigoCupon?: string; // En mayúsculas (ej. "PARADA20")
  limiteUsos?: number;
  usosActuales?: number;

  creadoEn: string;
  actualizadoEn?: string;
}

export interface CrearPromocionInput {
  negocioId: string;
  nombre: string;
  descripcion?: string;
  tipo: TipoPromocion;
  canales: CanalPromocion[];
  activo?: boolean;
  diasSemana?: number[];
  horaInicio?: string;
  horaFin?: string;
  fechaInicio?: string;
  fechaFin?: string;
  categoriaIds?: string[];
  productoIds?: string[];
  tipoDescuento: TipoDescuentoPromocion;
  valorDescuento: number;
  montoMinimoSubtotal?: number;
  topeDescuentoMaximoCOP?: number;
  codigoCupon?: string;
  limiteUsos?: number;
}

export interface ResultadoEvaluacionPromocion {
  promocion: Promocion;
  esAplicable: boolean;
  montoDescuentoCOP: number;
  mensaje: string;
  detalleAhorro?: string;
  itemsAfectadosIds?: string[];
}

export interface KpisPromociones {
  totalPromociones: number;
  activas: number;
  happyHoursEnVivo: number;
  cuponesActivos: number;
  totalCanjesCupones: number;
}
