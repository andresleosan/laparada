import * as admin from 'firebase-admin';
import type { DocumentData, Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import {
  buildOrderTrackingProjection,
  generateTrackingToken,
  hashOrderReference,
  isValidTrackingTenantId,
  isValidTrackingToken,
  mergeTrackingHistory,
  TRACKING_COLLECTION,
} from './orderTracking';

export type OrderTrackingSyncResult = 'deleted' | 'ignored' | 'token_assigned' | 'synced';

async function deleteProjectionIfOwned(db: Firestore, token: string, domicilioId: string): Promise<void> {
  const ref = db.collection(TRACKING_COLLECTION).doc(token);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists && snapshot.data()?.pedidoRef === hashOrderReference(domicilioId)) {
      transaction.delete(ref);
    }
  });
}

/**
 * Mantiene `rastreo_pedidos/{token}` sincronizado con `domicilios/{domicilioId}`.
 * - Pedido eliminado: elimina su proyección pública.
 * - Pedido sin token (p. ej. creado desde el POS): asigna uno; la reescritura
 *   vuelve a disparar el trigger y entonces se crea la proyección.
 * - Resto de escrituras: reescribe la proyección saneada conservando el historial.
 */
export async function syncOrderTracking(
  db: Firestore,
  domicilioId: string,
  before: DocumentData | undefined,
  after: DocumentData | undefined
): Promise<OrderTrackingSyncResult> {
  if (!after) {
    if (isValidTrackingToken(before?.rastreoToken)) {
      await deleteProjectionIfOwned(db, before.rastreoToken, domicilioId);
    }
    return 'deleted';
  }

  if (!isValidTrackingTenantId(after.negocioId)) {
    return 'ignored';
  }

  const token = after.rastreoToken;
  if (!isValidTrackingToken(token)) {
    await db.collection('domicilios').doc(domicilioId).update({
      rastreoToken: generateTrackingToken(),
    });
    return 'token_assigned';
  }

  if (isValidTrackingToken(before?.rastreoToken) && before.rastreoToken !== token) {
    await deleteProjectionIfOwned(db, before.rastreoToken, domicilioId);
  }

  const negocioSnapshot = await db.collection('negocios').doc(after.negocioId).get();
  const projection = buildOrderTrackingProjection(
    domicilioId,
    after,
    negocioSnapshot.exists ? negocioSnapshot.data() : undefined
  );
  const ref = db.collection(TRACKING_COLLECTION).doc(token);

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const existing = snapshot.data();
    if (snapshot.exists && existing?.pedidoRef !== projection.pedidoRef) {
      throw new Error('El token de rastreo pertenece a otro pedido');
    }
    const reachedAt = projection.estado === 'pendiente' && projection.creadoEn
      ? projection.creadoEn
      : FieldValue.serverTimestamp();
    transaction.set(ref, {
      ...projection,
      historial: mergeTrackingHistory(existing?.historial, projection.estado, reachedAt),
      sincronizadoEn: FieldValue.serverTimestamp(),
    });
  });

  return 'synced';
}

export const sincronizarRastreoPedido = onDocumentWritten(
  {
    document: 'domicilios/{domicilioId}',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
    maxInstances: 10,
  },
  async (event) => {
    const domicilioId = event.params.domicilioId;
    try {
      await syncOrderTracking(
        admin.firestore(),
        domicilioId,
        event.data?.before.exists ? event.data.before.data() : undefined,
        event.data?.after.exists ? event.data.after.data() : undefined
      );
    } catch (error) {
      console.error('No fue posible sincronizar el rastreo del pedido', {
        domicilioId,
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }
);

