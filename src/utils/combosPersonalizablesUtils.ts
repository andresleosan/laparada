import type {
  CategoriaGrupoEleccion,
  Combo,
  EleccionComboSeleccionada,
  GrupoEleccionCombo,
  Insumo,
  InsumoReceta,
  ItemVenta,
  OpcionEleccionCombo,
  Producto,
  ValidacionSeleccionCombo,
} from '@/types';
import { evaluarEstadoStockOpcionCombo } from './recetasEscandallo';

function generarIdLocal(prefijo: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefijo}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefijo}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

function limpiarPrefijoGrupoNombre(grupoNombre: string): string {
  const limpio = grupoNombre
    .trim()
    .replace(/^(elige\s+tus?|elige\s+los?|elige\s+las?|selecciona\s+tus?|selecciona\s+el|selecciona\s+la|selecciona)\s+/i, '')
    .trim();
  if (!limpio) return grupoNombre.trim();
  return limpio.charAt(0).toUpperCase() + limpio.slice(1);
}

/**
 * Determina si un combo tiene habilitada la personalización con al menos un grupo de elección.
 */
export function esComboPersonalizable(
  combo: Pick<Combo, 'esPersonalizable' | 'gruposEleccion'> | null | undefined
): boolean {
  return Boolean(
    combo?.esPersonalizable &&
      Array.isArray(combo.gruposEleccion) &&
      combo.gruposEleccion.length > 0
  );
}

/**
 * Genera un grupo de elección preconfigurado por categoría usando productos o insumos reales cuando existen.
 */
