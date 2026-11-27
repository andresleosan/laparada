import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';
import { db } from '@/services/firebase';
import { requireTenantId } from '@/security/tenantScope';
import { registrarEventoAuditoriaSilencioso } from '@/services/auditoriaService';
import { crearAlertaSilenciosa } from '@/services/notificacionesService';
import { formatCOP } from '@/utils/formatCOP';
import { obtenerFechaIsoColombia } from '@/utils/lotesInventarioUtils';
import {
  calcularVariacionPrecioPct,
  sanitizarCostoUnitarioCOP,
  UMBRAL_ALZA_CRITICA_PCT,
} from '@/utils/preciosProveedoresUtils';
import type {
  RegistrarPrecioInsumoInput,
  RegistroPrecioInsumo,
} from '@/types/preciosProveedores';

export const COLECCION_HISTORIAL_PRECIOS = 'historial_precios_insumos';

function mapDocRegistroPrecio(
  id: string,
  data: Record<string, unknown>
): RegistroPrecioInsumo {
  return {
    ...data,
    id,
  } as RegistroPrecioInsumo;
}

/**
 * Obtiene el histórico de precios de insumos del negocio activo.
 */
export async function getHistorialPreciosInsumos(
  negocioId: string,
  maxRegistros = 500
): Promise<RegistroPrecioInsumo[]> {
  const tenantId = requireTenantId(negocioId);
  const q = query(
    collection(db, COLECCION_HISTORIAL_PRECIOS),
    where('negocioId', '==', tenantId),
    orderBy('fecha', 'desc'),
    limit(Math.max(1, maxRegistros))
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) =>
    mapDocRegistroPrecio(docSnap.id, docSnap.data() as Record<string, unknown>)
  );
}

/**
 * Suscripción en tiempo real al histórico de precios de insumos del negocio.
 */
export function onHistorialPreciosInsumosChange(
  negocioId: string,
  callback: (registros: RegistroPrecioInsumo[]) => void,
  onError?: (error: Error) => void,
  maxRegistros = 500
): () => void {
  const tenantId = requireTenantId(negocioId);
  const q = query(
    collection(db, COLECCION_HISTORIAL_PRECIOS),
    where('negocioId', '==', tenantId),
    orderBy('fecha', 'desc'),
    limit(Math.max(1, maxRegistros))
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const lista = snapshot.docs.map((docSnap) =>
        mapDocRegistroPrecio(docSnap.id, docSnap.data() as Record<string, unknown>)
      );
      callback(lista);
    },
    (error) => {
      console.error('Error en listener de historial_precios_insumos:', error);
      onError?.(error);
    }
  );
}

/**
 * Consulta el último precio registrado para un insumo específico dentro del tenant.
 */
