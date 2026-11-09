import { Timestamp } from 'firebase/firestore';

export type TipoPeriodoContable =
  | 'mes_actual'
  | 'mes_anterior'
  | 'bimestre_actual'
  | 'bimestre_anterior'
  | 'hoy'
  | 'ano_actual'
  | 'personalizado';

export interface RangoFechaContable {
  tipo: TipoPeriodoContable;
  inicio: Date;
  fin: Date;
  etiqueta: string;
  ano: number;
  bimestre?: number; // 1 a 6
}

/**
 * Entrada diaria oficial para el Libro Fiscal de Operaciones Diarias
 * según Artículo 616 del Estatuto Tributario colombiano (E.T.)
 */
export interface EntradaLibroFiscalDiario {
  fecha: string;                   // ISO YYYY-MM-DD
  consecutivoInicial: string;      // ej: "POS-00101" o "N/A"
  consecutivoFinal: string;        // ej: "POS-00142" o "N/A"
  totalDocumentos: number;
  totalAnulados: number;
  ingresosGravadosInc8: number;    // Base gravable comidas y bebidas INC 8%
  impuestoInc8: number;            // Impuesto al Consumo liquidado (8%)
  ingresosGravadosIva19: number;   // Base gravable IVA 19% si aplica (licores u otros)
  impuestoIva19: number;           // IVA liquidado (19%)
  ingresosExcluidos: number;       // Ingresos por operaciones no gravadas o exentas
  totalVentasBrutas: number;       // Ventas brutas totales antes de descuentos
  totalDescuentos: number;         // Descuentos concedidos y devoluciones
  totalVentasNetas: number;        // totalVentasBrutas - totalDescuentos
  propinasRecaudadas: number;      // Propinas voluntarias (no constituyen ingreso del negocio)
  totalCobradoEfectivo: number;
  totalCobradoTransferencia: number;
  totalEgresosGastos: number;      // Compras de insumos y gastos operativos del día
  saldoNetoOperacional: number;    // totalVentasNetas - totalEgresosGastos
}

export interface ConsolidadoLibroFiscal {
  periodo: RangoFechaContable;
  entradas: EntradaLibroFiscalDiario[];
  totalDiasConOperacion: number;
  totalDocumentosEmitidos: number;
  totalDocumentosAnulados: number;
  acumuladoVentasBrutas: number;
  acumuladoDescuentos: number;
  acumuladoVentasNetas: number;
  acumuladoBaseInc8: number;
  acumuladoImpuestoInc8: number;
  acumuladoBaseIva19: number;
  acumuladoImpuestoIva19: number;
  acumuladoExcluidos: number;
  acumuladoPropinas: number;
  acumuladoEfectivo: number;
  acumuladoTransferencia: number;
  acumuladoEgresosGastos: number;
  acumuladoSaldoNeto: number;
}

/**
 * Renglón formal para la declaración tributaria (Formulario 310 DIAN)
 */
export interface RenglonFormulario310 {
  numeroRenglon: number;
  codigo: string;
  concepto: string;
  valor: number;
  esCalculado: boolean;
  explicacion: string;
}

/**
 * Consolidado oficial de la declaración bimestral del Impuesto Nacional al Consumo (Formulario 310)
 */
export interface LiquidacionFormulario310 {
  anoGravable: number;
  bimestre: number;                // 1 a 6
  bimestreNombre: string;          // ej: "Bimestre 1: Enero - Febrero"
  fechaInicio: string;             // YYYY-MM-DD
  fechaFin: string;                // YYYY-MM-DD
  ingresosBrutosRestaurantes8: number;
  descuentosYAnulaciones: number;
  ingresosNetosGravados8: number;
  tarifaImpuesto: number;          // 8
  impuestoGenerado8: number;
  ingresosExcluidosNoGravados: number;
  totalIngresosNetos: number;
  totalImpuestoACargo: number;
  anticiposRetenciones: number;
  saldoAPagar: number;
  propinasInformativas: number;
  totalOperacionesPos: number;
  renglones: RenglonFormulario310[];
}

/**
 * Elemento de conciliación diaria de ventas vs arqueo físico de caja
 */
