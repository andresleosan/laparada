import { httpsCallable } from 'firebase/functions';
import { functions } from '@/services/firebase';

/**
 * Change admin PIN via Cloud Function
 */
export async function changeAdminPin(
  currentPin: string,
  newPin: string,
  confirmNewPin: string
): Promise<{ success: boolean; message: string }> {
  try {
    const changePinFunction = httpsCallable(functions, 'changeAdminPin');
    const result = await changePinFunction({
      currentPin,
      newPin,
      confirmNewPin,
    });

    return result.data as { success: boolean; message: string };
  } catch (error: any) {
    console.error('Error changing PIN:', error);
    throw new Error(
      error.message ||
        'Error al cambiar el PIN: ' + error.code
    );
  }
}

/**
 * Verify admin PIN via Cloud Function
 */
export async function verifyAdminPin(pin: string): Promise<boolean> {
  try {
    const verifyPinFunction = httpsCallable(functions, 'verifyAdminPin');
    const result = await verifyPinFunction({ pin });

    return (result.data as { valid: boolean }).valid;
  } catch (error: any) {
    console.error('Error verifying PIN:', error);
    throw new Error(
      error.message ||
        'Error al verificar el PIN: ' + error.code
    );
  }
}
