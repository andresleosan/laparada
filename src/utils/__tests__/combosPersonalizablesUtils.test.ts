import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { Combo, Insumo, ItemVenta, Producto } from '@/types';
import {
  actualizarSeleccionesEnGrupo,
  calcularPrecioUnitarioComboPersonalizado,
  calcularRecargoEleccionesCombo,
  combinarModificadoresConEleccionesCombo,
  construirEleccionesComboSeleccionadas,
  construirItemVentaComboPersonalizado,
  construirNotasPedidoStorefrontConCombos,
  crearGrupoDesdePlantilla,
  esComboPersonalizable,
  formatearEleccionesComboParaModificadores,
  formatearResumenCortoEleccionesCombo,
  obtenerSeleccionesInicialesCombo,
  sanitizarGruposEleccionParaFirestore,
  validarSeleccionesCombo,
} from '../combosPersonalizablesUtils';
import {
  calcularConsumoInsumos,
  evaluarEstadoStockCombo,
  evaluarEstadoStockOpcionCombo,
} from '../recetasEscandallo';
import { construirMatrizIngenieriaMenu } from '../ingenieriaMenuUtils';
import { obtenerRangoFechaReporte } from '../analiticaFinancieraUtils';

describe('combosPersonalizablesUtils & escandallo dinámico', () => {
  const now = Timestamp.now();

  const insumosMock: Insumo[] = [
    {
      id: 'ins_carne',
      nombre: 'Carne Artesanal',
      stockActual: 20,
      stockMinimo: 4,
      unidad: 'kg',
      costoUnitario: 28000,
      negocioId: 'laparada',
      creadoEn: now,
      actualizadoEn: now,
    },
    {
      id: 'ins_papa',
      nombre: 'Papa Prefrita',
      stockActual: 15,
      stockMinimo: 3,
      unidad: 'kg',
      costoUnitario: 9000,
      negocioId: 'laparada',
      creadoEn: now,
      actualizadoEn: now,
    },
    {
      id: 'ins_coca',
      nombre: 'Lata Coca-Cola',
      stockActual: 12,
      stockMinimo: 5,
      unidad: 'unidades',
      costoUnitario: 2200,
      negocioId: 'laparada',
      creadoEn: now,
      actualizadoEn: now,
    },
    {
      id: 'ins_jugo_agotado',
      nombre: 'Pulpa de Mango',
      stockActual: 0,
      stockMinimo: 2,
      unidad: 'kg',
      costoUnitario: 12000,
      negocioId: 'laparada',
      creadoEn: now,
      actualizadoEn: now,
    },
    {
      id: 'ins_salsa_ajo',
      nombre: 'Salsa de Ajo',
      stockActual: 5,
      stockMinimo: 1,
      unidad: 'litros',
      costoUnitario: 14000,
      negocioId: 'laparada',
      creadoEn: now,
      actualizadoEn: now,
    },
    {
      id: 'ins_salsa_tartara',
      nombre: 'Salsa Tártara',
      stockActual: 4,
      stockMinimo: 1,
      unidad: 'litros',
      costoUnitario: 15000,
      negocioId: 'laparada',
      creadoEn: now,
      actualizadoEn: now,
    },
  ];

  const productosMock: Producto[] = [
    {
      id: 'prod_burger',
      nombre: 'Hamburguesa Clásica',
      descripcion: 'Res artesanal',
      categoria: 'Hamburguesas',
      precio: 18000,
      disponible: true,
      negocioId: 'laparada',
      creadoEn: now,
      actualizadoEn: now,
      receta: [
        {
          insumoId: 'ins_carne',
          nombreSnapshot: 'Carne Artesanal',
          cantidad: 0.15,
          unidadSnapshot: 'kg',
        },
      ],
    },
    {
      id: 'prod_papas',
      nombre: 'Papas Francesas',
      descripcion: 'Porción mediana',
      categoria: 'Acompañamientos',
      precio: 7000,
      disponible: true,
      negocioId: 'laparada',
      creadoEn: now,
      actualizadoEn: now,
      receta: [
        {
          insumoId: 'ins_papa',
          nombreSnapshot: 'Papa Prefrita',
          cantidad: 0.2,
          unidadSnapshot: 'kg',
        },
      ],
    },
    {
      id: 'prod_coca',
      nombre: 'Coca-Cola 400ml',
      descripcion: 'Bebida fría',
      categoria: 'Bebidas',
      precio: 4500,
      disponible: true,
      negocioId: 'laparada',
      creadoEn: now,
      actualizadoEn: now,
      receta: [
        {
          insumoId: 'ins_coca',
          nombreSnapshot: 'Lata Coca-Cola',
          cantidad: 1,
          unidadSnapshot: 'unidades',
        },
      ],
    },
    {
      id: 'prod_jugo_mango',
      nombre: 'Jugo de Mango',
      descripcion: 'Natural en agua',
      categoria: 'Bebidas',
      precio: 6000,
      disponible: true,
      negocioId: 'laparada',
      creadoEn: now,
      actualizadoEn: now,
      receta: [
        {
          insumoId: 'ins_jugo_agotado',
          nombreSnapshot: 'Pulpa de Mango',
          cantidad: 0.15,
          unidadSnapshot: 'kg',
        },
      ],
    },
  ];

  const comboPersonalizableMock: Combo = {
    id: 'combo_arma_1',
    nombre: 'Combo Burger Personalizable',
    descripcion: 'Burger + acompañamiento + bebida + salsas',
    precioEspecial: 26000,
    disponible: true,
    esPersonalizable: true,
    negocioId: 'laparada',
    creadoEn: now,
    actualizadoEn: now,
    items: [
      {
        productoId: 'prod_burger',
        cantidad: 1,
        nombreSnapshot: 'Hamburguesa Clásica',
      },
    ],
    gruposEleccion: [
      {
        id: 'grp_bebida',
        nombre: 'Elige tu Bebida',
        categoriaGrupo: 'bebida',
        obligatorio: true,
        minSelecciones: 1,
        maxSelecciones: 1,
        opciones: [
          {
            id: 'opc_coca',
            nombre: 'Coca-Cola 400ml',
            productoId: 'prod_coca',
            cantidadProducto: 1,
            recargoCOP: 0,
            disponible: true,
            porDefecto: true,
          },
          {
            id: 'opc_jugo',
            nombre: 'Jugo de Mango',
            productoId: 'prod_jugo_mango',
            cantidadProducto: 1,
            recargoCOP: 2000,
            disponible: true,
            porDefecto: false,
          },
        ],
      },
      {
        id: 'grp_acomp',
        nombre: 'Elige tu Acompañamiento',
        categoriaGrupo: 'acompanamiento',
        obligatorio: true,
        minSelecciones: 1,
        maxSelecciones: 1,
        opciones: [
          {
            id: 'opc_papas',
            nombre: 'Papas Francesas',
            productoId: 'prod_papas',
            cantidadProducto: 1,
            recargoCOP: 0,
            disponible: true,
            porDefecto: true,
          },
          {
            id: 'opc_papas_dobles',
            nombre: 'Papas Grandes',
            productoId: 'prod_papas',
            cantidadProducto: 2,
            recargoCOP: 3000,
            disponible: true,
            porDefecto: false,
          },
        ],
      },
      {
        id: 'grp_salsas',
        nombre: 'Elige tus Salsas',
        categoriaGrupo: 'salsa',
        obligatorio: false,
        minSelecciones: 0,
        maxSelecciones: 2,
        opciones: [
          {
            id: 'opc_ajo',
            nombre: 'Salsa de Ajo',
            recargoCOP: 0,
            disponible: true,
            porDefecto: true,
            recetaExtra: [
              {
                insumoId: 'ins_salsa_ajo',
                nombreSnapshot: 'Salsa de Ajo',
                cantidad: 0.03,
                unidadSnapshot: 'litros',
              },
            ],
          },
          {
            id: 'opc_tartara',
            nombre: 'Salsa Tártara',
            recargoCOP: 500,
            disponible: true,
            porDefecto: false,
            recetaExtra: [
              {
                insumoId: 'ins_salsa_tartara',
                nombreSnapshot: 'Salsa Tártara',
                cantidad: 0.03,
                unidadSnapshot: 'litros',
              },
            ],
          },
        ],
      },
    ],
  };

  it('detecta correctamente si un combo es personalizable y crea plantillas por categoría', () => {
    expect(esComboPersonalizable(comboPersonalizableMock)).toBe(true);
    expect(
      esComboPersonalizable({ esPersonalizable: false, gruposEleccion: comboPersonalizableMock.gruposEleccion })
    ).toBe(false);
    expect(esComboPersonalizable({ esPersonalizable: true, gruposEleccion: [] })).toBe(false);

    const gBebida = crearGrupoDesdePlantilla('bebida', productosMock, insumosMock);
    const gAcomp = crearGrupoDesdePlantilla('acompanamiento', productosMock, insumosMock);
    const gSalsa = crearGrupoDesdePlantilla('salsa', productosMock, insumosMock);
    const gProteina = crearGrupoDesdePlantilla('proteina', productosMock, insumosMock);
    const gOtro = crearGrupoDesdePlantilla('otro', productosMock, insumosMock);

    expect(gBebida.obligatorio).toBe(true);
    expect(gBebida.opciones.some((o) => o.productoId === 'prod_coca')).toBe(true);
    expect(gAcomp.opciones.some((o) => o.productoId === 'prod_papas')).toBe(true);
    expect(gSalsa.obligatorio).toBe(false);
    expect(gSalsa.maxSelecciones).toBe(2);
    expect(gSalsa.opciones[0].recetaExtra?.[0].insumoId).toContain('ins_salsa_');
    expect(gProteina.categoriaGrupo).toBe('proteina');
    expect(gOtro.categoriaGrupo).toBe('otro');
  });

  it('calcula selecciones iniciales saltando opciones agotadas y valida mínimos/máximos', () => {
    const iniciales = obtenerSeleccionesInicialesCombo(
      comboPersonalizableMock,
      productosMock,
      insumosMock
    );
    expect(iniciales.grp_bebida).toEqual(['opc_coca']);
    expect(iniciales.grp_acomp).toEqual(['opc_papas']);
    expect(iniciales.grp_salsas).toEqual(['opc_ajo']);

    const validacionOk = validarSeleccionesCombo(
      comboPersonalizableMock,
      iniciales,
      productosMock,
      insumosMock
    );
    expect(validacionOk.valido).toBe(true);
    expect(validacionOk.gruposFaltantes).toEqual([]);

    const validacionIncompleta = validarSeleccionesCombo(
      comboPersonalizableMock,
      { ...iniciales, grp_bebida: [] },
      productosMock,
      insumosMock
    );
    expect(validacionIncompleta.valido).toBe(false);
    expect(validacionIncompleta.gruposFaltantes).toContain('grp_bebida');

    const validacionAgotada = validarSeleccionesCombo(
      comboPersonalizableMock,
      { ...iniciales, grp_bebida: ['opc_jugo'] },
      productosMock,
      insumosMock
    );
    expect(validacionAgotada.valido).toBe(false);
    expect(validacionAgotada.erroresPorGrupo.grp_bebida).toContain('agotada');
  });

  it('alterna selecciones respetando límites de grupo único y múltiple', () => {
    const grupoSalsas = comboPersonalizableMock.gruposEleccion![2];
    const grupoBebida = comboPersonalizableMock.gruposEleccion![0];

    let sel: Record<string, string[]> = { grp_bebida: ['opc_coca'], grp_salsas: ['opc_ajo'] };
    sel = actualizarSeleccionesEnGrupo(sel, grupoSalsas, 'opc_tartara');
    expect(sel.grp_salsas).toEqual(['opc_ajo', 'opc_tartara']);

    // Máximo 2: no agrega una tercera opción inexistente
    sel = actualizarSeleccionesEnGrupo(sel, grupoSalsas, 'opc_extra');
    expect(sel.grp_salsas).toEqual(['opc_ajo', 'opc_tartara']);

    // Toggle off en múltiple
    sel = actualizarSeleccionesEnGrupo(sel, grupoSalsas, 'opc_ajo');
    expect(sel.grp_salsas).toEqual(['opc_tartara']);

    // Grupo obligatorio único mantiene selección
    sel = actualizarSeleccionesEnGrupo(sel, grupoBebida, 'opc_coca');
    expect(sel.grp_bebida).toEqual(['opc_coca']);
  });

  it('calcula recargos, construye ItemVenta, combina modificadores y trunca notas de Storefront', () => {
    const selecciones = {
      grp_bebida: ['opc_coca'],
      grp_acomp: ['opc_papas_dobles'],
      grp_salsas: ['opc_ajo', 'opc_tartara'],
    };

    const elecciones = construirEleccionesComboSeleccionadas(comboPersonalizableMock, selecciones);
    expect(calcularRecargoEleccionesCombo(elecciones, true)).toBe(3500);
    expect(calcularRecargoEleccionesCombo(elecciones, false)).toBe(0);
    expect(calcularPrecioUnitarioComboPersonalizado(comboPersonalizableMock, elecciones, true)).toBe(
      29500
    );
    expect(calcularPrecioUnitarioComboPersonalizado(comboPersonalizableMock, elecciones, false)).toBe(
      26000
    );

    const mods = formatearEleccionesComboParaModificadores(elecciones);
    expect(mods).toEqual([
      'Bebida: Coca-Cola 400ml',
      'Acompañamiento: Papas Grandes',
      'Salsas: Salsa de Ajo, Salsa Tártara',
    ]);
    expect(formatearResumenCortoEleccionesCombo(elecciones)).toBe(
      'Bebida: Coca-Cola 400ml · Acompañamiento: Papas Grandes · Salsas: Salsa de Ajo, Salsa Tártara'
    );

    const itemAnterior: ItemVenta = {
      tipo: 'combo',
      referenciaId: 'combo_arma_1',
      nombre: 'Combo Burger Personalizable',
      cantidad: 1,
      precioUnitario: 26000,
      subtotal: 26000,
      eleccionesCombo: [elecciones[0]],
      modificadores: ['Bebida: Jugo Viejo', 'Sin cebolla'],
    };

    const itemNuevo = construirItemVentaComboPersonalizado({
      combo: comboPersonalizableMock,
      seleccionesPorGrupo: selecciones,
      cantidad: 2,
      notas: 'Sin hielo en la bebida',
      initialItem: itemAnterior,
      modoStorefront: false,
    });

    expect(itemNuevo.precioUnitario).toBe(29500);
    expect(itemNuevo.subtotal).toBe(59000);
    expect(itemNuevo.modificadores).toContain('Bebida: Coca-Cola 400ml');
    expect(itemNuevo.modificadores).toContain('Sin cebolla');
    expect(itemNuevo.modificadores).not.toContain('Bebida: Jugo Viejo');
    expect(itemNuevo.notas).toBe('Sin hielo en la bebida');

    const combinados = combinarModificadoresConEleccionesCombo(
      elecciones,
      ['Bebida: Anterior', 'Para llevar'],
      elecciones
    );
    expect(combinados).toContain('Para llevar');
    expect(combinados).not.toContain('Bebida: Anterior');

    const notasCortas = construirNotasPedidoStorefrontConCombos(
      [itemNuevo],
      'Timbre blanco',
      '[Cupón: TEST]',
      300
    );
    expect(notasCortas).toContain('Combo Burger Personalizable [');
    expect(notasCortas).toContain('Timbre blanco');
    expect(notasCortas.length).toBeLessThanOrEqual(300);

    const notasLargas = construirNotasPedidoStorefrontConCombos(
      [itemNuevo],
      'A'.repeat(400),
      '',
      300
    );
    expect(notasLargas.length).toBe(300);
    expect(notasLargas.endsWith('…')).toBe(true);
  });

  it('recalcula escandallo e inventario considerando elecciones del combo y grupos obligatorios agotados', () => {
    const itemPersonalizado = construirItemVentaComboPersonalizado({
      combo: comboPersonalizableMock,
      seleccionesPorGrupo: {
        grp_bebida: ['opc_coca'],
        grp_acomp: ['opc_papas_dobles'], // cantidadProducto: 2 -> 0.4 kg papa
        grp_salsas: ['opc_ajo', 'opc_tartara'], // 0.03 L cada una
      },
      cantidad: 2,
    });

    const consumos = calcularConsumoInsumos(
      [itemPersonalizado],
      productosMock,
      [comboPersonalizableMock]
    );
    const byId = new Map(consumos.map((c) => [c.insumoId, c.cantidadTotal]));

    expect(byId.get('ins_carne')).toBe(0.3); // 2 * 0.15 kg
    expect(byId.get('ins_coca')).toBe(2); // 2 * 1 unidad
    expect(byId.get('ins_papa')).toBe(0.8); // 2 * (2 * 0.2 kg)
    expect(byId.get('ins_salsa_ajo')).toBe(0.06); // 2 * 0.03 L
    expect(byId.get('ins_salsa_tartara')).toBe(0.06); // 2 * 0.03 L

    // Opción con insumo agotado
    const alertaJugo = evaluarEstadoStockOpcionCombo(
      comboPersonalizableMock.gruposEleccion![0].opciones[1],
      productosMock,
      insumosMock
    );
    expect(alertaJugo.estado).toBe('agotado');
    expect(alertaJugo.insumoCritico).toBe('Pulpa de Mango');

    // Evaluación del combo completo con elecciones válidas
    const alertaConElecciones = evaluarEstadoStockCombo(
      comboPersonalizableMock,
      productosMock,
      insumosMock,
      itemPersonalizado.eleccionesCombo
    );
    expect(alertaConElecciones.estado).toBe('disponible');

    // Si todas las opciones de un grupo obligatorio quedan agotadas, el combo pasa a agotado
    const comboGrupoAgotado: Combo = {
      ...comboPersonalizableMock,
      gruposEleccion: [
        {
          ...comboPersonalizableMock.gruposEleccion![0],
          opciones: [comboPersonalizableMock.gruposEleccion![0].opciones[1]],
        },
      ],
    };
    const alertaComboAgotado = evaluarEstadoStockCombo(
      comboGrupoAgotado,
      productosMock,
      insumosMock
    );
    expect(alertaComboAgotado.estado).toBe('agotado');
  });

  it('sanitiza grupos sin propiedades undefined e integra opciones base en Ingeniería de Menú', () => {
    const limpios = sanitizarGruposEleccionParaFirestore(comboPersonalizableMock.gruposEleccion!);
    expect(JSON.stringify(limpios)).not.toContain('undefined');
    expect(limpios[0].opciones[0]).not.toHaveProperty('recetaExtra');

    const matriz = construirMatrizIngenieriaMenu({
      productos: productosMock,
      combos: [comboPersonalizableMock],
      ventas: [],
      insumos: insumosMock,
      movimientosKardex: [],
      periodo: obtenerRangoFechaReporte('hoy'),
    });

    const itemComboMatriz = matriz.items.find((i) => i.id === 'combo_arma_1');
    expect(itemComboMatriz?.tieneCosteo).toBe(true);
    // Carne (0.15*28000=4200) + Coca (2200) + Papas (0.2*9000=1800) = 8200
    expect(itemComboMatriz?.costoUnitarioCOP).toBe(8200);
  });
});
