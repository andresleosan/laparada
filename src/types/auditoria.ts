import { Timestamp } from 'firebase/firestore';

/**
 * Categorías operativas y de seguridad auditadas en La Parada
 */
export type CategoriaEventoAuditoria =
  | 'anulacion_venta'
  | 'cortesia_descuento'
  | 'merma_inventario'
  | 'ajuste_inventario'
  | 'cancelacion_comanda'
  | 'descuadre_caja'
  | 'acceso_personal';

/**
 * Nivel de severidad forense del evento
 */
export type SeveridadAuditoria = 'critica' | 'alta' | 'media' | 'informativa';

/**
 * Origen técnico del registro en el Centro de Auditoría
 */
export type OrigenRegistroAuditoria = 'bitacora_inmutable' | 'correlacion_historica';

/**
 * Tipo de entidad operativa vinculada al evento
 */
export type EntidadAuditoriaTipo =
  | 'venta'
  | 'inventario'
  | 'comanda'
  | 'caja'
  | 'personal'
  | 'seguridad';

/**
 * Rango temporal para el filtro forense
 */
export type RangoFechaAuditoria = 'hoy' | '7dias' | '30dias' | 'todo';

/**
 * Documento y proyección unificada de un Evento de Auditoría
 */
export interface EventoAuditoria {
  id: string;
  negocioId: string;
  categoria: CategoriaEventoAuditoria;
  severidad: SeveridadAuditoria;
  titulo: string;
  descripcion: string;
  motivo?: string;
  montoImpacto: number; // En COP, entero >= 0
  responsableNombre: string;
  responsableRol?: string;
  entidadTipo: EntidadAuditoriaTipo;
  referenciaId: string;
  codigoVisible: string;
  detallesForenses?: Record<string, string | number | boolean>;
  fecha: Timestamp | Date;
  origenRegistro: OrigenRegistroAuditoria;
  huellaForense: string;
}

/**
 * Payload para registrar un nuevo evento inmutable en la colección `bitacora_auditoria`
 */
export interface RegistrarEventoAuditoriaInput {
  negocioId: string;
  categoria: CategoriaEventoAuditoria;
  severidad?: SeveridadAuditoria;
  titulo: string;
  descripcion: string;
  motivo?: string;
  montoImpacto?: number;
  responsableNombre?: string;
  responsableRol?: string;
  entidadTipo: EntidadAuditoriaTipo;
  referenciaId: string;
  detallesForenses?: Record<string, string | number | boolean>;
}

/**
 * Estado de los filtros forenses en `/auditoria`
 */
export interface FiltrosAuditoria {
  busqueda: string;
  categoria: CategoriaEventoAuditoria | 'todas';
  severidad: SeveridadAuditoria | 'todas';
  responsable: string;
  rangoFecha: RangoFechaAuditoria;
  soloImpactoFinanciero: boolean;
}

/**
 * Índice global de riesgo operativo calculado sobre el período filtrado
 */
export type NivelRiesgoOperativo = 'bajo' | 'moderado' | 'alto';

/**
 * Métricas consolidadas del Centro de Auditoría y Seguridad Operativa
 */
export interface MetricasAuditoria {
  totalEventos: number;
  eventosCriticosYAltos: number;
  impactoFinancieroTotal: number;
  totalAnulacionesCOP: number;
  cantidadAnulaciones: number;
  totalCortesiasYDescuentosCOP: number;
  cantidadCortesiasYDescuentos: number;
  totalMermasCOP: number;
  cantidadMermas: number;
  cantidadAjustesStock: number;
  cantidadCancelacionesComanda: number;
  totalDescuadresCajaCOP: number;
  cantidadDescuadresCaja: number;
  cantidadAccesosPersonal: number;
  nivelRiesgo: NivelRiesgoOperativo;
  porcentajeInmutable: number;
}