export async function getUltimoPrecioInsumo(
  negocioId: string,
  insumoId: string
): Promise<RegistroPrecioInsumo | null> {
  const tenantId = requireTenantId(negocioId);
  const cleanInsumoId = (insumoId || '').trim();
  if (!cleanInsumoId) return null;

  const q = query(
    collection(db, COLECCION_HISTORIAL_PRECIOS),
    where('negocioId', '==', tenantId),
    where('insumoId', '==', cleanInsumoId),
    orderBy('fecha', 'desc'),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const first = snapshot.docs[0];
  return mapDocRegistroPrecio(first.id, first.data() as Record<string, unknown>);
}

/**
 * Registra un nuevo precio histórico de compra o cotización de proveedor.
 * Si el incremento supera el 10% frente al último costo conocido, dispara
 * alerta operativa en `/notificaciones` y registro en `bitacora_auditoria`.
 */
export async function registrarPrecioInsumo(
  input: RegistrarPrecioInsumoInput
): Promise<{ id: string; variacionPct: number; esAlzaCritica: boolean }> {
  const tenantId = requireTenantId(input.negocioId);
  const insumoId = (input.insumoId || '').trim().slice(0, 128);
  const insumoNombre = (input.insumoNombre || '').trim().slice(0, 200);
  const unidad = (input.unidad || 'unidad').trim().slice(0, 40) || 'unidad';
  const proveedorNombre = (input.proveedorNombre || 'Proveedor').trim().slice(0, 160) || 'Proveedor';
  const costoUnitarioCOP = sanitizarCostoUnitarioCOP(input.costoUnitarioCOP);

  if (!insumoId || !insumoNombre) {
    throw new Error('El insumo es obligatorio para registrar un precio histórico');
  }
  if (costoUnitarioCOP <= 0 || costoUnitarioCOP > 1_000_000_000) {
    throw new Error('El costo unitario debe ser mayor a $0 COP');
  }

  let costoAnteriorCOP =
    typeof input.costoAnteriorCOP === 'number' &&
    Number.isFinite(input.costoAnteriorCOP) &&
    input.costoAnteriorCOP > 0
      ? sanitizarCostoUnitarioCOP(input.costoAnteriorCOP)
      : 0;

  if (costoAnteriorCOP <= 0) {
    try {
      const ultimo = await getUltimoPrecioInsumo(tenantId, insumoId);
      if (ultimo && ultimo.costoUnitarioCOP > 0) {
        costoAnteriorCOP = sanitizarCostoUnitarioCOP(ultimo.costoUnitarioCOP);
      }
    } catch {
      // Si no se puede consultar el último precio, se continúa sin comparación previa
    }
  }

  const variacionPct =
    costoAnteriorCOP > 0
      ? calcularVariacionPrecioPct(costoAnteriorCOP, costoUnitarioCOP)
      : 0;
  const esAlzaCritica =
    costoAnteriorCOP > 0 && variacionPct > UMBRAL_ALZA_CRITICA_PCT;

  const fechaIso =
    input.fechaIso && /^\d{4}-\d{2}-\d{2}$/.test(input.fechaIso.trim())
      ? input.fechaIso.trim()
      : obtenerFechaIsoColombia();

  const now = Timestamp.now();
  const fechaTs =
    input.fechaIso && /^\d{4}-\d{2}-\d{2}$/.test(input.fechaIso.trim())
      ? Timestamp.fromDate(new Date(`${fechaIso}T12:00:00-05:00`))
      : now;

  const registradoPor =
    (input.registradoPor || 'Administrador').trim().slice(0, 120) || 'Administrador';

  const payload: Omit<RegistroPrecioInsumo, 'id'> = {
    negocioId: tenantId,
    insumoId,
    insumoNombre,
    unidad,
    proveedorNombre,
    costoUnitarioCOP,
    origen: input.origen,
    fechaIso,
    fecha: fechaTs,
    registradoPor,
    creadoEn: now,
    ...(input.proveedorId?.trim()
      ? { proveedorId: input.proveedorId.trim().slice(0, 128) }
      : {}),
    ...(costoAnteriorCOP > 0 ? { costoAnteriorCOP } : {}),
    ...(costoAnteriorCOP > 0 ? { variacionPct } : {}),
    ...(costoAnteriorCOP > 0 ? { esAlzaCritica } : {}),
    ...(typeof input.cantidadComprada === 'number' &&
    Number.isFinite(input.cantidadComprada) &&
    input.cantidadComprada >= 0
      ? { cantidadComprada: Number(input.cantidadComprada.toFixed(4)) }
      : {}),
    ...(input.referenciaId?.trim()
      ? { referenciaId: input.referenciaId.trim().slice(0, 128) }
      : {}),
    ...(input.referenciaCodigo?.trim()
      ? { referenciaCodigo: input.referenciaCodigo.trim().slice(0, 80) }
      : {}),
    ...(input.notas?.trim() ? { notas: input.notas.trim().slice(0, 1000) } : {}),
  };

  const docRef = await addDoc(
    collection(db, COLECCION_HISTORIAL_PRECIOS),
    payload
  );

  if (esAlzaCritica) {
    const incrementoCOP = Math.max(0, costoUnitarioCOP - costoAnteriorCOP);
    crearAlertaSilenciosa(tenantId, {
      modulo: 'inventario',
      tipo: 'alza_precio_insumo',
      titulo: `Alza crítica (+${variacionPct}%): ${insumoNombre}`,
      mensaje: `${proveedorNombre} subió de ${formatCOP(costoAnteriorCOP)} a ${formatCOP(costoUnitarioCOP)}/${unidad}. Revisa Food Cost de tus recetas o cambia a un proveedor más económico.`,
      urgencia: variacionPct >= 20 ? 'critica' : 'alta',
      enlace: '/proveedores?tab=comparador',
      origen: 'automatico',
      creadaPor: registradoPor,
      metadata: {
        insumoId,
        insumoNombre,
        proveedorNombre,
        costoAnteriorCOP,
        costoUnitarioCOP,
        variacionPct,
      },
    });

    registrarEventoAuditoriaSilencioso({
      negocioId: tenantId,
      categoria: 'ajuste_inventario',
      severidad: variacionPct >= 20 ? 'critica' : 'alta',
      titulo: `Alza de Precio > 10% en ${insumoNombre}`,
      descripcion: `Compra/cotización de ${proveedorNombre} pasó de ${formatCOP(costoAnteriorCOP)} a ${formatCOP(costoUnitarioCOP)}/${unidad} (+${variacionPct}%).`,
      motivo: 'inflacion_proveedor_critica',
      montoImpacto: incrementoCOP,
      responsableNombre: registradoPor,
      responsableRol: 'admin',
      entidadTipo: 'inventario',
      referenciaId: docRef.id,
      detallesForenses: {
        insumoId,
        proveedorNombre,
        costoAnteriorCOP,
        costoUnitarioCOP,
        variacionPct,
        origen: input.origen,
      },
    });
  }

  return {
    id: docRef.id,
    variacionPct,
    esAlzaCritica,
  };
}

/**
 * Registra un precio en segundo plano sin interrumpir la recepción de compras o entradas.
 */
export function registrarPrecioInsumoSilencioso(
  input: RegistrarPrecioInsumoInput
): void {
  void registrarPrecioInsumo(input).catch((err) => {
    console.warn('No se pudo registrar el histórico de precio de insumo:', err);
  });
}

/**
 * Elimina un registro puntual del histórico validando pertenencia al tenant activo.
 */
export async function eliminarRegistroPrecioInsumo(
  negocioId: string,
  registroId: string
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const cleanId = (registroId || '').trim();
  if (!cleanId) {
    throw new Error('Identificador de registro requerido');
  }

  const docRef = doc(db, COLECCION_HISTORIAL_PRECIOS, cleanId);
  const snap = await getDoc(docRef);
  if (!snap.exists() || snap.data().negocioId !== tenantId) {
    throw new Error('El registro de precio no pertenece al negocio activo');
  }

  await deleteDoc(docRef);
}
