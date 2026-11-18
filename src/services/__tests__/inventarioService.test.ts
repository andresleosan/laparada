import { beforeEach, describe, expect, it, vi } from 'vitest';

const firestoreMocks = vi.hoisted(() => ({
  addDoc: vi.fn(),
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  onSnapshot: vi.fn(),
  runTransaction: vi.fn(),
  updateDoc: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  addDoc: firestoreMocks.addDoc,
  collection: vi.fn(() => ({})),
  deleteDoc: vi.fn(),
  doc: vi.fn(() => ({})),
  getDoc: firestoreMocks.getDoc,
  getDocs: firestoreMocks.getDocs,
  limit: vi.fn(() => ({})),
  onSnapshot: firestoreMocks.onSnapshot,
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  runTransaction: firestoreMocks.runTransaction,
  Timestamp: {
    now: vi.fn(() => ({})),
  },
  updateDoc: firestoreMocks.updateDoc,
  where: vi.fn(() => ({})),
}));

vi.mock('../firebase', () => ({ db: {} }));

import {
  descontarStockInsumosPorVenta,
  getHistorialInsumo,
  getInsumosConBajoStock,
  getTodosInsumos,
  getTodosMovimientosInventario,
  guardarConfiguracionSubReceta,
  onTodosInsumosChange,
  registrarAjusteInventario,
  registrarConteoFisicoMasivo,
  registrarEntradaInventario,
  registrarMermaInventario,
  registrarMermaOperativaAvanzada,
  registrarProduccionLoteSubReceta,
} from '../inventarioService';

describe('lecturas de inventario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('propaga el error al fallar la lectura de todos los insumos', async () => {
    const failure = new Error('Firestore no disponible');
    firestoreMocks.getDocs.mockRejectedValueOnce(failure);

    await expect(getTodosInsumos('negocio-a')).rejects.toBe(failure);
  });

  it('propaga el error al fallar la lectura del historial', async () => {
    const failure = new Error('Firestore no disponible');
    firestoreMocks.getDocs.mockRejectedValueOnce(failure);

    await expect(getHistorialInsumo('negocio-a', 'insumo-a')).rejects.toBe(failure);
  });

  it('propaga el error al calcular bajo stock si falla la lectura base', async () => {
    const failure = new Error('Firestore no disponible');
    firestoreMocks.getDocs.mockRejectedValueOnce(failure);

    await expect(getInsumosConBajoStock('negocio-a')).rejects.toBe(failure);
  });

  it('no clasifica como bajo stock un insumo con mínimo cero', async () => {
    firestoreMocks.getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'aceite',
          data: () => ({
            actualizadoEn: {},
            creadoEn: {},
            negocioId: 'negocio-a',
            nombre: 'Aceite',
            stockActual: 5,
            stockMinimo: 0,
            unidad: 'litros',
          }),
        },
      ],
    });

    await expect(getInsumosConBajoStock('negocio-a')).resolves.toEqual([]);
  });

  it('notifica el error del listener sin reemplazar existencias por una lista vacía', () => {
    const failure = new Error('Listener interrumpido');
    const onData = vi.fn();
    const onError = vi.fn();
    firestoreMocks.onSnapshot.mockImplementation((_query, _next, listenerError) => {
      listenerError(failure);
      return vi.fn();
    });

    onTodosInsumosChange('negocio-a', onData, onError);

    expect(onError).toHaveBeenCalledWith(failure);
    expect(onData).not.toHaveBeenCalled();
  });
});

