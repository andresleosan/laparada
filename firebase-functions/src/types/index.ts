/**
 * Tipos para Cloud Functions
 * Duplicados aquí para evitar dependencias circulares
 */

// Re-export tipos básicos desde Firestore
export type Timestamp = any;

export interface Control86ItemServer {
  agotado86?: boolean;
  motivo86?: string;
  nota86?: string;
  contadorActivo?: boolean;
  porcionesDisponibles?: number | null;
  umbralAlertaPorciones?: number;
  auto86AlLlegarACero?: boolean;
}

export interface EspecialDelDiaConfigServer {
  activo?: boolean;
  etiqueta?: string;
  diasSemana?: number[];
  fechaEspecifica?: string;
  horaInicio?: string;
  horaFin?: string;
  mensajeSugerido?: string;
  soloEnHorarioProgramado?: boolean;
  prioridad?: number;
}

/**
 * Producto en el menú
 */
export interface Producto {
  id?: string;
  negocioId: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  categoria?: string;
  disponible?: boolean;
  imagen?: string;
  preparacionMinutos?: number;
  control86?: Control86ItemServer;
  especialDelDia?: EspecialDelDiaConfigServer;
}

/**
 * Combo de productos
 */
export interface Combo {
  id?: string;
  negocioId: string;
  nombre: string;
  descripcion?: string;
  categoria?: string;
  precioEspecial: number;
  precioCombo?: number;
  precioTotal?: number;
  precioIndividual?: number;
  items?: Array<{
    id?: string;
    productoId?: string;
    cantidad?: number;
    nombre?: string;
    nombreSnapshot?: string;
  }>;
  disponible?: boolean;
  control86?: Control86ItemServer;
  especialDelDia?: EspecialDelDiaConfigServer;
}

/**
 * Item de una venta
 */
export interface ItemVenta {
  tipo: 'producto' | 'combo';
  referenciaId: string;
  id: string;
  nombre: string;
  precioUnitario: number;
  precio: number;
  cantidad: number;
  subtotal: number;
  categoria?: string;
}

/**
 * Venta
 */
export interface Venta {
  id?: string;
  negocioId: string;
  numeroCliente?: string;
  items: ItemVenta[];
  total: number;
  fecha?: Timestamp;
  origen: 'pos' | 'whatsapp' | 'phone' | 'domicilio';
  metodoPago: string;
  estado?: string;
  domicilio?: boolean;
}

/**
 * Domicilio (Entrega)
 */
export interface Domicilio {
  id?: string;
  negocioId: string;
  numeroCliente: string;
  telefonoCliente?: string;
  direccion: string;
  referencia?: string;
  monto: number;
  estado: 'confirmado' | 'en_preparacion' | 'listo' | 'en_camino' | 'entregado' | 'cancelado';
  domiciliarioId?: string;
  creadoEn?: Timestamp;
  entregadoEn?: Timestamp;
  horaEnCamino?: Timestamp;
}

/**
 * Usuario del sistema
 */
export interface Usuario {
  id?: string;
  nombre: string;
  email: string;
  telefono?: string;
  rol: 'admin' | 'domiciliario' | 'cliente';
  activo: boolean;
}
