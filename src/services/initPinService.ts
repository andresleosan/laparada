import { functions } from '@/services/firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * Initialize admin PIN (one-time setup)
 * Creates the initial PIN configuration in Firestore
 */
export async function initializeAdminPin(pin: string): Promise<{ success: boolean; message: string }> {
  try {
    const initializePinFunction = httpsCallable(functions, 'initializeAdminPin');
    const result = await initializePinFunction({ pin });
    return result.data as { success: boolean; message: string };
  } catch (error: any) {
    const message = error.message || 'Error al inicializar PIN';
    throw new Error(message);
  }
}
