import { describe, expect, it } from 'vitest';
import {
  parseCreateStaffUserInput,
  StaffUserError,
} from '../firebase-functions/src/staff/staffUser';

const validInput = {
  negocioId: 'laparada',
  nombre: '  Ana   Cajera  ',
  email: ' ANA@example.com ',
  password: 'ClaveSegura123',
  rol: 'cajero',
};

describe('contrato del alta de personal', () => {
  it('normaliza los datos y conserva únicamente roles operativos', () => {
    expect(parseCreateStaffUserInput(validInput)).toEqual({
      negocioId: 'laparada',
      nombre: 'Ana Cajera',
      email: 'ana@example.com',
      password: 'ClaveSegura123',
      rol: 'cajero',
    });
  });

  it.each([
    ['campo adicional', { ...validInput, activo: true }],
    ['rol superadmin', { ...validInput, rol: 'superadmin' }],
    ['tenant inválido', { ...validInput, negocioId: '../otro' }],
    ['correo inválido', { ...validInput, email: 'sin-arroba' }],
    ['contraseña corta', { ...validInput, password: 'Clave123' }],
    ['contraseña sin número', { ...validInput, password: 'SoloLetrasSeguras' }],
  ])('rechaza %s', (_caseName, input) => {
    expect(() => parseCreateStaffUserInput(input)).toThrow(StaffUserError);
  });
});