describe('descontarStockInsumosPorVenta', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('no ejecuta transacción si la lista de consumos está vacía', async () => {
    await descontarStockInsumosPorVenta('laparada', [], 'Venta #123');
    expect(firestoreMocks.runTransaction).not.toHaveBeenCalled();
  });

  it('descuenta stock atómicamente y registra la salida en entradas_inventario', async () => {
    const mockTransaction = {
      get: vi.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          negocioId: 'laparada',
          nombre: 'Queso Costeño',
          stockActual: 10,
        }),
      }),
      update: vi.fn(),
      set: vi.fn(),
    };

    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => {
      await callback(mockTransaction);
    });

    await descontarStockInsumosPorVenta(
      'laparada',
      [
        {
          insumoId: 'ins_queso',
          nombreSnapshot: 'Queso Costeño',
          cantidadTotal: 2.5,
          unidadSnapshot: 'kg',
        },
      ],
      'Venta POS #123456'
    );

    expect(mockTransaction.get).toHaveBeenCalled();
    // 10 - 2.5 = 7.5
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        stockActual: 7.5,
      })
    );
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        negocioId: 'laparada',
        insumoId: 'ins_queso',
        cantidad: -2.5,
        costo: 0,
        proveedor: 'Venta POS #123456',
      })
    );
  });

  it('no permite stock negativo si el consumo supera el stock disponible', async () => {
    const mockTransaction = {
      get: vi.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          negocioId: 'laparada',
          nombre: 'Queso Costeño',
          stockActual: 2,
        }),
      }),
      update: vi.fn(),
      set: vi.fn(),
    };

    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => {
      await callback(mockTransaction);
    });

    await descontarStockInsumosPorVenta(
      'laparada',
      [
        {
          insumoId: 'ins_queso',
          nombreSnapshot: 'Queso Costeño',
          cantidadTotal: 5,
        },
      ],
      'Venta POS #999'
    );

    // Math.max(0, 2 - 5) = 0
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        stockActual: 0,
      })
    );
  });
});

describe('kardex y movimientos de inventario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registrarMermaInventario descuenta stock y registra movimiento de merma', async () => {
    const mockTransaction = {
      get: vi.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          negocioId: 'laparada',
          nombre: 'Tomate Chonto',
          stockActual: 10,
          unidad: 'kg',
        }),
        id: 'ins_tomate',
      }),
      update: vi.fn(),
      set: vi.fn(),
    };

    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => {
      await callback(mockTransaction);
    });

    await registrarMermaInventario(
      'laparada',
      'ins_tomate',
      2,
      'vencimiento',
      'Tomates en descomposición',
      'Cajero 1'
    );

    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        stockActual: 8,
      })
    );
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tipoMovimiento: 'merma',
        cantidad: -2,
        costo: 0,
        motivo: 'vencimiento',
        stockPrevio: 10,
        stockResultante: 8,
        notas: 'Tomates en descomposición',
        responsable: 'Cajero 1',
        unidadMedida: 'kg',
      })
    );
  });

  it('registrarMermaInventario rechaza cantidad <= 0 o motivo vacío', async () => {
    await expect(
      registrarMermaInventario('laparada', 'ins_1', 0, 'vencimiento')
    ).rejects.toThrow('La cantidad de merma debe ser mayor a 0');

    await expect(
      registrarMermaInventario('laparada', 'ins_1', 2, '')
    ).rejects.toThrow('Debes indicar el motivo de la merma');
  });

  it('registrarAjusteInventario actualiza al stock físico real y registra diferencia', async () => {
    const mockTransaction = {
      get: vi.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          negocioId: 'laparada',
          nombre: 'Papas a la francesa',
          stockActual: 15,
          unidad: 'paquetes',
        }),
        id: 'ins_papas',
      }),
      update: vi.fn(),
      set: vi.fn(),
    };

    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => {
      await callback(mockTransaction);
    });

    // Stock en sistema era 15, físico real es 18 -> diferencia +3
    await registrarAjusteInventario(
      'laparada',
      'ins_papas',
      18,
      'conteo_fisico',
      'Auditoría mensual',
      'Admin'
    );

    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        stockActual: 18,
      })
    );
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tipoMovimiento: 'ajuste',
        cantidad: 3,
        stockPrevio: 15,
        stockResultante: 18,
        motivo: 'conteo_fisico',
        notas: 'Auditoría mensual',
      })
    );
  });

  it('registrarAjusteInventario rechaza nuevo stock negativo', async () => {
    await expect(
      registrarAjusteInventario('laparada', 'ins_1', -5, 'conteo_fisico')
    ).rejects.toThrow('El nuevo stock físico no puede ser negativo');
  });

  it('getTodosMovimientosInventario consulta la colección entradas_inventario ordenada por fecha', async () => {
    firestoreMocks.getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'mov_1',
          data: () => ({
            negocioId: 'laparada',
            insumoId: 'ins_1',
            insumoNombre: 'Pan',
            cantidad: 20,
            costo: 30000,
            tipoMovimiento: 'entrada',
          }),
        },
      ],
    });

    const res = await getTodosMovimientosInventario('laparada');
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe('mov_1');
    expect(res[0].tipoMovimiento).toBe('entrada');
  });

  it('registrarEntradaInventario actualiza stockActual, costoUnitario y proveedor en el insumo', async () => {
    const mockTransaction = {
      get: vi.fn().mockResolvedValue({
        exists: () => true,
        data: () => ({
          negocioId: 'laparada',
          nombre: 'Queso Mozzarella',
          stockActual: 5,
          unidad: 'kg',
        }),
        id: 'ins_queso',
      }),
      update: vi.fn(),
      set: vi.fn(),
    };

    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => {
      await callback(mockTransaction);
    });

    await registrarEntradaInventario(
      'laparada',
      'ins_queso',
      10,
      250000,
      'Lácteos del Norte',
      'Recepción Orden OC-0001',
      'Admin',
      true
    );

    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        stockActual: 15,
        costoUnitario: 25000,
        proveedor: 'Lácteos del Norte',
      })
    );
  });

  it('registrarConteoFisicoMasivo ajusta solo los insumos con diferencia frente al sistema', async () => {
    const mockTransaction = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'ins-1',
          data: () => ({
            negocioId: 'laparada',
            nombre: 'Queso',
            stockActual: 10,
            unidad: 'kg',
          }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'ins-2',
          data: () => ({
            negocioId: 'laparada',
            nombre: 'Harina',
            stockActual: 20,
            unidad: 'kg',
          }),
        }),
      update: vi.fn(),
      set: vi.fn(),
    };

    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => {
      await callback(mockTransaction);
    });

    const resultado = await registrarConteoFisicoMasivo('laparada', {
      items: [
        { insumoId: 'ins-1', nuevoStockFisico: 8.5 }, // diferencia -1.5
        { insumoId: 'ins-2', nuevoStockFisico: 20 },  // exacto, sin diferencia
      ],
      motivo: 'conteo_fisico',
      notas: 'Conteo semanal',
      responsable: 'Admin',
    });

    expect(resultado.ajustadosCount).toBe(1);
    expect(mockTransaction.update).toHaveBeenCalledTimes(1);
    expect(mockTransaction.set).toHaveBeenCalledTimes(1);
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        insumoId: 'ins-1',
        cantidad: -1.5,
        tipoMovimiento: 'ajuste',
        stockPrevio: 10,
        stockResultante: 8.5,
      })
    );
  });
});

