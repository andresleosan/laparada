import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  onSnapshot: vi.fn(),
  runTransaction: vi.fn(),
  doc: vi.fn((...args: unknown[]) => {
    const parts = args.slice(1).map((a) => (typeof a === 'string' ? a : 'auto'));
    return { path: parts.join('/'), id: parts[parts.length - 1] || 'auto_id' };
  }),
  collection: vi.fn((_db: unknown, name: string) => ({ id: name, path: name })),
  deleteField: vi.fn(() => ({ _methodName: 'deleteField' })),
  serverTimestamp: vi.fn(() => ({ _methodName: 'serverTimestamp' })),
  getProductos: vi.fn(),
  getCombos: vi.fn(),
  registrarCompraCliente: vi.fn(() => Promise.resolve()),
  registrarEventoAuditoriaSilencioso: vi.fn(),
  crearAlertaSilenciosa: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: mocks.collection,
  doc: mocks.doc,
  addDoc: mocks.addDoc,
  getDoc: mocks.getDoc,
  getDocs: mocks.getDocs,
  updateDoc: mocks.updateDoc,
  deleteDoc: mocks.deleteDoc,
  deleteField: mocks.deleteField,
  onSnapshot: mocks.onSnapshot,
  orderBy: vi.fn((f, d) => ({ f, d })),
  query: vi.fn((ref, ...c) => ({ ref, c })),
  where: vi.fn((f, op, v) => ({ f, op, v })),
  limit: vi.fn((n) => ({ n })),
  runTransaction: mocks.runTransaction,
  serverTimestamp: mocks.serverTimestamp,
  Timestamp: { now: vi.fn(() => ({ seconds: 1730000000, nanoseconds: 0 })) },
}));

vi.mock('@/services/firebase', () => ({ db: {} }));
vi.mock('@/services/productosService', () => ({
  getProductos: mocks.getProductos,
  getCombos: mocks.getCombos,
}));
vi.mock('@/services/clientesService', () => ({
  registrarCompraCliente: mocks.registrarCompraCliente,
}));
vi.mock('@/services/auditoriaService', () => ({
  registrarEventoAuditoriaSilencioso: mocks.registrarEventoAuditoriaSilencioso,
}));
vi.mock('@/services/notificacionesService', () => ({
  crearAlertaSilenciosa: mocks.crearAlertaSilenciosa,
}));

import type { CotizacionComercial, CrearCotizacionInput, Producto } from '@/types';
import {
  convertirCotizacionAVentaYComanda,
  crearCotizacion,
  eliminarCotizacion,
  registrarAnticipoCotizacion,
  validarDatosCotizacion,
} from '../cotizacionesService';

const baseInput: CrearCotizacionInput = {
  codigo: 'COT-2026-001',
  clienteNombre: 'Laura Gómez',
  empresa: 'Constructora Norte S.A.S.',
  clienteTelefono: '3151234567',
  tipoEvento: 'corporativo',
  modalidadEntrega: 'domicilio_evento',
  fechaEvento: '2026-11-25',
  horaEvento: '12:30',
  fechaVencimiento: '2026-11-30',
  invitados: 20,
  direccionEvento: 'Av. Libertadores #12-40',
  barrioEvento: 'Caobos',
  items: [
    {
      id: 'item-1',
      tipo: 'producto',
      referenciaId: 'prod-1',
      nombre: 'Tequeños x6',
      cantidad: 20,
      precioUnitario: 12000,
      subtotal: 240000,
    },
  ],
  descuento: 10000,
  costoLogistica: 15000,
  anticipoMonto: 100000,
  anticipoMetodo: 'transferencia',
  anticipoEstado: 'pendiente',
  estado: 'enviada',
};

