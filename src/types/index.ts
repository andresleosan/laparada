import { Timestamp } from 'firebase/firestore';

/**
 * Jornada: período del día en que opera La Parada
 */
export type Jornada = 'mañana' | 'noche' | 'ambas';

/**
 * Origen de la venta: punto físico (POS) o WhatsApp
 */
export type OrigenVenta = 'pos' | 'whatsapp';

/**
 * Método de pago
 */
export type MetodoPago = 'efectivo' | 'transferencia' | 'domicilio';

/**
 * Estados de un domicilio en su ciclo de vida
 */
export type EstadoDomicilio = 'pendiente' | 'en_preparacion' | 'en_camino' | 'entregado';

/**
 * Categoría de gasto
 */
export type CategoriaGasto = 'insumos' | 'gas' | 'domiciliario' | 'varios' | 'salarios' | 'servicios' | 'mantenimiento' | 'otros';

/**
 * Producto individual del menú
 */
export interface Producto {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;           // En COP, valor entero
  jornada: Jornada;
  disponible: boolean;
  imagenUrl?: string;
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
  precioTotal?: number;
  descripcion: string;
  items: ComboItem[];
  precioEspecial: number;  // En COP, valor entero
  jornada: Jornada;
  disponible: boolean;
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
}

/**
 * Venta registrada (POS o domicilio entregado)
 */
export interface Venta {
  id: string;
  items: ItemVenta[];
  total: number;           // En COP, valor entero
  metodoPago: MetodoPago;
  origen: OrigenVenta;
  jornada: Jornada;
  fecha: Timestamp;
  domicilioId?: string;    // Si fue entregado como domicilio
}

/**
 * Pedido a domicilio con seguimiento de estado
 */
export interface Domicilio {
  id: string;
  clienteNombre: string;
  clienteTelefono: string;
  direccion: string;
  items: ItemVenta[];
  total: number;           // En COP, valor entero
  metodoPago: MetodoPago;
  origen: OrigenVenta;
  estado: EstadoDomicilio;
  jornada: 'mañana' | 'noche';
  domiciliarioId?: string;
  notas?: string;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
  ventaId?: string;        // Se establece cuando se marca como entregado
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
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}

/**
 * Registro de entrada de insumo al inventario
 */
export interface EntradaInventario {
  id: string;
  insumoId: string;
  insumoNombre: string;
  cantidad: number;
  costo: number;           // En COP, valor entero
  proveedor: string;
  fecha: Timestamp;
}

/**
 * Gasto registrado
 */
export interface Gasto {
  id: string;
  concepto: string;
  monto: number;           // En COP, valor entero
  categoria: CategoriaGasto;
  jornada: Jornada;
  fecha: Timestamp;
  notas?: string;
}

/**
 * Cierre de caja de una jornada
 */
export interface CierreCaja {
  id: string;
  jornada: Jornada;
  fecha: Timestamp;
  totalIngresos: number;   // En COP, valor entero
  totalGastos: number;     // En COP, valor entero
  utilidadNeta: number;    // En COP, valor entero
  ventasPos: number;       // En COP, valor entero
  ventasWhatsapp: number;  // En COP, valor entero
}

/**
 * Configuración del bot WhatsApp
 */
export interface ConfiguracionBot {
  activo: boolean;
  mensajeBienvenida: string;
  mensajeCierre: string;
  jornadaActiva: Jornada;
  webhookVerificado: boolean;
  ultimaActualizacion: Timestamp;
}

/**
 * Estado conversacional del usuario (para el bot)
 */
export interface EstadoUsuarioBot {
  telefono: string;
  estado: 'inicio' | 'eligiendo_menu' | 'confirmando_pedido' | 'datos_envio';
  carrito: ItemVenta[];
  clienteNombre?: string;
  clienteDireccion?: string;
  ultimaActualizacion: Timestamp;
  tiempoExpiracion: number;  // milisegundos
}

/**
 * Transacción de pago (Stripe/MercadoPago)
 */
export type EstadoPago = 'pendiente' | 'procesando' | 'completado' | 'fallido' | 'cancelado' | 'reembolsado';

export interface TransaccionPago {
  id: string;
  ventaId: string;
  monto: number;           // En COP, valor entero
  moneda: 'COP';
  metodoPago: 'stripe' | 'mercadopago' | 'efectivo';
  estado: EstadoPago;
  referenciaPasarela?: string;  // ID de transacción en Stripe/MP
  clienteEmail?: string;
  clienteTelefono?: string;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
  completadoEn?: Timestamp;
  errorMensaje?: string;
}

/**
 * Sesión de pago iniciada
 */
export interface SesionPago {
  id: string;
  ventaId: string;
  urlPago: string;         // URL de checkout
  monto: number;
  estado: 'activa' | 'completada' | 'expirada';
  clienteEmail: string;
  clienteTelefono: string;
  creadoEn: Timestamp;
  expiraEn: Timestamp;
  completadoEn?: Timestamp;
}

/**
 * Mensaje WhatsApp mejorado
 */
export interface MensajeWhatsApp {
  id?: string;
  telefono: string;
  tipo: 'entrada' | 'salida';
  contenido: string;
  mediaUrl?: string;
  estado: 'enviado' | 'entregado' | 'leido' | 'fallido';
  referenciaMensajeWA?: string;
  referenciaWhatsapp?: string;
  creadoEn: Timestamp | Date;
  actualizadoEn?: Timestamp | Date;
  entregadoEn?: Timestamp | Date;
  leidoEn?: Timestamp | Date;
  falloEn?: Timestamp | Date;
  intentosFallidos?: number;
}

/**
 * Estadísticas de transacciones
 */
export interface EstadisticasPagos {
  totalTransacciones: number;
  totalMonto: number;
  transaccionesCompletadas: number;
  transaccionesFallidas: number;
  porcentajeExito: number;
  montoPromedio: number;
}
