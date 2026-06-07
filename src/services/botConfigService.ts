import {

  getDoc,
  doc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { ConfiguracionBot } from '../types';

/**
 * Obtener configuración actual del bot WhatsApp
 */
export async function getBotConfig(): Promise<ConfiguracionBot | null> {
  try {
    const docRef = doc(db, 'configuracion', 'bot_config');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data() as ConfiguracionBot;
    }
    return null;
  } catch (error) {
    console.error('Error fetching bot config:', error);
    return null;
  }
}

/**
 * Actualizar configuración del bot
 */
export async function updateBotConfig(updates: Partial<ConfiguracionBot>): Promise<void> {
  try {
    const docRef = doc(db, 'configuracion', 'bot_config');
    await updateDoc(docRef, updates);
  } catch (error) {
    console.error('Error updating bot config:', error);
    throw error;
  }
}

/**
 * Listener en tiempo real para cambios en config del bot
 */
export function onBotConfigChange(
  callback: (config: ConfiguracionBot | null) => void
): () => void {
  const docRef = doc(db, 'configuracion', 'bot_config');
  return onSnapshot(docRef, (snapshot: any) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as ConfiguracionBot);
    } else {
      callback(null);
    }
  });
}

/**
 * Validar webhook de Meta (HMAC signature verification)
 * TODO: Implementar verificación de firma HMAC correctamente
 */
export function validateWebhookSignature(
  signature: string,
  body: string,
  whatsappToken: string
): boolean {
  // Placeholder: En producción, verificar HMAC-SHA256
  // const crypto = require('crypto');
  // const hash = crypto.createHmac('sha256', whatsappToken).update(body).digest('hex');
  // return `sha256=${hash}` === signature;
  console.warn('⚠️ Webhook signature validation is a placeholder. Implement HMAC in production.');
  return true;
}
