/**
 * Alérgenos principales de declaración obligatoria en la carta
 * (alineados con la Res. 5109/2005 de Colombia y la lista de 14 alérgenos UE).
 */
export type AlergenoId =
  | 'gluten'
  | 'lacteos'
  | 'huevo'
  | 'mani'
  | 'frutos_secos'
  | 'soya'
  | 'pescado'
  | 'mariscos'
  | 'sesamo'
  | 'sulfitos';

/**
 * Etiquetas dietéticas visibles para el comensal (filtros y badges del menú).
 */
export type EtiquetaDietetica =
  | 'vegetariano'
  | 'vegano'
  | 'sin_gluten'
  | 'sin_lactosa'
  | 'picante';

/**
 * Información nutricional básica por porción servida.
 */
export interface InfoNutricional {
  calorias?: number;      // kcal por porción (entero 0..5000)
  porcionGramos?: number; // gramos por porción (entero 1..5000)
}

/**
 * Alergias o restricciones declaradas por el comensal al tomar la comanda.
 */
export interface AlergiasComensal {
  alergenos: AlergenoId[];
  nota?: string; // Ej: "Alergia severa, usar utensilios separados"
}

/**
 * Metadatos visuales de un alérgeno.
 */
export interface InfoAlergeno {
  id: AlergenoId;
  label: string;
  shortLabel: string;
  emoji: string;
  descripcion: string;
}

/**
 * Metadatos visuales de una etiqueta dietética.
 */
export interface InfoEtiquetaDietetica {
  id: EtiquetaDietetica;
  label: string;
  shortLabel: string;
  emoji: string;
  badgeClass: string;
  pillActiveClass: string;
}

/**
 * Filtro dietético seleccionado por el comensal en Storefront, Kiosco o Menú QR.
 */
export interface FiltroDietetico {
  etiquetas: EtiquetaDietetica[];
  excluirAlergenos: AlergenoId[];
}

/**
 * Perfil dietético resuelto de un producto o combo (combos heredan alérgenos de sus productos).
 */
export interface PerfilDietetico {
  alergenos: AlergenoId[];
  etiquetas: EtiquetaDietetica[];
  infoNutricional?: InfoNutricional;
  /** True si el administrador verificó explícitamente la declaración de alérgenos */
  declarado: boolean;
}

/**
 * Ítem de una comanda que contiene alérgenos declarados por el comensal.
 */
export interface ConflictoAlergiaItem {
  itemIndex: number;
  nombre: string;
  alergenos: AlergenoId[];
}

/**
 * Estado editable del perfil dietético en los formularios de `/productos`.
 */
export interface PerfilDieteticoFormState {
  declarado: boolean;
  alergenos: AlergenoId[];
  etiquetas: EtiquetaDietetica[];
  caloriasStr: string;
  porcionGramosStr: string;
}

/**
 * Campos persistibles del perfil dietético en `Producto` y `Combo`.
 */
export interface PerfilDieteticoPayload {
  alergenosDeclarados: boolean;
  alergenos: AlergenoId[];
  etiquetasDieteticas: EtiquetaDietetica[];
  infoNutricional?: InfoNutricional;
}
