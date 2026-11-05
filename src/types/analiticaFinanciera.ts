// src/types/analiticaFinanciera.ts

export type TipoPeriodoReporte =
  | 'hoy'
  | '7dias'
  | '30dias'
  | 'mes_actual'
  | 'mes_anterior'
  | 'personalizado';

export interface RangoFechaReporte {
  tipo: TipoPeriodoReporte;
  inicio: Date;
  fin: Date;
  etiqueta: string;
}

export interface InsumoConsumoCMV {
  insumoId: string;
  nombre: string;
  unidad: string;
  cantidadConsumida: number;
  costoUnitarioEstimado: number;
  costoTotalCOP: number;
  porcentajeCMV: number;
}

export interface DesgloseCanalesVenta {
  pos: number;
  domicilios: number;
  mesas: number;
  otros: number;
}

export interface DesgloseMetodosPagoVenta {
  efectivo: number;
  transferencia: number;
  otros: number;
}

export type SaludFinancieraPyg = 'excelente' | 'saludable' | 'atencion' | 'critica';

/**
 * Contrato del Estado de Resultados (P&L / Pérdidas y Ganancias) para gastronomía
 */
export interface EstadoResultadosPL {
  periodo: RangoFechaReporte;
  
  // 1. Ingresos
  ventasBrutas: number;
  descuentosConcedidos: number;
  ventasNetas: number; // ventasBrutas - descuentosConcedidos
  propinasRecaudadas: number; // Fondo voluntario no operacional
  ventasAnuladasMonto: number;
  cantidadVentasValidas: number;
  cantidadVentasAnuladas: number;
  ticketPromedio: number;
  canales: DesgloseCanalesVenta;
  metodosPago: DesgloseMetodosPagoVenta;

  // 2. Costo de Mercancía Vendida (CMV / Food Cost)
  cmvInsumos: number;
  porcentajeCMV: number; // (cmvInsumos / ventasNetas) * 100
  insumosClaveCMV: InsumoConsumoCMV[];

  // 3. Utilidad Bruta
  utilidadBruta: number; // ventasNetas - cmvInsumos
  margenBruto: number; // (utilidadBruta / ventasNetas) * 100

  // 4. Mermas y Desperdicios
  totalMermasCOP: number;
  porcentajeMermas: number; // (totalMermasCOP / ventasNetas) * 100
  cantidadMermas: number;
  mermasPorMotivo: Record<string, number>;

  // 5. Gastos Operativos (OPEX)
  totalGastosOperativos: number;
  porcentajeGastos: number; // (totalGastosOperativos / ventasNetas) * 100
  cantidadGastos: number;
  gastosPorCategoria: Record<string, number>;

  // 6. Utilidad Operativa / Neta
  utilidadNeta: number; // utilidadBruta - totalMermasCOP - totalGastosOperativos
  margenNeto: number; // (utilidadNeta / ventasNetas) * 100
  saludFinanciera: SaludFinancieraPyg;
  recomendacionOperativa: string;
}

