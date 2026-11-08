import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { requireTenantId } from '@/security/tenantScope';
import type { Venta } from '@/types';
import type {
  ConfiguracionMesero,
  LiquidacionMesero,
  CrearLiquidacionMeseroInput,
} from '@/types/mesero';
import { crearGasto } from './gastosService';

/**
 * Escucha en tiempo real las ventas recientes del salón para calcular métricas de meseros.
 */
export function onVentasMeserosChange(
  negocioId: string,
  diasAtras = 30,
  callback: (ventas: Venta[]) => void
): () => void {
  const tenantId = requireTenantId(negocioId);
  const fechaMin = new Date();
  fechaMin.setDate(fechaMin.getDate() - Math.max(1, diasAtras));
  fechaMin.setHours(0, 0, 0, 0);

  const q = query(
    collection(db, 'ventas'),
    where('negocioId', '==', tenantId),
    where('fecha', '>=', Timestamp.fromDate(fechaMin)),
    orderBy('fecha', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const ventas = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<Venta, 'id'>),
      }));
      callback(ventas);
    },
    (err) => {
      console.error('Error al escuchar ventas de meseros:', err);
    }
  );
}

/**
 * Obtiene todas las configuraciones de meseros activas para el negocio.
 */
export async function getConfiguracionesMeseros(negocioId: string): Promise<ConfiguracionMesero[]> {
  const tenantId = requireTenantId(negocioId);
  const ref = collection(db, 'configuraciones_meseros');
  const q = query(ref, where('negocioId', '==', tenantId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<ConfiguracionMesero, 'id'>),
  }));
}

/**
 * Suscripción reactiva en tiempo real a las configuraciones de meseros.
 */
export function onConfiguracionesMeserosChange(
  negocioId: string,
  callback: (configs: ConfiguracionMesero[]) => void
): () => void {
  const tenantId = requireTenantId(negocioId);
  const ref = collection(db, 'configuraciones_meseros');
  const q = query(ref, where('negocioId', '==', tenantId));

  return onSnapshot(
    q,
    (snapshot) => {
      const configs = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<ConfiguracionMesero, 'id'>),
      }));
      callback(configs);
    },
    (error) => {
      console.error('Error al escuchar configuraciones de meseros:', error);
    }
  );
}

/**
 * Crea o actualiza la configuración de incentivos de un mesero.
 */
export async function guardarConfiguracionMesero(
  negocioId: string,
  input: {
    id?: string;
    empleadoId: string;
    nombre: string;
    porcentajeComision: number;
    porcentajePropina: number;
    metaVentaTurno?: number;
    activo?: boolean;
  }
): Promise<string> {
  const tenantId = requireTenantId(negocioId);
  const porcentajeComision = Math.max(0, Math.min(100, Number(input.porcentajeComision) || 0));
  const porcentajePropina = Math.max(0, Math.min(100, Number(input.porcentajePropina) || 100));
  const metaVentaTurno = input.metaVentaTurno ? Math.max(0, Math.round(Number(input.metaVentaTurno))) : undefined;
  const activo = input.activo ?? true;

  if (input.id) {
    const docRef = doc(db, 'configuraciones_meseros', input.id);
    await updateDoc(docRef, {
      porcentajeComision,
      porcentajePropina,
      metaVentaTurno: metaVentaTurno ?? null,
      activo,
      actualizadoEn: Timestamp.now(),
    });
    return input.id;
  }

  // Verificar si ya existe una configuración para este empleadoId
  const ref = collection(db, 'configuraciones_meseros');
  const q = query(
    ref,
    where('negocioId', '==', tenantId),
    where('empleadoId', '==', input.empleadoId)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const existingDoc = snapshot.docs[0];
    await updateDoc(doc(db, 'configuraciones_meseros', existingDoc.id), {
      nombre: input.nombre.trim(),
      porcentajeComision,
      porcentajePropina,
      metaVentaTurno: metaVentaTurno ?? null,
      activo,
      actualizadoEn: Timestamp.now(),
    });
    return existingDoc.id;
  }

  // Crear nuevo documento
  const nuevoDoc: Omit<ConfiguracionMesero, 'id'> = {
    negocioId: tenantId,
    empleadoId: input.empleadoId,
    nombre: input.nombre.trim(),
    porcentajeComision,
    porcentajePropina,
    ...(metaVentaTurno ? { metaVentaTurno } : {}),
    activo,
    actualizadoEn: Timestamp.now(),
  };

  const docRef = await addDoc(ref, nuevoDoc);
  return docRef.id;
}

