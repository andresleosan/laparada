import { Timestamp } from 'firebase/firestore';
import type { InsumoReceta } from './receta';
import type {
  EleccionComboSeleccionada,
  GrupoEleccionCombo,
} from './comboPersonalizable';
import type { TipoMovimientoKardex } from './kardex';
import type { CategoriaSubReceta } from './produccionCocina';
import type { EstacionCocinaMerma, OrigenMermaOperativa } from './mermasOperativas';
import type { EstacionCocina } from './cocina';
import type { CategoriaEmpaque } from './empaque';
import type { LoteConsumidoPepsRef } from './loteInventario';
import type {
  AlergenoId,
  AlergiasComensal,
  EtiquetaDietetica,
  InfoNutricional,
} from './alergenos';
import type { Control86Item, EspecialDelDiaConfig } from './control86';

export * from './negocio';
export * from './alergenos';
export * from './control86';
export * from './cocina';
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
export * from './fidelizacion';
export * from './kiosco';
export * from './auditoria';
export * from './mesero';
export * from './promocion';
export * from './facturacion';
export * from './contabilidad';
export * from './satisfaccion';
export * from './menuMesa';
export * from './tanda';
export * from './espera';
export * from './ingenieriaMenu';
export * from './metasPresupuesto';
export * from './despachoDomicilios';
export * from './comboPersonalizable';
export * from './produccionCocina';
export * from './mermasOperativas';
export * from './cotizacion';
export * from './cartera';
export * from './bono';
export * from './movimientoCaja';
export * from './liquidacionDomiciliario';
export * from './loteInventario';
export * from './bpm';
export * from './mantenimiento';
export * from './reclamo';
export * from './preciosProveedores';

/**
 * Origen de la venta: punto físico (POS), WhatsApp, Tienda Web o Kiosco de Autoservicio
 */
export type OrigenVenta = 'pos' | 'whatsapp' | 'web' | 'kiosco';

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
 * Categoría de gasto operativo (incluye servicios públicos, arriendo, aseo, mantenimiento, transporte, etc.)
 */
