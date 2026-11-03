// firebase-functions/src/notifications/dailySummaryFunctions.ts
import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resendApiKey } from '../config/integrationParams';
import {
  aggregateDailySummary,
  getColombiaDayRange,
} from './dailySummaryAggregator';
import {
  enviarCorreoTransaccional,
  renderPlantillaResumenDiario,
} from './emailNotificationService';

const getDb = () => admin.firestore();

/**
 * Verifica si un UID de usuario tiene privilegios administrativos sobre un negocio específico
 */
async function assertUserHasTenantAdmin(
  auth: { uid: string; token?: { email?: string } } | undefined,
  negocioId: string
): Promise<void> {
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Se requiere autenticación para esta acción.');
  }

  const isSuperAdmin = auth.token?.email === 'andres.san1404@gmail.com';
  if (isSuperAdmin) {
    return;
  }

  const userDoc = await getDb().collection('usuarios_negocio').doc(auth.uid).get();
  if (!userDoc.exists) {
    throw new HttpsError('permission-denied', 'No tienes un perfil administrativo registrado.');
  }

  const userData = userDoc.data();
  if (
    userData?.negocioId !== negocioId ||
    userData?.activo !== true ||
    userData?.rol !== 'admin'
  ) {
    throw new HttpsError(
      'permission-denied',
      'No tienes permisos de administrador para este negocio.'
    );
  }
}

/**
 * Verifica si un UID de usuario tiene acceso de consulta a un negocio
 */
async function assertUserHasTenantAccess(
  auth: { uid: string; token?: { email?: string } } | undefined,
  negocioId: string
): Promise<void> {
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Se requiere autenticación para esta acción.');
  }

  const isSuperAdmin = auth.token?.email === 'andres.san1404@gmail.com';
  if (isSuperAdmin) {
    return;
  }

  const userDoc = await getDb().collection('usuarios_negocio').doc(auth.uid).get();
  if (!userDoc.exists) {
    throw new HttpsError('permission-denied', 'No tienes acceso a este negocio.');
  }

  const userData = userDoc.data();
  if (userData?.negocioId !== negocioId || userData?.activo !== true) {
    throw new HttpsError('permission-denied', 'No tienes acceso activo a este negocio.');
  }
}

/**
 * 1. Cloud Function programada para las 11:00 PM (hora Colombia)
 * Despacha el resumen diario de ventas y productividad a cada negocio activo.
 */
export const enviarResumenDiarioNegocios = onSchedule(
  {
    schedule: '0 23 * * *',
    timeZone: 'America/Bogota',
    secrets: [resendApiKey],
    region: 'us-central1',
    timeoutSeconds: 300,
    memory: '512MiB',
  },
  async () => {
    const db = getDb();
    console.info('[enviarResumenDiarioNegocios] Iniciando despacho automático de resumen diario (11:00 PM Col)...');

    const snap = await db.collection('negocios').where('estado', '==', 'activo').get();
    const negociosProcesar = new Set<string>();

    snap.forEach((doc) => {
      negociosProcesar.add(doc.id);
    });

    // Asegurar negocio insignia La Parada
    negociosProcesar.add('laparada');

    let enviados = 0;
    let fallidos = 0;
    let omitidos = 0;

    for (const negocioId of negociosProcesar) {
      try {
        const negDoc = await db.collection('negocios').doc(negocioId).get();
        const negData = negDoc.data() || {};

        if (negData.recibirResumenDiarioEmail === false) {
          console.info(`[enviarResumenDiarioNegocios] Negocio ${negocioId} tiene el resumen diario desactivado.`);
          omitidos++;
          continue;
        }

        const summary = await aggregateDailySummary(negocioId, undefined, db);
        const html = renderPlantillaResumenDiario(summary.plantillaData);
        const asunto = `📊 Resumen Ejecutivo Diario · ${summary.nombreNegocio} (${summary.fechaTexto})`;

        const res = await enviarCorreoTransaccional(
          {
            negocioId,
            tipo: 'resumen_diario',
            destinatario: summary.destinatarioEmail,
            asunto,
            html,
            resendApiKey: resendApiKey.value(),
            metadata: {
              origen: 'cron_11pm',
              totalVentasCOP: summary.plantillaData.totalVentasCOP,
              cantidadVentas: summary.plantillaData.cantidadVentas,
            },
          },
          db
        );

        if (res.estado === 'enviado' || res.estado === 'simulado') {
          enviados++;
        } else {
          fallidos++;
        }
      } catch (err) {
        console.error(`[enviarResumenDiarioNegocios] Error procesando resumen para ${negocioId}:`, err);
        fallidos++;
      }
    }

    console.info(
      `[enviarResumenDiarioNegocios] Finalizado: ${enviados} enviados, ${fallidos} fallidos, ${omitidos} omitidos.`
    );
  }
);

/**
 * 2. Cloud Function callable para enviar el resumen diario bajo demanda desde el Dashboard o Reportes.
 */
export const enviarResumenDiarioManual = onCall(
  {
    secrets: [resendApiKey],
    region: 'us-central1',
    timeoutSeconds: 30,
    memory: '256MiB',
  },
  async (request) => {
    const { negocioId, fecha } = (request.data || {}) as {
      negocioId?: string;
      fecha?: string;
    };

    if (!negocioId || typeof negocioId !== 'string') {
      throw new HttpsError('invalid-argument', 'El parámetro negocioId es obligatorio.');
    }

    await assertUserHasTenantAdmin(request.auth, negocioId);

    const db = getDb();
    const summary = await aggregateDailySummary(negocioId, fecha, db);
    const html = renderPlantillaResumenDiario(summary.plantillaData);
    const asunto = `📊 Resumen Ejecutivo Diario · ${summary.nombreNegocio} (${summary.fechaTexto})`;

    const res = await enviarCorreoTransaccional(
      {
        negocioId,
        tipo: 'resumen_diario',
        destinatario: summary.destinatarioEmail,
        asunto,
        html,
        resendApiKey: resendApiKey.value(),
        metadata: {
          origen: 'manual_dashboard',
          solicitadoPorUid: request.auth?.uid,
          totalVentasCOP: summary.plantillaData.totalVentasCOP,
          cantidadVentas: summary.plantillaData.cantidadVentas,
        },
      },
      db
    );

    return {
      exito: res.estado !== 'fallido',
      estado: res.estado,
      destinatario: summary.destinatarioEmail,
      fechaTexto: summary.fechaTexto,
      totalVentasCOP: summary.plantillaData.totalVentasCOP,
      cantidadVentas: summary.plantillaData.cantidadVentas,
      error: res.error,
    };
  }
);

/**
 * 3. Cloud Function callable para obtener el resumen del día (previsualización en vivo).
 */
export const obtenerResumenDiario = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 20,
    memory: '256MiB',
  },
  async (request) => {
    const { negocioId, fecha } = (request.data || {}) as {
      negocioId?: string;
      fecha?: string;
    };

    if (!negocioId || typeof negocioId !== 'string') {
      throw new HttpsError('invalid-argument', 'El parámetro negocioId es obligatorio.');
    }

    await assertUserHasTenantAccess(request.auth, negocioId);

    const db = getDb();
    const summary = await aggregateDailySummary(negocioId, fecha, db);

    return {
      negocioId: summary.negocioId,
      nombreNegocio: summary.nombreNegocio,
      slug: summary.slug,
      destinatarioEmail: summary.destinatarioEmail,
      propietarioNombre: summary.propietarioNombre,
      fechaISO: summary.fechaISO,
      fechaTexto: summary.fechaTexto,
      datos: summary.plantillaData,
    };
  }
);