export function crearGrupoDesdePlantilla(
  categoria: CategoriaGrupoEleccion,
  productos: Producto[] = [],
  insumos: Insumo[] = []
): GrupoEleccionCombo {
  const productosDisponibles = productos.filter((p) => p.disponible !== false);

  if (categoria === 'bebida') {
    const bebidas = productosDisponibles
      .filter((p) =>
        /bebida|gaseosa|jugo|agua|limonada|coca|postobon|pepsi|hit|te\s|té\s|cerveza|malta/i.test(
          `${p.categoria || ''} ${p.nombre}`
        )
      )
      .slice(0, 4);

    const opciones: OpcionEleccionCombo[] =
      bebidas.length > 0
        ? bebidas.map((prod, idx) => ({
            id: generarIdLocal('opc'),
            nombre: prod.nombre,
            productoId: prod.id,
            cantidadProducto: 1,
            recargoCOP: 0,
            disponible: true,
            porDefecto: idx === 0,
          }))
        : [
            {
              id: generarIdLocal('opc'),
              nombre: 'Gaseosa Personal 400ml',
              recargoCOP: 0,
              disponible: true,
              porDefecto: true,
            },
            {
              id: generarIdLocal('opc'),
              nombre: 'Jugo Natural',
              recargoCOP: 1000,
              disponible: true,
              porDefecto: false,
            },
          ];

    return {
      id: generarIdLocal('grp'),
      nombre: 'Elige tu Bebida',
      categoriaGrupo: 'bebida',
      obligatorio: true,
      minSelecciones: 1,
      maxSelecciones: 1,
      opciones,
    };
  }

  if (categoria === 'acompanamiento') {
    const acomp = productosDisponibles
      .filter((p) =>
        /papa|acompañ|yuquita|yuca|arepa|arroz|ensalada|aros|tequeño|salchipapa/i.test(
          `${p.categoria || ''} ${p.nombre}`
        )
      )
      .slice(0, 4);

    const opciones: OpcionEleccionCombo[] =
      acomp.length > 0
        ? acomp.map((prod, idx) => ({
            id: generarIdLocal('opc'),
            nombre: prod.nombre,
            productoId: prod.id,
            cantidadProducto: 1,
            recargoCOP: 0,
            disponible: true,
            porDefecto: idx === 0,
          }))
        : [
            {
              id: generarIdLocal('opc'),
              nombre: 'Papas Francesas',
              recargoCOP: 0,
              disponible: true,
              porDefecto: true,
            },
            {
              id: generarIdLocal('opc'),
              nombre: 'Yucas Fritas',
              recargoCOP: 0,
              disponible: true,
              porDefecto: false,
            },
          ];

    return {
      id: generarIdLocal('grp'),
      nombre: 'Elige tu Acompañamiento',
      categoriaGrupo: 'acompanamiento',
      obligatorio: true,
      minSelecciones: 1,
      maxSelecciones: 1,
      opciones,
    };
  }

  if (categoria === 'salsa') {
    const insumosSalsas = insumos
      .filter((ins) =>
        /salsa|aderezo|ajo|tártara|tartara|piña|pina|bbq|picante|rosada|mayonesa/i.test(ins.nombre)
      )
      .slice(0, 4);

    const opciones: OpcionEleccionCombo[] =
      insumosSalsas.length > 0
        ? insumosSalsas.map((ins, idx) => {
            const recetaExtra: InsumoReceta[] = [
              {
                insumoId: ins.id,
                nombreSnapshot: ins.nombre,
                cantidad: 0.03,
                unidadSnapshot: ins.unidad || 'litros',
              },
            ];
            return {
              id: generarIdLocal('opc'),
              nombre: ins.nombre,
              recetaExtra,
              recargoCOP: 0,
              disponible: true,
              porDefecto: idx === 0,
            };
          })
        : [
            {
              id: generarIdLocal('opc'),
              nombre: 'Salsa de Ajo',
              recargoCOP: 0,
              disponible: true,
              porDefecto: true,
            },
            {
              id: generarIdLocal('opc'),
              nombre: 'Salsa Tártara',
              recargoCOP: 0,
              disponible: true,
              porDefecto: false,
            },
            {
              id: generarIdLocal('opc'),
              nombre: 'Salsa de Piña',
              recargoCOP: 0,
              disponible: true,
              porDefecto: false,
            },
          ];

    return {
      id: generarIdLocal('grp'),
      nombre: 'Elige tus Salsas',
      categoriaGrupo: 'salsa',
      obligatorio: false,
      minSelecciones: 0,
      maxSelecciones: 2,
      opciones,
    };
  }

  if (categoria === 'proteina') {
    const proteinas = productosDisponibles
      .filter((p) =>
        /carne|pollo|cerdo|hamburguesa|perro|mixta|churrasco|costilla/i.test(
          `${p.categoria || ''} ${p.nombre}`
        )
      )
      .slice(0, 4);

    const opciones: OpcionEleccionCombo[] =
      proteinas.length > 0
        ? proteinas.map((prod, idx) => ({
            id: generarIdLocal('opc'),
            nombre: prod.nombre,
            productoId: prod.id,
            cantidadProducto: 1,
            recargoCOP: 0,
            disponible: true,
            porDefecto: idx === 0,
          }))
        : [
            {
              id: generarIdLocal('opc'),
              nombre: 'Carne Asada',
              recargoCOP: 0,
              disponible: true,
              porDefecto: true,
            },
            {
              id: generarIdLocal('opc'),
              nombre: 'Pechuga a la Plancha',
              recargoCOP: 0,
              disponible: true,
              porDefecto: false,
            },
          ];

    return {
      id: generarIdLocal('grp'),
      nombre: 'Elige tu Proteína',
      categoriaGrupo: 'proteina',
      obligatorio: true,
      minSelecciones: 1,
      maxSelecciones: 1,
      opciones,
    };
  }

  return {
    id: generarIdLocal('grp'),
    nombre: 'Personalización Adicional',
    categoriaGrupo: 'otro',
    obligatorio: false,
    minSelecciones: 0,
    maxSelecciones: 2,
    opciones: [
      {
        id: generarIdLocal('opc'),
        nombre: 'Opción Estándar',
        recargoCOP: 0,
        disponible: true,
        porDefecto: true,
      },
    ],
  };
}

/**
 * Calcula las selecciones iniciales por grupo usando opciones por defecto disponibles
 * o completando grupos obligatorios con la primera opción con stock.
 */
export function obtenerSeleccionesInicialesCombo(
  combo: Combo,
  productos: Producto[] = [],
  insumos: Insumo[] = []
): Record<string, string[]> {
  const resultado: Record<string, string[]> = {};
  const grupos = combo.gruposEleccion || [];

  for (const grupo of grupos) {
    const maxAllowed = Math.max(1, grupo.maxSelecciones || 1);
    const opcionesDisponibles = (grupo.opciones || []).filter((op) => {
      const stock = evaluarEstadoStockOpcionCombo(op, productos, insumos);
      return stock.estado !== 'agotado';
    });

    const porDefectoIds = opcionesDisponibles
      .filter((op) => op.porDefecto)
      .slice(0, maxAllowed)
      .map((op) => op.id);

    if (porDefectoIds.length > 0) {
      resultado[grupo.id] = porDefectoIds;
      continue;
    }

    if (grupo.obligatorio && opcionesDisponibles.length > 0) {
      const minNecesario = Math.max(1, Math.min(grupo.minSelecciones || 1, maxAllowed));
      resultado[grupo.id] = opcionesDisponibles.slice(0, minNecesario).map((op) => op.id);
    } else {
      resultado[grupo.id] = [];
    }
  }

  return resultado;
}

