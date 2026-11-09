import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { requireTenantId } from '@/security/tenantScope';
import type {
  EncuestaSatisfaccion,
  CrearEncuestaSatisfaccionInput,
  ConfiguracionSatisfaccion,
  EstadoEncuestaSatisfaccion,
} from '@/types/satisfaccion';
import {
  evaluarTipoNps,
  esEncuestaQueja,
  getConfiguracionSatisfaccionDefault,
  parseFechaEncuesta,
} from '@/utils/satisfaccionUtils';
import { crearAlertaSilenciosa } from './notificacionesService';

export const COLECCION_ENCUESTAS_SATISFACCION = 'encuestas_satisfaccion';
export const COLECCION_CONFIGURACIONES_SATISFACCION = 'configuraciones_satisfaccion';

/**
 * Guarda una nueva encuesta de satisfacción respondida por el comensal
 */
export async function guardarEncuestaSatisfaccion(
  negocioId: string,
  input: CrearEncuestaSatisfaccionInput
): Promise<string> {
  const tenantId = requireTenantId(negocioId);

  const calificacion = Math.min(5, Math.max(1, Math.round(input.calificacion || 5)));
  const tipoNps = evaluarTipoNps(calificacion);
  const esQueja = esEncuestaQueja(calificacion, input.tags);

  const payload: Omit<EncuestaSatisfaccion, 'id'> = {
    negocioId: tenantId,
    calificacion,
    tipoNps,
    canal: input.canal || 'mostrador_pos',
    ...(input.ventaId ? { ventaId: input.ventaId.trim() } : {}),
    ...(input.pedidoId ? { pedidoId: input.pedidoId.trim() } : {}),
    ...(input.mesaNombre ? { mesaNombre: input.mesaNombre.trim() } : {}),
    ...(input.meseroNombre ? { meseroNombre: input.meseroNombre.trim() } : {}),
    ...(input.clienteNombre ? { clienteNombre: input.clienteNombre.trim() } : {}),
    ...(input.clienteTelefono ? { clienteTelefono: input.clienteTelefono.trim() } : {}),
    ...(input.dimensiones ? { dimensiones: input.dimensiones } : {}),
    tags: Array.isArray(input.tags) ? input.tags : [],
    ...(input.comentario ? { comentario: input.comentario.trim() } : {}),
    esQueja,
    redirigidoGoogleReviews: Boolean(input.redirigidoGoogleReviews),
    contactadoPorWhatsApp: false,
    estado: 'nueva',
    creadoEn: new Date().toISOString(),
  };

  const docRef = await addDoc(
    collection(db, COLECCION_ENCUESTAS_SATISFACCION),
    payload
  );

  // Si califica como queja, dispara una alerta operativa al administrador
  if (esQueja) {
    const detalleCliente = input.clienteNombre
      ? ` de ${input.clienteNombre}`
      : input.mesaNombre
        ? ` en ${input.mesaNombre}`
        : '';
    const detalleComentario = input.comentario ? ` — "${input.comentario.slice(0, 60)}..."` : '';

    crearAlertaSilenciosa(tenantId, {
      modulo: 'pedidos',
      tipo: 'alerta_general',
      titulo: `⚠️ Queja de comensal recibida (${calificacion}⭐)${detalleCliente}`,
      mensaje: `Se registró una calificación crítica de ${calificacion} estrella(s)${detalleComentario}. Revisa el centro de satisfacción para contactar al cliente.`,
      urgencia: calificacion <= 1 ? 'critica' : 'alta',
      origen: 'automatico',
      enlace: '/satisfaccion',
    });
  }

  return docRef.id;
}

/**
 * Consulta todas las encuestas registradas para un negocio
 */
export async function getEncuestasSatisfaccion(
  negocioId: string
): Promise<EncuestaSatisfaccion[]> {
  const tenantId = requireTenantId(negocioId);
  const q = query(
    collection(db, COLECCION_ENCUESTAS_SATISFACCION),
    where('negocioId', '==', tenantId)
  );

  const snap = await getDocs(q);
  const items = snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<EncuestaSatisfaccion, 'id'>),
  }));

  // Ordenar en memoria por fecha descendente
  return items.sort((a, b) => {
    const fA = parseFechaEncuesta(a.creadoEn).getTime();
    const fB = parseFechaEncuesta(b.creadoEn).getTime();
    return fB - fA;
  });
}

/**
 * Suscripción en tiempo real a las encuestas de un negocio
 */
export function onEncuestasSatisfaccionChange(
  negocioId: string,
  callback: (encuestas: EncuestaSatisfaccion[]) => void
): () => void {
  const tenantId = requireTenantId(negocioId);
  const q = query(
    collection(db, COLECCION_ENCUESTAS_SATISFACCION),
    where('negocioId', '==', tenantId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<EncuestaSatisfaccion, 'id'>),
      }));

      items.sort((a, b) => {
        const fA = parseFechaEncuesta(a.creadoEn).getTime();
        const fB = parseFechaEncuesta(b.creadoEn).getTime();
        return fB - fA;
      });

      callback(items);
    },
    (err) => {
      console.error('Error al escuchar encuestas de satisfacción:', err);
    }
  );
}

