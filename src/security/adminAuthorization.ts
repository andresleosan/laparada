import type { RolUsuarioNegocio, UsuarioNegocio } from '../types/negocio';

export interface AuthenticatedIdentity {
  uid: string;
  email: string;
}

export const OPERATIONAL_ROLES = ['admin', 'cajero', 'domiciliario', 'cocinero'] as const;

export function isOperationalRole(rol: unknown): rol is RolUsuarioNegocio {
  return typeof rol === 'string' && (OPERATIONAL_ROLES as readonly string[]).includes(rol);
}

export function assertValidAdminProfile(
  profile: UsuarioNegocio,
  identity: AuthenticatedIdentity
): void {
  const expectedEmail = identity.email.trim().toLowerCase();
  const profileEmail = typeof profile.email === 'string' ? profile.email.trim().toLowerCase() : '';

  if (
    profile.uid !== identity.uid ||
    profileEmail !== expectedEmail ||
    profile.activo !== true ||
    !isOperationalRole(profile.rol) ||
    typeof profile.negocioId !== 'string' ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(profile.negocioId)
  ) {
    throw new Error('Tu perfil administrativo no está activo o no coincide con tu identidad');
  }
}

export function canAccessAdmin(input: {
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  profile: UsuarioNegocio | null;
}): boolean {
  if (!input.isAuthenticated) return false;
  if (input.isSuperAdmin) return true;
  return Boolean(input.profile?.activo && isOperationalRole(input.profile.rol));
}

export function isDeliveryRole(profile: UsuarioNegocio | null): boolean {
  return profile?.activo === true && profile.rol === 'domiciliario';
}

export function isCookRole(profile: UsuarioNegocio | null): boolean {
  return profile?.activo === true && profile.rol === 'cocinero';
}

