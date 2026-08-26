const TENANT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function requireTenantId(value: string): string {
  const tenantId = value?.trim();
  if (!tenantId || !TENANT_ID_PATTERN.test(tenantId)) {
    throw new Error('El negocio activo no tiene un identificador válido');
  }
  return tenantId;
}
