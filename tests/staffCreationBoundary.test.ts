import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('frontera del alta de personal', () => {
  it('usa la callable y no crea identidades desde la sesión administrativa', () => {
    const page = readFileSync(resolve('src/pages/AdminSettingsPage.tsx'), 'utf8');
    const service = readFileSync(resolve('src/services/staffService.ts'), 'utf8');
    const legacyService = readFileSync(resolve('src/services/negociosService.ts'), 'utf8');

    expect(page).toContain("from '@/services/staffService'");
    expect(service).toContain("'crearUsuarioPersonal'");
    expect(service).toContain('limitedUseAppCheckTokens: true');
    expect(legacyService).not.toContain('export async function registrarUsuarioParaNegocio');
  });

  it('reserva la configuración de equipo a admin y superadmin', () => {
    const protectedApp = readFileSync(resolve('src/ProtectedApp.tsx'), 'utf8');
    const navigation = readFileSync(resolve('src/components/layout/BottomNav.tsx'), 'utf8');

    expect(protectedApp).toContain("esSuperAdmin || usuarioNegocio?.rol === 'admin'");
    expect(navigation).toContain("item.path !== '/admin-settings'");
    expect(navigation).toContain("usuarioNegocio?.rol === 'admin'");
  });
});
