import type {
  AlergenoId,
  AlergiasComensal,
  Combo,
  ConflictoAlergiaItem,
  EtiquetaDietetica,
  FiltroDietetico,
  InfoAlergeno,
  InfoEtiquetaDietetica,
  InfoNutricional,
  ItemVenta,
  PerfilDietetico,
  PerfilDieteticoFormState,
  PerfilDieteticoPayload,
  Producto,
} from '@/types';

export const ALERGENOS_ORDEN: readonly AlergenoId[] = [
  'gluten',
  'lacteos',
  'huevo',
  'mani',
  'frutos_secos',
  'soya',
  'pescado',
  'mariscos',
  'sesamo',
  'sulfitos',
];

export const ALERGENOS_META: Record<AlergenoId, InfoAlergeno> = {
  gluten: { id: 'gluten', label: 'Gluten (trigo, cebada, avena)', shortLabel: 'Gluten', emoji: '🌾', descripcion: 'Harinas de trigo, pan, apanados, masas de tequeño.' },
  lacteos: { id: 'lacteos', label: 'Lácteos (leche y derivados)', shortLabel: 'Lácteos', emoji: '🥛', descripcion: 'Leche, queso, crema, mantequilla, suero.' },
  huevo: { id: 'huevo', label: 'Huevo', shortLabel: 'Huevo', emoji: '🥚', descripcion: 'Huevo y salsas con huevo (mayonesa, tártara).' },
  mani: { id: 'mani', label: 'Maní', shortLabel: 'Maní', emoji: '🥜', descripcion: 'Maní, mantequilla de maní, salsas de maní.' },
  frutos_secos: { id: 'frutos_secos', label: 'Frutos secos (nueces, almendras)', shortLabel: 'Frutos secos', emoji: '🌰', descripcion: 'Nueces, almendras, avellanas, marañón.' },
  soya: { id: 'soya', label: 'Soya', shortLabel: 'Soya', emoji: '🫘', descripcion: 'Salsa de soya, tofu, proteína de soya.' },
  pescado: { id: 'pescado', label: 'Pescado', shortLabel: 'Pescado', emoji: '🐟', descripcion: 'Pescados y salsas a base de pescado.' },
  mariscos: { id: 'mariscos', label: 'Mariscos y crustáceos', shortLabel: 'Mariscos', emoji: '🦐', descripcion: 'Camarón, langostino, cangrejo, moluscos.' },
  sesamo: { id: 'sesamo', label: 'Ajonjolí (sésamo)', shortLabel: 'Ajonjolí', emoji: '🫓', descripcion: 'Semillas de ajonjolí, tahini, panes con ajonjolí.' },
  sulfitos: { id: 'sulfitos', label: 'Sulfitos', shortLabel: 'Sulfitos', emoji: '🍷', descripcion: 'Conservantes en vinos, encurtidos y embutidos.' },
};

export const ETIQUETAS_DIETETICAS_ORDEN: readonly EtiquetaDietetica[] = [
  'vegetariano',
  'vegano',
  'sin_gluten',
  'sin_lactosa',
  'picante',
];

export const ETIQUETAS_DIETETICAS_META: Record<EtiquetaDietetica, InfoEtiquetaDietetica> = {
  vegetariano: {
    id: 'vegetariano',
    label: 'Vegetariano',
    shortLabel: 'Veggie',
    emoji: '🥗',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
    pillActiveClass: 'border-emerald-400 bg-emerald-500/25 text-emerald-200',
  },
  vegano: {
    id: 'vegano',
    label: 'Vegano',
    shortLabel: 'Vegano',
    emoji: '🌱',
    badgeClass: 'border-lime-500/40 bg-lime-500/15 text-lime-300',
    pillActiveClass: 'border-lime-400 bg-lime-500/25 text-lime-200',
  },
  sin_gluten: {
    id: 'sin_gluten',
    label: 'Sin gluten',
    shortLabel: 'Sin gluten',
    emoji: '🚫🌾',
    badgeClass: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
    pillActiveClass: 'border-amber-400 bg-amber-500/25 text-amber-200',
  },
  sin_lactosa: {
    id: 'sin_lactosa',
    label: 'Sin lactosa',
    shortLabel: 'Sin lactosa',
    emoji: '🚫🥛',
    badgeClass: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
    pillActiveClass: 'border-sky-400 bg-sky-500/25 text-sky-200',
  },
  picante: {
    id: 'picante',
    label: 'Picante',
    shortLabel: 'Picante',
    emoji: '🌶️',
    badgeClass: 'border-red-500/40 bg-red-500/15 text-red-300',
    pillActiveClass: 'border-red-400 bg-red-500/25 text-red-200',
  },
};

