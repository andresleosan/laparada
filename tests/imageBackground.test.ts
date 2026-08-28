import { describe, expect, it } from 'vitest';
import {
  ImageProcessingError,
  parseRemoveProductBackgroundInput,
} from '../functions/src/image/removeProductBackground';

const validInput = {
  imageBase64: 'aGVsbG8=',
  mimeType: 'image/jpeg',
};

describe('contrato de edición de fotos', () => {
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