/**
 * Actualiza el estado de seguimiento o notas de una encuesta
 */
export async function actualizarEstadoEncuesta(
  negocioId: string,
  encuestaId: string,
  datos: {
    estado?: EstadoEncuestaSatisfaccion;
    notasInternas?: string;
    contactadoPorWhatsApp?: boolean;
    atendidaPor?: string;
  }
): Promise<void> {
  requireTenantId(negocioId);
  if (!encuestaId) throw new Error('ID de encuesta requerido');

  const ref = doc(db, COLECCION_ENCUESTAS_SATISFACCION, encuestaId);
  const updatePayload: Record<string, unknown> = {
    actualizadoEn: new Date().toISOString(),
  };

  if (datos.estado) updatePayload.estado = datos.estado;
  if (datos.notasInternas !== undefined) updatePayload.notasInternas = datos.notasInternas.trim();
  if (datos.contactadoPorWhatsApp !== undefined) updatePayload.contactadoPorWhatsApp = datos.contactadoPorWhatsApp;
  if (datos.atendidaPor !== undefined) updatePayload.atendidaPor = datos.atendidaPor.trim();

  await updateDoc(ref, updatePayload);
}

/**
 * Elimina una encuesta del sistema (solo administradores)
 */
export async function eliminarEncuesta(negocioId: string, encuestaId: string): Promise<void> {
  requireTenantId(negocioId);
  if (!encuestaId) throw new Error('ID de encuesta requerido');
  await deleteDoc(doc(db, COLECCION_ENCUESTAS_SATISFACCION, encuestaId));
}

/**
 * Obtiene la configuración de satisfacción y Google Reviews de un negocio
 */
export async function getConfiguracionSatisfaccion(
  negocioId: string
): Promise<ConfiguracionSatisfaccion> {
  const tenantId = requireTenantId(negocioId);
  const snap = await getDoc(
    doc(db, COLECCION_CONFIGURACIONES_SATISFACCION, tenantId)
  );

  if (!snap.exists()) {
    return getConfiguracionSatisfaccionDefault(tenantId);
  }

  return {
    ...getConfiguracionSatisfaccionDefault(tenantId),
    ...(snap.data() as Partial<ConfiguracionSatisfaccion>),
    negocioId: tenantId,
  };
}

/**
 * Guarda o actualiza la configuración de satisfacción del negocio
 */
export async function guardarConfiguracionSatisfaccion(
  negocioId: string,
  config: Partial<ConfiguracionSatisfaccion>
): Promise<void> {
  const tenantId = requireTenantId(negocioId);
  const ref = doc(db, COLECCION_CONFIGURACIONES_SATISFACCION, tenantId);

  const payload: Record<string, unknown> = {
    negocioId: tenantId,
    actualizadoEn: serverTimestamp(),
  };

  if (config.googleBusinessUrl !== undefined) {
    payload.googleBusinessUrl = config.googleBusinessUrl.trim();
  }
  if (config.telefonoAtencionQuejas !== undefined) {
    payload.telefonoAtencionQuejas = config.telefonoAtencionQuejas.trim();
  }
  if (config.habilitarRedireccionGoogle !== undefined) {
    payload.habilitarRedireccionGoogle = Boolean(config.habilitarRedireccionGoogle);
  }
  if (config.mensajeAgradecimiento5Estrellas !== undefined) {
    payload.mensajeAgradecimiento5Estrellas = config.mensajeAgradecimiento5Estrellas.trim();
  }
  if (config.mensajeDisculpaQueja !== undefined) {
    payload.mensajeDisculpaQueja = config.mensajeDisculpaQueja.trim();
  }

  await setDoc(ref, payload, { merge: true });
}

/**
 * Suscripción reactiva en tiempo real a la configuración de satisfacción
 */
export function onConfiguracionSatisfaccionChange(
  negocioId: string,
  callback: (config: ConfiguracionSatisfaccion) => void
): () => void {
  const tenantId = requireTenantId(negocioId);
  const ref = doc(db, COLECCION_CONFIGURACIONES_SATISFACCION, tenantId);

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        callback(getConfiguracionSatisfaccionDefault(tenantId));
      } else {
        callback({
          ...getConfiguracionSatisfaccionDefault(tenantId),
          ...(snap.data() as Partial<ConfiguracionSatisfaccion>),
          negocioId: tenantId,
        });
      }
    },
    (err) => {
      console.error('Error al escuchar configuración de satisfacción:', err);
    }
  );
}
