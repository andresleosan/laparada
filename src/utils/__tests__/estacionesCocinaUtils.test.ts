import { describe, expect, it } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { Domicilio, ItemVenta } from '@/types';
import {
  agruparItemsComandaPorEstacion,
  calcularTiempoObjetivoComanda,
  calcularTiempoObjetivoItems,
  construirCatalogoCocinaLookup,
  contarComandasPorEstacion,
  evaluarSemaforoComandaConObjetivo,
  filtrarComandasPorEstacion,
  inferirEstacionPorCategoriaONombre,
  resolverEstacionItem,
  resolverTiempoPreparacionItem,
  sanitizarTiempoPreparacion,
} from '../estacionesCocinaUtils';

function crearComandaMock(id: string, items: ItemVenta[], minAtras = 0, tiempoObjetivoMin?: number): Domicilio {
  const nowMs = Date.now();
  const creadoMs = nowMs - minAtras * 60000;
  return {
    id,
    clienteNombre: 'Cliente Test',
    clienteTelefono: '3001234567',
    direccion: 'Calle 10',
    barrio: 'Centro',
    items,
    total: 25000,
    metodoPago: 'efectivo',
    origen: 'pos',
    estado: 'pendiente',
    creadoEn: Timestamp.fromMillis(creadoMs),
    actualizadoEn: Timestamp.fromMillis(creadoMs),
    negocioId: 'laparada',
    ...(tiempoObjetivoMin !== undefined ? { tiempoObjetivoMin } : {}),
  };
}

