import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { requireTenantId } from '@/security/tenantScope';
import type {
  CerrarLiquidacionDomiciliarioInput,
  EntregarBaseRutaInput,
  LiquidacionDomiciliario,
} from '@/types';
import {
  calcularDiferenciaRendicion,
  calcularLiquidacionConBase,
  generarCodigoActaLiquidacion,
  obtenerIdsDomiciliosYaLiquidados,
  sanitizarMontoRuta,
} from '@/utils/liquidacionDomiciliariosUtils';
import { registrarEventoAuditoriaSilencioso } from '@/services/auditoriaService';
import { crearAlertaSilenciosa } from '@/services/notificacionesService';
import { formatCOP } from '@/utils/formatCOP';

const COL_LIQUIDACIONES_DOMICILIARIOS = 'liquidaciones_domiciliarios';

function rangoHoy(): { inicio: Date; fin: Date } {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const fin = new Date();
  fin.setHours(23, 59, 59, 999);
  return { inicio, fin };
}

function mapLiquidacionDoc(
  id: string,
  data: Record<string, unknown>
): LiquidacionDomiciliario {
  return {
    ...(data as Omit<LiquidacionDomiciliario, 'id'>),
    id,
  };
}

/**
 * Consulta todas las bases de ruta y actas de liquidación de domiciliarios del día
 */
export async function getLiquidacionesDomiciliariosHoy(
  negocioId: string
): Promise<LiquidacionDomiciliario[]> {
  const tenantId = requireTenantId(negocioId);
  const { inicio, fin } = rangoHoy();

  const q = query(
    collection(db, COL_LIQUIDACIONES_DOMICILIARIOS),
    where('negocioId', '==', tenantId),
    where('fechaEntregaBase', '>=', Timestamp.fromDate(inicio)),
    where('fechaEntregaBase', '<=', Timestamp.fromDate(fin)),
    orderBy('fechaEntregaBase', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) =>
    mapLiquidacionDoc(d.id, d.data() as Record<string, unknown>)
  );
}

/**
 * Suscripción en tiempo real a las bases y liquidaciones de domiciliarios del día
 */
