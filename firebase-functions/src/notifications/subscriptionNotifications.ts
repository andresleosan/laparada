// firebase-functions/src/notifications/subscriptionNotifications.ts
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resendApiKey } from '../config/integrationParams';
import {
  enviarCorreoTransaccional,
  renderPlantillaAlerta,
  renderPlantillaSuscripcion,
} from './emailNotificationService';

const getDb = () => admin.firestore();

interface PlanInfo {
  nombre: string;
  dias: number;
  cuotaRespuestasIA: number;
}

const PLANES_INFO: Record<string, PlanInfo> = {
  prueba_3d: { nombre: 'Prueba 3 días', dias: 3, cuotaRespuestasIA: 300 },
  semanal_7d: { nombre: 'Semanal (7 días)', dias: 7, cuotaRespuestasIA: 700 },
  quincenal_15d: { nombre: 'Quincenal (15 días)', dias: 15, cuotaRespuestasIA: 1500 },
  mensual_30d: { nombre: 'Mensual (30 días)', dias: 30, cuotaRespuestasIA: 3000 },
  enterprise: { nombre: 'Enterprise Insignia', dias: 365, cuotaRespuestasIA: 100000 },
};

/**
 * 1. Cloud Function callable para disparar la confirmación por correo de activación o renovación.
 */
export const notificarSuscripcionEmail = onCall(
  {
    secrets: [resendApiKey],
    region: 'us-central1',
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Se requiere autenticación.');
    }

    const isSuperAdmin = request.auth.token?.email === 'andres.san1404@gmail.com';
    const { negocioId, tipoAccion, planId } = (request.data || {}) as {
      negocioId?: string;
      tipoAccion?: 'activacion' | 'renovacion';
      planId?: string;
    };

    if (!negocioId || typeof negocioId !== 'string') {
      throw new HttpsError('invalid-argument', 'El parámetro negocioId es obligatorio.');
    }

    // Solo SuperAdmin o administradores de la plataforma pueden disparar notificaciones de suscripción
    if (!isSuperAdmin) {
      const userDoc = await getDb().collection('usuarios_negocio').doc(request.auth.uid).get();
      if (!userDoc.exists || userDoc.data()?.rol !== 'admin') {
        throw new HttpsError('permission-denied', 'Solo administradores pueden enviar notificaciones de suscripción.');
      }
    }

    const db = getDb();
    const negDoc = await db.collection('negocios').doc(negocioId).get();
    if (!negDoc.exists) {
      throw new HttpsError('not-found', 'El negocio no existe.');
    }

    const negData = negDoc.data() || {};
    const nombreNegocio = (negData.nombre as string) || negocioId;
    const slug = (negData.slug as string) || negocioId;
    const destinatario = (negData.propietarioEmail as string) || '';
    const propietarioNombre = (negData.propietarioNombre as string) || 'Administrador';

    if (!destinatario || !destinatario.includes('@')) {
      throw new HttpsError('failed-precondition', 'El negocio no tiene un correo de propietario válido.');
    }

    const resolvedPlanId = planId || negData.planId || negData.plan || 'prueba_3d';
    const planConfig = PLANES_INFO[resolvedPlanId] || PLANES_INFO.prueba_3d;

    // Calcular fecha de vencimiento texto
    let fechaVencimientoTexto = 'Suscripción activa permanente';
    if (negData.suscripcionVenceEn) {
      const d =
        typeof negData.suscripcionVenceEn.toDate === 'function'
          ? negData.suscripcionVenceEn.toDate()
          : typeof negData.suscripcionVenceEn.seconds === 'number'
            ? new Date(negData.suscripcionVenceEn.seconds * 1000)
            : new Date(negData.suscripcionVenceEn);

      fechaVencimientoTexto = d.toLocaleDateString('es-CO', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }

    const accion = tipoAccion === 'renovacion' ? 'renovacion' : 'activacion';
    const html = renderPlantillaSuscripcion({
      nombreNegocio,
      slug,
      propietarioNombre,
      tipoAccion: accion,
      planNombre: planConfig.nombre,
      diasVigencia: planConfig.dias,
      cuotaRespuestasIA: negData.cuotaRespuestasIA || planConfig.cuotaRespuestasIA,
      fechaVencimientoTexto,
    });

    const asunto =
      accion === 'activacion'
        ? `🎉 ¡Bienvenido a La Parada SaaS! Tu local "${nombreNegocio}" está activo`
        : `✅ Suscripción Renovada con Éxito · ${nombreNegocio} (${planConfig.nombre})`;

    const res = await enviarCorreoTransaccional(
      {
        negocioId,
        tipo: accion === 'activacion' ? 'activacion_plan' : 'renovacion_plan',
        destinatario,
        asunto,
        html,
        resendApiKey: resendApiKey.value(),
        metadata: {
          planId: resolvedPlanId,
          tipoAccion: accion,
          solicitadoPorUid: request.auth.uid,
        },
      },
      db
    );

    return {
      exito: res.estado !== 'fallido',
      estado: res.estado,
      destinatario,
      plan: planConfig.nombre,
      error: res.error,
    };
  }
);

