import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ImageProcessingError,
  mapRemoveBgFailure,
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

  it('conserva solo el flujo de fondo de mesa y retira el fondo uniforme heredado', () => {
    const form = readFileSync(resolve('src/components/productos/ProductoForm.tsx'), 'utf8');
    const modal = readFileSync(resolve('src/components/productos/ImageUploadModal.tsx'), 'utf8');
    const imageService = readFileSync(resolve('src/services/imageBackgroundService.ts'), 'utf8');
    const productService = readFileSync(resolve('src/services/productosService.ts'), 'utf8');

    expect(modal).toContain('Aplicar fondo de mesa');
    expect(form).not.toContain('Aplicar fondo');
    expect(form).not.toContain('type="color"');
    expect(imageService).not.toContain('procesarImagenConFondoUniforme');
    expect(productService).not.toContain('aplicarFondoACategoria');
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

  it.each([
    [401, 'failed-precondition', 'clave de remove.bg'],
    [403, 'failed-precondition', 'clave de remove.bg'],
    [402, 'resource-exhausted', 'créditos'],
    [429, 'resource-exhausted', 'límite temporal'],
    [400, 'failed-precondition', 'procesar esta imagen'],
    [503, 'unavailable', 'no está disponible'],
  ])('traduce el estado %i del proveedor sin exponer su respuesta', (status, code, message) => {
    expect(mapRemoveBgFailure(status)).toMatchObject({ code });
    expect(mapRemoveBgFailure(status).message).toContain(message);
  });
});
