// src/services/emailNotificationsService.ts
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from './firebase';
import { requireTenantId } from '@/security/tenantScope';
import {
  NotificacionCorreo,
  ResumenDiarioResponse,
  EnviarResumenDiarioResult,
} from '@/types/notificacion';
import { TipoPlanSaaS } from '@/types/negocio';

/**
 * Consulta la previsualización del resumen diario calculado para un negocio.
 */
export async function obtenerResumenDiarioActual(
  negocioId: string,
  fecha?: string
): Promise<ResumenDiarioResponse> {
  const tenantId = requireTenantId(negocioId);

  if (!functions) {
    throw new Error('El servicio de Cloud Functions no está disponible.');
  }

  const callable = httpsCallable<{ negocioId: string; fecha?: string }, ResumenDiarioResponse>(
    functions,
    'obtenerResumenDiario'
  );

  const response = await callable({ negocioId: tenantId, fecha });
  return response.data;
}

/**
 * Dispara el envío manual del resumen ejecutivo diario por correo vía Cloud Functions.
 */
export async function enviarResumenDiarioPorCorreo(
  negocioId: string,
  fecha?: string
): Promise<EnviarResumenDiarioResult> {
  const tenantId = requireTenantId(negocioId);

  if (!functions) {
    throw new Error('El servicio de Cloud Functions no está disponible.');
  }

  const callable = httpsCallable<{ negocioId: string; fecha?: string }, EnviarResumenDiarioResult>(
    functions,
    'enviarResumenDiarioManual'
  );

  const response = await callable({ negocioId: tenantId, fecha });
  return response.data;
}

/**
 * Dispara la notificación por correo de activación o renovación de plan SaaS.
 */
export async function notificarSuscripcion(
  negocioId: string,
  tipoAccion: 'activacion' | 'renovacion',
  planId: TipoPlanSaaS
): Promise<{ exito: boolean; estado: string; error?: string }> {
  try {
    const tenantId = requireTenantId(negocioId);

    if (!functions) {
      console.warn('[emailNotificationsService] Functions no disponible para notificar suscripción.');
      return { exito: false, estado: 'no_disponible' };
    }

    const callable = httpsCallable<
      { negocioId: string; tipoAccion: 'activacion' | 'renovacion'; planId: string },
      { exito: boolean; estado: string; error?: string }
    >(functions, 'notificarSuscripcionEmail');

    const response = await callable({ negocioId: tenantId, tipoAccion, planId });
    return response.data;
  } catch (error) {
    console.warn('[emailNotificationsService] Error enviando correo de suscripción:', error);
    return {
      exito: false,
      estado: 'fallido',
      error: error instanceof Error ? error.message : 'Error al despachar notificación',
    };
  }
}

/**
 * Obtiene el historial reciente de correos transaccionales enviados a un negocio.
 */
export async function getNotificacionesCorreoDeNegocio(
  negocioId: string,
  limiteRegistros = 10
): Promise<NotificacionCorreo[]> {
  const tenantId = requireTenantId(negocioId);

  try {
    const q = query(
      collection(db, 'notificaciones_correo'),
      where('negocioId', '==', tenantId),
      orderBy('enviadoEn', 'desc'),
      limit(limiteRegistros)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<NotificacionCorreo, 'id'>),
    }));
  } catch (error) {
    console.error(`[emailNotificationsService] Error obteniendo historial de correos para ${tenantId}:`, error);
    return [];
  }
}