/**
 * 2. Cloud Function programada para las 9:00 AM (hora Colombia)
 * Detecta negocios con suscripción por vencer (≤ 48 h) o consumo alto de IA (≥ 85%).
 */
export const verificarAlertasSuscripciones = onSchedule(
  {
    schedule: '0 9 * * *',
    timeZone: 'America/Bogota',
    secrets: [resendApiKey],
    region: 'us-central1',
    timeoutSeconds: 300,
    memory: '512MiB',
  },
  async () => {
    const db = getDb();
    console.info('[verificarAlertasSuscripciones] Verificando vencimientos y cuotas de Sarin IA (9:00 AM Col)...');

    const snap = await db.collection('negocios').where('estado', '==', 'activo').get();
    const ahora = Date.now();
    const dosDiasMs = 48 * 3600 * 1000;
    const unDiaAtras = new Date(ahora - 24 * 3600 * 1000);

    let alertasVencimientoEnviadas = 0;
    let alertasCuotaEnviadas = 0;

    for (const doc of snap.docs) {
      const negocioId = doc.id;
      if (negocioId === 'laparada') continue; // Insignia permanente

      const data = doc.data();
      const propietarioEmail = data.propietarioEmail as string | undefined;
      const propietarioNombre = (data.propietarioNombre as string) || 'Administrador';
      const nombreNegocio = (data.nombre as string) || negocioId;

      if (!propietarioEmail || !propietarioEmail.includes('@')) continue;

      // 1. Verificar vencimiento próximo (≤ 48 horas)
      if (data.suscripcionVenceEn) {
        const venceEnMs =
          typeof data.suscripcionVenceEn.toDate === 'function'
            ? data.suscripcionVenceEn.toDate().getTime()
            : typeof data.suscripcionVenceEn.seconds === 'number'
              ? data.suscripcionVenceEn.seconds * 1000
              : new Date(data.suscripcionVenceEn).getTime();

        const diffMs = venceEnMs - ahora;
        if (diffMs > 0 && diffMs <= dosDiasMs) {
          // Validar que no se haya enviado alerta en las últimas 24 horas
          const prevNotif = await db
            .collection('notificaciones_correo')
            .where('negocioId', '==', negocioId)
            .where('tipo', '==', 'alerta_vencimiento')
            .where('enviadoEn', '>=', unDiaAtras)
            .limit(1)
            .get();

          if (prevNotif.empty) {
            const diasRestantes = Math.max(1, Math.ceil(diffMs / (24 * 3600 * 1000)));
            const html = renderPlantillaAlerta({
              nombreNegocio,
              propietarioNombre,
              tipoAlerta: 'vencimiento_proximo',
              diasRestantes,
            });

            await enviarCorreoTransaccional(
              {
                negocioId,
                tipo: 'alerta_vencimiento',
                destinatario: propietarioEmail,
                asunto: `⚠️ Tu suscripción de ${nombreNegocio} vence en ${diasRestantes} día(s)`,
                html,
                resendApiKey: resendApiKey.value(),
                metadata: { diasRestantes },
              },
              db
            );
            alertasVencimientoEnviadas++;
          }
        }
      }

      // 2. Verificar consumo de Sarin IA (≥ 85%)
      const cuota = (data.cuotaRespuestasIA as number) || 300;
      const usadas = (data.respuestasIAUsadas as number) || 0;
      if (cuota > 0) {
        const pct = Math.round((usadas / cuota) * 100);
        if (pct >= 85) {
          const prevNotifIA = await db
            .collection('notificaciones_correo')
            .where('negocioId', '==', negocioId)
            .where('tipo', '==', 'alerta_cuota_ia')
            .where('enviadoEn', '>=', unDiaAtras)
            .limit(1)
            .get();

          if (prevNotifIA.empty) {
            const html = renderPlantillaAlerta({
              nombreNegocio,
              propietarioNombre,
              tipoAlerta: 'cuota_ia_agotandose',
              porcentajeUsoIA: pct,
              respuestasUsadas: usadas,
              cuotaTotal: cuota,
            });

            await enviarCorreoTransaccional(
              {
                negocioId,
                tipo: 'alerta_cuota_ia',
                destinatario: propietarioEmail,
                asunto: `⚡ Cuota de Sarin IA al ${pct}% en ${nombreNegocio}`,
                html,
                resendApiKey: resendApiKey.value(),
                metadata: { porcentajeUsoIA: pct, usadas, cuota },
              },
              db
            );
            alertasCuotaEnviadas++;
          }
        }
      }
    }

    console.info(
      `[verificarAlertasSuscripciones] Alertas enviadas: ${alertasVencimientoEnviadas} vencimiento, ${alertasCuotaEnviadas} cuota IA.`
    );
  }
);