/** Alérgenos que hacen incoherente cada etiqueta dietética. */
const ALERGENOS_INCOMPATIBLES: Record<EtiquetaDietetica, readonly AlergenoId[]> = {
  vegetariano: ['pescado', 'mariscos'],
  vegano: ['lacteos', 'huevo', 'pescado', 'mariscos'],
  sin_gluten: ['gluten'],
  sin_lactosa: ['lacteos'],
  picante: [],
};

export const FILTRO_DIETETICO_VACIO: FiltroDietetico = Object.freeze({
  etiquetas: [],
  excluirAlergenos: [],
}) as FiltroDietetico;

export const PERFIL_DIETETICO_VACIO: PerfilDietetico = Object.freeze({
  alergenos: [],
  etiquetas: [],
  declarado: false,
}) as PerfilDietetico;

const NOTA_ALERGIA_MAX = 200;
const NUTRICION_MAX = 5000;

function sanitizarLista<T extends string>(input: unknown, orden: readonly T[]): T[] {
  if (!Array.isArray(input)) return [];
  const validos = new Set<T>();
  for (const raw of input) {
    if (typeof raw === 'string' && (orden as readonly string[]).includes(raw)) {
      validos.add(raw as T);
    }
  }
  return orden.filter((id) => validos.has(id));
}

/** Normaliza una lista de alérgenos: descarta valores inválidos, duplicados y ordena canónicamente. */
export function sanitizarAlergenos(input: unknown): AlergenoId[] {
  return sanitizarLista(input, ALERGENOS_ORDEN);
}

/** Normaliza una lista de etiquetas dietéticas. */
export function sanitizarEtiquetasDieteticas(input: unknown): EtiquetaDietetica[] {
  return sanitizarLista(input, ETIQUETAS_DIETETICAS_ORDEN);
}

function sanitizarEnteroNutricional(raw: unknown, min: number): number | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined;
  const num = typeof raw === 'number' ? raw : Number(String(raw).trim().replace(',', '.'));
  if (!Number.isFinite(num) || num < min || num > NUTRICION_MAX) return undefined;
  return Math.round(num);
}

/** Valida la información nutricional por porción; retorna undefined si no hay datos válidos. */
export function sanitizarInfoNutricional(input: unknown): InfoNutricional | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const data = input as Record<string, unknown>;
  const calorias = sanitizarEnteroNutricional(data.calorias, 0);
  const porcionGramos = sanitizarEnteroNutricional(data.porcionGramos, 1);
  if (calorias === undefined && porcionGramos === undefined) return undefined;
  return {
    ...(calorias !== undefined ? { calorias } : {}),
    ...(porcionGramos !== undefined ? { porcionGramos } : {}),
  };
}

/** Normaliza las alergias del comensal; retorna undefined si no hay nada declarado. */
export function sanitizarAlergiasComensal(input: unknown): AlergiasComensal | undefined {
  if (!input || typeof input !== 'object') return undefined;
  const data = input as Record<string, unknown>;
  const alergenos = sanitizarAlergenos(data.alergenos);
  const nota =
    typeof data.nota === 'string'
      ? data.nota.replace(/\s+/g, ' ').trim().slice(0, NOTA_ALERGIA_MAX)
      : '';
  if (alergenos.length === 0 && !nota) return undefined;
  return { alergenos, ...(nota ? { nota } : {}) };
}

export function tieneAlergiasComensal(alergias?: AlergiasComensal | null): boolean {
  return Boolean(sanitizarAlergiasComensal(alergias));
}

/** Retorna los mensajes de incoherencia entre alérgenos declarados y etiquetas dietéticas. */
export function detectarIncoherenciasDieteticas(
  alergenos: readonly AlergenoId[],
  etiquetas: readonly EtiquetaDietetica[]
): string[] {
  const presentes = new Set(alergenos);
  const errores: string[] = [];
  for (const etiqueta of etiquetas) {
    const choques = ALERGENOS_INCOMPATIBLES[etiqueta].filter((a) => presentes.has(a));
    if (choques.length > 0) {
      errores.push(
        `"${ETIQUETAS_DIETETICAS_META[etiqueta].label}" no es compatible con: ${formatearAlergenos(choques)}`
      );
    }
  }
  return errores;
}

