import { Timestamp } from 'firebase/firestore';
import type { InsumoReceta } from './receta';
import type { TipoMovimientoKardex } from './kardex';

export * from './negocio';
export * from './reserva';
export * from './notificacion';
export * from './offline';
export * from './ticket';
export * from './tracking';
export * from './cliente';
export * from './receta';
export * from './mesa';
export * from './descuento';
export * from './anulacionVenta';
export * from './kardex';
export * from './analiticaFinanciera';
export * from './proveedor';
export * from './personal';

/**
 * Origen de la venta: punto físico (POS), WhatsApp o Tienda Web
 */
export type OrigenVenta = 'pos' | 'whatsapp' | 'web';

/**
 * Método de pago
 */
export type MetodoPago = 'efectivo' | 'transferencia';

/**
 * Forma en que el cliente recibe el pedido. No es un medio de pago.
 */
export type TipoEntrega = 'mostrador' | 'domicilio';

/**
 * Estados de un domicilio en su ciclo de vida
 */
export type EstadoDomicilio = 'pendiente' | 'en_preparacion' | 'en_camino' | 'entregado';

/**
 * Categoría de gasto (ordenado: gas, insumos, mantenimiento, otros, domiciliario, servicios, varios, salarios)
 */
export type CategoriaGasto = 'gas' | 'insumos' | 'mantenimiento' | 'otros' | 'domiciliario' | 'servicios' | 'varios' | 'salarios';

/**
 * Categoría de productos del menú
 */
export interface CategoriaProducto {
  id: string;
  nombre: string;
  icono?: string;
  imagenUrl?: string;       // Foto/Fondo compartido para todos los productos de esta categoría
  descripcion?: string;
  orden?: number;
  activo: boolean;
  negocioId: string;        // ID del negocio / tenant
  creadoEn?: Timestamp;
  actualizadoEn?: Timestamp;
}

/**
 * Producto individual del menú
 */
export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  categoria?: string;       // Categoría (ej: Tequeños, Pancerotis, Hamburguesas, etc.)
  precio: number;           // En COP, valor entero
  disponible: boolean;
  destacado?: boolean;      // Marcado como favorito/destacado para la tienda
  imagenUrl?: string;
  receta?: InsumoReceta[];  // Escandallo de insumos para deducción automática
  negocioId: string;        // ID del negocio / tenant
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}

/**
 * Item que forma parte de un combo
 */
export interface ComboItem {
  productoId: string;
  cantidad: number;
  nombreSnapshot: string;  // Nombre del producto al momento de crear el combo
}

/**
 * Combo o paquete promocional
 */
export interface Combo {
  id: string;
  nombre: string;
  categoria?: string;      // Categoría (ej: Combos, Promociones, etc.)
  precioTotal?: number;
  descripcion: string;
  items: ComboItem[];
  precioEspecial: number;  // En COP, valor entero
  disponible: boolean;
  destacado?: boolean;     // Marcado como favorito/destacado para la tienda
  imagenUrl?: string;
  receta?: InsumoReceta[]; // Insumos directos del combo (ej: empaques, salsas especiales)
  negocioId: string;       // ID del negocio / tenant
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}

/**
 * Item en una venta (puede ser producto o combo)
 */
export interface ItemVenta {
  tipo: 'producto' | 'combo';
  referenciaId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;  // En COP, valor entero
  subtotal: number;        // En COP, valor entero
  modificadores?: string[]; // Ej: ["Término 3/4", "Sin salsas", "Queso extra", "Para llevar"]
  notas?: string;          // Instrucción puntual de cocina
}

/**
 * Venta registrada (POS o domicilio entregado)
 */
export interface Venta {
  id: string;
  items: ItemVenta[];
  subtotal?: number;       // En COP, subtotal de productos antes de propina y descuento
  descuento?: number;      // En COP, valor descontado del subtotal
  descuentoMotivo?: string; // Motivo justificado del descuento o cortesía
  propina?: number;        // En COP, propina voluntaria sugerida (>= 0)
  total: number;           // En COP, valor entero total cobrado
  metodoPago: MetodoPago;
  tipoEntrega?: TipoEntrega;
  origen: OrigenVenta;
  /** Fecha y hora exacta del cobro. Es la única fuente de la hora de la venta. */
  fecha: Timestamp;
  domicilioId?: string;    // Si fue entregado como domicilio
  clienteNombre?: string;  // Nombre del cliente si aplica
  direccion?: string;      // Dirección si es domicilio
  barrio?: string;         // Barrio si es domicilio
  clienteTelefono?: string; // Teléfono del cliente si es domicilio
  fotoTransferenciaPath?: string; // Ruta privada en Storage para transferencias nuevas
  fotoTransferenciaUrl?: string; // Legado: migrar y retirar; no se abre desde la UI
  cuentaMesaId?: string;   // Si proviene de una cuenta de mesa
  mesaNombre?: string;     // Nombre de la mesa si aplica
  esPagoParcial?: boolean; // True si es un cobro parcial / abono de cuenta
  estado?: 'completada' | 'anulada'; // Estado operativo de la venta
  anuladaEn?: Timestamp;   // Fecha de anulación si fue cancelada
  anuladaPor?: string;     // Nombre o identificador del usuario que anuló
  motivoAnulacion?: string; // Motivo justificado de la anulación
  notasAnulacion?: string;  // Justificación detallada
  revertirStock?: boolean; // Si se reintegró el stock de recetas al inventario
  negocioId: string;       // ID del negocio / tenant
}

