import { Timestamp } from 'firebase/firestore';
import type { ItemVenta, MetodoPago } from './index';

export type TipoServicioKiosco = 'salon' | 'para_llevar';

export type EstadoTurno = 'pendiente_pago' | 'en_preparacion' | 'listo' | 'entregado' | 'cancelado';

/**
 * Item personalizado para el Kiosco con modificadores táctiles
 */
export interface ItemKioscoCustomizado extends ItemVenta {
  modificadores?: string[];
  notas?: string;
}

/**
 * Pedido generado desde el kiosco de autoservicio
 */
export interface PedidoKiosco {
  id: string;
  negocioId: string;
  numeroTurno: string; // Ej: "K-015"
  codigoTurnoCorto: string; // Ej: "015"
  clienteNombre: string;
  clienteTelefono?: string;
  tipoServicio: TipoServicioKiosco;
  mesaNumero?: string;
  items: ItemKioscoCustomizado[];
  total: number;
  metodoPago: MetodoPago;
  pagado: boolean;
  estado: EstadoTurno;
  notas?: string;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
  listoEn?: Timestamp;
  entregadoEn?: Timestamp;
  ventaId?: string;
  domicilioId?: string;
}

/**
 * Datos de entrada para crear un pedido desde el kiosco
 */
export interface CrearPedidoKioscoInput {
  negocioId: string;
  clienteNombre: string;
  clienteTelefono?: string;
  tipoServicio: TipoServicioKiosco;
  mesaNumero?: string;
  items: ItemKioscoCustomizado[];
  notas?: string;
  metodoPago?: MetodoPago;
}

/**
 * Representación simplificada de un turno en la pantalla del llamador de salón
 */
export interface TurnoDisplay {
  id: string;
  numeroTurno: string;
  codigoCorto: string;
  clienteNombre: string;
  tipoServicio?: TipoServicioKiosco;
  mesaNumero?: string;
  estado: 'preparando' | 'listo';
  creadoEnMs: number;
  minutosEspera: number;
  esKiosco?: boolean;
}
