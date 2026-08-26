import type { UsuarioNegocio } from '../types/negocio';

export interface AuthenticatedIdentity {
  uid: string;
  email: string;
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
    !['admin', 'cajero'].includes(profile.rol) ||
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
  return Boolean(input.profile?.activo && ['admin', 'cajero'].includes(input.profile.rol));
}