/**
 * Valida las elecciones del usuario frente a las reglas de mínimo/máximo y disponibilidad de stock de cada grupo.
 */
export function validarSeleccionesCombo(
  combo: Combo,
  seleccionesPorGrupo: Record<string, string[]>,
  productos: Producto[] = [],
  insumos: Insumo[] = []
): ValidacionSeleccionCombo {
  const erroresPorGrupo: Record<string, string> = {};
  const gruposFaltantes: string[] = [];

  for (const grupo of combo.gruposEleccion || []) {
    const opcionesMap = new Map<string, OpcionEleccionCombo>();
    for (const op of grupo.opciones || []) {
      opcionesMap.set(op.id, op);
    }

    const rawSeleccionadas = Array.from(new Set(seleccionesPorGrupo[grupo.id] || []));
    const seleccionadasValidas: string[] = [];
    let tieneAgotada = false;

    for (const opId of rawSeleccionadas) {
      const opcion = opcionesMap.get(opId);
      if (!opcion) continue;
      const stock = evaluarEstadoStockOpcionCombo(opcion, productos, insumos);
      if (stock.estado === 'agotado') {
        tieneAgotada = true;
      } else {
        seleccionadasValidas.push(opId);
      }
    }

    if (tieneAgotada) {
      erroresPorGrupo[grupo.id] = `Una opción seleccionada en "${grupo.nombre}" está agotada.`;
      gruposFaltantes.push(grupo.id);
      continue;
    }

    const minReq = grupo.obligatorio
      ? Math.max(1, grupo.minSelecciones || 1)
      : Math.max(0, grupo.minSelecciones || 0);
    const maxReq = Math.max(minReq || 1, grupo.maxSelecciones || 1);

    if (seleccionadasValidas.length < minReq) {
      erroresPorGrupo[grupo.id] = `Elige al menos ${minReq} ${minReq === 1 ? 'opción' : 'opciones'} en ${grupo.nombre}.`;
      gruposFaltantes.push(grupo.id);
    } else if (seleccionadasValidas.length > maxReq) {
      erroresPorGrupo[grupo.id] = `Máximo ${maxReq} ${maxReq === 1 ? 'opción' : 'opciones'} en ${grupo.nombre}.`;
    }
  }

  return {
    valido: Object.keys(erroresPorGrupo).length === 0,
    erroresPorGrupo,
    gruposFaltantes,
  };
}

/**
 * Construye el arreglo limpio de elecciones seleccionadas listo para persistir en Firestore.
 */
export function construirEleccionesComboSeleccionadas(
  combo: Combo,
  seleccionesPorGrupo: Record<string, string[]>
): EleccionComboSeleccionada[] {
  const elecciones: EleccionComboSeleccionada[] = [];

  for (const grupo of combo.gruposEleccion || []) {
    const ids = Array.from(new Set(seleccionesPorGrupo[grupo.id] || []));
    for (const opId of ids) {
      const opcion = (grupo.opciones || []).find((o) => o.id === opId);
      if (!opcion) continue;

      const recargoSeguro = Math.max(0, Math.round(Number(opcion.recargoCOP) || 0));
      elecciones.push({
        grupoId: grupo.id,
        grupoNombre: grupo.nombre,
        opcionId: opcion.id,
        opcionNombre: opcion.nombre,
        cantidad: 1,
        recargoCOP: recargoSeguro,
        ...(opcion.productoId ? { productoId: opcion.productoId } : {}),
        ...(opcion.recetaExtra && opcion.recetaExtra.length > 0
          ? { recetaExtra: opcion.recetaExtra }
          : {}),
      });
    }
  }

  return elecciones;
}

/**
 * Suma los recargos en COP de las opciones elegidas para 1 unidad del combo.
 */
export function calcularRecargoEleccionesCombo(
  elecciones: EleccionComboSeleccionada[],
  incluirRecargos = true
): number {
  if (!incluirRecargos || !Array.isArray(elecciones) || elecciones.length === 0) {
    return 0;
  }

  return elecciones.reduce((acc, el) => {
    const recargo = Math.max(0, Math.round(Number(el.recargoCOP) || 0));
    const cantidad = el.cantidad && el.cantidad > 0 ? el.cantidad : 1;
    return acc + recargo * cantidad;
  }, 0);
}

/**
 * Calcula el precio unitario final en COP de un combo personalizado.
 */
