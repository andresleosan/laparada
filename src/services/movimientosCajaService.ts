import {
  addDoc,
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { requireTenantId } from '@/security/tenantScope';
import type {
  CorteXParcial,
  MovimientoCaja,
  RegistrarCorteXInput,
  RegistrarMovimientoCajaInput,
} from '@/types';
import {
  CATALOGO_TIPOS_MOVIMIENTO_CAJA,
  generarCodigoComprobanteCaja,
  generarCodigoCorteX,
  sanitizarMontoMovimientoCaja,
} from '@/utils/movimientosCajaUtils';
import { registrarEventoAuditoriaSilencioso } from '@/services/auditoriaService';
import { crearAlertaSilenciosa } from '@/services/notificacionesService';
import { formatCOP } from '@/utils/formatCOP';

const COL_MOVIMIENTOS_CAJA = 'movimientos_caja';
const COL_CORTES_X = 'cortes_x';

function rangoHoy(): { inicio: Date; fin: Date } {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date();
  fin.setHours(23, 59, 59, 999);
  return { inicio, fin };
}

function mapMovimientoDoc(id: string, data: Record<string, unknown>): MovimientoCaja {
  return {
    ...(data as Omit<MovimientoCaja, 'id'>),
    id,
  };
}

function mapCorteXDoc(id: string, data: Record<string, unknown>): CorteXParcial {
  return {
    ...(data as Omit<CorteXParcial, 'id'>),
    id,
  };
}

/**
 * Consulta los movimientos de caja del día actual acotados por `negocioId`
 */
export async function getMovimientosCajaHoy(negocioId: string): Promise<MovimientoCaja[]> {
  const tenantId = requireTenantId(negocioId);
  const { inicio, fin } = rangoHoy();

  const q = query(
    collection(db, COL_MOVIMIENTOS_CAJA),
    where('negocioId', '==', tenantId),
    where('fecha', '>=', Timestamp.fromDate(inicio)),
    where('fecha', '<=', Timestamp.fromDate(fin)),
    orderBy('fecha', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapMovimientoDoc(d.id, d.data() as Record<string, unknown>));
}

/**
 * Consulta movimientos de caja recientes del negocio
 */
export async function getMovimientosCajaRecientes(
  negocioId: string,
  maxRegistros = 100
): Promise<MovimientoCaja[]> {
  const tenantId = requireTenantId(negocioId);
  const q = query(
    collection(db, COL_MOVIMIENTOS_CAJA),
    where('negocioId', '==', tenantId),
    orderBy('fecha', 'desc'),
    limit(maxRegistros)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapMovimientoDoc(d.id, d.data() as Record<string, unknown>));
}

/**
 * Suscripción en tiempo real a los movimientos de caja del día
 */
export function suscribirMovimientosCajaHoy(
  negocioId: string,
  onData: (movimientos: MovimientoCaja[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const tenantId = requireTenantId(negocioId);
  const { inicio, fin } = rangoHoy();

  const q = query(
    collection(db, COL_MOVIMIENTOS_CAJA),
    where('negocioId', '==', tenantId),
    where('fecha', '>=', Timestamp.fromDate(inicio)),
    where('fecha', '<=', Timestamp.fromDate(fin)),
    orderBy('fecha', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((d) => mapMovimientoDoc(d.id, d.data() as Record<string, unknown>)));
    },
    (error) => {
      console.error('Error escuchando movimientos_caja:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Registra un movimiento inmutable de caja en turno (sangría, caja menor o ingreso de sencillo)
 */
export async function registrarMovimientoCaja(
  input: RegistrarMovimientoCajaInput,
  existentes: Pick<MovimientoCaja, 'codigoComprobante' | 'tipo'>[] = []
): Promise<MovimientoCaja> {
  const tenantId = requireTenantId(input.negocioId);
  const monto = sanitizarMontoMovimientoCaja(input.monto);
  if (monto <= 0) {
    throw new Error('El monto del movimiento debe ser mayor a $0');
  }

  const motivo = (input.motivo || '').trim();
  if (motivo.length < 2) {
    throw new Error('Debes indicar un motivo claro para el movimiento de caja');
  }

  const responsableNombre = (input.responsableNombre || 'Cajero de Turno').trim();
  const codigoComprobante = generarCodigoComprobanteCaja(input.tipo, existentes);
  const fecha = Timestamp.now();

  const payload: Omit<MovimientoCaja, 'id'> = {
    negocioId: tenantId,
    ...(input.cajaId ? { cajaId: input.cajaId } : {}),
    tipo: input.tipo,
    monto,
    motivo,
    ...(input.referencia?.trim() ? { referencia: input.referencia.trim() } : {}),
    responsableNombre,
    ...(input.responsableRol?.trim() ? { responsableRol: input.responsableRol.trim() } : {}),
    ...(input.autorizadoPor?.trim() ? { autorizadoPor: input.autorizadoPor.trim() } : {}),
    codigoComprobante,
    ...(input.notas?.trim() ? { notas: input.notas.trim() } : {}),
    fecha,
  };

  const docRef = await addDoc(collection(db, COL_MOVIMIENTOS_CAJA), payload);
  const infoTipo = CATALOGO_TIPOS_MOVIMIENTO_CAJA[input.tipo];

  registrarEventoAuditoriaSilencioso({
    negocioId: tenantId,
    categoria: 'movimiento_caja',
    titulo: `${infoTipo.label} (${codigoComprobante})`,
    descripcion: `${infoTipo.signo > 0 ? '+' : '-'}${formatCOP(monto)} · ${motivo}`,
    motivo,
    montoImpacto: input.tipo === 'ingreso_sencillo' ? 0 : monto,
    responsableNombre,
    responsableRol: input.responsableRol || 'cajero',
    entidadTipo: 'caja',
    referenciaId: docRef.id,
    detallesForenses: {
      codigoComprobante,
      tipoMovimiento: input.tipo,
      montoCOP: monto,
      autorizadoPor: input.autorizadoPor?.trim() || responsableNombre,
      referencia: input.referencia?.trim() || 'N/A',
    },
  });

  if (
    (input.tipo === 'sangria_caja_fuerte' && monto >= 100000) ||
    (input.tipo === 'egreso_caja_menor' && monto >= 50000)
  ) {
    crearAlertaSilenciosa(tenantId, {
      modulo: 'caja',
      tipo: input.tipo,
      titulo: `${infoTipo.shortLabel} ${codigoComprobante}: ${formatCOP(monto)}`,
      mensaje: `${responsableNombre} registró: ${motivo}`,
      urgencia: monto >= 300000 ? 'alta' : 'media',
      enlace: '/caja',
      origen: 'automatico',
      creadaPor: responsableNombre,
    });
  }

  return {
    ...payload,
    id: docRef.id,
  };
}

/**
 * Consulta los Cortes X del día actual acotados por `negocioId`
 */
export async function getCortesXHoy(negocioId: string): Promise<CorteXParcial[]> {
  const tenantId = requireTenantId(negocioId);
  const { inicio, fin } = rangoHoy();

  const q = query(
    collection(db, COL_CORTES_X),
    where('negocioId', '==', tenantId),
    where('fecha', '>=', Timestamp.fromDate(inicio)),
    where('fecha', '<=', Timestamp.fromDate(fin)),
    orderBy('fecha', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapCorteXDoc(d.id, d.data() as Record<string, unknown>));
}

/**
 * Suscripción en tiempo real a los Cortes X del día
 */
export function suscribirCortesXHoy(
  negocioId: string,
  onData: (cortes: CorteXParcial[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const tenantId = requireTenantId(negocioId);
  const { inicio, fin } = rangoHoy();

  const q = query(
    collection(db, COL_CORTES_X),
    where('negocioId', '==', tenantId),
    where('fecha', '>=', Timestamp.fromDate(inicio)),
    where('fecha', '<=', Timestamp.fromDate(fin)),
    orderBy('fecha', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((d) => mapCorteXDoc(d.id, d.data() as Record<string, unknown>)));
    },
    (error) => {
      console.error('Error escuchando cortes_x:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Registra un Corte X (arqueo parcial de relevo) inmutable
 */
export async function registrarCorteX(
  input: RegistrarCorteXInput,
  existentes: Pick<CorteXParcial, 'codigoCorte'>[] = []
): Promise<CorteXParcial> {
  const tenantId = requireTenantId(input.negocioId);
  const cajeroSaliente = (input.cajeroSaliente || '').trim();
  if (cajeroSaliente.length < 2) {
    throw new Error('Debes indicar el nombre del cajero saliente para el Corte X');
  }

  const codigoCorte = generarCodigoCorteX(existentes);
  const fecha = Timestamp.now();

  const payload: Omit<CorteXParcial, 'id'> = {
    negocioId: tenantId,
    ...(input.cajaId ? { cajaId: input.cajaId } : {}),
    codigoCorte,
    cajeroSaliente,
    ...(input.cajeroEntrante?.trim() ? { cajeroEntrante: input.cajeroEntrante.trim() } : {}),
    efectivoInicial: Math.max(0, Math.round(input.efectivoInicial || 0)),
    ventasEfectivo: Math.max(0, Math.round(input.ventasEfectivo || 0)),
    ventasTransferencia: Math.max(0, Math.round(input.ventasTransferencia || 0)),
    ingresosSencillo: Math.max(0, Math.round(input.ingresosSencillo || 0)),
    sangriasCajaFuerte: Math.max(0, Math.round(input.sangriasCajaFuerte || 0)),
    egresosCajaMenor: Math.max(0, Math.round(input.egresosCajaMenor || 0)),
    gastosOperativos: Math.max(0, Math.round(input.gastosOperativos || 0)),
    efectivoEsperado: Math.max(0, Math.round(input.efectivoEsperado || 0)),
    arqueo: input.arqueo,
    ...(input.notas?.trim() ? { notas: input.notas.trim() } : {}),
    fecha,
  };

  const docRef = await addDoc(collection(db, COL_CORTES_X), payload);
  const diferencia = input.arqueo.diferencia;

  registrarEventoAuditoriaSilencioso({
    negocioId: tenantId,
    categoria: diferencia !== 0 ? 'descuadre_caja' : 'movimiento_caja',
    titulo: `Corte X de Relevo ${codigoCorte} (${
      diferencia === 0
        ? 'Cuadre Exacto'
        : diferencia > 0
          ? `Sobrante +${formatCOP(diferencia)}`
          : `Faltante -${formatCOP(Math.abs(diferencia))}`
    })`,
    descripcion: `Relevo de ${cajeroSaliente}${
      input.cajeroEntrante ? ` ➔ ${input.cajeroEntrante.trim()}` : ''
    }. Físico: ${formatCOP(input.arqueo.totalFisico)} vs Esperado: ${formatCOP(payload.efectivoEsperado)}.`,
    motivo: (input.notas || 'Corte X parcial de relevo').trim(),
    montoImpacto: diferencia < 0 ? Math.abs(Math.round(diferencia)) : 0,
    responsableNombre: cajeroSaliente,
    responsableRol: 'cajero',
    entidadTipo: 'caja',
    referenciaId: docRef.id,
    detallesForenses: {
      codigoCorte,
      cajeroEntrante: input.cajeroEntrante?.trim() || 'N/A',
      efectivoEsperado: payload.efectivoEsperado,
      efectivoFisico: input.arqueo.totalFisico,
      diferenciaCOP: diferencia,
    },
  });

  if (diferencia !== 0) {
    crearAlertaSilenciosa(tenantId, {
      modulo: 'caja',
      tipo: 'corte_x_descuadre',
      titulo: `Descuadre en Corte X ${codigoCorte}: ${
        diferencia > 0 ? `+${formatCOP(diferencia)}` : `-${formatCOP(Math.abs(diferencia))}`
      }`,
      mensaje: `Relevo de ${cajeroSaliente}. Revisa el arqueo parcial en /caja.`,
      urgencia: Math.abs(diferencia) >= 20000 ? 'critica' : 'alta',
      enlace: '/caja',
      origen: 'automatico',
      creadaPor: cajeroSaliente,
    });
  }

  return {
    ...payload,
    id: docRef.id,
  };
}