/**
 * Consulta el historial de liquidaciones pagadas a meseros.
 */
export async function getLiquidacionesMeseros(
  negocioId: string,
  limiteRegistros = 50
): Promise<LiquidacionMesero[]> {
  const tenantId = requireTenantId(negocioId);
  const ref = collection(db, 'liquidaciones_meseros');
  const q = query(
    ref,
    where('negocioId', '==', tenantId),
    orderBy('fecha', 'desc'),
    limit(limiteRegistros)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...(docSnap.data() as Omit<LiquidacionMesero, 'id'>),
  }));
}

/**
 * Suscripción en tiempo real a las liquidaciones pagadas a meseros.
 */
export function onLiquidacionesMeserosChange(
  negocioId: string,
  callback: (liquidaciones: LiquidacionMesero[]) => void
): () => void {
  const tenantId = requireTenantId(negocioId);
  const ref = collection(db, 'liquidaciones_meseros');
  const q = query(
    ref,
    where('negocioId', '==', tenantId),
    orderBy('fecha', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const liquidaciones = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<LiquidacionMesero, 'id'>),
      }));
      callback(liquidaciones);
    },
    (error) => {
      console.error('Error al escuchar liquidaciones de meseros:', error);
    }
  );
}

/**
 * Registra formalmente la liquidación de incentivos y propinas a un mesero.
 */
export async function registrarLiquidacionMesero(
  negocioId: string,
  input: CrearLiquidacionMeseroInput
): Promise<string> {
  const tenantId = requireTenantId(negocioId);

  if (!input.meseroId || !input.meseroNombre) {
    throw new Error('El mesero es obligatorio para registrar la liquidación.');
  }

  const totalLiquidado = Math.max(0, Math.round(Number(input.totalLiquidado) || 0));
  if (totalLiquidado <= 0) {
    throw new Error('El valor a liquidar debe ser mayor a cero.');
  }

  const ahora = Timestamp.now();
  let gastoId: string | undefined;

  // Registrar gasto contable opcional de salida de caja
  if (input.registrarGastoCaja) {
    try {
      gastoId = await crearGasto({
        negocioId: tenantId,
        concepto: `Liquidación incentivos / propinas mesero: ${input.meseroNombre} (${input.periodoDesde} a ${input.periodoHasta})`,
        monto: totalLiquidado,
        categoria: 'salarios',
        fecha: ahora,
      });
    } catch (err) {
      console.warn('No se pudo emitir el gasto automático de caja:', err);
    }
  }

  const nuevaLiquidacion: Omit<LiquidacionMesero, 'id'> = {
    negocioId: tenantId,
    meseroId: input.meseroId,
    meseroNombre: input.meseroNombre.trim(),
    periodoDesde: input.periodoDesde,
    periodoHasta: input.periodoHasta,
    totalVentas: Math.max(0, Math.round(input.totalVentas || 0)),
    totalPropinas: Math.max(0, Math.round(input.totalPropinas || 0)),
    totalComisiones: Math.max(0, Math.round(input.totalComisiones || 0)),
    totalLiquidado,
    metodoPago: input.metodoPago || 'efectivo',
    ...(input.referenciaPago ? { referenciaPago: input.referenciaPago.trim() } : {}),
    ...(input.liquidadoPor ? { liquidadoPor: input.liquidadoPor.trim() } : {}),
    ...(gastoId ? { gastoId } : {}),
    ...(input.notas ? { notas: input.notas.trim() } : {}),
    fecha: ahora,
    creadoEn: ahora,
  };

  const docRef = await addDoc(collection(db, 'liquidaciones_meseros'), nuevaLiquidacion);
  return docRef.id;
}
