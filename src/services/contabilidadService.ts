import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
  limit as firestoreLimit,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import type {
  ConciliacionContableCerrada,
  MapeoPlanCuentasPUC,
  ResumenConciliacionContable,
} from '@/types/contabilidad';
import { requireTenantId } from '@/security/tenantScope';
import { getMapeoPucDefault } from '@/utils/contabilidadUtils';

const COLLECTION_CONCILIACIONES = 'conciliaciones_contables';
const COLLECTION_CONFIG_PUC = 'configuraciones_puc';

/**
 * Obtiene la configuración del Plan Único de Cuentas (PUC) del negocio.
 * Si no existe, retorna los códigos PUC estándar colombianos para gastronomía.
 */
export async function getConfiguracionPuc(negocioId: string): Promise<MapeoPlanCuentasPUC> {
  const tenantId = requireTenantId(negocioId);
  try {
    const docRef = doc(db, COLLECTION_CONFIG_PUC, tenantId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as MapeoPlanCuentasPUC;
      return {
        ...getMapeoPucDefault(),
        ...data,
      };
    }

    return getMapeoPucDefault();
  } catch (error) {
    console.error('Error al obtener configuración PUC:', error);
    return getMapeoPucDefault();
  }
}

/**
 * Guarda o actualiza el mapeo de cuentas PUC para el negocio
 */
export async function guardarConfiguracionPuc(
  negocioId: string,
  mapeo: Partial<MapeoPlanCuentasPUC>
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const docRef = doc(db, COLLECTION_CONFIG_PUC, tenantId);

  const payload: Partial<MapeoPlanCuentasPUC> & { negocioId: string; actualizadoEn: Timestamp } = {
    ...mapeo,
    negocioId: tenantId,
    actualizadoEn: Timestamp.now(),
  };

  await setDoc(docRef, payload, { merge: true });
}

/**
 * Guarda un acta oficial de conciliación contable cerrada para auditoría mensual
 */
export async function guardarConciliacionCerrada(
  negocioId: string,
  conciliacion: ResumenConciliacionContable,
  periodoMes: string,
  responsable: string,
  notas?: string
): Promise<string> {
  const tenantId = requireTenantId(negocioId);

  // ID estructurado para unicidad y orden: ej: "conc-laparada-2026-03"
  const docId = `conc-${tenantId}-${periodoMes}`;
  const docRef = doc(db, COLLECTION_CONCILIACIONES, docId);

  const totalBaseInc = Math.round(conciliacion.totalVentasSistema / 1.08);
  const impuestoInc = Math.round(conciliacion.totalVentasSistema - totalBaseInc);

  const estado: 'aprobada' | 'observada' =
    conciliacion.saludConciliacion === 'critica' || Math.abs(conciliacion.diferenciaTotalNeta) > 20000
      ? 'observada'
      : 'aprobada';

  const docData: ConciliacionContableCerrada = {
    id: docId,
    negocioId: tenantId,
    periodoMes,
    fechaCierre: Timestamp.now(),
    responsable,
    totalVentas: conciliacion.totalVentasSistema,
    totalVentasNetas: conciliacion.totalVentasSistema,
    baseInc8: totalBaseInc,
    impuestoInc8: impuestoInc,
    totalEgresos: conciliacion.totalEgresosPeriodo,
    totalEfectivo: conciliacion.totalCobradoEfectivo,
    totalTransferencia: conciliacion.totalCobradoTransferencia,
    diferenciaCaja: conciliacion.diferenciaTotalNeta,
    estado,
    notas: notas || '',
    creadoEn: Timestamp.now(),
  };

  await setDoc(docRef, docData, { merge: true });
  return docId;
}

/**
 * Obtiene el historial de conciliaciones contables cerradas del negocio
 */
export async function getConciliacionesCerradas(
  negocioId: string,
  limite = 24
): Promise<ConciliacionContableCerrada[]> {
  const tenantId = requireTenantId(negocioId);
  try {
    const q = query(
      collection(db, COLLECTION_CONCILIACIONES),
      where('negocioId', '==', tenantId),
      orderBy('periodoMes', 'desc'),
      firestoreLimit(limite)
    );

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      ...d.data(),
      id: d.id,
    })) as ConciliacionContableCerrada[];
  } catch (error) {
    console.error('Error al obtener conciliaciones cerradas:', error);
    return [];
  }
}

/**
 * Suscribe a cambios en las conciliaciones cerradas en tiempo real
 */
export function onConciliacionesCerradasChange(
  negocioId: string,
  callback: (conciliaciones: ConciliacionContableCerrada[]) => void,
  limite = 24
): () => void {
  const tenantId = requireTenantId(negocioId);
  const q = query(
    collection(db, COLLECTION_CONCILIACIONES),
    where('negocioId', '==', tenantId),
    orderBy('periodoMes', 'desc'),
    firestoreLimit(limite)
  );

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as ConciliacionContableCerrada[];
      callback(items);
    },
    (error) => {
      console.error('Error en suscripción de conciliaciones contables:', error);
    }
  );
}
