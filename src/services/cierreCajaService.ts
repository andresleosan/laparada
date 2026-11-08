import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  orderBy,
  limit,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import { CierreCaja, ArqueoEfectivo } from '../types';
import { requireTenantId } from '@/security/tenantScope';
import { registrarEventoAuditoriaSilencioso } from '@/services/auditoriaService';

export interface DetalleCierre {
  ventasPos?: number;
  ventasWhatsapp?: number;
  totalDescuentos?: number;
  cantidadDescuentos?: number;
  totalAnuladas?: number;
  cantidadAnuladas?: number;
  arqueo?: ArqueoEfectivo;
  cajeroNombre?: string;
  efectivoInicial?: number;
  efectivoEsperado?: number;
  efectivoReal?: number;
  diferenciaEfectivo?: number;
}

export interface ResumenCierre {
  totalVentas: number;
  totalGastos: number;
  gananciaNeta: number;
  cantidadVentas: number;
  cantidadGastos: number;
}

/**
 * Crear el cierre de caja del día o turno con acta de arqueo físico opcional
 */
export async function crearCierreCaja(
  negocioId: string,
  totalVentas: number,
  totalGastos: number,
  notas?: string,
  detalle?: DetalleCierre
): Promise<string> {
  try {
    const tenantId = requireTenantId(negocioId);
    const safeVentas = Math.max(0, Math.round(Number.isFinite(totalVentas) ? totalVentas : 0));
    const safeGastos = Math.max(0, Math.round(Number.isFinite(totalGastos) ? totalGastos : 0));
    const utilidadNeta = safeVentas - safeGastos;

    const cierreCajaRef = collection(db, 'cierres_caja');
    const docData: Record<string, unknown> = {
      negocioId: tenantId,
      totalIngresos: safeVentas,
      totalGastos: safeGastos,
      utilidadNeta,
      ventasPos: Math.max(0, Math.round(detalle?.ventasPos ?? 0)),
      ventasWhatsapp: Math.max(0, Math.round(detalle?.ventasWhatsapp ?? 0)),
      notas: (notas || '').trim(),
      fecha: Timestamp.now(),
    };

    if (typeof detalle?.totalDescuentos === 'number') {
      docData.totalDescuentos = Math.max(0, Math.round(detalle.totalDescuentos));
    }
    if (typeof detalle?.cantidadDescuentos === 'number') {
      docData.cantidadDescuentos = Math.max(0, Math.round(detalle.cantidadDescuentos));
    }
    if (typeof detalle?.totalAnuladas === 'number') {
      docData.totalAnuladas = Math.max(0, Math.round(detalle.totalAnuladas));
    }
    if (typeof detalle?.cantidadAnuladas === 'number') {
      docData.cantidadAnuladas = Math.max(0, Math.round(detalle.cantidadAnuladas));
    }
    if (detalle?.arqueo) {
      docData.arqueo = detalle.arqueo;
      docData.efectivoReal = detalle.arqueo.totalFisico;
      docData.efectivoEsperado = detalle.arqueo.efectivoEsperado;
      docData.diferenciaEfectivo = detalle.arqueo.diferencia;
    }
    if (detalle?.cajeroNombre) {
      docData.cajeroNombre = detalle.cajeroNombre.trim();
    }
    if (typeof detalle?.efectivoInicial === 'number') {
      docData.efectivoInicial = Math.max(0, Math.round(detalle.efectivoInicial));
    }

    const docRef = await addDoc(cierreCajaRef, docData as Omit<CierreCaja, 'id'>);

    const diferencia = detalle?.arqueo?.diferencia ?? detalle?.diferenciaEfectivo ?? 0;
    if (diferencia !== 0) {
      const diferenciaAbs = Math.abs(Math.round(diferencia));
      const estadoCuadre = diferencia < 0 ? 'Faltante de Caja' : 'Sobrante de Caja';

      registrarEventoAuditoriaSilencioso({
        negocioId: tenantId,
        categoria: 'descuadre_caja',
        titulo: `Acta de Cierre de Caja (${estadoCuadre})`,
        descripcion: `Diferencia detectada de $${diferenciaAbs.toLocaleString('es-CO')} (${estadoCuadre}).`,
        motivo: (notas || estadoCuadre).trim(),
        montoImpacto: diferencia < 0 ? diferenciaAbs : 0,
        responsableNombre: (
          detalle?.cajeroNombre ||
          'Cajero de Turno'
        ).trim(),
        responsableRol: 'cajero',
        entidadTipo: 'caja',
        referenciaId: docRef.id,
        detallesForenses: {
          estadoCuadre,
          diferenciaCOP: diferencia,
          totalIngresos: safeVentas,
          totalGastos: safeGastos,
        },
      });
    }

    return docRef.id;
  } catch (error) {
    console.error('Error creating cierre caja:', error);
    throw error;
  }
}

