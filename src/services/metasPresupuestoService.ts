import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  Timestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { requireTenantId } from '@/security/tenantScope';
import type {
  Combo,
  ConfiguracionMetasPresupuesto,
  Gasto,
  GuardarMetasPresupuestoInput,
  Insumo,
  MovimientoKardex,
  Producto,
  Venta,
} from '@/types';
import {
  calcularProgresoTemporalMes,
  clampPercentage,
  getConfiguracionMetasDefault,
  normalizarMesKey,
  obtenerMesKeyAnterior,
  safeCurrencyInt,
  sanitizarMapaPresupuestos,
} from '@/utils/metasPresupuestoUtils';

export const COLECCION_METAS_PRESUPUESTOS = 'metas_presupuestos';

export function buildMetasPresupuestoDocId(negocioId: string, mesKey: string): string {
  const tenantId = requireTenantId(negocioId);
  const key = normalizarMesKey(mesKey);
  return `${tenantId}_${key}`;
}

function mapConfiguracionSnapshot(
  docId: string,
  data: Partial<ConfiguracionMetasPresupuesto>,
  tenantId: string,
  mesKey: string
): ConfiguracionMetasPresupuesto {
  const base = getConfiguracionMetasDefault(tenantId, mesKey);
  return {
    ...base,
    ...data,
    id: docId,
    negocioId: tenantId,
    mesKey,
    metaVentasMensualCOP: safeCurrencyInt(data.metaVentasMensualCOP, 0),
    metaUtilidadNetaMensualCOP: safeCurrencyInt(data.metaUtilidadNetaMensualCOP, 0),
    costosFijosBaseCOP: safeCurrencyInt(data.costosFijosBaseCOP, 0),
    foodCostObjetivoPct: clampPercentage(data.foodCostObjetivoPct, 5, 85, 35),
    umbralAlertaGastoPct: clampPercentage(data.umbralAlertaGastoPct, 50, 99, 80),
    presupuestosPorCategoria: sanitizarMapaPresupuestos(data.presupuestosPorCategoria),
    configuradoManualmente: data.configuradoManualmente ?? true,
  };
}

/**
 * Obtiene la configuración de metas y presupuesto para un mes calendario específico (`YYYY-MM`).
 * Retorna `null` si aún no se ha configurado ese mes.
 */
export async function getMetasPresupuestoMes(
  negocioId: string,
  mesKey: string
): Promise<ConfiguracionMetasPresupuesto | null> {
  const tenantId = requireTenantId(negocioId);
  const key = normalizarMesKey(mesKey);
  const docId = buildMetasPresupuestoDocId(tenantId, key);

  const snap = await getDoc(doc(db, COLECCION_METAS_PRESUPUESTOS, docId));
  if (!snap.exists()) return null;

  return mapConfiguracionSnapshot(
    snap.id,
    snap.data() as Partial<ConfiguracionMetasPresupuesto>,
    tenantId,
    key
  );
}

/**
 * Consulta los meses configurados recientemente para el negocio activo (para copiar o comparar).
 */
export async function getHistorialMetasPresupuesto(
  negocioId: string,
  maxMeses = 12
): Promise<ConfiguracionMetasPresupuesto[]> {
  const tenantId = requireTenantId(negocioId);
  const q = query(
    collection(db, COLECCION_METAS_PRESUPUESTOS),
    where('negocioId', '==', tenantId),
    orderBy('mesKey', 'desc'),
    limit(maxMeses)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data() as Partial<ConfiguracionMetasPresupuesto>;
    const key = normalizarMesKey(data.mesKey);
    return mapConfiguracionSnapshot(d.id, data, tenantId, key);
  });
}

/**
 * Suscripción en tiempo real a la configuración de metas y presupuesto del mes seleccionado.
 */
export function onMetasPresupuestoMesChange(
  negocioId: string,
  mesKey: string,
  onChange: (config: ConfiguracionMetasPresupuesto | null) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const tenantId = requireTenantId(negocioId);
  const key = normalizarMesKey(mesKey);
  const docId = buildMetasPresupuestoDocId(tenantId, key);

  return onSnapshot(
    doc(db, COLECCION_METAS_PRESUPUESTOS, docId),
    (snap) => {
      if (!snap.exists()) {
        onChange(null);
        return;
      }
      onChange(
        mapConfiguracionSnapshot(
          snap.id,
          snap.data() as Partial<ConfiguracionMetasPresupuesto>,
          tenantId,
          key
        )
      );
    },
    (err) => {
      console.error('Error escuchando metas y presupuesto:', err);
      onError?.(err);
    }
  );
}

/**
 * Guarda o actualiza las metas comerciales y presupuesto mensual con validación estricta.
 */