describe('estacionesCocinaUtils', () => {
  it('sanitiza tiempos de preparación dentro del rango válido (1..180 min)', () => {
    expect(sanitizarTiempoPreparacion(12)).toBe(12);
    expect(sanitizarTiempoPreparacion('8.6')).toBe(9);
    expect(sanitizarTiempoPreparacion(0)).toBeUndefined();
    expect(sanitizarTiempoPreparacion(-5)).toBeUndefined();
    expect(sanitizarTiempoPreparacion(250)).toBe(180);
    expect(sanitizarTiempoPreparacion('')).toBeUndefined();
  });

  it('infiere estación por categoría o nombre cuando no está configurada', () => {
    expect(inferirEstacionPorCategoriaONombre('Tequeños', 'Tequeños x5')).toBe('fritura');
    expect(inferirEstacionPorCategoriaONombre('Hamburguesas', 'Burger Especial')).toBe('plancha');
    expect(inferirEstacionPorCategoriaONombre('Bebidas', 'Limonada de Coco')).toBe('bebidas_barra');
    expect(inferirEstacionPorCategoriaONombre('Combos', 'Combo Familiar')).toBe('armado');
    expect(inferirEstacionPorCategoriaONombre('Especial', 'Plato de la Casa')).toBe('general');
  });

  it('prioriza la estación y tiempo explícitos del ítem o del catálogo sobre la inferencia', () => {
    const lookup = construirCatalogoCocinaLookup(
      [
        {
          id: 'prod-1',
          nombre: 'Producto Genérico',
          estacionCocina: 'plancha',
          tiempoPreparacionMin: 16,
        },
      ],
      []
    );

    const itemSinMeta: ItemVenta = {
      tipo: 'producto',
      referenciaId: 'prod-1',
      nombre: 'Producto Genérico',
      cantidad: 1,
      precioUnitario: 15000,
      subtotal: 15000,
    };

    expect(resolverEstacionItem(itemSinMeta, lookup)).toBe('plancha');
    expect(resolverTiempoPreparacionItem(itemSinMeta, lookup)).toBe(16);

    const itemConMeta: ItemVenta = {
      ...itemSinMeta,
      estacionCocina: 'fritura',
      tiempoPreparacionMin: 7,
    };

    expect(resolverEstacionItem(itemConMeta, lookup)).toBe('fritura');
    expect(resolverTiempoPreparacionItem(itemConMeta, lookup)).toBe(7);
  });

  it('calcula el tiempo objetivo de una comanda usando el cuello de botella máximo entre estaciones', () => {
    const items: ItemVenta[] = [
      {
        tipo: 'producto',
        referenciaId: 'b1',
        nombre: 'Gaseosa',
        cantidad: 2,
        precioUnitario: 4000,
        subtotal: 8000,
        estacionCocina: 'bebidas_barra',
        tiempoPreparacionMin: 3,
      },
      {
        tipo: 'producto',
        referenciaId: 'p1',
        nombre: 'Hamburguesa Doble',
        cantidad: 1,
        precioUnitario: 22000,
        subtotal: 22000,
        estacionCocina: 'plancha',
        tiempoPreparacionMin: 14,
      },
    ];

    expect(calcularTiempoObjetivoItems(items)).toBe(14);
    const comanda = crearComandaMock('cmd-1', items);
    expect(calcularTiempoObjetivoComanda(comanda)).toBe(14);
  });

  it('evalúa el semáforo dinámico contra el tiempo objetivo (óptimo, atención, crítico)', () => {
    const ahora = 1_700_000_000_000;
    const creado5mAtras = ahora - 5 * 60000;
    const creado10mAtras = ahora - 10 * 60000;
    const creado15mAtras = ahora - 15 * 60000;

    const opt = evaluarSemaforoComandaConObjetivo(creado5mAtras, 12, ahora);
    expect(opt.nivel).toBe('optimo');
    expect(opt.restanteMin).toBe(7);

    const att = evaluarSemaforoComandaConObjetivo(creado10mAtras, 12, ahora);
    expect(att.nivel).toBe('atencion');
    expect(att.restanteMin).toBe(2);

    const crit = evaluarSemaforoComandaConObjetivo(creado15mAtras, 12, ahora);
    expect(crit.nivel).toBe('critico');
    expect(crit.etiquetaObjetivo).toContain('Excedido +3m');
  });

  it('filtra, cuenta y agrupa comandas por estación de cocina', () => {
    const cmdFritura = crearComandaMock('c1', [
      {
        tipo: 'producto',
        referenciaId: 'f1',
        nombre: 'Tequeños',
        cantidad: 1,
        precioUnitario: 10000,
        subtotal: 10000,
        estacionCocina: 'fritura',
        tiempoPreparacionMin: 8,
      },
    ]);

    const cmdMixta = crearComandaMock('c2', [
      {
        tipo: 'producto',
        referenciaId: 'p1',
        nombre: 'Burger',
        cantidad: 1,
        precioUnitario: 18000,
        subtotal: 18000,
        estacionCocina: 'plancha',
        tiempoPreparacionMin: 12,
      },
      {
        tipo: 'producto',
        referenciaId: 'b1',
        nombre: 'Jugo Natural',
        cantidad: 1,
        precioUnitario: 6000,
        subtotal: 6000,
        estacionCocina: 'bebidas_barra',
        tiempoPreparacionMin: 3,
      },
    ]);

    const todas = [cmdFritura, cmdMixta];
    const conteo = contarComandasPorEstacion(todas);
    expect(conteo.fritura).toBe(1);
    expect(conteo.plancha).toBe(1);
    expect(conteo.bebidas_barra).toBe(1);

    expect(filtrarComandasPorEstacion(todas, 'todas')).toHaveLength(2);
    expect(filtrarComandasPorEstacion(todas, 'fritura').map((c) => c.id)).toEqual(['c1']);
    expect(filtrarComandasPorEstacion(todas, 'bebidas_barra').map((c) => c.id)).toEqual(['c2']);

    const grupos = agruparItemsComandaPorEstacion(cmdMixta.items);
    expect(grupos.map((g) => g.estacion)).toEqual(['plancha', 'bebidas_barra']);
    expect(grupos[0].items[0].originalIndex).toBe(0);
    expect(grupos[1].items[0].originalIndex).toBe(1);
  });
});
