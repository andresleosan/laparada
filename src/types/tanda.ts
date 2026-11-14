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

export type SaludMermaVitrina = 'optima' | 'atencion' | 'critica';

/**
 * Métrica acumulada de desempeño, rotación y rentabilidad por producto en tandas de vitrina
 */
export interface MetricaProductoVitrina {
  productoId: string;
  nombre: string;
  categoria?: string;
  precioUnitarioPromedio: number;
  tandasParticipadas: number;
  totalInicial: number;
  totalAdiciones: number;
  totalPuesto: number;
  totalVendidos: number;
  totalMermas: number;
  totalSobrantes: number;
  ingresosBrutos: number;
  costoMermaEstimado: number;
  tasaRotacionPct: number;
  tasaMermaPct: number;
  tasaSobrantePct: number;
  participacionIngresosPct: number;
}

/**
 * Analítica consolidada de tandas históricas y rendimiento de vitrina
 */
export interface AnaliticaTandasConsolidada {
  cantidadTandasCerradas: number;
  cantidadTandasAbiertas: number;
  totalUnidadesPuestas: number;
  totalUnidadesVendidas: number;
  totalUnidadesMerma: number;
  totalUnidadesSobrantes: number;
  ingresosTotalesVitrina: number;
  totalTransferenciasVitrina: number;
  totalEfectivoVitrina: number;
  valorComercialMerma: number;
  ticketPromedioPorTanda: number;
  tasaRotacionGlobalPct: number;
  tasaMermaGlobalPct: number;
  tasaSobranteGlobalPct: number;
  saludMerma: SaludMermaVitrina;
  rankingProductos: MetricaProductoVitrina[];
  topProductosRentables: MetricaProductoVitrina[];
  productosMayorMerma: MetricaProductoVitrina[];
}
