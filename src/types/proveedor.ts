import { Timestamp } from 'firebase/firestore';

/**
 * Categorías de insumos y servicios de proveedores en gastronomía
 */
export type CategoriaProveedor =
  | 'carnes'
  | 'panaderia'
  | 'lacteos'
  | 'verduras_frutas'
  | 'bebidas'
  | 'empaques'
  | 'gas_servicios'
  | 'limpieza'
  | 'otros';

/**
 * Entidad Proveedor (Aliado comercial de materias primas o servicios)
 */
export interface Proveedor {
  id: string;
  negocioId: string;
  nombre: string;
  contacto?: string;
  telefono: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  nit?: string;
  categoria: CategoriaProveedor;
  diasCreditoHabitual: number; // 0 para contado, 7, 15, 30 días
  activo: boolean;
  notas?: string;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}

/**
 * Item detallado en una factura de compra
 */
export interface ItemFacturaCompra {
  insumoId?: string;       // ID del insumo en inventario si está vinculado
  descripcion: string;     // Nombre del producto o concepto
  cantidad: number;
  unidad?: string;         // kg, litro, unidad, paquete, etc.
  costoUnitario: number;   // En COP, valor entero
  subtotal: number;        // En COP, valor entero (cantidad * costoUnitario)
}

/**
 * Condición de pago de la compra
 */
export type CondicionPagoFactura = 'contado' | 'credito';

/**
 * Estado administrativo de la factura de compra
 */
export type EstadoFacturaCompra = 'pendiente' | 'parcial' | 'pagada' | 'anulada';

/**
 * Semáforo de vencimiento para cuentas por pagar
 */
export type EstadoVencimientoFactura = 'al_dia' | 'por_vencer' | 'vencida' | 'pagada';

/**
 * Factura o cuenta de cobro de compra a proveedor
 */
export interface FacturaCompra {
  id: string;
  negocioId: string;
  proveedorId: string;
  proveedorNombre: string;
  numeroFactura: string;         // Ej: "FAC-1024", "REM-301", "FAC-001"
  fechaEmision: Timestamp;
  fechaVencimiento: Timestamp;
  condicionPago: CondicionPagoFactura;
  estado: EstadoFacturaCompra;
  items: ItemFacturaCompra[];
  subtotal: number;              // En COP, valor entero
  impuestos?: number;            // En COP, IVA u otros impuestos
  total: number;                 // En COP, valor entero total
  montoPagado: number;           // En COP, suma acumulada de abonos
  saldoPendiente: number;        // En COP, total - montoPagado
  afectaInventario?: boolean;    // Si ingresó los insumos al stock físico
  notas?: string;
  motivoAnulacion?: string;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}

/**
 * Abono o pago realizado a una factura de compra
 */
export interface PagoFacturaCompra {
  id: string;
  negocioId: string;
  facturaId: string;
  proveedorId: string;
  monto: number;                 // En COP, valor entero
  fechaPago: Timestamp;
  metodoPago: 'efectivo' | 'transferencia';
  referenciaComprobante?: string;// Ej: # Comprobante Nequi/Bancolombia o recibo
  registradoPor?: string;        // Nombre del cajero/administrador
  gastoId?: string;              // ID del gasto vinculado en la colección 'gastos'
  notas?: string;
  creadoEn: Timestamp;
}

/**
 * Métricas consolidadas del módulo de proveedores y cuentas por pagar
 */
export interface MetricasCuentasPorPagar {
  deudaTotal: number;
  totalVencido: number;
  cantidadVencidas: number;
  totalPorVencerSemana: number;
  cantidadPorVencerSemana: number;
  totalPagadoMes: number;
  proveedoresActivos: number;
}

/**
 * Resumen contable por proveedor individual
 */
export interface ResumenProveedorTotales {
  totalComprado: number;
  saldoPendiente: number;
  facturasPendientes: number;
}

/**
 * Parámetros de entrada para crear una factura de compra
 */
export interface CrearFacturaCompraInput extends Omit<
  FacturaCompra,
  'id' | 'creadoEn' | 'actualizadoEn' | 'montoPagado' | 'saldoPendiente' | 'estado'
