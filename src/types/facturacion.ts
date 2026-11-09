import { Timestamp } from 'firebase/firestore';

export type RegimenFiscal =
  | 'no_responsable'    // No responsable de IVA ni INC (antiguo simplificado)
  | 'responsable_inc'   // Responsable de Impuesto Nacional al Consumo (8% gastronomía)
  | 'responsable_iva'   // Responsable de IVA (19% régimen común)
  | 'regimen_simple';   // Régimen Simple de Tributación (RST)

export type TipoImpuestoFiscal = 'inc' | 'iva' | 'ninguno';

export interface TarifaImpuesto {
  tipo: TipoImpuestoFiscal;
  porcentaje: number;   // 8, 19, 0
  nombre: string;       // ej: "Impoconsumo (INC 8%)", "IVA (19%)", "Exento / No sujeto"
}

export interface ResolucionDian {
  numeroResolucion: string;      // ej: "18764012345678"
  fechaExpedicion: string;       // ISO YYYY-MM-DD
  fechaVencimiento: string;      // ISO YYYY-MM-DD
  prefijo: string;               // ej: "POS"
  rangoInicial: number;          // ej: 1
  rangoFinal: number;            // ej: 10000
  consecutivoActual: number;     // Siguiente número a emitir (ej: 1)
  vigenciaMeses?: number;        // ej: 12, 18, 24
  claveTecnica?: string;         // Clave técnica DIAN si aplica
}

export interface AlertasResolucionConfig {
  diasAnticipacionVencimiento: number;  // por defecto 30 días
  consecutivosMinimosRestantes: number; // por defecto 100 folios
}

export interface ConfiguracionFiscal {
  id?: string;
  negocioId: string;
  habilitado: boolean;                 // true si emite Documento Equivalente POS con numeración DIAN
  razonSocial: string;                // ej: "COMERCIALIZADORA GASTRONÓMICA LA PARADA S.A.S."
  nombreComercial: string;            // ej: "LA PARADA"
  nit: string;                        // ej: "901.458.789"
  dv: string;                         // Dígito de verificación, ej: "4"
  tipoDocumentoIdentidad: 'NIT' | 'CC' | 'CE';
  regimenFiscal: RegimenFiscal;
  responsabilidad: string;            // ej: "Responsable de Impuesto Nacional al Consumo (INC 8%)"
  direccionFiscal: string;            // ej: "Av. 0 # 10-20, Cúcuta"
  municipio: string;                  // ej: "Cúcuta"
  departamento: string;               // ej: "Norte de Santander"
  telefonoContacto: string;           // ej: "310 123 4567"
  correoFiscal?: string;              // ej: "facturacion@laparada.com"
  leyendaFiscal?: string;             // Leyenda obligatoria al pie del ticket
  tarifaDefault: TarifaImpuesto;
  preciosIncluyenImpuesto: boolean;   // Por defecto true en restaurantes
  resolucion: ResolucionDian;
  alertas: AlertasResolucionConfig;
  creadoEn?: Timestamp;
  actualizadoEn?: Timestamp;
}

export interface DesgloseImpuestoCalculado {
  baseGravable: number;
  valorImpuesto: number;
  tarifa: number;
  tipo: TipoImpuestoFiscal;
  totalBruto: number;
}

export type EstadoSemaforoResolucion =
  | 'optimo'
  | 'proximo_a_vencer'
  | 'agotando_folios'
  | 'vencida'
  | 'agotada';

export interface EvaluacionResolucionDian {
  estado: EstadoSemaforoResolucion;
  diasRestantes: number;
  foliosRestantes: number;
  porcentajeFoliosUsados: number;
  color: 'verde' | 'amarillo' | 'rojo';
  mensaje: string;
  requiereAtencion: boolean;
}

export interface ComprobanteZ {
  id: string;
  negocioId: string;
  numeroZ: string;                     // ej: "Z-2026-11-08-001"
  fechaCorte: string;                  // ISO YYYY-MM-DD
  horaGeneracion: string;              // HH:mm
  generadoPor: string;                 // Nombre o correo del responsable
  resolucionNumero: string;
  prefijo: string;
  rangoInicial: number;
  rangoFinal: number;
  consecutivoInicialTexto: string;     // ej: "POS-00150"
  consecutivoFinalTexto: string;       // ej: "POS-00182"
  totalDocumentosEmitidos: number;
  totalDocumentosAnulados: number;
  totalVentasBrutas: number;
  totalDescuentos: number;
  totalVentasNetas: number;
  baseGravableInc8: number;
  impuestoInc8: number;
  baseGravableIva19: number;
  impuestoIva19: number;
  baseExenta: number;
  totalImpuestos: number;
  totalPropinas: number;
  totalCobrado: number;
  totalEfectivo: number;
  totalTransferencia: number;
  creadoEn?: Timestamp;
  notas?: string;
}

export interface DatosFiscalesTicket {
  razonSocial: string;
  nombreComercial?: string;
  nit: string;
  dv?: string;
  regimen: string;
  responsabilidad: string;
  direccionFiscal?: string;
  municipio?: string;
  departamento?: string;
  telefono?: string;
  consecutivoFiscal: string;
  numeroResolucion: string;
  prefijo: string;
  rangoTexto: string;
  vigenciaTexto: string;
  baseGravable?: number;
  impuesto?: number;
  tarifa?: number;
  tipoImpuesto?: TipoImpuestoFiscal;
  leyenda?: string;
}
