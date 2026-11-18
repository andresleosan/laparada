import type { Timestamp } from 'firebase/firestore';
import type { EleccionComboSeleccionada } from './comboPersonalizable';
import type { MetodoPago } from './index';
import type { TicketVentaData } from './ticket';

export type EstadoCotizacion =
  | 'borrador'
  | 'enviada'
  | 'aprobada'
  | 'convertida'
  | 'rechazada'
  | 'vencida';

export type TipoEventoCotizacion =
  | 'corporativo'
  | 'fiesta_cumpleanos'
  | 'boda_aniversario'
  | 'coffee_break'
  | 'refrigerio_escolar'
  | 'evento_privado'
  | 'otro';

export type ModalidadEntregaEvento =
  | 'domicilio_evento'
  | 'recoger_local'
  | 'evento_salon';

export type EstadoAnticipoCotizacion = 'sin_anticipo' | 'pendiente' | 'verificado';

export type TipoItemCotizacion = 'producto' | 'combo' | 'servicio_extra';

export type NivelRentabilidadEvento = 'optimo' | 'aceptable' | 'riesgo' | 'sin_costeo';

export interface ItemCotizacion {
  id: string;
  tipo: TipoItemCotizacion;
  referenciaId?: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number; // En COP, valor entero
  subtotal: number; // En COP, valor entero
  costoUnitarioEstimado?: number; // En COP (uso interno para servicios extra o costo manual)
  modificadores?: string[];
  notas?: string;
  eleccionesCombo?: EleccionComboSeleccionada[];
}

export interface SimulacionInsumoEvento {
  insumoId: string;
  nombre: string;
  unidad: string;
  cantidadRequerida: number;
  stockActual: number;
  faltante: number;
  costoUnitarioInsumo: number;
  costoTotalCOP: number;
  tieneStockSuficiente: boolean;
}

export interface SimulacionMargenCotizacion {
  subtotalProductosCOP: number;
  subtotalServiciosExtrasCOP: number;
  descuentoCOP: number;
  costoLogisticaCOP: number;
  totalCotizadoCOP: number;
  costoInsumosCOP: number;
  costoServiciosEstimadoCOP: number;
  costoTotalEstimadoCOP: number;
  utilidadBrutaCOP: number;
  margenBrutoPct: number;
  foodCostPct: number;
  costoPorInvitadoCOP: number;
  precioPorInvitadoCOP: number;
  nivelRentabilidad: NivelRentabilidadEvento;
  insumosRequeridos: SimulacionInsumoEvento[];
  insumosConDeficit: SimulacionInsumoEvento[];
  itemsSinCosteo: string[];
  coberturaCosteoPct: number;
}

export interface CotizacionComercial {
  id: string;
  negocioId: string;
  codigo: string;
  clienteNombre: string;
  empresa?: string;
  nitEmpresa?: string;
  clienteTelefono: string;
  clienteEmail?: string;
  tipoEvento: TipoEventoCotizacion;
  modalidadEntrega: ModalidadEntregaEvento;
  fechaEvento: string; // YYYY-MM-DD
  horaEvento?: string; // HH:mm
  fechaVencimiento: string; // YYYY-MM-DD
  invitados: number;
  direccionEvento?: string;
  barrioEvento?: string;
  notasEvento?: string;
  condicionesComerciales?: string;
  items: ItemCotizacion[];
  subtotal: number;
  descuento: number;
  descuentoPorcentaje?: number;
  descuentoMotivo?: string;
  costoLogistica: number;
  totalCotizado: number;
  // Snapshot financiero interno (nunca expuesto en propuestas al cliente)
  costoEstimadoInsumos: number;
  utilidadEstimada: number;
  margenEstimadoPct: number;
  // Control de anticipos 100% offline
  anticipoMonto: number;
  anticipoMetodo?: MetodoPago;
  anticipoEstado: EstadoAnticipoCotizacion;
  anticipoReferencia?: string;
  anticipoFotoPath?: string;
  anticipoVerificadoEn?: string;
  saldoPendiente: number;
  // Ciclo de vida y trazabilidad de conversión
  estado: EstadoCotizacion;
  enviadaWhatsAppEn?: string;
  aprobadaEn?: string;
  convertidaEn?: Timestamp | string;
  ventaId?: string;
  comandaId?: string;
  metodoPagoLiquidacion?: MetodoPago;
  responsableNombre?: string;
  creadoEn?: Timestamp | string;
  actualizadoEn?: Timestamp | string;
}