describe('producción de cocina y sub-recetas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('guardarConfiguracionSubReceta crea una preparación base validada con aislamiento multi-tenant', async () => {
    firestoreMocks.addDoc.mockResolvedValueOnce({ id: 'sub-ajo-1' });

    const id = await guardarConfiguracionSubReceta('laparada', {
      nombre: 'Salsa de Ajo de la Casa',
      categoriaSubReceta: 'salsas_casa',
      unidad: 'litros',
      rendimientoLote: 5,
      stockActual: 0,
      stockMinimo: 2,
      recetaInsumos: [
        {
          insumoId: 'ins-aceite',
          nombreSnapshot: 'Aceite vegetal',
          cantidad: 3.5,
          unidadSnapshot: 'litros',
        },
        {
          insumoId: 'ins-ajo',
          nombreSnapshot: 'Ajo pelado',
          cantidad: 0.5,
          unidadSnapshot: 'kg',
        },
      ],
      tiempoPreparacionMin: 25,
      vidaUtilHoras: 72,
    });

    expect(id).toBe('sub-ajo-1');
    expect(firestoreMocks.addDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        negocioId: 'laparada',
        nombre: 'Salsa de Ajo de la Casa',
        esSubReceta: true,
        categoriaSubReceta: 'salsas_casa',
        rendimientoLote: 5,
        stockActual: 0,
      })
    );
  });

  it('guardarConfiguracionSubReceta actualiza una sub-receta existente del tenant', async () => {
    firestoreMocks.getDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'sub-ajo-1',
      data: () => ({
        negocioId: 'laparada',
        nombre: 'Salsa de Ajo',
        esSubReceta: true,
      }),
    });

    const id = await guardarConfiguracionSubReceta('laparada', {
      id: 'sub-ajo-1',
      nombre: 'Salsa de Ajo Especial',
      categoriaSubReceta: 'salsas_casa',
      unidad: 'litros',
      rendimientoLote: 6,
      stockMinimo: 2,
      recetaInsumos: [
        { insumoId: 'ins-aceite', nombreSnapshot: 'Aceite vegetal', cantidad: 4, unidadSnapshot: 'litros' },
      ],
    });

    expect(id).toBe('sub-ajo-1');
    expect(firestoreMocks.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        negocioId: 'laparada',
        nombre: 'Salsa de Ajo Especial',
        rendimientoLote: 6,
        esSubReceta: true,
      })
    );
  });

  it('guardarConfiguracionSubReceta rechaza configuración inválida o circular', async () => {
    await expect(
      guardarConfiguracionSubReceta('laparada', {
        id: 'sub-1',
        nombre: 'Salsa',
        categoriaSubReceta: 'salsas_casa',
        unidad: 'litros',
        rendimientoLote: 5,
        stockMinimo: 1,
        recetaInsumos: [
          { insumoId: 'sub-1', nombreSnapshot: 'Salsa', cantidad: 1, unidadSnapshot: 'litros' },
        ],
      })
    ).rejects.toThrow('no puede incluirse a sí misma');
  });

  it('registrarProduccionLoteSubReceta descuenta insumos primarios, acredita lote y actualiza costo unitario en Kardex', async () => {
    const mockTransaction = {
      get: vi
        .fn()
        // 1. Sub-receta
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'sub-ajo-1',
          data: () => ({
            negocioId: 'laparada',
            nombre: 'Salsa de Ajo de la Casa',
            esSubReceta: true,
            unidad: 'litros',
            rendimientoLote: 5,
            stockActual: 1,
            recetaInsumos: [
              { insumoId: 'ins-aceite', nombreSnapshot: 'Aceite vegetal', cantidad: 3.5, unidadSnapshot: 'litros' },
              { insumoId: 'ins-ajo', nombreSnapshot: 'Ajo pelado', cantidad: 0.5, unidadSnapshot: 'kg' },
            ],
          }),
        })
        // 2. Aceite
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'ins-aceite',
          data: () => ({
            negocioId: 'laparada',
            nombre: 'Aceite vegetal',
            stockActual: 10,
            unidad: 'litros',
            costoUnitario: 9000,
          }),
        })
        // 3. Ajo
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'ins-ajo',
          data: () => ({
            negocioId: 'laparada',
            nombre: 'Ajo pelado',
            stockActual: 2,
            unidad: 'kg',
            costoUnitario: 18000,
          }),
        }),
      update: vi.fn(),
      set: vi.fn(),
    };

    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => {
      await callback(mockTransaction);
    });

    const res = await registrarProduccionLoteSubReceta('laparada', {
      subRecetaId: 'sub-ajo-1',
      multiplicadorLotes: 2,
      cantidadProducidaReal: 9.5,
      responsable: 'Chef Laura',
      notas: 'Tanda fin de semana',
    });

    // Costo lote = 2 * (3.5 * 9000 + 0.5 * 18000) = 81,000 COP
    // Costo unitario = round(81000 / 9.5) = 8526 COP/litro
    expect(res.cantidadProducida).toBe(9.5);
    expect(res.costoTotalLoteCOP).toBe(81000);
    expect(res.costoUnitarioResultanteCOP).toBe(8526);
    expect(res.stockPrevioSubReceta).toBe(1);
    expect(res.stockResultanteSubReceta).toBe(10.5);
    expect(res.insumosConsumidosCount).toBe(2);

    // 2 actualizaciones a primarios + 1 actualización a sub-receta
    expect(mockTransaction.update).toHaveBeenCalledTimes(3);
    // 2 salidas_produccion + 1 entrada_produccion
    expect(mockTransaction.set).toHaveBeenCalledTimes(3);
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        insumoId: 'ins-aceite',
        cantidad: -7,
        tipoMovimiento: 'salida_produccion',
        stockPrevio: 10,
        stockResultante: 3,
      })
    );
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        insumoId: 'sub-ajo-1',
        cantidad: 9.5,
        costo: 81000,
        costoUnitario: 8526,
        tipoMovimiento: 'entrada_produccion',
        stockPrevio: 1,
        stockResultante: 10.5,
      })
    );
  });

  it('registrarProduccionLoteSubReceta aborta transacción si un insumo primario es insuficiente', async () => {
    const mockTransaction = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'sub-masa',
          data: () => ({
            negocioId: 'laparada',
            nombre: 'Masa Tequeños',
            esSubReceta: true,
            unidad: 'kg',
            rendimientoLote: 6,
            stockActual: 0,
            recetaInsumos: [
              { insumoId: 'ins-harina', nombreSnapshot: 'Harina', cantidad: 4, unidadSnapshot: 'kg' },
            ],
          }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'ins-harina',
          data: () => ({
            negocioId: 'laparada',
            nombre: 'Harina de trigo',
            stockActual: 2,
            unidad: 'kg',
          }),
        }),
      update: vi.fn(),
      set: vi.fn(),
    };

    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => {
      await callback(mockTransaction);
    });

    await expect(
      registrarProduccionLoteSubReceta('laparada', {
        subRecetaId: 'sub-masa',
        multiplicadorLotes: 1,
      })
    ).rejects.toThrow('Stock insuficiente de "Harina de trigo"');

    expect(mockTransaction.update).not.toHaveBeenCalled();
    expect(mockTransaction.set).not.toHaveBeenCalled();
  });
});

