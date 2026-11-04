import type { Timestamp } from 'firebase/firestore';
import type { ItemVenta, OrigenVenta } from './index';

/**
 * Representa el resumen del pedido recurrente o habitual de un cliente
 */
export interface LoDeSiempreCliente {
  items: ItemVenta[];
  total: number;
  origen?: OrigenVenta;
  actualizadoEn: Timestamp | Date;
}

/**
 * Entidad de Cliente en el directorio multi-tenant de La Parada
 */
export interface Cliente {
  id: string;
  negocioId: string;
  nombre: string;
  telefono: string;
  email?: string;
  direcciones: string[];
  barrio?: string;
  totalPedidos: number;
  totalConsumido: number;
  primerPedidoEn: Timestamp | Date;
  ultimoPedidoEn: Timestamp | Date;
  loDeSiempre?: LoDeSiempreCliente;
  origenRegistro: OrigenVenta;
  notas?: string;
  creadoEn: Timestamp | Date;
  actualizadoEn: Timestamp | Date;
}

/**
 * Datos requeridos para crear manualmente un cliente en el directorio
 */
export interface NuevoClienteInput {
  nombre: string;
  telefono: string;
  email?: string;
  direccion?: string;
  barrio?: string;
  notas?: string;
  origenRegistro?: OrigenVenta;
}

/**
 * Parámetros para registrar o actualizar automáticamente un cliente tras una compra
 */
export interface RegistrarCompraClienteParams {
  nombre?: string;
  telefono: string;
  direccion?: string;
  barrio?: string;
  monto: number;
  items?: ItemVenta[];
  origen: OrigenVenta;
  fecha?: Date;
}

