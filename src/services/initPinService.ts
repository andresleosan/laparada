import { httpsCallable, getFunctions } from 'firebase/functions';
import { functions } from '@/services/firebase';
import app from '@/services/firebase';

/**
 * Initialize admin PIN (one-time setup)
 * Creates the initial PIN configuration in Firestore
 */
export async function initializeAdminPin(pin: string): Promise<{ success: boolean; message: string }> {
  try {
    // Use getFunctions directly as fallback if functions import is null
    const functionsInstance = functions || getFunctions(app);
    
    console.log('Calling initializeAdminPin with functions:', { 
      functionsInstance: !!functionsInstance,
      pin: pin.substring(0, 1) + '*'.repeat(5)
    });
    
    const initializePinFunction = httpsCallable(functionsInstance, 'initializeAdminPin');
    const result = await initializePinFunction({ pin });
    return result.data as { success: boolean; message: string };
  } catch (error: any) {
    console.error('Error calling initializeAdminPin:', error);
    const message = error.message || 'Error al inicializar PIN';
    throw new Error(message);
  }
}
