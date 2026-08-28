import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ImageProcessingError,
  parseRemoveProductBackgroundInput,
} from '../firebase-functions/src/image/removeProductBackground';

const validInput = {
  imageBase64: 'aGVsbG8=',
  mimeType: 'image/jpeg',
};

describe('contrato de edición de fotos', () => {
  it('solicita un token App Check de uso limitado para cada edición', () => {
    const client = readFileSync(resolve('src/services/imageBackgroundService.ts'), 'utf8');
    expect(client).toContain('limitedUseAppCheckTokens: true');
  });

  it('inicializa Firebase Admin antes de acceder al rate limit', () => {
    const backend = readFileSync(
      resolve('firebase-functions/src/image/removeProductBackground.ts'),
      'utf8'
    );
    expect(backend).toContain("import { getDb } from '../firebase-admin'");
    expect(backend).toContain("import { removeBgApiKey } from '../config/imageParams'");
    expect(backend).not.toContain("from '../config/integrationParams'");
    expect(backend).not.toContain('admin.firestore()');
  });

  it('acepta únicamente una imagen codificada y un MIME permitido', () => {
    expect(parseRemoveProductBackgroundInput(validInput)).toEqual(validInput);
  });

  it.each([
    ['campos adicionales', { ...validInput, negocioId: 'otro-tenant' }],
    ['MIME no permitido', { ...validInput, mimeType: 'image/svg+xml' }],
    ['base64 inválido', { ...validInput, imageBase64: 'no es base64' }],
    ['base64 incompleto', { ...validInput, imageBase64: 'aGVsbG8' }],
    ['imagen vacía', { ...validInput, imageBase64: '====' }],
  ])('rechaza %s', (_caseName, input) => {
    expect(() => parseRemoveProductBackgroundInput(input)).toThrow(ImageProcessingError);
  });

  it('rechaza una imagen que supera el límite de entrada', () => {
    expect(() => parseRemoveProductBackgroundInput({
      ...validInput,
      imageBase64: 'A'.repeat(8_388_612),
    })).toThrow('supera el tamaño permitido');
  });
});