export interface CrearCotizacionInput {
  codigo?: string;
  clienteNombre: string;
  empresa?: string;
  nitEmpresa?: string;
  clienteTelefono: string;
  clienteEmail?: string;
  tipoEvento: TipoEventoCotizacion;
  modalidadEntrega: ModalidadEntregaEvento;
  fechaEvento: string;
  horaEvento?: string;
  fechaVencimiento: string;
  invitados: number;
  direccionEvento?: string;
  barrioEvento?: string;
  notasEvento?: string;
  condicionesComerciales?: string;
  items: ItemCotizacion[];
  descuento?: number;
  descuentoPorcentaje?: number;
  descuentoMotivo?: string;
  costoLogistica?: number;
  costoEstimadoInsumos?: number;
  utilidadEstimada?: number;
  margenEstimadoPct?: number;
  anticipoMonto?: number;
  anticipoMetodo?: MetodoPago;
  anticipoEstado?: EstadoAnticipoCotizacion;
  anticipoReferencia?: string;
  anticipoFotoPath?: string;
  estado?: Exclude<EstadoCotizacion, 'convertida'>;
  responsableNombre?: string;
}

export interface RegistrarAnticipoCotizacionInput {
  anticipoMonto: number;
  anticipoMetodo: MetodoPago;
  anticipoEstado: EstadoAnticipoCotizacion;
  anticipoReferencia?: string;
  anticipoFotoPath?: string;
  aprobarSiVerificado?: boolean;
  responsableNombre?: string;
}

export interface ConvertirCotizacionInput {
  metodoPagoSaldo: MetodoPago;
  enviarAKDS?: boolean;
  descontarInventario?: boolean;
  responsableNombre?: string;
  notasCocinaExtra?: string;
  negocioNombre?: string;
  negocioSlug?: string;
  negocioDireccion?: string;
  negocioTelefono?: string;
  datosFiscales?: {
    consecutivoFiscal?: string;
    baseGravable?: number;
    valorImpuesto?: number;
    tarifaImpuesto?: number;
    tipoImpuesto?: 'inc' | 'iva' | 'ninguno';
    resolucionDian?: string;
    razonSocial?: string;
    nombreComercial?: string;
    nit?: string;
    dv?: string;
    regimen?: string;
    responsabilidad?: string;
    direccionFiscal?: string;
    municipio?: string;
    departamento?: string;
    telefono?: string;
    prefijo?: string;
    rangoTexto?: string;
    vigenciaTexto?: string;
    leyenda?: string;
  };
}

export interface ResultadoConversionCotizacion {
  ventaId: string;
  comandaId?: string;
  insumosDescontados: number;
  ticket: TicketVentaData;
}

export interface FiltrosCotizaciones {
  estado: 'todas' | EstadoCotizacion;
  tipoEvento: 'todos' | TipoEventoCotizacion;
  busqueda: string;
}

export interface MetricasCotizaciones {
  total: number;
  borradores: number;
  enviadas: number;
  aprobadas: number;
  convertidas: number;
  rechazadasOVencidas: number;
  pipelineActivoCOP: number;
  totalConvertidoCOP: number;
  totalAnticiposVerificadosCOP: number;
  totalSaldoPorCobrarCOP: number;
  eventosProximos7Dias: number;
  tasaConversionPct: number;
  margenPromedioPct: number;
}