/** Descarta etiquetas que contradicen los alérgenos presentes (seguridad del comensal primero). */
export function resolverEtiquetasCoherentes(
  alergenos: readonly AlergenoId[],
  etiquetas: readonly EtiquetaDietetica[]
): EtiquetaDietetica[] {
  const presentes = new Set(alergenos);
  return sanitizarEtiquetasDieteticas(etiquetas).filter((etiqueta) =>
    ALERGENOS_INCOMPATIBLES[etiqueta].every((a) => !presentes.has(a))
  );
}

export function formatearAlergenos(alergenos: readonly AlergenoId[]): string {
  return sanitizarAlergenos(alergenos)
    .map((a) => ALERGENOS_META[a].shortLabel)
    .join(', ');
}

type PerfilFuente = Pick<
  Producto,
  'alergenosDeclarados' | 'alergenos' | 'etiquetasDieteticas' | 'infoNutricional'
>;

/** Construye el perfil dietético de un producto a partir de sus campos persistidos. */
export function construirPerfilDietetico(fuente: Partial<PerfilFuente>): PerfilDietetico {
  const alergenos = sanitizarAlergenos(fuente.alergenos);
  const declarado = fuente.alergenosDeclarados === true || alergenos.length > 0;
  const etiquetas = resolverEtiquetasCoherentes(alergenos, fuente.etiquetasDieteticas ?? []);
  const infoNutricional = sanitizarInfoNutricional(fuente.infoNutricional);
  return {
    alergenos,
    etiquetas,
    declarado,
    ...(infoNutricional ? { infoNutricional } : {}),
  };
}

/**
 * Lookup por id de producto/combo con su perfil dietético resuelto.
 * Los combos suman los alérgenos de sus productos fijos y su declaración depende de que
 * el combo y todos sus productos estén declarados.
 */
export function construirLookupPerfilDietetico(
  productos: ReadonlyArray<Pick<Producto, 'id'> & Partial<PerfilFuente>>,
  combos: ReadonlyArray<Pick<Combo, 'id' | 'items'> & Partial<PerfilFuente>> = []
): Map<string, PerfilDietetico> {
  const map = new Map<string, PerfilDietetico>();
  for (const p of productos) {
    map.set(p.id, construirPerfilDietetico(p));
  }
  for (const c of combos) {
    const propio = construirPerfilDietetico(c);
    const alergenos = new Set<AlergenoId>(propio.alergenos);
    let productosDeclarados = true;
    for (const item of c.items ?? []) {
      const perfilProd = map.get(item.productoId);
      if (!perfilProd || !perfilProd.declarado) {
        productosDeclarados = false;
        continue;
      }
      perfilProd.alergenos.forEach((a) => alergenos.add(a));
    }
    const alergenosOrdenados = sanitizarAlergenos([...alergenos]);
    map.set(c.id, {
      alergenos: alergenosOrdenados,
      etiquetas: resolverEtiquetasCoherentes(alergenosOrdenados, propio.etiquetas),
      declarado: propio.declarado && productosDeclarados,
      ...(propio.infoNutricional ? { infoNutricional: propio.infoNutricional } : {}),
    });
  }
  return map;
}

export function contarFiltrosDieteticosActivos(filtro: FiltroDietetico): number {
  return filtro.etiquetas.length + filtro.excluirAlergenos.length;
}

/**
 * Evalúa si un perfil cumple el filtro dietético del comensal.
 * Si se excluyen alérgenos, solo pasan platos con declaración verificada (no se garantiza lo no declarado).
 */
export function cumpleFiltroDietetico(
  perfil: PerfilDietetico | undefined,
  filtro: FiltroDietetico
): boolean {
  if (contarFiltrosDieteticosActivos(filtro) === 0) return true;
  if (!perfil) return false;
  const etiquetas = new Set(perfil.etiquetas);
  const cumpleEtiquetas = filtro.etiquetas.every(
    (et) => etiquetas.has(et) || (et === 'vegetariano' && etiquetas.has('vegano'))
  );
  if (!cumpleEtiquetas) return false;
  if (filtro.excluirAlergenos.length === 0) return true;
  if (!perfil.declarado) return false;
  return filtro.excluirAlergenos.every((a) => !perfil.alergenos.includes(a));
}

export function filtrarPorPerfilDietetico<T extends { id: string }>(
  items: readonly T[],
  lookup: Map<string, PerfilDietetico>,
  filtro: FiltroDietetico
): T[] {
  if (contarFiltrosDieteticosActivos(filtro) === 0) return [...items];
  return items.filter((it) => cumpleFiltroDietetico(lookup.get(it.id), filtro));
}

