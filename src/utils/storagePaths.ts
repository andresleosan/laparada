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
  const tenant = negocioId?.trim();

  // Los IDs creados por Firestore usan este conjunto. Conservar mayúsculas es
  // importante porque el ID también se compara en las reglas de seguridad.
  if (!tenant || !/^[A-Za-z0-9_-]{1,128}$/.test(tenant)) {
    throw new Error('El negocio activo no tiene un identificador válido');
  }

  return tenant;
}
