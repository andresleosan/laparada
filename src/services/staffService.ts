import { httpsCallable } from 'firebase/functions';
import { appCheckConfigured, functions } from './firebase';

export interface CreateStaffUserRequest {
  negocioId: string;
  nombre: string;
  email: string;
  password: string;
  rol: 'admin' | 'cajero';
}

export interface CreatedStaffUserResponse {
  uid: string;
  negocioId: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'cajero';
  activo: true;
}

function staffErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code: unknown }).code)
    : '';
  const messages: Record<string, string> = {
    'functions/invalid-argument': 'Revisa el nombre, correo, contraseña y rol.',
    'functions/unauthenticated': 'Tu sesión expiró. Inicia sesión de nuevo.',
    'functions/permission-denied': 'No tienes permiso para crear personal.',
    'functions/already-exists': 'Ya existe un usuario con ese correo.',
    'functions/failed-precondition': 'El negocio no está activo o la solicitud ya fue usada.',
    'functions/internal': 'No fue posible crear el usuario. Intenta de nuevo.',
  };
  return messages[code] || 'No fue posible crear el usuario. Intenta de nuevo.';
}

export async function registrarUsuarioParaNegocio(
  request: CreateStaffUserRequest
): Promise<CreatedStaffUserResponse> {
  if (!functions || !appCheckConfigured) {
    throw new Error('El alta segura de personal no está disponible en este entorno');
  }

  const callable = httpsCallable<CreateStaffUserRequest, CreatedStaffUserResponse>(
    functions,
    'crearUsuarioPersonal',
    {
      timeout: 20_000,
      limitedUseAppCheckTokens: true,
    }
  );

  try {
    const result = await callable(request);
    return result.data;
  } catch (error) {
    throw new Error(staffErrorMessage(error));
  }
}

