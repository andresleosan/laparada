// src/services/facturacionService.ts
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  setDoc,
  Timestamp,
  where,
  limit,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import type { ComprobanteZ, ConfiguracionFiscal, ResolucionDian } from '@/types';
import { requireTenantId } from '@/security/tenantScope';
import {
  formatearConsecutivoFiscal,
  getConfiguracionFiscalDefault,
} from '@/utils/facturacionUtils';

const COLLECTION_CONFIG = 'configuraciones_fiscales';
const COLLECTION_COMPROBANTES_Z = 'comprobantes_z';

/**
 * Obtiene la configuración fiscal del negocio.
 * Si no existe aún en Firestore, retorna la configuración predeterminada sin fallar.
 */
export async function getConfiguracionFiscal(negocioId: string): Promise<ConfiguracionFiscal> {
  const tenantId = requireTenantId(negocioId);
  try {
    const docRef = doc(db, COLLECTION_CONFIG, tenantId);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as ConfiguracionFiscal;
      return {
        ...getConfiguracionFiscalDefault(tenantId),
        ...data,
        id: snap.id,
        negocioId: tenantId,
      };
    }

    return getConfiguracionFiscalDefault(tenantId);
  } catch (error) {
    console.error('Error al obtener configuración fiscal:', error);
    return getConfiguracionFiscalDefault(tenantId);
  }
}

/**
 * Guarda o actualiza la configuración fiscal del negocio con aislamiento tenant estricto.
 */
export async function guardarConfiguracionFiscal(
  negocioId: string,
  configParcial: Partial<ConfiguracionFiscal>
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const docRef = doc(db, COLLECTION_CONFIG, tenantId);

  const datosGuardar: Record<string, unknown> = {
    ...configParcial,
    negocioId: tenantId,
    actualizadoEn: Timestamp.now(),
  };

  await setDoc(docRef, datosGuardar, { merge: true });
}

/**
 * Asigna de forma atómica el siguiente consecutivo de Documento Equivalente POS
 * mediante una transacción de Firestore, incrementando el folio para la siguiente venta.
 */
export async function asignarSiguienteConsecutivoPos(
  negocioId: string
): Promise<{ consecutivoFiscal: string; folioNumero: number; resolucion: ResolucionDian }> {
  const tenantId = requireTenantId(negocioId);
  const docRef = doc(db, COLLECTION_CONFIG, tenantId);

  return await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef);
    let config: ConfiguracionFiscal;

    if (snap.exists()) {
      config = snap.data() as ConfiguracionFiscal;
    } else {
      config = getConfiguracionFiscalDefault(tenantId);
    }

    const resolucion = config.resolucion || getConfiguracionFiscalDefault(tenantId).resolucion;
    const prefijo = resolucion.prefijo || 'POS';
    const consecutivoActual = resolucion.consecutivoActual || 1;
    const siguienteConsecutivo = consecutivoActual + 1;

    // Actualizamos el consecutivo en la transacción
    transaction.set(
      docRef,
      {
        negocioId: tenantId,
        actualizadoEn: Timestamp.now(),
        resolucion: {
          ...resolucion,
          consecutivoActual: siguienteConsecutivo,
        },
      },
      { merge: true }
    );

    const consecutivoFiscal = formatearConsecutivoFiscal(prefijo, consecutivoActual);

    return {
      consecutivoFiscal,
      folioNumero: consecutivoActual,
      resolucion,
    };
  });
}

/**
 * Guarda un Comprobante Z Diario de Corte Fiscal POS en la colección multi-tenant.
 */
export async function guardarComprobanteZ(
  negocioId: string,
  comprobante: ComprobanteZ
): Promise<string> {
  const tenantId = requireTenantId(negocioId);
  const idDocumento = comprobante.id || `corte_${comprobante.fechaCorte}_${Date.now()}`;
  const docRef = doc(db, COLLECTION_COMPROBANTES_Z, idDocumento);

  await setDoc(docRef, {
    ...comprobante,
    id: idDocumento,
    negocioId: tenantId,
    creadoEn: Timestamp.now(),
  });

  return idDocumento;
}

/**
 * Obtiene el historial de comprobantes Z de corte fiscal del negocio.
 */
export async function getComprobantesZ(
  negocioId: string,
  maxRegistros: number = 30
): Promise<ComprobanteZ[]> {
  const tenantId = requireTenantId(negocioId);
  try {
    const q = query(
      collection(db, COLLECTION_COMPROBANTES_Z),
      where('negocioId', '==', tenantId),
      orderBy('fechaCorte', 'desc'),
      limit(maxRegistros)
    );

    const snap = await getDocs(q);
    return snap.docs.map((d) => ({
      ...d.data(),
      id: d.id,
    })) as ComprobanteZ[];
  } catch (error) {
    console.error('Error al consultar comprobantes Z:', error);
    return [];
  }
}

/**
 * Listener reactivo en tiempo real para la configuración fiscal del negocio.
 */
export function onConfiguracionFiscalChange(
  negocioId: string,
  callback: (config: ConfiguracionFiscal) => void
): () => void {
  const tenantId = requireTenantId(negocioId);
  const docRef = doc(db, COLLECTION_CONFIG, tenantId);

  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as ConfiguracionFiscal;
        callback({
          ...getConfiguracionFiscalDefault(tenantId),
          ...data,
          id: snap.id,
          negocioId: tenantId,
        });
      } else {
        callback(getConfiguracionFiscalDefault(tenantId));
      }
    },
    (error) => {
      console.warn('Error en listener de configuración fiscal:', error);
      callback(getConfiguracionFiscalDefault(tenantId));
    }
  );
}

/**
 * Listener reactivo en tiempo real para el historial de comprobantes Z.
 */
export function onComprobantesZChange(
  negocioId: string,
  callback: (comprobantes: ComprobanteZ[]) => void,
  maxRegistros: number = 30
): () => void {
  const tenantId = requireTenantId(negocioId);
  const q = query(
    collection(db, COLLECTION_COMPROBANTES_Z),
    where('negocioId', '==', tenantId),
    orderBy('fechaCorte', 'desc'),
    limit(maxRegistros)
  );

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({
        ...d.data(),
        id: d.id,
      })) as ComprobanteZ[];
      callback(items);
    },
    (error) => {
      console.warn('Error en listener de comprobantes Z:', error);
      callback([]);
    }
  );
}