/**
 * Actualizar cierre de caja
 */
export async function actualizarCierreCaja(
  id: string,
  updates: Partial<Omit<CierreCaja, 'id' | 'negocioId'>>,
  negocioId: string
): Promise<void> {
  try {
    const tenantId = requireTenantId(negocioId);
    const docRef = doc(db, 'cierres_caja', id);
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists() || snapshot.data().negocioId !== tenantId) {
      throw new Error('El cierre no pertenece al negocio activo');
    }
    await updateDoc(docRef, { ...updates, negocioId: tenantId });
  } catch (error) {
    console.error('Error updating cierre caja:', error);
    throw error;
  }
}

/**
 * Obtener el cierre de caja de una fecha específica
 */
export async function getCierreCajaPorFecha(
  negocioId: string,
  fecha: Date
): Promise<CierreCaja | null> {
  try {
    const fechaInicio = new Date(fecha);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fecha);
    fechaFin.setHours(23, 59, 59, 999);

    const cierreCajaRef = collection(db, 'cierres_caja');
    const q = query(
      cierreCajaRef,
      where('negocioId', '==', requireTenantId(negocioId)),
      where('fecha', '>=', Timestamp.fromDate(fechaInicio)),
      where('fecha', '<=', Timestamp.fromDate(fechaFin))
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const firstDoc = snapshot.docs[0];
      return {
        ...firstDoc.data(),
        id: firstDoc.id,
      } as CierreCaja;
    }
    return null;
  } catch (error) {
    console.error('Error fetching cierre caja:', error);
    return null;
  }
}

/**
 * Obtener últimos N cierres de caja ordenados cronológicamente descendente
 */
export async function getUltimosCierres(
  negocioId: string,
  limiteResultados: number = 30
): Promise<CierreCaja[]> {
  try {
    const cierreCajaRef = collection(db, 'cierres_caja');
    const q = query(
      cierreCajaRef,
      where('negocioId', '==', requireTenantId(negocioId)),
      orderBy('fecha', 'desc'),
      limit(limiteResultados)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d: QueryDocumentSnapshot<DocumentData>) => ({
      ...d.data(),
      id: d.id,
    } as CierreCaja));
  } catch (error) {
    console.error('Error fetching ultimos cierres:', error);
    return [];
  }
}

/**
 * Obtener cierre de caja de hoy
 */
export async function getCierreCajaHoy(negocioId: string): Promise<CierreCaja | null> {
  try {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const cierreCajaRef = collection(db, 'cierres_caja');
    const q = query(
      cierreCajaRef,
      where('negocioId', '==', requireTenantId(negocioId)),
      where('fecha', '>=', Timestamp.fromDate(hoy)),
      where('fecha', '<', Timestamp.fromDate(manana)),
      orderBy('fecha', 'desc')
    );

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const firstDoc = snapshot.docs[0];
      return {
        ...firstDoc.data(),
        id: firstDoc.id,
      } as CierreCaja;
    }
    return null;
  } catch (error) {
    console.error('Error fetching cierre caja hoy:', error);
    return null;
  }
}

/**
 * Calcular resumen de cierre de caja para un período
 */
export async function calcularResumenCierre(
  negocioId: string,
  fechaInicio: Date,
  fechaFin: Date
): Promise<ResumenCierre> {
  try {
    const cierreCajaRef = collection(db, 'cierres_caja');
    const q = query(
      cierreCajaRef,
      where('negocioId', '==', requireTenantId(negocioId)),
      where('fecha', '>=', Timestamp.fromDate(fechaInicio)),
      where('fecha', '<=', Timestamp.fromDate(fechaFin))
    );

    const snapshot = await getDocs(q);
    let totalVentas = 0;
    let totalGastos = 0;
    let cantidadVentas = 0;
    let cantidadGastos = 0;

    snapshot.docs.forEach((d: QueryDocumentSnapshot<DocumentData>) => {
      const cierre = d.data() as CierreCaja;
      totalVentas += cierre.totalIngresos || 0;
      totalGastos += cierre.totalGastos || 0;
      cantidadVentas += 1;
      cantidadGastos += 1;
    });

    return {
      totalVentas,
      totalGastos,
      gananciaNeta: totalVentas - totalGastos,
      cantidadVentas,
      cantidadGastos,
    };
  } catch (error) {
    console.error('Error calculating resumen cierre:', error);
    return {
      totalVentas: 0,
      totalGastos: 0,
      gananciaNeta: 0,
      cantidadVentas: 0,
      cantidadGastos: 0,
    };
  }
}