export interface ItemConciliacionCajaVenta {
  fecha: string;                   // ISO YYYY-MM-DD
  totalVentasSistema: number;
  ventasEfectivoSistema: number;
  ventasTransferenciaSistema: number;
  totalEgresosCaja: number;
  efectivoEsperadoCaja: number;    // saldo esperado en caja
  efectivoRealArqueado: number;    // saldo físico reportado en cierre
  diferenciaEfectivo: number;      // efectivoRealArqueado - efectivoEsperadoCaja
  estado: 'cuadrado' | 'sobrante' | 'faltante' | 'sin_cierre';
  responsableCierre?: string;
  cierreCajaId?: string;
  notas?: string;
}

export interface ResumenConciliacionContable {
  periodo: RangoFechaContable;
  items: ItemConciliacionCajaVenta[];
  totalVentasSistema: number;
  totalCobradoEfectivo: number;
  totalCobradoTransferencia: number;
  totalEgresosPeriodo: number;
  totalArqueadoFisico: number;
  diferenciaTotalNeta: number;
  diasCuadrados: number;
  diasConDiferencia: number;
  diasSinCierre: number;
  saludConciliacion: 'optima' | 'alerta' | 'critica';
  porcentajeEfectivo: number;
  porcentajeTransferencia: number;
}

/**
 * Destinos de exportación a software contable colombiano
 */
export type SoftwareContableTarget =
  | 'siigo'
  | 'world_office'
  | 'helisa'
  | 'generico_puc';

/**
 * Mapeo de cuentas del Plan Único de Cuentas (PUC) comercial para gastronomía
 */
export interface MapeoPlanCuentasPUC {
  cuentaCaja: string;                   // ej: "110505" (Caja General)
  cuentaBancos: string;                 // ej: "111005" (Bancos / Medios Digitales)
  cuentaIngresosRestaurante: string;    // ej: "414005" (Hoteles y Restaurantes)
  cuentaImpoconsumoPorPagar: string;    // ej: "249501" (Impuesto Nacional al Consumo por pagar)
  cuentaIvaPorPagar: string;            // ej: "240801" (Impuesto a las ventas por pagar)
  cuentaDescuentosVentas: string;       // ej: "417505" (Devoluciones y Descuentos en Ventas)
  cuentaPropinasPorPagar: string;       // ej: "233525" (Propinas por Distribuir)
  cuentaCuentasPorCobrar: string;       // ej: "130505" (Clientes Nacionales)
  cuentaGastosInsumos: string;          // ej: "513505" (Gastos Insumos y Servicios)
  centroCostosDefault: string;          // ej: "001"
  nitClienteGenerico: string;           // ej: "222222222222" (Consumidor Final cuantías menores)
}

/**
 * Asiento contable individual listo para exportar a software contable
 */
export interface AsientoContableExportacion {
  fecha: string;                        // YYYY-MM-DD
  tipoDocumento: string;                // ej: "RC" (Recibo de Caja), "FV" (Factura de Venta), "CC" (Comprobante Contable)
  consecutivo: string;                  // ej: "POS-00120"
  nitTercero: string;                   // NIT del cliente o genérico
  nombreTercero: string;                // Nombre del cliente o "CLIENTES VARIOS"
  cuentaContable: string;               // Código PUC
  nombreCuenta: string;                 // Nombre descriptivo de la cuenta
  debito: number;                       // Valor débito
  credito: number;                      // Valor crédito
  baseGravable?: number;                // Base gravable si aplica
  centroCostos: string;                 // Centro de costos
  concepto: string;                     // Descripción detallada del movimiento
}

/**
 * Registro de conciliación contable cerrada para auditoría mensual
 */
export interface ConciliacionContableCerrada {
  id: string;
  negocioId: string;
  periodoMes: string;                   // YYYY-MM
  fechaCierre: Timestamp;
  responsable: string;
  totalVentas: number;
  totalVentasNetas: number;
  baseInc8: number;
  impuestoInc8: number;
  totalEgresos: number;
  totalEfectivo: number;
  totalTransferencia: number;
  diferenciaCaja: number;
  estado: 'aprobada' | 'observada';
  notas?: string;
  creadoEn: Timestamp;
}
