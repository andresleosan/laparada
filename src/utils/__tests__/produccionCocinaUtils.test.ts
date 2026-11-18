import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { Combo, Insumo, MovimientoKardex, Producto } from '@/types';
import {
  CATEGORIAS_SUB_RECETA,
  PLANTILLAS_SUB_RECETAS_LA_PARADA,
  calcularMetricasProduccionCocina,
  contarProductosConSubRecetas,
  esInsumoSubReceta,
  filtrarInsumosPrimarios,
  filtrarSubRecetas,
  reconstruirHistorialLotesProduccion,
  simularProduccionLoteSubReceta,
  validarConfiguracionSubReceta,
} from '../produccionCocinaUtils';

describe('produccionCocinaUtils', () => {
  const fakeTimestamp = (dateStr: string) =>
    ({
      toDate: () => new Date(dateStr),
      seconds: Math.floor(new Date(dateStr).getTime() / 1000),
      nanoseconds: 0,
    }) as unknown as Timestamp;

  const mockInsumos: Insumo[] = [
    {
      id: 'ins-aceite',
      nombre: 'Aceite vegetal',
      stockActual: 10,
      stockMinimo: 2,
      unidad: 'litros',
      costoUnitario: 9000,
      negocioId: 'laparada',
      creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
    },
    {
      id: 'ins-ajo',
      nombre: 'Ajo pelado',
      stockActual: 1.2,
      stockMinimo: 0.5,
      unidad: 'kg',
      costoUnitario: 18000,
      negocioId: 'laparada',
      creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
    },
    {
      id: 'ins-harina',
      nombre: 'Harina de trigo',
      stockActual: 2,
      stockMinimo: 5,
      unidad: 'kg',
      costoUnitario: 4000,
      negocioId: 'laparada',
      creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
    },
    {
      id: 'sub-salsa-ajo',
      nombre: 'Salsa de Ajo de la Casa',
      stockActual: 3,
      stockMinimo: 2,
      unidad: 'litros',
      costoUnitario: 8100,
      esSubReceta: true,
      categoriaSubReceta: 'salsas_casa',
      rendimientoLote: 5,
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
      negocioId: 'laparada',
      creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
    },
    {
      id: 'sub-masa',
      nombre: 'Masa Artesanal de Tequeños',
      stockActual: 1,
      stockMinimo: 3,
      unidad: 'kg',
      costoUnitario: 6000,
      esSubReceta: true,
      categoriaSubReceta: 'masas_panaderia',
      rendimientoLote: 6,
      recetaInsumos: [
        {
          insumoId: 'ins-harina',
          nombreSnapshot: 'Harina de trigo',
          cantidad: 4,
          unidadSnapshot: 'kg',
        },
      ],
      negocioId: 'laparada',
      creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
    },
  ];

  it('provee categorías y plantillas insignia de La Parada', () => {
    expect(CATEGORIAS_SUB_RECETA.length).toBeGreaterThanOrEqual(5);
    expect(PLANTILLAS_SUB_RECETAS_LA_PARADA.length).toBeGreaterThanOrEqual(4);
    expect(
      PLANTILLAS_SUB_RECETAS_LA_PARADA.some((p) => p.nombre.includes('Salsa de Ajo'))
    ).toBe(true);
  });

  it('separa correctamente sub-recetas de insumos primarios', () => {
    const subs = filtrarSubRecetas(mockInsumos);
    const primarios = filtrarInsumosPrimarios(mockInsumos);

    expect(subs.map((s) => s.id)).toEqual(['sub-salsa-ajo', 'sub-masa']);
    expect(primarios.map((p) => p.id)).toEqual(['ins-aceite', 'ins-ajo', 'ins-harina']);
    expect(esInsumoSubReceta(subs[0])).toBe(true);
    expect(esInsumoSubReceta(primarios[0])).toBe(false);
  });

  it('valida la configuración de una sub-receta incluyendo referencia circular y duplicados', () => {
    const valida = validarConfiguracionSubReceta({
      id: 'sub-1',
      nombre: 'Salsa BBQ',
      categoriaSubReceta: 'salsas_casa',
      unidad: 'litros',
      rendimientoLote: 4,
      stockMinimo: 1,
      recetaInsumos: [
        { insumoId: 'ins-1', nombreSnapshot: 'Tomate', cantidad: 2, unidadSnapshot: 'kg' },
      ],
    });
    expect(valida.valida).toBe(true);
    expect(valida.errores).toHaveLength(0);

    const invalida = validarConfiguracionSubReceta({
      id: 'sub-1',
      nombre: ' ',
      unidad: '',
      rendimientoLote: 0,
      stockMinimo: -1,
      recetaInsumos: [
        { insumoId: 'sub-1', nombreSnapshot: 'Circular', cantidad: 1, unidadSnapshot: 'l' },
        { insumoId: 'sub-1', nombreSnapshot: 'Circular', cantidad: 0, unidadSnapshot: 'l' },
      ],
    });
    expect(invalida.valida).toBe(false);
    expect(invalida.errores.length).toBeGreaterThanOrEqual(5);
  });

  it('simula producción de lote con costo total, costo unitario, lotes máximos posibles y merma de cocción', () => {
    const subSalsa = mockInsumos[3];
    // Aceite: 10 / 3.5 = 2.85 lotes; Ajo: 1.2 / 0.5 = 2.4 lotes -> máximo 2.4 lotes
    const sim = simularProduccionLoteSubReceta({
      subReceta: subSalsa,
      insumos: mockInsumos,
      multiplicadorLotes: 2,
      cantidadProducidaReal: 9.5, // esperado 10 litros -> merma 0.5 litros (5%)
    });

    expect(sim.rendimientoEsperado).toBe(10);
    expect(sim.cantidadProducidaReal).toBe(9.5);
    expect(sim.mermaCoccionCantidad).toBe(0.5);
    expect(sim.mermaCoccionPct).toBe(5);
    expect(sim.todosInsumosDisponibles).toBe(true);
    expect(sim.lotesMaximosPosibles).toBe(2.4);
    // Costo: 2 * (3.5 * 9000 + 0.5 * 18000) = 2 * (31500 + 9000) = 81,000 COP
    expect(sim.costoTotalLoteCOP).toBe(81000);
    // Costo unitario = round(81000 / 9.5) = 8526 COP/litro
    expect(sim.costoUnitarioResultanteCOP).toBe(8526);
    expect(sim.desgloseInsumos[0].stockPosterior).toBe(3); // 10 - 7
    expect(sim.desgloseInsumos[1].stockPosterior).toBe(0.2); // 1.2 - 1.0
  });

  it('detecta déficit de insumos primarios cuando el stock no alcanza para el lote solicitado', () => {
    const subMasa = mockInsumos[4]; // requiere 4 kg harina por lote; solo hay 2 kg
    const sim = simularProduccionLoteSubReceta({
      subReceta: subMasa,
      insumos: mockInsumos,
      multiplicadorLotes: 1,
    });

    expect(sim.todosInsumosDisponibles).toBe(false);
    expect(sim.lotesMaximosPosibles).toBe(0.5);
    expect(sim.insumosFaltantes).toHaveLength(1);
    expect(sim.insumosFaltantes[0].insumoId).toBe('ins-harina');
    expect(sim.insumosFaltantes[0].faltante).toBe(2);
  });

  it('reconstruye historial de lotes y calcula métricas de producción de cocina', () => {
    const movimientos: MovimientoKardex[] = [
      {
        id: 'mov-ent-1',
        negocioId: 'laparada',
        insumoId: 'sub-salsa-ajo',
        insumoNombre: 'Salsa de Ajo de la Casa',
        cantidad: 5,
        costo: 40500,
        costoUnitario: 8100,
        proveedor: 'Producción Lote #LOTE1',
        fecha: fakeTimestamp('2026-11-18T14:00:00Z'),
        tipoMovimiento: 'entrada_produccion',
        stockPrevio: 0,
        stockResultante: 5,
        responsable: 'Chef Andrés',
        unidadMedida: 'litros',
        loteProduccionId: 'lote-1',
        subRecetaId: 'sub-salsa-ajo',
        subRecetaNombre: 'Salsa de Ajo de la Casa',
        multiplicadorLotes: 1,
      },
      {
        id: 'mov-sal-1',
        negocioId: 'laparada',
        insumoId: 'ins-aceite',
        insumoNombre: 'Aceite vegetal',
        cantidad: -3.5,
        costo: 31500,
        costoUnitario: 9000,
        proveedor: 'Consumo Lote: Salsa de Ajo de la Casa',
        fecha: fakeTimestamp('2026-11-18T14:00:00Z'),
        tipoMovimiento: 'salida_produccion',
        stockPrevio: 13.5,
        stockResultante: 10,
        responsable: 'Chef Andrés',
        unidadMedida: 'litros',
        loteProduccionId: 'lote-1',
        subRecetaId: 'sub-salsa-ajo',
        subRecetaNombre: 'Salsa de Ajo de la Casa',
      },
      {
        id: 'mov-sal-2',
        negocioId: 'laparada',
        insumoId: 'ins-ajo',
        insumoNombre: 'Ajo pelado',
        cantidad: -0.5,
        costo: 9000,
        costoUnitario: 18000,
        proveedor: 'Consumo Lote: Salsa de Ajo de la Casa',
        fecha: fakeTimestamp('2026-11-18T14:00:00Z'),
        tipoMovimiento: 'salida_produccion',
        stockPrevio: 1.7,
        stockResultante: 1.2,
        responsable: 'Chef Andrés',
        unidadMedida: 'kg',
        loteProduccionId: 'lote-1',
        subRecetaId: 'sub-salsa-ajo',
        subRecetaNombre: 'Salsa de Ajo de la Casa',
      },
    ];

    const historial = reconstruirHistorialLotesProduccion(movimientos);
    expect(historial).toHaveLength(1);
    expect(historial[0].cantidadProducida).toBe(5);
    expect(historial[0].costoTotalLoteCOP).toBe(40500);
    expect(historial[0].insumosConsumidos).toHaveLength(2);
    expect(historial[0].responsable).toBe('Chef Andrés');

    const metricas = calcularMetricasProduccionCocina(
      mockInsumos,
      movimientos,
      new Date('2026-11-18T16:00:00Z')
    );
    expect(metricas.totalSubRecetas).toBe(2);
    expect(metricas.subRecetasConStockBajo).toBe(1); // Masa (1 <= 3)
    expect(metricas.subRecetasListasParaProducir).toBe(1); // Salsa de ajo sí alcanza
    expect(metricas.subRecetasBloqueadasPorFaltaInsumo).toBe(1); // Masa no alcanza
    expect(metricas.lotesProducidosHoy).toBe(1);
    expect(metricas.costoTotalProducidoPeriodoCOP).toBe(40500);
    // Valor preparados: 3 * 8100 + 1 * 6000 = 24300 + 6000 = 30300 COP
    expect(metricas.valorInventarioPreparadosCOP).toBe(30300);
  });

  it('cuenta productos y combos del menú vinculados con sub-recetas', () => {
    const productos: Producto[] = [
      {
        id: 'prod-teq',
        nombre: 'Tequeños x5',
        descripcion: '',
        precio: 14000,
        disponible: true,
        receta: [
          { insumoId: 'sub-masa', nombreSnapshot: 'Masa', cantidad: 0.25, unidadSnapshot: 'kg' },
        ],
        negocioId: 'laparada',
        creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
        actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      },
    ];

    const combos: Combo[] = [
      {
        id: 'combo-1',
        nombre: 'Combo Especial',
        descripcion: '',
        items: [],
        precioEspecial: 25000,
        disponible: true,
        esPersonalizable: true,
        gruposEleccion: [
          {
            id: 'g-salsa',
            nombre: 'Salsa',
            categoriaGrupo: 'salsa',
            obligatorio: false,
            minSelecciones: 0,
            maxSelecciones: 1,
            opciones: [
              {
                id: 'op-ajo',
                nombre: 'Salsa de Ajo',
                recargoCOP: 0,
                recetaExtra: [
                  {
                    insumoId: 'sub-salsa-ajo',
                    nombreSnapshot: 'Salsa de Ajo de la Casa',
                    cantidad: 0.05,
                    unidadSnapshot: 'litros',
                  },
                ],
              },
            ],
          },
        ],
        negocioId: 'laparada',
        creadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
        actualizadoEn: fakeTimestamp('2026-11-01T10:00:00Z'),
      },
    ];

    const uso = contarProductosConSubRecetas(mockInsumos, productos, combos);
    expect(uso.productosCount).toBe(1);
    expect(uso.combosCount).toBe(1);
    expect(uso.totalCount).toBe(2);
    expect(uso.subRecetaIdsEnUso).toEqual(
      expect.arrayContaining(['sub-masa', 'sub-salsa-ajo'])
    );
  });
});