export type CategoriaGasto =
  | 'servicios'
  | 'arriendo'
  | 'aseo'
  | 'mantenimiento'
  | 'transporte'
  | 'gas'
  | 'insumos'
  | 'salarios'
  | 'domiciliario'
  | 'varios'
  | 'otros';

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
  recetaEmpaque?: InsumoReceta[]; // Empaques, bolsas y desechables usados en Para Llevar / Domicilio
  costoReferencia?: number; // En COP, costo directo de referencia cuando no usa receta detallada
  estacionCocina?: EstacionCocina; // Estación KDS responsable (fritura, plancha, bebidas_barra, etc.)
  tiempoPreparacionMin?: number; // Tiempo objetivo de preparación en minutos
  alergenosDeclarados?: boolean; // True si el admin verificó la declaración de alérgenos
  alergenos?: AlergenoId[];  // Alérgenos presentes en el plato
  etiquetasDieteticas?: EtiquetaDietetica[]; // Vegetariano, vegano, sin gluten, etc.
  infoNutricional?: InfoNutricional; // kcal y gramos por porción
  control86?: Control86Item; // Control "86" en vivo y contador regresivo de porciones
  especialDelDia?: EspecialDelDiaConfig; // Programación de Especial del Día
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
  recetaEmpaque?: InsumoReceta[]; // Empaques, bolsas y desechables usados en Para Llevar / Domicilio
  costoReferencia?: number; // En COP, costo directo de referencia cuando no usa receta detallada
  esPersonalizable?: boolean; // Si activa el flujo "Arma tu Combo" con grupos de elección
  gruposEleccion?: GrupoEleccionCombo[]; // Grupos configurables (bebida, acompañamiento, salsas, etc.)
  estacionCocina?: EstacionCocina; // Estación principal KDS para este combo
  tiempoPreparacionMin?: number; // Tiempo objetivo de preparación en minutos
  alergenosDeclarados?: boolean; // True si el admin verificó la declaración de alérgenos
  alergenos?: AlergenoId[];  // Alérgenos propios del combo (se suman los de sus productos)
  etiquetasDieteticas?: EtiquetaDietetica[]; // Etiquetas dietéticas del combo
  infoNutricional?: InfoNutricional; // kcal y gramos por porción
  control86?: Control86Item; // Control "86" en vivo y contador regresivo de porciones
  especialDelDia?: EspecialDelDiaConfig; // Programación de Especial del Día
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
  eleccionesCombo?: EleccionComboSeleccionada[]; // Opciones elegidas al armar un combo personalizable
  estacionCocina?: EstacionCocina; // Estación KDS asignada al ítem
  tiempoPreparacionMin?: number; // Tiempo objetivo de preparación del ítem en minutos
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
  promocionId?: string;    // ID de la promoción aplicada (Happy Hour, 2x1, cupón, etc.)
  codigoCupon?: string;    // Código del cupón canjeado si aplica (ej: "PARADA20")
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
  meseroId?: string;       // ID del mesero asignado (si proviene de salón o POS)
  meseroNombre?: string;   // Nombre del mesero asignado
  comisionMesero?: number; // En COP, valor de comisión calculado para el mesero
  esPagoParcial?: boolean; // True si es un cobro parcial / abono de cuenta
  estado?: 'completada' | 'anulada'; // Estado operativo de la venta
  anuladaEn?: Timestamp;   // Fecha de anulación si fue cancelada
  anuladaPor?: string;     // Nombre o identificador del usuario que anuló
  motivoAnulacion?: string; // Motivo justificado de la anulación
  notasAnulacion?: string;  // Justificación detallada
  revertirStock?: boolean; // Si se reintegró el stock de recetas al inventario
  numeroTurno?: string;    // Número de turno asociado (ej: "K-015")
  tipoServicio?: 'salon' | 'para_llevar' | 'domicilio'; // Modalidad de consumo
  costoEmpaque?: number;   // En COP, costo calculado de empaques y desechables consumidos en la venta
  consecutivoFiscal?: string; // Número oficial consecutivo DIAN (ej: "POS-00154")
  baseGravable?: number;   // En COP, base gravable calculada antes de impuesto
  valorImpuesto?: number;  // En COP, valor del impuesto liquidado (INC o IVA)
  tarifaImpuesto?: number; // Porcentaje de impuesto (ej: 8 o 19)
  tipoImpuesto?: 'inc' | 'iva' | 'ninguno'; // Tipo de impuesto fiscal aplicado
  resolucionDian?: string; // Número de resolución DIAN bajo la que se emitió
  cotizacionId?: string;   // Si la venta proviene de la conversión de una cotización/evento
  cotizacionCodigo?: string; // Código comercial de la cotización convertida (ej: "COT-2026-001")
  anticipoAplicado?: number; // En COP, anticipo offline previamente verificado sobre el evento
  bonoId?: string;         // ID del bono de regalo / tarjeta prepago redimida
  bonoCodigo?: string;     // Código único del bono redimido (ej: "BON-2026-ABCD12")
  montoBonoRedimido?: number; // En COP, monto cubierto con saldo del bono/tarjeta prepago
  montoExcedentePagado?: number; // En COP, excedente pagado en efectivo/transferencia si el bono no cubrió el 100%
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
  numeroTurno?: string;    // Número de turno amigable (ej: "K-015")
  tipoServicio?: 'salon' | 'para_llevar' | 'domicilio'; // Modalidad de servicio
  mesaNumero?: string;     // Número de mesa si es para salón
  pagado?: boolean;        // Si el pedido ya fue abonado en caja
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
  entregadoEn?: Timestamp;
  ventaId?: string;        // Se establece cuando se marca como entregado
  rastreoToken?: string;   // Token público para seguimiento sin login en /rastreo/:token
  costoEnvio?: number;     // Tarifa de domicilio cobrada o asociada a la zona (COP)
  zonaDomicilioNombre?: string; // Nombre de la zona de cobertura detectada
  tiempoEstimadoMin?: number;   // Tiempo estimado de entrega en minutos
  tiempoObjetivoMin?: number;   // Tiempo objetivo de preparación en cocina (máximo entre ítems)
  cotizacionId?: string;        // Si la comanda proviene de una cotización/evento corporativo
  alergiasComensal?: AlergiasComensal; // Alergias declaradas por el comensal (alerta destacada en KDS)
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
  esEmpaque?: boolean;     // True cuando es un empaque, bolsa o desechable por canal
  categoriaEmpaque?: CategoriaEmpaque; // Clasificación operativa del empaque
  esSubReceta?: boolean;   // True cuando es una preparación base producida en cocina
  categoriaSubReceta?: CategoriaSubReceta;
  rendimientoLote?: number; // Cantidad esperada obtenida por 1 lote estándar (ej: 5 litros, 4 kg)
  recetaInsumos?: InsumoReceta[]; // Insumos primarios consumidos para producir 1 lote estándar
  instruccionesPreparacion?: string; // Procedimiento paso a paso para cocina
  tiempoPreparacionMin?: number; // Duración estimada de producción en minutos
  vidaUtilHoras?: number;  // Vida útil refrigerada/ambiente recomendada en horas
  ultimoLoteProducidoEn?: Timestamp;
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
  loteProduccionId?: string;
  subRecetaId?: string;
  subRecetaNombre?: string;
  multiplicadorLotes?: number;
  origenMerma?: OrigenMermaOperativa;
  estacionCocina?: EstacionCocinaMerma;
  mermaLoteId?: string;
  productoMermaId?: string;
  productoMermaNombre?: string;
  comandaMermaId?: string;
  loteInventarioId?: string;
  codigoLote?: string;
  fechaVencimientoLote?: string;
  lotesConsumidosPeps?: LoteConsumidoPepsRef[];
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
  origenFondo?: import('./gasto').OrigenFondoGasto;
  metodoPago?: import('./gasto').MetodoPagoGasto;
  proveedorNombre?: string;
  numeroComprobante?: string;
  responsableNombre?: string;
  responsableRol?: string;
  cajaId?: string;
  movimientoCajaId?: string;
  deducible?: boolean;
  creadoEn?: Timestamp;
  actualizadoEn?: Timestamp;
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
  totalIngresosSencillo?: number; // Ingresos de sencillo / cambio en turno
  totalSangrias?: number;         // Sangrías / retiros a caja fuerte en turno
  totalCajaMenor?: number;        // Egresos de caja menor en turno
  cantidadCortesX?: number;       // Cortes X parciales realizados en el turno
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

export * from './gasto';
export * from './empaque';