export function calcularPrecioUnitarioComboPersonalizado(
  combo: Pick<Combo, 'precioEspecial'>,
  elecciones: EleccionComboSeleccionada[],
  incluirRecargos = true
): number {
  const base = Math.max(0, Math.round(Number(combo.precioEspecial) || 0));
  return base + calcularRecargoEleccionesCombo(elecciones, incluirRecargos);
}

/**
 * Formatea las elecciones agrupadas por grupo como modificadores legibles para cocina, POS y ticket.
 * Ej: ["Bebida: Coca-Cola 400ml", "Acompañamiento: Papas Francesas", "Salsas: Ajo, Tártara"]
 */
export function formatearEleccionesComboParaModificadores(
  elecciones: EleccionComboSeleccionada[]
): string[] {
  if (!Array.isArray(elecciones) || elecciones.length === 0) return [];

  const agrupadas = new Map<string, string[]>();
  for (const el of elecciones) {
    const label = limpiarPrefijoGrupoNombre(el.grupoNombre);
    const actual = agrupadas.get(label) || [];
    if (!actual.includes(el.opcionNombre)) {
      actual.push(el.opcionNombre);
    }
    agrupadas.set(label, actual);
  }

  const resultado: string[] = [];
  agrupadas.forEach((nombres, label) => {
    resultado.push(`${label}: ${nombres.join(', ')}`);
  });

  return resultado;
}

/**
 * Resumen compacto en una sola línea de las elecciones de un combo.
 */
export function formatearResumenCortoEleccionesCombo(
  elecciones?: EleccionComboSeleccionada[]
): string {
  if (!elecciones || elecciones.length === 0) return '';
  return formatearEleccionesComboParaModificadores(elecciones).join(' · ');
}

/**
 * Combina modificadores generados por elecciones de combo con otros modificadores previos (ej. "Sin cebolla")
 * evitando duplicar elecciones de grupo anteriores al re-editar el combo.
 */
export function combinarModificadoresConEleccionesCombo(
  elecciones: EleccionComboSeleccionada[],
  modificadoresPrevios: string[] = [],
  eleccionesPrevias: EleccionComboSeleccionada[] = []
): string[] {
  const nuevosModsCombo = formatearEleccionesComboParaModificadores(elecciones);
  const modsPreviosCombo = new Set(formatearEleccionesComboParaModificadores(eleccionesPrevias));
  const prefijosGruposActuales = new Set(
    elecciones.map((el) => `${limpiarPrefijoGrupoNombre(el.grupoNombre).toLowerCase()}:`)
  );

  const extrasConservados = (modificadoresPrevios || []).filter((mod) => {
    if (modsPreviosCombo.has(mod)) return false;
    const modLower = mod.toLowerCase();
    for (const prefijo of prefijosGruposActuales) {
      if (modLower.startsWith(prefijo)) return false;
    }
    return true;
  });

  return Array.from(new Set([...nuevosModsCombo, ...extrasConservados]));
}

/**
 * Alterna la selección de una opción dentro de un grupo respetando selección única vs múltiple y límites.
 */
export function actualizarSeleccionesEnGrupo(
  seleccionesActuales: Record<string, string[]>,
  grupo: GrupoEleccionCombo,
  opcionId: string
): Record<string, string[]> {
  const actual = seleccionesActuales[grupo.id] || [];
  const maxSel = Math.max(1, grupo.maxSelecciones || 1);

  if (maxSel <= 1) {
    if (actual.includes(opcionId)) {
      if (grupo.obligatorio) {
        return { ...seleccionesActuales, [grupo.id]: [opcionId] };
      }
      return { ...seleccionesActuales, [grupo.id]: [] };
    }
    return { ...seleccionesActuales, [grupo.id]: [opcionId] };
  }

  if (actual.includes(opcionId)) {
    return {
      ...seleccionesActuales,
      [grupo.id]: actual.filter((id) => id !== opcionId),
    };
  }

  if (actual.length >= maxSel) {
    return seleccionesActuales;
  }

  return {
    ...seleccionesActuales,
    [grupo.id]: [...actual, opcionId],
  };
}

/**
 * Construye el ItemVenta limpio de un combo personalizado listo para POS, Storefront y Firestore.
 */
