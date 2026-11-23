import { describe, expect, it } from 'vitest';
import type { Combo, FiltroDietetico, ItemVenta, Producto } from '@/types';
import {
  construirLookupPerfilDietetico,
  construirPayloadPerfilDietetico,
  construirPerfilDietetico,
  cumpleFiltroDietetico,
  detectarConflictosAlergia,
  detectarIncoherenciasDieteticas,
  filtrarPorPerfilDietetico,
  formatearAlergenos,
  perfilFormDesdeFuente,
  resolverAlergenosItem,
  resolverEtiquetasCoherentes,
  sanitizarAlergenos,
  sanitizarAlergiasComensal,
  sanitizarInfoNutricional,
} from '../alergenosUtils';

type ProdPerfil = Pick<
  Producto,
  'id' | 'alergenosDeclarados' | 'alergenos' | 'etiquetasDieteticas' | 'infoNutricional'
>;

const productos: ProdPerfil[] = [
  { id: 'teq', alergenosDeclarados: true, alergenos: ['gluten', 'lacteos'], etiquetasDieteticas: ['vegetariano'] },
  { id: 'ensalada', alergenosDeclarados: true, alergenos: [], etiquetasDieteticas: ['vegano', 'sin_gluten'] },
  { id: 'salsa-mani', alergenosDeclarados: true, alergenos: ['mani'] },
  { id: 'sin-declarar' },
];

const combos: Array<Pick<Combo, 'id' | 'items'> & Partial<ProdPerfil>> = [
  {
    id: 'combo-ok',
    alergenosDeclarados: true,
    alergenos: ['huevo'],
    etiquetasDieteticas: ['vegetariano', 'sin_gluten'],
    items: [
      { productoId: 'teq', cantidad: 2, nombreSnapshot: 'Tequeños' },
      { productoId: 'ensalada', cantidad: 1, nombreSnapshot: 'Ensalada' },
    ],
  },
  {
    id: 'combo-incompleto',
    alergenosDeclarados: true,
    items: [{ productoId: 'sin-declarar', cantidad: 1, nombreSnapshot: 'Misterio' }],
  },
];

describe('alergenosUtils — sanitización', () => {
  it('normaliza alérgenos, información nutricional y alergias del comensal', () => {
    expect(sanitizarAlergenos(['mani', 'gluten', 'mani', 'veneno', 3])).toEqual(['gluten', 'mani']);
    expect(sanitizarAlergenos('gluten')).toEqual([]);

    expect(sanitizarInfoNutricional({ calorias: '450.4', porcionGramos: 320 })).toEqual({
      calorias: 450,
      porcionGramos: 320,
    });
    expect(sanitizarInfoNutricional({ calorias: -5, porcionGramos: 0 })).toBeUndefined();
    expect(sanitizarInfoNutricional(null)).toBeUndefined();

    expect(sanitizarAlergiasComensal({ alergenos: ['mani', 'x'], nota: '  Severa   anafilaxia ' })).toEqual({
      alergenos: ['mani'],
      nota: 'Severa anafilaxia',
    });
    expect(sanitizarAlergiasComensal({ alergenos: [], nota: '   ' })).toBeUndefined();
    expect(sanitizarAlergiasComensal({ alergenos: [], nota: 'x'.repeat(300) })?.nota).toHaveLength(200);
  });

  it('detecta incoherencias entre etiquetas y alérgenos y las descarta al resolver', () => {
    expect(detectarIncoherenciasDieteticas(['gluten'], ['sin_gluten'])).toHaveLength(1);
    expect(detectarIncoherenciasDieteticas(['huevo', 'lacteos'], ['vegano', 'vegetariano'])).toEqual([
      '"Vegano" no es compatible con: Lácteos, Huevo',
    ]);
    expect(detectarIncoherenciasDieteticas(['lacteos'], ['vegetariano', 'picante'])).toEqual([]);
    expect(resolverEtiquetasCoherentes(['pescado'], ['vegetariano', 'sin_gluten', 'picante'])).toEqual([
      'sin_gluten',
      'picante',
    ]);
    expect(formatearAlergenos(['sesamo', 'mani'])).toBe('Maní, Ajonjolí');
  });
});

