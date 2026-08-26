import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';
import { assertValidAdminProfile, canAccessAdmin } from '../adminAuthorization';
import type { UsuarioNegocio } from '../../types/negocio';

const identity = { uid: 'user-1', email: 'admin@example.com' };
const profile: UsuarioNegocio = {
  uid: identity.uid,
  email: identity.email,
  nombre: 'Admin',
  negocioId: 'laparada',
  rol: 'admin',
  activo: true,
  creadoEn: Timestamp.fromMillis(0),
};

describe('autorización administrativa del cliente', () => {
  it('acepta únicamente un perfil activo que coincide con la identidad', () => {
    expect(() => assertValidAdminProfile(profile, identity)).not.toThrow();
    expect(
      canAccessAdmin({ isAuthenticated: true, isSuperAdmin: false, profile })
    ).toBe(true);
  });

  it.each([
    ['UID diferente', { ...profile, uid: 'other' }],
    ['email diferente', { ...profile, email: 'other@example.com' }],
    ['perfil inactivo', { ...profile, activo: false }],
    ['tenant inválido', { ...profile, negocioId: '../otro' }],
    ['rol inválido', { ...profile, rol: 'superadmin' }],
  ])('rechaza %s', (_caseName, invalidProfile) => {
    expect(() =>
      assertValidAdminProfile(invalidProfile as UsuarioNegocio, identity)
    ).toThrow();
  });

  it('niega acceso sin sesión o sin perfil', () => {
    expect(
      canAccessAdmin({ isAuthenticated: false, isSuperAdmin: false, profile })
    ).toBe(false);
    expect(
      canAccessAdmin({ isAuthenticated: true, isSuperAdmin: false, profile: null })
    ).toBe(false);
  });

  it('permite al superadmin solo cuando existe una sesión autenticada', () => {
    expect(
      canAccessAdmin({ isAuthenticated: true, isSuperAdmin: true, profile: null })
    ).toBe(true);
    expect(
      canAccessAdmin({ isAuthenticated: false, isSuperAdmin: true, profile: null })
    ).toBe(false);
  });
});