/**
 * Pedido a domicilio con seguimiento de estado
 */
export interface Domicilio {
  id: string;
  clienteNombre: string;
  clienteTelefono: string;
  direccion: string;
  barrio: string;
  items: ItemVenta[];
  total: number;           // En COP, valor entero
  metodoPago: MetodoPago;
  origen: OrigenVenta;
  estado: EstadoDomicilio;
  domiciliarioId?: string;
  domiciliarioNombre?: string;
  notas?: string;
  notasEntrega?: string;
  fotoTransferenciaPath?: string;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
  entregadoEn?: Timestamp;
  ventaId?: string;        // Se establece cuando se marca como entregado
  rastreoToken?: string;   // Token público para seguimiento sin login en /rastreo/:token
  negocioId: string;       // ID del negocio / tenant
}

/**
 * Insumo en inventario
 */
export interface Insumo {
  id: string;
  nombre: string;
  stockActual: number;
  stockMinimo: number;
  unidad: string;          // ej: kg, litro, unidad
  costoUnitario?: number;  // En COP, costo unitario de referencia
  proveedor?: string;      // Proveedor habitual
  negocioId: string;       // ID del negocio / tenant
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}

/**
 * Registro de entrada de insumo al inventario (compatible con Kardex)
 */
export interface EntradaInventario {
  id: string;
  insumoId: string;
  insumoNombre: string;
  cantidad: number;
  costo: number;           // En COP, valor entero
  proveedor: string;
  fecha: Timestamp;
  negocioId: string;       // ID del negocio / tenant
  tipoMovimiento?: TipoMovimientoKardex;
  stockPrevio?: number;
  stockResultante?: number;
  motivo?: string;
  notas?: string;
  responsable?: string;
  unidadMedida?: string;
  costoUnitario?: number;
}

/**
 * Gasto registrado
 */
export interface Gasto {
  id: string;
  concepto: string;
  monto: number;           // En COP, valor entero
  categoria: CategoriaGasto;
  fecha: Timestamp;
  notas?: string;
  negocioId: string;       // ID del negocio / tenant
}

import type { DesgloseDenominaciones, EstadoCuadreCaja, ArqueoEfectivo } from './cierreCaja';
export type { DesgloseDenominaciones, EstadoCuadreCaja, ArqueoEfectivo };

/**
 * Cierre de caja del día o turno
 */
export interface CierreCaja {
  id: string;
  fecha: Timestamp;
  totalIngresos: number;       // En COP, valor entero
  totalGastos: number;         // En COP, valor entero
  utilidadNeta: number;        // En COP, valor entero
  ventasPos: number;           // En COP, valor entero
  ventasWhatsapp: number;      // En COP, valor entero
  notas?: string;              // Observaciones o notas de cierre
  negocioId: string;           // ID del negocio / tenant
  arqueo?: ArqueoEfectivo;     // Arqueo físico de billetes y monedas
  cajeroNombre?: string;       // Nombre del cajero o responsable
  efectivoInicial?: number;    // Base de caja inicial del día
  efectivoEsperado?: number;   // Saldo esperado en efectivo
  efectivoReal?: number;       // Saldo físico real contado
  diferenciaEfectivo?: number; // Diferencia (real - esperado)
}

/**
 * Caja de dinero en efectivo del día
 */
export interface Caja {
  id: string;
  fecha: Timestamp;
  montoInicial: number;    // En COP, valor entero
  ingresos: number;        // En COP, valor entero (ventas en efectivo)
  egresos: number;         // En COP, valor entero (gastos deducidos)
  saldoActual: number;     // En COP, valor entero (inicial + ingresos - egresos)
  negocioId: string;       // ID del negocio / tenant
}

/**
 * Configuración del bot WhatsApp
 */
export interface ConfiguracionBot {
  negocioId: string;
  activo: boolean;
  mensajeBienvenida: string;
  mensajeCierre: string;
  ultimaActualizacion: Timestamp;
}

/**
 * Mensaje WhatsApp mejorado
 */
export interface MensajeWhatsApp {
  id?: string;
  negocioId: string;
  telefono: string;
  tipo: 'entrada' | 'salida';
  contenido: string;
  mediaUrl?: string;
  estado: 'procesando' | 'enviado' | 'entregado' | 'leido' | 'fallido';
  referenciaMensajeWA?: string;
  referenciaWhatsapp?: string;
  creadoEn: Timestamp | Date;
  actualizadoEn?: Timestamp | Date;
  entregadoEn?: Timestamp | Date;
  leidoEn?: Timestamp | Date;
  falloEn?: Timestamp | Date;
  intentosFallidos?: number;
}
