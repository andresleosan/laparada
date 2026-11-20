import type {
  CatalogoCocinaRef,
  Combo,
  Domicilio,
  EstacionCocina,
  EstacionFiltro,
  InfoEstacionCocina,
  ItemVenta,
  Producto,
  SemaforoObjetivoComanda,
} from '@/types';
import { timestampToMillis } from './kitchenKds';

export const ESTACIONES_COCINA_ORDEN: EstacionCocina[] = [
  'fritura',
  'plancha',
  'bebidas_barra',
  'armado',
  'general',
];

export const TIEMPOS_PREPARACION_SUGERIDOS: number[] = [3, 5, 8, 10, 12, 15, 20, 25];

export const ESTACIONES_COCINA_META: Record<EstacionCocina, InfoEstacionCocina> = {
  fritura: {
    id: 'fritura',
    label: 'Fritura',
    shortLabel: 'Fritura',
    emoji: '🍟',
    descripcion: 'Freidora: tequeños, pancerotis, papas, empanadas y croquetas.',
    tiempoDefaultMin: 8,
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    pillActiveClass: 'border-amber-400 bg-amber-500/25 text-amber-200',
  },
  plancha: {
    id: 'plancha',
    label: 'Plancha / Parrilla',
    shortLabel: 'Plancha',
    emoji: '🔥',
    descripcion: 'Parrilla y plancha: hamburguesas, perros, carnes, pepitos y asados.',
    tiempoDefaultMin: 12,
    badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    pillActiveClass: 'border-orange-400 bg-orange-500/25 text-orange-200',
  },
  bebidas_barra: {
    id: 'bebidas_barra',
    label: 'Bebidas / Barra',
    shortLabel: 'Barra',
    emoji: '🥤',
    descripcion: 'Barra fría/caliente: jugos, limonadas, gaseosas, malteadas y cervezas.',
    tiempoDefaultMin: 3,
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    pillActiveClass: 'border-sky-400 bg-sky-500/25 text-sky-200',
  },
  armado: {
    id: 'armado',
    label: 'Armado / Empaque',
    shortLabel: 'Armado',
    emoji: '📦',
    descripcion: 'Estación de ensamble, combos, salsas y empaque final.',
    tiempoDefaultMin: 5,
    badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    pillActiveClass: 'border-purple-400 bg-purple-500/25 text-purple-200',
  },
  general: {
    id: 'general',
    label: 'Cocina General',
    shortLabel: 'General',
    emoji: '🍳',
    descripcion: 'Estación general cuando no aplica una línea específica.',
    tiempoDefaultMin: 10,
    badgeClass: 'bg-neutral-700/70 text-neutral-200 border-neutral-600',
    pillActiveClass: 'border-gold-400 bg-gold-400/20 text-gold-300',
  },
};

export function sanitizarTiempoPreparacion(valor: unknown): number | undefined {
  if (valor === null || valor === undefined || valor === '') return undefined;
  const num = typeof valor === 'number' ? valor : Number(valor);
  if (!Number.isFinite(num) || num <= 0) return undefined;
  return Math.min(180, Math.max(1, Math.round(num)));
}