export function alternarEnLista<T>(lista: readonly T[], valor: T): T[] {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

/** Resuelve los alérgenos de un ítem de comanda incluyendo las elecciones de combos personalizables. */
export function resolverAlergenosItem(
  item: Pick<ItemVenta, 'referenciaId' | 'eleccionesCombo'>,
  lookup: Map<string, PerfilDietetico>
): AlergenoId[] {
  const alergenos = new Set<AlergenoId>(lookup.get(item.referenciaId)?.alergenos ?? []);
  for (const eleccion of item.eleccionesCombo ?? []) {
    if (!eleccion.productoId) continue;
    lookup.get(eleccion.productoId)?.alergenos.forEach((a) => alergenos.add(a));
  }
  return sanitizarAlergenos([...alergenos]);
}

/** Detecta los ítems de la comanda que contienen alérgenos declarados por el comensal. */
export function detectarConflictosAlergia(
  items: ReadonlyArray<Pick<ItemVenta, 'referenciaId' | 'nombre' | 'eleccionesCombo'>>,
  alergias: AlergiasComensal | undefined | null,
  lookup: Map<string, PerfilDietetico>
): ConflictoAlergiaItem[] {
  const alergiasLimpias = sanitizarAlergiasComensal(alergias);
  if (!alergiasLimpias || alergiasLimpias.alergenos.length === 0) return [];
  const declaradas = new Set(alergiasLimpias.alergenos);
  const conflictos: ConflictoAlergiaItem[] = [];
  items.forEach((item, itemIndex) => {
    const choques = resolverAlergenosItem(item, lookup).filter((a) => declaradas.has(a));
    if (choques.length > 0) {
      conflictos.push({ itemIndex, nombre: item.nombre, alergenos: choques });
    }
  });
  return conflictos;
}

export function perfilFormDesdeFuente(fuente?: Partial<PerfilFuente>): PerfilDieteticoFormState {
  const perfil = construirPerfilDietetico(fuente ?? {});
  return {
    declarado: perfil.declarado,
    alergenos: perfil.alergenos,
    etiquetas: sanitizarEtiquetasDieteticas(fuente?.etiquetasDieteticas ?? []),
    caloriasStr:
      perfil.infoNutricional?.calorias !== undefined ? String(perfil.infoNutricional.calorias) : '',
    porcionGramosStr:
      perfil.infoNutricional?.porcionGramos !== undefined
        ? String(perfil.infoNutricional.porcionGramos)
        : '',
  };
}

export interface ResultadoPerfilDietetico {
  payload?: PerfilDieteticoPayload;
  error?: string;
}

/**
 * Valida el formulario de perfil dietético y construye el payload persistible.
 * `teniaInfoNutricional` permite limpiar la información nutricional previa con un mapa vacío.
 */
export function construirPayloadPerfilDietetico(
  form: PerfilDieteticoFormState,
  teniaInfoNutricional = false
): ResultadoPerfilDietetico {
  const alergenos = form.declarado ? sanitizarAlergenos(form.alergenos) : [];
  const etiquetas = sanitizarEtiquetasDieteticas(form.etiquetas);
  const incoherencias = detectarIncoherenciasDieteticas(alergenos, etiquetas);
  if (incoherencias.length > 0) {
    return { error: incoherencias[0] };
  }

  const caloriasTxt = form.caloriasStr.trim();
  const porcionTxt = form.porcionGramosStr.trim();
  const calorias = sanitizarEnteroNutricional(caloriasTxt, 0);
  const porcionGramos = sanitizarEnteroNutricional(porcionTxt, 1);
  if (caloriasTxt && calorias === undefined) {
    return { error: `Las calorías deben estar entre 0 y ${NUTRICION_MAX} kcal` };
  }
  if (porcionTxt && porcionGramos === undefined) {
    return { error: `La porción debe estar entre 1 y ${NUTRICION_MAX} g` };
  }

  const infoNutricional = sanitizarInfoNutricional({ calorias, porcionGramos });
  return {
    payload: {
      alergenosDeclarados: form.declarado,
      alergenos,
      etiquetasDieteticas: etiquetas,
      ...(infoNutricional
        ? { infoNutricional }
        : teniaInfoNutricional
          ? { infoNutricional: {} }
          : {}),
    },
  };
}