> {
  estado?: EstadoFacturaCompra;
  registrarEntradaInventarioAutomatica?: boolean;
  registrarGastoContado?: boolean;
  responsable?: string;
}

/**
 * Parámetros de entrada para registrar un abono a una factura
 */
export interface RegistrarPagoFacturaInput {
  monto: number;
  metodoPago: 'efectivo' | 'transferencia';
  referenciaComprobante?: string;
  registradoPor?: string;
  notas?: string;
  crearGastoCaja?: boolean;
}

/**
 * Estados del ciclo de vida de una Orden de Compra a proveedor
 */
export type EstadoOrdenCompra = 'borrador' | 'enviada' | 'recibida' | 'cancelada';

/**
 * Nivel de urgencia para reabastecimiento por quiebre de stock mínimo
 */
export type PrioridadReabastecimiento = 'agotado' | 'critico' | 'bajo';

/**
 * Ítem dentro de una Orden de Compra a proveedor
 */
export interface ItemOrdenCompra {
  insumoId: string;
  insumoNombre: string;
  unidad: string;
  stockActualSnapshot: number;
  stockMinimoSnapshot: number;
  cantidadSolicitada: number;
  cantidadRecibida?: number;
  costoUnitarioEstimado: number; // En COP, valor entero
  costoUnitarioReal?: number;     // En COP, valor entero confirmado al recibir
  subtotalEstimado: number;       // En COP, cantidadSolicitada * costoUnitarioEstimado
  subtotalReal?: number;          // En COP, cantidadRecibida * costoUnitarioReal
}

/**
 * Orden de Compra inteligente emitida a un proveedor (almacenada en `ordenes_compra`)
 */
export interface OrdenCompra {
  id: string;
  negocioId: string;
  numeroOrden: string;           // Ej: "OC-0001"
  proveedorId: string;
  proveedorNombre: string;
  proveedorTelefono?: string;
  estado: EstadoOrdenCompra;
  items: ItemOrdenCompra[];
  totalEstimado: number;         // En COP, valor entero
  totalReal?: number;            // En COP, valor entero al recibir en bodega
  notas?: string;
  facturaGeneradaId?: string;    // ID de la factura creada al recibir (si aplica)
  motivoCancelacion?: string;
  responsable?: string;
  enviadaEn?: Timestamp;
  recibidaEn?: Timestamp;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}

/**
 * Sugerencia automática generada cuando un insumo está en o bajo su stock mínimo
 */
export interface SugerenciaReabastecimiento {
  insumoId: string;
  insumoNombre: string;
  unidad: string;
  stockActual: number;
  stockMinimo: number;
  deficit: number;               // Cuánto falta para llegar al mínimo
  cantidadSugerida: number;      // Cantidad recomendada para pedir (stock óptimo)
  costoUnitarioReferencia: number; // En COP, último costo conocido o de catálogo
  subtotalEstimado: number;      // En COP, cantidadSugerida * costoUnitarioReferencia
  proveedorSugeridoId?: string;
  proveedorSugeridoNombre?: string;
  prioridad: PrioridadReabastecimiento;
}

/**
 * Datos para crear una nueva Orden de Compra
 */
export interface CrearOrdenCompraInput {
  negocioId: string;
  numeroOrden?: string;
  proveedorId: string;
  proveedorNombre: string;
  proveedorTelefono?: string;
  estado?: 'borrador' | 'enviada';
  items: ItemOrdenCompra[];
  notas?: string;
  responsable?: string;
}

/**
 * Detalle por insumo al recibir una Orden de Compra en bodega
 */
export interface ItemRecepcionOrdenInput {
  insumoId: string;
  cantidadRecibida: number;
  costoUnitarioReal: number;
}

/**
 * Parámetros para recibir en 1 clic una Orden de Compra e impactar el Kardex
 */
export interface RecibirOrdenCompraInput {
  itemsRecibidos: ItemRecepcionOrdenInput[];
  actualizarCostoUnitarioCatalogo?: boolean;
  generarFacturaCompra?: boolean;
  numeroFacturaProveedor?: string;
  condicionPago?: CondicionPagoFactura;
  registrarGastoContado?: boolean;
  notasRecepcion?: string;
  responsable?: string;
}