export function suscribirLiquidacionesDomiciliariosHoy(
  negocioId: string,
  onData: (lista: LiquidacionDomiciliario[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const tenantId = requireTenantId(negocioId);
  const { inicio, fin } = rangoHoy();

  const q = query(
    collection(db, COL_LIQUIDACIONES_DOMICILIARIOS),
    where('negocioId', '==', tenantId),
    where('fechaEntregaBase', '>=', Timestamp.fromDate(inicio)),
    where('fechaEntregaBase', '<=', Timestamp.fromDate(fin)),
    orderBy('fechaEntregaBase', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onData(
        snapshot.docs.map((d) =>
          mapLiquidacionDoc(d.id, d.data() as Record<string, unknown>)
        )
      );
    },
    (error) => {
      console.error('Error escuchando liquidaciones_domiciliarios:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * Entrega una base de sencillo inicial en ruta a un domiciliario
 */
export async function entregarBaseRuta(
  input: EntregarBaseRutaInput
): Promise<LiquidacionDomiciliario> {
  const tenantId = requireTenantId(input.negocioId);
  const montoBase = sanitizarMontoRuta(input.montoBaseInicial);
  if (montoBase <= 0) {
    throw new Error('El monto de base de sencillo debe ser mayor a $0');
  }

  const domiciliarioId = (input.domiciliarioId || '').trim();
  const domiciliarioNombre = (input.domiciliarioNombre || '').trim();
  if (!domiciliarioId || domiciliarioNombre.length < 2) {
    throw new Error('Selecciona o ingresa un repartidor válido');
  }

  const entregadoPor = (input.entregadoPor || '').trim() || 'Cajero';
  const hoyExistentes = await getLiquidacionesDomiciliariosHoy(tenantId);

  const yaTieneBaseActiva = hoyExistentes.some(
    (item) => item.estado === 'activa' && item.domiciliarioId === domiciliarioId
  );
  if (yaTieneBaseActiva) {
    throw new Error(
      `${domiciliarioNombre} ya tiene una base de sencillo activa sin liquidar`
    );
  }

  const codigoActa = generarCodigoActaLiquidacion(hoyExistentes);
  const fechaEntregaBase = Timestamp.now();

  const payload: Omit<LiquidacionDomiciliario, 'id'> = {
    negocioId: tenantId,
    codigoActa,
    domiciliarioId,
    domiciliarioNombre,
    estado: 'activa',
    montoBaseInicial: montoBase,
    entregadoPor,
    ...(input.observacionesBase?.trim()
      ? { observacionesBase: input.observacionesBase.trim() }
      : {}),
    fechaEntregaBase,
    totalEntregas: 0,
    domicilioIds: [],
    totalEfectivoCobrado: 0,
    totalTransferencias: 0,
    efectivoEsperadoRendir: montoBase,
    efectivoEntregadoFisico: 0,
    diferencia: 0,
    conciliadoConCaja: false,
  };

  const docRef = await addDoc(collection(db, COL_LIQUIDACIONES_DOMICILIARIOS), payload);

  void registrarEventoAuditoriaSilencioso({
    negocioId: tenantId,
    categoria: 'movimiento_caja',
    severidad: 'informativa',
    titulo: `Base de sencillo en ruta · ${codigoActa}`,
    descripcion: `Entrega de ${formatCOP(montoBase)} en sencillo a ${domiciliarioNombre}`,
    motivo: input.observacionesBase?.trim() || 'Base inicial para vueltas en ruta',
    montoImpacto: montoBase,
    responsableNombre: entregadoPor,
    entidadTipo: 'caja',
    referenciaId: docRef.id,
    detallesForenses: {
      codigoActa,
      domiciliarioId,
      domiciliarioNombre,
      montoBaseInicial: montoBase,
    },
  });

  return {
    ...payload,
    id: docRef.id,
  };
}

/**
 * Liquida formalmente la ruta de un repartidor y concilia con la caja en turno
 */
export async function cerrarLiquidacionDomiciliario(
  input: CerrarLiquidacionDomiciliarioInput
): Promise<LiquidacionDomiciliario> {
  const tenantId = requireTenantId(input.negocioId);
  const domiciliarioId = (input.domiciliarioId || '').trim();
  const domiciliarioNombre = (input.domiciliarioNombre || '').trim();
  if (!domiciliarioId || domiciliarioNombre.length < 2) {
    throw new Error('El repartidor es obligatorio para cerrar la liquidación');
  }

  const cajeroReceptor = (input.cajeroReceptor || '').trim() || 'Cajero';
  const hoyExistentes = await getLiquidacionesDomiciliariosHoy(tenantId);
  const idsYaLiquidados = obtenerIdsDomiciliosYaLiquidados(hoyExistentes);

  let baseExistente: LiquidacionDomiciliario | null = null;
  if (input.liquidacionId) {
    const ref = doc(db, COL_LIQUIDACIONES_DOMICILIARIOS, input.liquidacionId);
    const snap = await getDoc(ref);
    if (!snap.exists() || snap.data().negocioId !== tenantId) {
      throw new Error('La base de ruta no pertenece al negocio activo');
    }
    baseExistente = mapLiquidacionDoc(snap.id, snap.data() as Record<string, unknown>);
    if (baseExistente.estado !== 'activa') {
      throw new Error('Esta base de ruta ya fue liquidada o anulada');
    }
  }

  const montoBaseInicial = baseExistente ? baseExistente.montoBaseInicial : 0;
  const calculo = calcularLiquidacionConBase(input.domiciliosEntregados, {
    domiciliarioId,
    montoBaseInicial,
    idsYaLiquidados,
  });

  const efectivoEntregadoFisico = sanitizarMontoRuta(input.efectivoEntregadoFisico);
  const { diferencia } = calcularDiferenciaRendicion(
    calculo.efectivoEsperadoRendir,
    efectivoEntregadoFisico
  );

  const fechaLiquidacion = Timestamp.now();
  const notas = input.notasLiquidacion?.trim();

  if (baseExistente) {
    const updates = {
      estado: 'liquidada' as const,
      totalEntregas: calculo.totalEntregas,
      domicilioIds: calculo.domicilioIds,
      totalEfectivoCobrado: calculo.totalEfectivo,
      totalTransferencias: calculo.totalTransferencia,
      efectivoEsperadoRendir: calculo.efectivoEsperadoRendir,
      efectivoEntregadoFisico,
      diferencia,
      conciliadoConCaja: true,
      cajeroReceptor,
      fechaLiquidacion,
      ...(notas ? { notasLiquidacion: notas } : {}),
    };

    await updateDoc(doc(db, COL_LIQUIDACIONES_DOMICILIARIOS, baseExistente.id), updates);

    const actaFinal: LiquidacionDomiciliario = {
      ...baseExistente,
      ...updates,
    };

    registrarAuditoriaYAlertasLiquidacion(tenantId, actaFinal, cajeroReceptor);
    return actaFinal;
  }

  // Liquidación directa sin base inicial previa ($0 de base)
  const codigoActa = generarCodigoActaLiquidacion(hoyExistentes);
  const payload: Omit<LiquidacionDomiciliario, 'id'> = {
    negocioId: tenantId,
    codigoActa,
    domiciliarioId,
    domiciliarioNombre,
    estado: 'liquidada',
    montoBaseInicial: 0,
    entregadoPor: cajeroReceptor,
    fechaEntregaBase: fechaLiquidacion,
    totalEntregas: calculo.totalEntregas,
    domicilioIds: calculo.domicilioIds,
    totalEfectivoCobrado: calculo.totalEfectivo,
    totalTransferencias: calculo.totalTransferencia,
    efectivoEsperadoRendir: calculo.efectivoEsperadoRendir,
    efectivoEntregadoFisico,
    diferencia,
    conciliadoConCaja: true,
    cajeroReceptor,
    fechaLiquidacion,
    ...(notas ? { notasLiquidacion: notas } : {}),
  };

  const docRef = await addDoc(collection(db, COL_LIQUIDACIONES_DOMICILIARIOS), payload);
  const actaFinal: LiquidacionDomiciliario = {
    ...payload,
    id: docRef.id,
  };

  registrarAuditoriaYAlertasLiquidacion(tenantId, actaFinal, cajeroReceptor);
  return actaFinal;
}

function registrarAuditoriaYAlertasLiquidacion(
  negocioId: string,
  acta: LiquidacionDomiciliario,
  cajeroReceptor: string
): void {
  const hayDescuadre = acta.diferencia !== 0;

  void registrarEventoAuditoriaSilencioso({
    negocioId,
    categoria: hayDescuadre ? 'descuadre_caja' : 'movimiento_caja',
    severidad: acta.diferencia < 0 ? 'alta' : hayDescuadre ? 'media' : 'informativa',
    titulo: `Liquidación de ruta ${acta.codigoActa} · ${acta.domiciliarioNombre}`,
    descripcion: hayDescuadre
      ? `Rendición de ${formatCOP(acta.efectivoEntregadoFisico)} vs ${formatCOP(acta.efectivoEsperadoRendir)} esperado (Diferencia: ${formatCOP(acta.diferencia)})`
      : `Rendición cuadrada por ${formatCOP(acta.efectivoEntregadoFisico)} (${acta.totalEntregas} entregas)`,
    motivo: acta.notasLiquidacion || 'Conciliación formal de domiciliario con caja',
    montoImpacto: hayDescuadre ? Math.abs(acta.diferencia) : acta.efectivoEntregadoFisico,
    responsableNombre: cajeroReceptor,
    entidadTipo: 'caja',
    referenciaId: acta.id,
    detallesForenses: {
      codigoActa: acta.codigoActa,
      domiciliarioNombre: acta.domiciliarioNombre,
      montoBaseInicial: acta.montoBaseInicial,
      totalEfectivoCobrado: acta.totalEfectivoCobrado,
      efectivoEsperadoRendir: acta.efectivoEsperadoRendir,
      efectivoEntregadoFisico: acta.efectivoEntregadoFisico,
      diferencia: acta.diferencia,
    },
  });

  if (acta.diferencia < 0) {
    crearAlertaSilenciosa(negocioId, {
      modulo: 'caja',
      tipo: 'alerta_caja',
      urgencia: 'alta',
      titulo: `Faltante en liquidación de ${acta.domiciliarioNombre} (${acta.codigoActa})`,
      mensaje: `Se esperaban ${formatCOP(acta.efectivoEsperadoRendir)} y entregó ${formatCOP(acta.efectivoEntregadoFisico)} (Faltante: ${formatCOP(Math.abs(acta.diferencia))}).`,
      enlace: '/caja',
      origen: 'sistema',
      metadata: { referenciaId: acta.id },
    });
  }
}
