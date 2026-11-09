import type { ItemVenta, MetodoPago, TipoEntrega } from './index';
import type { DatosFiscalesTicket } from './facturacion';

export interface TicketVentaData {
  ventaId: string;
  negocioNombre: string;
  negocioSlug?: string;
  negocioDireccion?: string;
  negocioTelefono?: string;
  fecha: Date | string;
  items: ItemVenta[];
  subtotal?: number;
  descuento?: number;
  descuentoMotivo?: string;
  propina?: number;
  total: number;
  metodoPago: MetodoPago;
  tipoEntrega: TipoEntrega;
  montoRecibido?: number;
  cambio?: number;
  clienteNombre?: string;
  clienteTelefono?: string;
  direccionEntrega?: string;
  barrioEntrega?: string;
  mesaNombre?: string;
  esOffline?: boolean;
  esPagoParcial?: boolean;
  saldoPendiente?: number;
  abonoNumero?: number;
  estado?: 'completada' | 'anulada';
  motivoAnulacion?: string;
  anuladaEn?: Date | string;
  datosFiscales?: DatosFiscalesTicket;
  encuestaUrl?: string;
}