function normalizarTexto(texto?: string): string {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Infiere la estación de cocina más probable cuando un producto o ítem heredado
 * no tiene estación explícita configurada.
 */
export function inferirEstacionPorCategoriaONombre(
  categoria?: string,
  nombre?: string
): EstacionCocina {
  const texto = `${normalizarTexto(categoria)} ${normalizarTexto(nombre)}`.trim();
  if (!texto) return 'general';

  if (
    /\b(bebidas?|jugos?|gaseosas?|coca|postobon|pepsi|limonadas?|cervezas?|malteadas?|batidos?|aguas?|te|cafe|barra|sodas?|refrescos?|granizados?)\b/.test(
      texto
    )
  ) {
    return 'bebidas_barra';
  }

  if (
    /\b(tequenos?|pancerotis?|panzerotis?|papas?|yucas?|patacones?|patacon|empanadas?|deditos?|fritos?|frituras?|croquetas?|nuggets?|salchipapas?|aros)\b/.test(
      texto
    )
  ) {
    return 'fritura';
  }

  if (
    /\b(hamburguesas?|burgers?|perros?|hot dogs?|pepitos?|carnes?|pollos?|parrilla|plancha|asados?|chorizos?|picadas?|sanduches?|sandwich|arepas?|chuletas?|lomitos?|costillas?)\b/.test(
      texto
    )
  ) {
    return 'plancha';
  }

  if (/\b(combos?|cajas?|armado|postres?|adicionales?|salsas?)\b/.test(texto)) {
    return 'armado';
  }

  return 'general';
}

export function construirCatalogoCocinaLookup(
  productos: Array<Pick<Producto, 'id' | 'nombre' | 'categoria' | 'estacionCocina' | 'tiempoPreparacionMin'>>,
  combos: Array<Pick<Combo, 'id' | 'nombre' | 'categoria' | 'estacionCocina' | 'tiempoPreparacionMin'>> = []
): Map<string, CatalogoCocinaRef> {
  const map = new Map<string, CatalogoCocinaRef>();
  for (const p of productos) {
    map.set(p.id, {
      estacionCocina: p.estacionCocina,
      tiempoPreparacionMin: p.tiempoPreparacionMin,
      categoria: p.categoria,
      nombre: p.nombre,
    });
  }
  for (const c of combos) {
    map.set(c.id, {
      estacionCocina: c.estacionCocina,
      tiempoPreparacionMin: c.tiempoPreparacionMin,
      categoria: c.categoria || 'Combos',
      nombre: c.nombre,
    });
  }
  return map;
}

export function resolverEstacionItem(
  item: Pick<ItemVenta, 'referenciaId' | 'nombre' | 'tipo' | 'estacionCocina'>,
  catalogoLookup?: Map<string, CatalogoCocinaRef>
): EstacionCocina {
  if (item.estacionCocina && ESTACIONES_COCINA_META[item.estacionCocina]) {
    return item.estacionCocina;
  }
  const ref = item.referenciaId ? catalogoLookup?.get(item.referenciaId) : undefined;
  if (ref?.estacionCocina && ESTACIONES_COCINA_META[ref.estacionCocina]) {
    return ref.estacionCocina;
  }
  return inferirEstacionPorCategoriaONombre(
    ref?.categoria ?? (item.tipo === 'combo' ? 'combo' : undefined),
    ref?.nombre ?? item.nombre
  );
}

export function resolverTiempoPreparacionItem(
  item: Pick<ItemVenta, 'referenciaId' | 'nombre' | 'tipo' | 'estacionCocina' | 'tiempoPreparacionMin'>,
  catalogoLookup?: Map<string, CatalogoCocinaRef>
): number {
  const explicit = sanitizarTiempoPreparacion(item.tiempoPreparacionMin);
  if (explicit !== undefined) return explicit;

  const ref = item.referenciaId ? catalogoLookup?.get(item.referenciaId) : undefined;
  const fromCatalog = sanitizarTiempoPreparacion(ref?.tiempoPreparacionMin);
  if (fromCatalog !== undefined) return fromCatalog;

  const estacion = resolverEstacionItem(item, catalogoLookup);
  return ESTACIONES_COCINA_META[estacion].tiempoDefaultMin;
}

export function calcularTiempoObjetivoItems(
  items: ItemVenta[],
  catalogoLookup?: Map<string, CatalogoCocinaRef>
): number {
  if (!items || items.length === 0) return 10;
  let maxMin = 0;
  for (const item of items) {
    const tiempo = resolverTiempoPreparacionItem(item, catalogoLookup);
    if (tiempo > maxMin) maxMin = tiempo;
  }
  return maxMin > 0 ? maxMin : 10;
}

export function calcularTiempoObjetivoComanda(
  comanda: Pick<Domicilio, 'items' | 'tiempoObjetivoMin'>,
  catalogoLookup?: Map<string, CatalogoCocinaRef>
): number {
  const explicito = sanitizarTiempoPreparacion(comanda.tiempoObjetivoMin);
  if (explicito !== undefined) return explicito;
  return calcularTiempoObjetivoItems(comanda.items || [], catalogoLookup);
}

/**
 * Evalúa el semáforo de una comanda contra su tiempo objetivo de preparación.
 * - Óptimo (verde): < 75% del objetivo
 * - Atención (ámbar): >= 75% y < 100% del objetivo
 * - Crítico (rojo): >= 100% del objetivo
 */
export function evaluarSemaforoComandaConObjetivo(
  creadoEn: unknown,
  tiempoObjetivoMin: number,
  ahoraMs: number = Date.now()
): SemaforoObjetivoComanda {
  const objetivoSeguro = sanitizarTiempoPreparacion(tiempoObjetivoMin) ?? 10;
  const inicioMs = timestampToMillis(creadoEn, ahoraMs);
  const transcurridoMs = Math.max(0, ahoraMs - inicioMs);
  const minutosTranscurridos = Math.floor(transcurridoMs / 60000);
  const restanteMin = objetivoSeguro - minutosTranscurridos;
  const progresoPct = Math.min(100, Math.round((transcurridoMs / (objetivoSeguro * 60000)) * 100));

  const umbralAtencion = Math.max(1, objetivoSeguro * 0.75);

  if (minutosTranscurridos < umbralAtencion) {
    return {
      nivel: 'optimo',
      minutosTranscurridos,
      tiempoObjetivoMin: objetivoSeguro,
      restanteMin,
      progresoPct,
      etiquetaObjetivo: `Obj ${objetivoSeguro}m · Quedan ${restanteMin}m`,
      borderClass: 'border-emerald-500/50 hover:border-emerald-400',
      bgCardClass: 'bg-emerald-950/15',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    };
  }

  if (minutosTranscurridos < objetivoSeguro) {
    return {
      nivel: 'atencion',
      minutosTranscurridos,
      tiempoObjetivoMin: objetivoSeguro,
      restanteMin,
      progresoPct,
      etiquetaObjetivo: `Obj ${objetivoSeguro}m · Quedan ${restanteMin}m`,
      borderClass: 'border-amber-500/60 hover:border-amber-400',
      bgCardClass: 'bg-amber-950/20',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    };
  }

  const excesoMin = Math.abs(restanteMin);
  return {
    nivel: 'critico',
    minutosTranscurridos,
    tiempoObjetivoMin: objetivoSeguro,
    restanteMin,
    progresoPct: 100,
    etiquetaObjetivo:
      excesoMin === 0
        ? `Obj ${objetivoSeguro}m · En límite`
        : `Excedido +${excesoMin}m (Obj ${objetivoSeguro}m)`,
    borderClass: 'border-red-500 hover:border-red-400 ring-1 ring-red-500/40',
    bgCardClass: 'bg-red-950/25',
    badgeClass: 'bg-red-500/25 text-red-300 border-red-500/50 animate-pulse',
  };
}

export function filtrarComandasPorEstacion(
  comandas: Domicilio[],
  estacionFiltro: EstacionFiltro,
  catalogoLookup?: Map<string, CatalogoCocinaRef>
): Domicilio[] {
  if (estacionFiltro === 'todas') return comandas;
  return comandas.filter((comanda) =>
    (comanda.items || []).some(
      (item) => resolverEstacionItem(item, catalogoLookup) === estacionFiltro
    )
  );
}

export function contarComandasPorEstacion(
  comandas: Domicilio[],
  catalogoLookup?: Map<string, CatalogoCocinaRef>
): Record<EstacionCocina, number> {
  const conteos: Record<EstacionCocina, number> = {
    fritura: 0,
    plancha: 0,
    bebidas_barra: 0,
    armado: 0,
    general: 0,
  };

  for (const comanda of comandas) {
    const estacionesEnComanda = new Set<EstacionCocina>();
    for (const item of comanda.items || []) {
      estacionesEnComanda.add(resolverEstacionItem(item, catalogoLookup));
    }
    for (const est of estacionesEnComanda) {
      conteos[est] += 1;
    }
  }

  return conteos;
}

export interface GrupoItemsEstacion {
  estacion: EstacionCocina;
  meta: InfoEstacionCocina;
  items: Array<{
    item: ItemVenta;
    originalIndex: number;
    tiempoPreparacionMin: number;
  }>;
}

export function agruparItemsComandaPorEstacion(
  items: ItemVenta[],
  catalogoLookup?: Map<string, CatalogoCocinaRef>
): GrupoItemsEstacion[] {
  const gruposMap = new Map<EstacionCocina, GrupoItemsEstacion['items']>();

  items.forEach((item, originalIndex) => {
    const estacion = resolverEstacionItem(item, catalogoLookup);
    const tiempoPreparacionMin = resolverTiempoPreparacionItem(item, catalogoLookup);
    const lista = gruposMap.get(estacion) || [];
    lista.push({ item, originalIndex, tiempoPreparacionMin });
    gruposMap.set(estacion, lista);
  });

  const grupos: GrupoItemsEstacion[] = [];
  for (const est of ESTACIONES_COCINA_ORDEN) {
    const lista = gruposMap.get(est);
    if (lista && lista.length > 0) {
      grupos.push({
        estacion: est,
        meta: ESTACIONES_COCINA_META[est],
        items: lista,
      });
    }
  }
  return grupos;
}