export function construirItemVentaComboPersonalizado(params: {
  combo: Combo;
  seleccionesPorGrupo: Record<string, string[]>;
  cantidad?: number;
  notas?: string;
  initialItem?: ItemVenta | null;
  modoStorefront?: boolean;
}): ItemVenta {
  const {
    combo,
    seleccionesPorGrupo,
    cantidad = 1,
    notas,
    initialItem,
    modoStorefront = false,
  } = params;

  const elecciones = construirEleccionesComboSeleccionadas(combo, seleccionesPorGrupo);
  const incluirRecargos = !modoStorefront;
  const precioUnitario = calcularPrecioUnitarioComboPersonalizado(
    combo,
    elecciones,
    incluirRecargos
  );
  const cantidadSegura = Math.min(20, Math.max(1, Math.round(Number(cantidad) || 1)));
  const subtotal = precioUnitario * cantidadSegura;
  const modificadores = combinarModificadoresConEleccionesCombo(
    elecciones,
    initialItem?.modificadores || [],
    initialItem?.eleccionesCombo || []
  );
  const notasLimpias = notas && notas.trim() ? notas.trim() : undefined;

  return {
    tipo: 'combo',
    referenciaId: combo.id,
    nombre: combo.nombre,
    cantidad: cantidadSegura,
    precioUnitario,
    subtotal,
    ...(elecciones.length > 0 ? { eleccionesCombo: elecciones } : {}),
    ...(modificadores.length > 0 ? { modificadores } : {}),
    ...(notasLimpias ? { notas: notasLimpias } : {}),
  };
}

/**
 * Consolida en la cadena de notas del Storefront las elecciones personalizadas de combos,
 * notas del cliente y etiqueta de cupón dentro del límite permitido por `crearPedidoPublico`.
 */
export function construirNotasPedidoStorefrontConCombos(
  carrito: ItemVenta[],
  notasCliente = '',
  etiquetaCupon = '',
  maxLen = 300
): string {
  const detallesCombos = carrito
    .filter((item) => item.tipo === 'combo' && item.eleccionesCombo && item.eleccionesCombo.length > 0)
    .map((item) => {
      const resumen = formatearResumenCortoEleccionesCombo(item.eleccionesCombo);
      return `${item.nombre} [${resumen}]`;
    });

  const partes = [
    detallesCombos.length > 0 ? `Combos: ${detallesCombos.join('; ')}` : '',
    notasCliente.trim(),
    etiquetaCupon.trim(),
  ].filter(Boolean);

  if (partes.length === 0) return '';

  const sinControlChars = Array.from(partes.join(' · '))
    .map((ch) => {
      const code = ch.charCodeAt(0);
      return code < 32 || code === 127 ? ' ' : ch;
    })
    .join('');

  const textoLimpio = sinControlChars
    .replace(/\s+/g, ' ')
    .trim();

  if (textoLimpio.length <= maxLen) return textoLimpio;
  if (maxLen <= 1) return textoLimpio.slice(0, maxLen);
  return `${textoLimpio.slice(0, maxLen - 1).trimEnd()}…`;
}

/**
 * Limpia propiedades `undefined` en `gruposEleccion` antes de guardar en Firestore.
 */
export function sanitizarGruposEleccionParaFirestore(
  grupos: GrupoEleccionCombo[]
): GrupoEleccionCombo[] {
  return grupos
    .filter((g) => g.nombre.trim().length > 0 && g.opciones.length > 0)
    .map((grupo) => {
      const min = Math.max(0, Math.round(Number(grupo.minSelecciones) || 0));
      const max = Math.max(min || 1, Math.round(Number(grupo.maxSelecciones) || 1));
      return {
        id: grupo.id,
        nombre: grupo.nombre.trim(),
        categoriaGrupo: grupo.categoriaGrupo,
        obligatorio: Boolean(grupo.obligatorio),
        minSelecciones: grupo.obligatorio ? Math.max(1, min) : min,
        maxSelecciones: max,
        opciones: grupo.opciones
          .filter((op) => op.nombre.trim().length > 0)
          .map((op) => ({
            id: op.id,
            nombre: op.nombre.trim(),
            recargoCOP: Math.max(0, Math.round(Number(op.recargoCOP) || 0)),
            disponible: op.disponible !== false,
            porDefecto: Boolean(op.porDefecto),
            ...(op.productoId ? { productoId: op.productoId } : {}),
            ...(typeof op.cantidadProducto === 'number' && op.cantidadProducto > 0
              ? { cantidadProducto: op.cantidadProducto }
              : {}),
            ...(op.recetaExtra && op.recetaExtra.length > 0
              ? {
                  recetaExtra: op.recetaExtra.map((ing) => ({
                    insumoId: ing.insumoId,
                    nombreSnapshot: ing.nombreSnapshot,
                    cantidad: ing.cantidad,
                    ...(ing.unidadSnapshot ? { unidadSnapshot: ing.unidadSnapshot } : {}),
                  })),
                }
              : {}),
          })),
      };
    });
}
