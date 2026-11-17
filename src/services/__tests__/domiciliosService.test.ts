import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  runTransaction: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  addDoc: firestoreMocks.addDoc,
  collection: vi.fn(() => ({})),
  doc: vi.fn((_db, _col, id) => ({ id })),
  getDoc: firestoreMocks.getDoc,
  getDocs: firestoreMocks.getDocs,
  onSnapshot: vi.fn(),
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  runTransaction: firestoreMocks.runTransaction,
  setDoc: firestoreMocks.setDoc,
  Timestamp: {
    fromDate: vi.fn(() => ({})),
    now: vi.fn(() => ({ seconds: 1700000000, nanoseconds: 0 })),
  },
  where: vi.fn(() => ({})),
}));

vi.mock('../firebase', () => ({ db: {} }));
vi.mock('@/services/clientesService', () => ({
  registrarCompraCliente: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/services/inventarioService', () => ({
  descontarStockInsumosPorVenta: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/services/productosService', () => ({
  getProductos: vi.fn(() => Promise.resolve([])),
  getCombos: vi.fn(() => Promise.resolve([])),
}));

import {
  asignarRepartidorDomicilio,
  crearDomicilioDesdePos,
  despacharLoteDomicilios,
  getConfiguracionZonasDomicilio,
  getDomiciliosActivos,
  getDomiciliosEntregados,
  guardarConfiguracionZonasDomicilio,
} from '../domiciliosService';

describe('lecturas y operaciones de domicilios', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('propaga el error al fallar la lectura de domicilios activos', async () => {
    const failure = new Error('Firestore no disponible');
    firestoreMocks.getDocs.mockRejectedValueOnce(failure);

    await expect(getDomiciliosActivos('negocio-a')).rejects.toBe(failure);
  });

  it('propaga el error al fallar la lectura de pedidos creados hoy ya entregados', async () => {
    const failure = new Error('Firestore no disponible');
    firestoreMocks.getDocs.mockRejectedValueOnce(failure);

    await expect(getDomiciliosEntregados('negocio-a')).rejects.toBe(failure);
  });

  it('retorna zonas predeterminadas si el negocio aún no tiene tarifario guardado', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => false,
    });

    const config = await getConfiguracionZonasDomicilio('laparada');
    expect(config.negocioId).toBe('laparada');
    expect(config.zonas.length).toBeGreaterThanOrEqual(5);
    expect(config.habilitarTarifaAutomatica).toBe(true);
  });

  it('guarda la configuración de zonas sanitizando barrios y montos por tenant', async () => {
    firestoreMocks.setDoc.mockResolvedValueOnce(undefined);

    const saved = await guardarConfiguracionZonasDomicilio('tenant-1', {
      habilitarTarifaAutomatica: true,
      tarifaPorDefecto: 5500,
      tiempoEstimadoPorDefectoMin: 35,
      envioGratisDesdeMonto: 60000,
      zonas: [
        {
          id: 'z1',
          nombre: '  Zona Centro ',
          barrios: [' Caobos ', '', 'Centro'],
          tarifaEnvio: -100,
          tiempoEstimadoMin: 5,
          pedidoMinimo: 10000,
          activa: true,
        },
      ],
    });

    expect(firestoreMocks.setDoc).toHaveBeenCalledTimes(1);
    expect(saved.negocioId).toBe('tenant-1');
    expect(saved.zonas[0].nombre).toBe('Zona Centro');
    expect(saved.zonas[0].barrios).toEqual(['Caobos', 'Centro']);
    expect(saved.zonas[0].tarifaEnvio).toBe(0);
    expect(saved.zonas[0].tiempoEstimadoMin).toBe(10);
  });

  it('asigna repartidor y despacha en lote dentro del mismo tenant', async () => {
    const txUpdate = vi.fn();
    firestoreMocks.runTransaction.mockImplementation(async (_db, fn) => {
      await fn({
        get: vi.fn().mockResolvedValue({
          exists: () => true,
          data: () => ({ negocioId: 'laparada', estado: 'en_preparacion' }),
        }),
        update: txUpdate,
      });
    });

    await asignarRepartidorDomicilio('dom-1', 'laparada', 'rep-9', 'Mateo Moto', true);
    expect(txUpdate).toHaveBeenCalledWith(
      { id: 'dom-1' },
      expect.objectContaining({
        domiciliarioId: 'rep-9',
        domiciliarioNombre: 'Mateo Moto',
        estado: 'en_camino',
      })
    );

    const totalDespachados = await despacharLoteDomicilios(
      ['dom-1', 'dom-2', 'dom-1'],
      'laparada',
      'rep-9',
      'Mateo Moto'
    );
    expect(totalDespachados).toBe(2);
  });

  it('crea domicilio desde POS generando rastreoToken y persistiendo datos de zona/envío', async () => {
    firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'dom-nuevo-123' });

    const id = await crearDomicilioDesdePos(
      'laparada',
      [],
      32000,
      'efectivo',
      'Laura',
      'Pardo',
      '3101234567',
      'Av 0 #11-20',
      'Caobos',
      {
        costoEnvio: 4000,
        zonaDomicilioNombre: 'Cercana (Centro - Caobos)',
        tiempoEstimadoMin: 25,
      }
    );

    expect(id).toBe('dom-nuevo-123');
    expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        negocioId: 'laparada',
        barrio: 'Caobos',
        costoEnvio: 4000,
        zonaDomicilioNombre: 'Cercana (Centro - Caobos)',
        tiempoEstimadoMin: 25,
        rastreoToken: expect.stringMatching(/^[0-9a-f]{32}$/),
      })
    );
  });
});
