const SEGMENTO_MAXIMO = 80;

export function normalizarNombreParaStorage(value: string): string {
  const normalizado = (value || 'item')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SEGMENTO_MAXIMO);

  return normalizado || 'item';
}

export function validarNegocioIdParaStorage(negocioId: string): string {
  return requireTenantId(negocioId);
}
import { requireTenantId } from '@/security/tenantScope';
