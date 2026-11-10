import { Timestamp } from 'firebase/firestore';

/**
 * Adición o recarga de unidades a la tanda (ej: nueva hornada/fritura)
 */
export interface AdicionTanda {
  id: string;
  cantidad: number;
  hora: Timestamp;
  nota?: string;
}

/**
 * Merma o baja de producto en la tanda (ej: quemada, caída, cortesía, prueba de calidad)
 */
export interface MermaTanda {
  id: string;
  cantidad: number;
  hora: Timestamp;
  motivo?: string;
}

/**
 * Producto individual dentro de una tanda de vitrina
 */
export interface ItemTanda {
  productoId: string;
  nombre: string;
  precioUnitario: number; // En COP
  categoria?: string;
  imagenUrl?: string;
  cantidadInicial: number;
  adiciones: AdicionTanda[];
  mermas: MermaTanda[];
  sobrantes?: number;       // Unidades sobrantes contadas al cierre
  vendidos?: number;        // cantidadInicial + sum(adiciones) - sum(mermas) - sobrantes
  subtotal?: number;        // vendidos * precioUnitario
}

/**
 * Método de pago por transferencia bancaria
 */
export type MetodoTransferenciaTanda = 'nequi' | 'daviplata' | 'bancolombia' | 'dps' | 'otro';

/**
 * Registro ágil de transferencia recibida durante el turno de la tanda
 */
export interface TransferenciaTanda {
  id: string;
  monto: number;           // En COP
  metodo: MetodoTransferenciaTanda;
  referencia?: string;     // Comprobante o número de aprobación
  hora: Timestamp;
  fotoUrl?: string;        // Foto opcional del comprobante
  nota?: string;
}

export type EstadoTanda = 'abierta' | 'cerrada';

/**
 * Resumen consolidado del cierre de la tanda
 */
export interface ResumenTanda {
  totalInicial: number;
  totalAdiciones: number;
  totalMermas: number;
  totalSobrantes: number;
  totalVendidos: number;
  totalVentaEstimada: number;      // Total en COP de productos vendidos
  totalTransferencias: number;     // Total en COP recibidas por transferencia
  totalEfectivoEsperado: number;   // totalVentaEstimada - totalTransferencias
}

/**
 * Documento principal de una Tanda de Vitrina en Firestore
 */
export interface TandaVitrina {
  id: string;
  negocioId: string;
  cajaId?: string;                 // ID de la caja del día con la que se concilia
  fecha: Timestamp;
  fechaCierre?: Timestamp;
  estado: EstadoTanda;
  responsable?: string;            // Nombre del cajero o encargado de vitrina
  items: ItemTanda[];
  transferencias: TransferenciaTanda[];
  resumen?: ResumenTanda;
  notasCierre?: string;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}
