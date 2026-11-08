import { Timestamp } from 'firebase/firestore';

/**
 * Configuración operativa de incentivos, comisiones y metas para un mesero
 */
export interface ConfiguracionMesero {
  id: string;
  negocioId: string;
  empleadoId: string;
  nombre: string;
  porcentajeComision: number;     // % sobre ventas netas (ej: 0, 2, 3, 5)
  porcentajePropina: number;      // % de propina directa (ej: 100% directa o 70% si 30% va a pool)
  metaVentaTurno?: number;        // En COP, meta diaria o de turno (ej: $ 300.000 COP)
  activo: boolean;
  actualizadoEn?: Timestamp;
}

/**
 * Resumen de desempeño operativo de un mesero en un período determinado
 */
export interface DesempenoMesero {
  meseroId: string;
  meseroNombre: string;
  telefono?: string;
  documento?: string;
  activo: boolean;
  totalVentas: number;            // En COP, suma de ventas de salón asignadas
  cantidadVentas: number;         // Número de tickets o comandas cobradas
  ticketPromedio: number;         // En COP, totalVentas / cantidadVentas
  totalPropinas: number;          // En COP, propinas voluntarias recaudadas
  propinaDirecta: number;         // En COP, porción directa para el mesero
  propinaPool: number;            // En COP, porción para fondo común de cocina/equipo
  porcentajeComision: number;     // % aplicado para comisiones
  comisionVentas: number;         // En COP, comisión devengada
  totalIncentivos: number;        // En COP, propinaDirecta + comisionVentas
  mesasActivasCount: number;      // Número de mesas que está atendiendo ahora mismo
  mesasActivasNombres: string[];  // Nombres de las mesas activas
  metaVentaTurno?: number;        // En COP
  porcentajeMeta: number;         // 0 a 100+ %
  ranking: number;                // 1 para el líder en ventas, 2, 3...
  esEstrella: boolean;            // True si es el #1 en ventas con ventas > 0
}

/**
 * Indicadores consolidados de todo el salón y equipo de meseros
 */
export interface ResumenSalonMeseros {
  totalVentasSalon: number;       // En COP, ventas de salón con mesero asignado
  totalPropinasSalon: number;     // En COP, propinas recaudadas en salón
  ticketPromedioSalon: number;    // En COP
  totalComisionesSalon: number;   // En COP
  mesasOcupadasEnSalon: number;
  meseroEstrella: DesempenoMesero | null;
  rankingMeseros: DesempenoMesero[];
}

/**
 * Registro de liquidación de incentivos, comisiones o propinas pagadas al mesero
 */
export interface LiquidacionMesero {
  id: string;
  negocioId: string;
  meseroId: string;
  meseroNombre: string;
  periodoDesde: string;           // YYYY-MM-DD
  periodoHasta: string;           // YYYY-MM-DD
  totalVentas: number;            // En COP
  totalPropinas: number;          // En COP
  totalComisiones: number;        // En COP
  totalLiquidado: number;         // En COP
  metodoPago: 'efectivo' | 'transferencia';
  referenciaPago?: string;
  liquidadoPor?: string;
  gastoId?: string;               // ID en colección 'gastos' si se registró salida contable
  notas?: string;
  fecha: Timestamp;
  creadoEn: Timestamp;
}

/**
 * Entrada para registrar una nueva liquidación de mesero
 */
export interface CrearLiquidacionMeseroInput {
  meseroId: string;
  meseroNombre: string;
  periodoDesde: string;
  periodoHasta: string;
  totalVentas: number;
  totalPropinas: number;
  totalComisiones: number;
  totalLiquidado: number;
  metodoPago: 'efectivo' | 'transferencia';
  referenciaPago?: string;
  liquidadoPor?: string;
  notas?: string;
  registrarGastoCaja?: boolean;
}