describe('alergenosUtils — perfiles y filtros del menú', () => {
  const lookup = construirLookupPerfilDietetico(productos, combos);

  it('construye perfiles y hereda alérgenos de productos en combos', () => {
    expect(construirPerfilDietetico({}).declarado).toBe(false);
    expect(construirPerfilDietetico({ alergenos: ['soya'] }).declarado).toBe(true);

    const combo = lookup.get('combo-ok');
    expect(combo?.alergenos).toEqual(['gluten', 'lacteos', 'huevo']);
    // "sin_gluten" se descarta porque los tequeños contienen gluten
    expect(combo?.etiquetas).toEqual(['vegetariano']);
    expect(combo?.declarado).toBe(true);
    expect(lookup.get('combo-incompleto')?.declarado).toBe(false);
  });

  it('filtra por etiquetas y exclusión de alérgenos sin garantizar platos no declarados', () => {
    const filtroVeggie: FiltroDietetico = { etiquetas: ['vegetariano'], excluirAlergenos: [] };
    // vegano satisface vegetariano
    expect(cumpleFiltroDietetico(lookup.get('ensalada'), filtroVeggie)).toBe(true);
    expect(cumpleFiltroDietetico(lookup.get('salsa-mani'), filtroVeggie)).toBe(false);

    const filtroSinGluten: FiltroDietetico = { etiquetas: [], excluirAlergenos: ['gluten'] };
    const visibles = filtrarPorPerfilDietetico(
      [...productos, ...combos].map(({ id }) => ({ id })),
      lookup,
      filtroSinGluten
    ).map((p) => p.id);
    expect(visibles).toEqual(['ensalada', 'salsa-mani']);

    expect(cumpleFiltroDietetico(undefined, { etiquetas: [], excluirAlergenos: [] })).toBe(true);
    expect(cumpleFiltroDietetico(undefined, filtroVeggie)).toBe(false);
  });
});

describe('alergenosUtils — alertas de alergia en comanda', () => {
  const lookup = construirLookupPerfilDietetico(productos, combos);

  it('resuelve alérgenos de ítems incluyendo elecciones de combos personalizables', () => {
    const item: Pick<ItemVenta, 'referenciaId' | 'eleccionesCombo'> = {
      referenciaId: 'ensalada',
      eleccionesCombo: [
        { grupoId: 'g', grupoNombre: 'Salsa', opcionId: 'o', opcionNombre: 'Maní', cantidad: 1, productoId: 'salsa-mani', recargoCOP: 0 },
      ],
    };
    expect(resolverAlergenosItem(item, lookup)).toEqual(['mani']);
    expect(resolverAlergenosItem({ referenciaId: 'desconocido' }, lookup)).toEqual([]);
  });

  it('detecta los platos que contienen alérgenos del comensal', () => {
    const items = [
      { referenciaId: 'teq', nombre: 'Tequeños' },
      { referenciaId: 'ensalada', nombre: 'Ensalada' },
      { referenciaId: 'combo-ok', nombre: 'Combo' },
    ];
    expect(detectarConflictosAlergia(items, { alergenos: ['lacteos', 'mani'] }, lookup)).toEqual([
      { itemIndex: 0, nombre: 'Tequeños', alergenos: ['lacteos'] },
      { itemIndex: 2, nombre: 'Combo', alergenos: ['lacteos'] },
    ]);
    expect(detectarConflictosAlergia(items, { alergenos: [], nota: 'Solo nota' }, lookup)).toEqual([]);
    expect(detectarConflictosAlergia(items, undefined, lookup)).toEqual([]);
  });
});

describe('alergenosUtils — payload del formulario de /productos', () => {
  it('construye payload válido, limpia nutrición previa y rechaza datos incoherentes', () => {
    const form = perfilFormDesdeFuente(productos[0]);
    expect(form).toEqual({
      declarado: true,
      alergenos: ['gluten', 'lacteos'],
      etiquetas: ['vegetariano'],
      caloriasStr: '',
      porcionGramosStr: '',
    });

    expect(construirPayloadPerfilDietetico({ ...form, caloriasStr: '520', porcionGramosStr: '300' })).toEqual({
      payload: {
        alergenosDeclarados: true,
        alergenos: ['gluten', 'lacteos'],
        etiquetasDieteticas: ['vegetariano'],
        infoNutricional: { calorias: 520, porcionGramos: 300 },
      },
    });

    expect(construirPayloadPerfilDietetico(form, true).payload?.infoNutricional).toEqual({});
    expect(
      construirPayloadPerfilDietetico({ ...form, declarado: false }).payload?.alergenos
    ).toEqual([]);
    expect(construirPayloadPerfilDietetico({ ...form, etiquetas: ['sin_gluten'] }).error).toMatch(
      /Sin gluten/
    );
    expect(construirPayloadPerfilDietetico({ ...form, caloriasStr: '99999' }).error).toMatch(/calorías/);
    expect(construirPayloadPerfilDietetico({ ...form, porcionGramosStr: '0' }).error).toMatch(/porción/);
  });
});
