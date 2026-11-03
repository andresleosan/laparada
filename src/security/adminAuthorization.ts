import type { UsuarioNegocio } from '../types/negocio';

export interface AuthenticatedIdentity {
  uid: string;
  email: string;
}

export const OPERATIONAL_ROLES = ['admin', 'cajero', 'domiciliario', 'cocinero'] as const;

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
    !OPERATIONAL_ROLES.includes(profile.rol as any) ||
    typeof profile.negocioId !== 'string' ||
    !/^[A-Za-z0-9_-]{1,64}$/.test(profile.negocioId)
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
  return Boolean(input.profile?.activo && OPERATIONAL_ROLES.includes(input.profile.rol as any));
}

export function isDeliveryRole(profile: UsuarioNegocio | null): boolean {
  return profile?.activo === true && profile.rol === 'domiciliario';
}