export async function guardarMetasPresupuestoMes(
  negocioId: string,
  mesKey: string,
  input: GuardarMetasPresupuestoInput,
  usuarioNombre?: string
): Promise<ConfiguracionMetasPresupuesto> {
  const tenantId = requireTenantId(negocioId);
  const key = normalizarMesKey(mesKey);
  const docId = buildMetasPresupuestoDocId(tenantId, key);
  const docRef = doc(db, COLECCION_METAS_PRESUPUESTOS, docId);

  const existente = await getDoc(docRef);
  const ahora = Timestamp.now();

  const payload = {
    negocioId: tenantId,
    mesKey: key,
    metaVentasMensualCOP: safeCurrencyInt(input.metaVentasMensualCOP, 0),
    metaUtilidadNetaMensualCOP: safeCurrencyInt(input.metaUtilidadNetaMensualCOP, 0),
    costosFijosBaseCOP: safeCurrencyInt(input.costosFijosBaseCOP, 0),
    foodCostObjetivoPct: clampPercentage(input.foodCostObjetivoPct, 5, 85, 35),
    umbralAlertaGastoPct: clampPercentage(input.umbralAlertaGastoPct, 50, 99, 80),
    presupuestosPorCategoria: sanitizarMapaPresupuestos(input.presupuestosPorCategoria),
    notas: (input.notas || '').trim().slice(0, 400),
    configuradoManualmente: true,
    actualizadoPor: (usuarioNombre || 'Administrador').trim().slice(0, 80),
    actualizadoEn: ahora,
    ...(existente.exists() ? {} : { creadoEn: ahora }),
  };

  await setDoc(docRef, payload, { merge: true });

  return {
    ...payload,
    id: docId,
  };
}

/**
 * Clona las metas y el presupuesto del mes inmediatamente anterior (o el último configurado).
 */
export async function copiarMetasPresupuestoDeMesAnterior(
  negocioId: string,
  mesKeyDestino: string,
  usuarioNombre?: string
): Promise<ConfiguracionMetasPresupuesto> {
  const tenantId = requireTenantId(negocioId);
  const keyDestino = normalizarMesKey(mesKeyDestino);
  const keyAnterior = obtenerMesKeyAnterior(keyDestino);

  let origen = await getMetasPresupuestoMes(tenantId, keyAnterior);
  if (!origen) {
    const historial = await getHistorialMetasPresupuesto(tenantId, 6);
    origen = historial.find((item) => item.mesKey !== keyDestino) || null;
  }

  if (!origen) {
    throw new Error('No hay ningún presupuesto guardado en meses anteriores para copiar.');
  }

  return await guardarMetasPresupuestoMes(
    tenantId,
    keyDestino,
    {
      metaVentasMensualCOP: origen.metaVentasMensualCOP,
      metaUtilidadNetaMensualCOP: origen.metaUtilidadNetaMensualCOP,
      costosFijosBaseCOP: origen.costosFijosBaseCOP,
      foodCostObjetivoPct: origen.foodCostObjetivoPct,
      umbralAlertaGastoPct: origen.umbralAlertaGastoPct,
      presupuestosPorCategoria: origen.presupuestosPorCategoria,
      notas: origen.notas || `Copiado de ${origen.mesKey}`,
    },
    usuarioNombre
  );
}

export interface DatosOperativosMes {
  ventasMes: Venta[];
  gastosMes: Gasto[];
  movimientosKardexMes: MovimientoKardex[];
  productos: Producto[];
  combos: Combo[];
  insumos: Insumo[];
}

/**
 * Consulta ventas, gastos y movimientos de Kardex del mes calendario completo,
 * manteniendo estricto aislamiento multi-tenant.
 */
export async function getDatosOperativosMes(
  negocioId: string,
  mesKey: string
): Promise<DatosOperativosMes> {
  const tenantId = requireTenantId(negocioId);
  const temporalidad = calcularProgresoTemporalMes(mesKey);
  const tsInicio = Timestamp.fromDate(temporalidad.inicio);
  const tsFin = Timestamp.fromDate(temporalidad.fin);

  const ventasQ = query(
    collection(db, 'ventas'),
    where('negocioId', '==', tenantId),
    where('fecha', '>=', tsInicio),
    where('fecha', '<=', tsFin),
    orderBy('fecha', 'desc')
  );

  const gastosQ = query(
    collection(db, 'gastos'),
    where('negocioId', '==', tenantId),
    where('fecha', '>=', tsInicio),
    where('fecha', '<=', tsFin),
    orderBy('fecha', 'desc')
  );

  const movimientosQ = query(
    collection(db, 'entradas_inventario'),
    where('negocioId', '==', tenantId),
    where('fecha', '>=', tsInicio),
    where('fecha', '<=', tsFin),
    orderBy('fecha', 'desc')
  );

  const productosQ = query(
    collection(db, 'productos'),
    where('negocioId', '==', tenantId)
  );

  const combosQ = query(
    collection(db, 'combos'),
    where('negocioId', '==', tenantId)
  );

  const insumosQ = query(
    collection(db, 'inventario'),
    where('negocioId', '==', tenantId)
  );

  const [
    ventasSnap,
    gastosSnap,
    movimientosSnap,
    productosSnap,
    combosSnap,
    insumosSnap,
  ] = await Promise.all([
    getDocs(ventasQ),
    getDocs(gastosQ),
    getDocs(movimientosQ),
    getDocs(productosQ),
    getDocs(combosQ),
    getDocs(insumosQ),
  ]);

  return {
    ventasMes: ventasSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Venta)),
    gastosMes: gastosSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Gasto)),
    movimientosKardexMes: movimientosSnap.docs.map(
      (d) => ({ ...d.data(), id: d.id } as MovimientoKardex)
    ),
    productos: productosSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Producto)),
    combos: combosSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Combo)),
    insumos: insumosSnap.docs.map((d) => ({ ...d.data(), id: d.id } as Insumo)),
  };
}
