import { describe, expect, it } from 'vitest';
import {
  normalizarNombreParaStorage,
  validarNegocioIdParaStorage,
} from '../storagePaths';

describe('storagePaths', () => {
  it('normaliza el nombre sin permitir separadores de ruta', () => {
    expect(normalizarNombreParaStorage('Pancerotí / Ranchero')).toBe(
      'panceroti-ranchero'
    );
  });

  it('usa un nombre seguro cuando el valor está vacío', () => {
    expect(normalizarNombreParaStorage('   ')).toBe('item');
  });

  it('conserva mayúsculas válidas del ID del tenant', () => {
    expect(validarNegocioIdParaStorage('AbC_123-xYz')).toBe('AbC_123-xYz');
  });

  it('rechaza IDs que podrían escapar de la ruta esperada', () => {
    expect(() => validarNegocioIdParaStorage('../otro-negocio')).toThrow(
      'identificador válido'
    );
  });
});
