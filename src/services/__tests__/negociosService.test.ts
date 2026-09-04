import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  getDocs: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(),
  getDocs: firestoreMocks.getDocs,
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  setDoc: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({})),
  },
  updateDoc: vi.fn(),
  where: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
}));

vi.mock('../firebase', () => ({ db: {}, auth: {} }));

import { getTodosNegocios } from '../negociosService';

describe('lectura de negocios para superadministración', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('propaga el error para que el panel no muestre una cartera parcial como completa', async () => {
    const failure = new Error('Firestore no disponible');
    firestoreMocks.getDocs.mockRejectedValueOnce(failure);

    await expect(getTodosNegocios()).rejects.toBe(failure);
  });
});