describe('cotizacionesService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('valida estrictamente los datos de la cotización y rechaza montos o campos inválidos', () => {
    expect(() => validarDatosCotizacion(baseInput)).not.toThrow();
    expect(() =>
      validarDatosCotizacion({ ...baseInput, clienteNombre: 'A' })
    ).toThrow(/nombre del cliente/i);
    expect(() => validarDatosCotizacion({ ...baseInput, items: [] })).toThrow(
      /al menos un producto/i
    );
    expect(() => validarDatosCotizacion({ ...baseInput, descuento: -500 })).toThrow(
      /no puede ser negativo/i
    );
    expect(() =>
      validarDatosCotizacion({
        ...baseInput,
        // @ts-expect-error probando método de pago no permitido
        anticipoMetodo: 'tarjeta',
      })
    ).toThrow(/offline/i);
  });

  it('crea una cotización con aislamiento multi-tenant y totales recalculados defensivamente', async () => {
    mocks.addDoc.mockResolvedValueOnce({ id: 'cot-new-1' });

    const id = await crearCotizacion('laparada', baseInput);

    expect(id).toBe('cot-new-1');
    expect(mocks.addDoc).toHaveBeenCalledTimes(1);
    const payload = mocks.addDoc.mock.calls[0][1] as Record<string, unknown>;
    expect(payload).toMatchObject({
      negocioId: 'laparada',
      codigo: 'COT-2026-001',
      subtotal: 240000,
      descuento: 10000,
      costoLogistica: 15000,
      totalCotizado: 245000,
      anticipoMonto: 100000,
      saldoPendiente: 145000,
      anticipoEstado: 'pendiente',
    });
    expect(payload).not.toHaveProperty('id');
  });

  it('registra y verifica anticipo offline, actualiza saldo pendiente y aprueba automáticamente', async () => {
    mocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'cot-1',
      data: () => ({
        negocioId: 'laparada',
        codigo: 'COT-2026-001',
        clienteNombre: 'Laura Gómez',
        empresa: 'Constructora Norte',
        totalCotizado: 245000,
        estado: 'enviada',
      }),
    });
    mocks.updateDoc.mockResolvedValueOnce(undefined);

    const res = await registrarAnticipoCotizacion('laparada', 'cot-1', {
      anticipoMonto: 120000,
      anticipoMetodo: 'transferencia',
      anticipoEstado: 'verificado',
      anticipoReferencia: 'Bancolombia #99812',
      aprobarSiVerificado: true,
    });

    expect(res).toEqual({ anticipoMonto: 120000, saldoPendiente: 125000 });
    expect(mocks.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        anticipoMonto: 120000,
        anticipoEstado: 'verificado',
        saldoPendiente: 125000,
        estado: 'aprobada',
      })
    );
    expect(mocks.crearAlertaSilenciosa).toHaveBeenCalledTimes(1);
  });

  it('impide registrar anticipo mayor al total cotizado o perteneciente a otro tenant', async () => {
    mocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'cot-1',
      data: () => ({
        negocioId: 'otro-tenant',
        totalCotizado: 245000,
        estado: 'enviada',
      }),
    });

    await expect(
      registrarAnticipoCotizacion('laparada', 'cot-1', {
        anticipoMonto: 100000,
        anticipoMetodo: 'transferencia',
        anticipoEstado: 'verificado',
      })
    ).rejects.toThrow(/no pertenece al negocio activo/i);
  });

  it('convierte atómicamente una cotización en Venta + Comanda KDS + Deducción de Inventario y Kardex', async () => {
    const cotDoc: Omit<CotizacionComercial, 'id'> = {
      negocioId: 'laparada',
      codigo: 'COT-2026-001',
      clienteNombre: 'Laura Gómez',
      empresa: 'Constructora Norte',
      clienteTelefono: '3151234567',
      tipoEvento: 'corporativo',
      modalidadEntrega: 'domicilio_evento',
      fechaEvento: '2026-11-25',
      horaEvento: '12:30',
      fechaVencimiento: '2026-11-30',
      invitados: 20,
      direccionEvento: 'Av. Libertadores #12-40',
      barrioEvento: 'Caobos',
      items: baseInput.items,
      subtotal: 240000,
      descuento: 10000,
      descuentoMotivo: 'Corporativo',
      costoLogistica: 15000,
      totalCotizado: 245000,
      costoEstimadoInsumos: 90000,
      utilidadEstimada: 155000,
      margenEstimadoPct: 63.3,
      anticipoMonto: 100000,
      anticipoMetodo: 'transferencia',
      anticipoEstado: 'verificado',
      saldoPendiente: 145000,
      estado: 'aprobada',
    };

    const productosCatalogo: Producto[] = [
      {
        id: 'prod-1',
        nombre: 'Tequeños x6',
        descripcion: 'Clásicos',
        precio: 12000,
        disponible: true,
        negocioId: 'laparada',
        receta: [
          { insumoId: 'ins-queso', nombreSnapshot: 'Queso', cantidad: 0.25, unidadSnapshot: 'kg' },
        ],
        creadoEn: {} as Producto['creadoEn'],
        actualizadoEn: {} as Producto['actualizadoEn'],
      },
    ];

    const txSet = vi.fn();
    const txUpdate = vi.fn();
    const txGet = vi.fn(async (ref: { path: string }) => {
      if (ref.path === 'cotizaciones/cot-1') {
        return { exists: () => true, id: 'cot-1', data: () => cotDoc };
      }
      if (ref.path === 'inventario/ins-queso') {
        return {
          exists: () => true,
          id: 'ins-queso',
          data: () => ({
            negocioId: 'laparada',
            nombre: 'Queso',
            stockActual: 12,
            unidad: 'kg',
            costoUnitario: 20000,
          }),
        };
      }
      return { exists: () => false, id: 'missing', data: () => undefined };
    });

    mocks.runTransaction.mockImplementationOnce(async (_db, fn) => {
      return await fn({ get: txGet, set: txSet, update: txUpdate });
    });

    const resultado = await convertirCotizacionAVentaYComanda(
      'laparada',
      'cot-1',
      {
        metodoPagoSaldo: 'transferencia',
        enviarAKDS: true,
        descontarInventario: true,
        negocioNombre: 'La Parada Grill',
        responsableNombre: 'Admin',
      },
      { productos: productosCatalogo, combos: [] }
    );

    expect(resultado.ventaId).toBe('cotizacion_cot-1');
    expect(resultado.comandaId).toBe('kds_cot_cot-1');
    expect(resultado.insumosDescontados).toBe(1);
    expect(resultado.ticket.total).toBe(245000);

    // Verifica que se escribió Venta (sin campo id), Comanda KDS (con ventaId preasignado) y Kardex
    expect(txSet).toHaveBeenCalledTimes(3);
    const ventaData = txSet.mock.calls[0][1] as Record<string, unknown>;
    expect(ventaData).toMatchObject({
      negocioId: 'laparada',
      total: 245000,
      cotizacionId: 'cot-1',
      cotizacionCodigo: 'COT-2026-001',
      anticipoAplicado: 100000,
    });
    expect(ventaData).not.toHaveProperty('id');

    const comandaData = txSet.mock.calls[1][1] as Record<string, unknown>;
    expect(comandaData).toMatchObject({
      negocioId: 'laparada',
      ventaId: 'cotizacion_cot-1',
      cotizacionId: 'cot-1',
      numeroTurno: 'COT-2026-001',
      pagado: true,
      estado: 'pendiente',
    });

    // Stock descontado: 12 - (20 * 0.25) = 7
    expect(txUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'inventario/ins-queso' }),
      expect.objectContaining({ stockActual: 7 })
    );
    expect(txUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ path: 'cotizaciones/cot-1' }),
      expect.objectContaining({
        estado: 'convertida',
        ventaId: 'cotizacion_cot-1',
        comandaId: 'kds_cot_cot-1',
        saldoPendiente: 0,
      })
    );
    expect(mocks.registrarEventoAuditoriaSilencioso).toHaveBeenCalledTimes(1);
    expect(mocks.crearAlertaSilenciosa).toHaveBeenCalledTimes(1);
  });

  it('impide convertir dos veces una cotización ya convertida (idempotencia)', async () => {
    mocks.runTransaction.mockImplementationOnce(async (_db, fn) => {
      return await fn({
        get: vi.fn(async () => ({
          exists: () => true,
          id: 'cot-dup',
          data: () => ({
            negocioId: 'laparada',
            codigo: 'COT-2026-001',
            estado: 'convertida',
            ventaId: 'cotizacion_cot-dup',
          }),
        })),
        set: vi.fn(),
        update: vi.fn(),
      });
    });

    await expect(
      convertirCotizacionAVentaYComanda(
        'laparada',
        'cot-dup',
        { metodoPagoSaldo: 'efectivo', descontarInventario: false },
        { productos: [], combos: [] }
      )
    ).rejects.toThrow(/ya fue convertida/i);
  });

  it('bloquea la eliminación de cotizaciones ya convertidas a venta', async () => {
    mocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'cot-conv',
      data: () => ({
        negocioId: 'laparada',
        estado: 'convertida',
      }),
    });

    await expect(eliminarCotizacion('laparada', 'cot-conv')).rejects.toThrow(
      /ya convertida/i
    );
  });
});