describe('registrarMermaOperativaAvanzada', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registra merma directa de insumo calculando costo unitario, origen, estación y auditoría', async () => {
    const mockTransaction = {
      get: vi.fn().mockResolvedValue({
        exists: () => true,
        id: 'ins-carne',
        data: () => ({
          negocioId: 'laparada',
          nombre: 'Carne Artesanal',
          stockActual: 20,
          unidad: 'unidades',
          costoUnitario: 5000,
        }),
      }),
      update: vi.fn(),
      set: vi.fn(),
    };

    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => {
      await callback(mockTransaction);
    });

    const res = await registrarMermaOperativaAvanzada('laparada', {
      modo: 'insumo',
      insumoId: 'ins-carne',
      cantidad: 3,
      motivo: 'desperdicio_cocina',
      origen: 'cocina_kds',
      estacion: 'parrilla_plancha',
      responsable: 'Chef Andres',
      notas: 'Se quemó en parrilla',
    });

    expect(res.modo).toBe('insumo');
    expect(res.costoTotalImpactoCOP).toBe(15000);
    expect(res.insumosAfectadosCount).toBe(1);
    expect(mockTransaction.update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ stockActual: 17 })
    );
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tipoMovimiento: 'merma',
        cantidad: -3,
        costo: 15000,
        costoUnitario: 5000,
        origenMerma: 'cocina_kds',
        estacionCocina: 'parrilla_plancha',
      })
    );
  });

  it('registra devolución de producto terminado explotando su escandallo sobre múltiples insumos en bodega', async () => {
    const mockTransaction = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'ins-pan',
          data: () => ({
            negocioId: 'laparada',
            nombre: 'Pan Brioche',
            stockActual: 25,
            unidad: 'unidades',
            costoUnitario: 1200,
          }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          id: 'ins-carne',
          data: () => ({
            negocioId: 'laparada',
            nombre: 'Carne Artesanal',
            stockActual: 14,
            unidad: 'unidades',
            costoUnitario: 4800,
          }),
        }),
      update: vi.fn(),
      set: vi.fn(),
    };

    firestoreMocks.runTransaction.mockImplementation(async (_db, callback) => {
      await callback(mockTransaction);
    });

    const res = await registrarMermaOperativaAvanzada(
      'laparada',
      {
        modo: 'producto_terminado',
        referenciaId: 'prod-hamb',
        tipoReferencia: 'producto',
        cantidad: 2,
        motivo: 'devolucion_cliente',
        origen: 'devolucion_cliente',
        estacion: 'entrega_domicilio',
        comandaCodigo: '#W-019',
        responsable: 'Cajero Turno',
      },
      {
        productos: [
          {
            id: 'prod-hamb',
            negocioId: 'laparada',
            nombre: 'Hamburguesa La Parada',
            descripcion: 'Hamburguesa doble',
            precio: 18000,
            disponible: true,
            receta: [
              { insumoId: 'ins-pan', nombreSnapshot: 'Pan Brioche', cantidad: 1, unidadSnapshot: 'unidades' },
              { insumoId: 'ins-carne', nombreSnapshot: 'Carne Artesanal', cantidad: 2, unidadSnapshot: 'unidades' },
            ],
            creadoEn: {} as any,
            actualizadoEn: {} as any,
          },
        ],
        combos: [],
      }
    );

    expect(res.modo).toBe('producto_terminado');
    expect(res.insumosAfectadosCount).toBe(2);
    // 2 * 1200 + 4 * 4800 = 2400 + 19200 = 21600
    expect(res.costoTotalImpactoCOP).toBe(21600);
    expect(mockTransaction.update).toHaveBeenCalledTimes(2);
    expect(mockTransaction.set).toHaveBeenCalledTimes(2);
    expect(mockTransaction.set).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tipoMovimiento: 'merma',
        productoMermaId: 'prod-hamb',
        productoMermaNombre: 'Hamburguesa La Parada',
        origenMerma: 'devolucion_cliente',
        estacionCocina: 'entrega_domicilio',
      })
    );
  });
});
