import { Timestamp } from 'firebase/firestore';
import type {
  Combo,
  ComparativaInsumoProveedores,
  FacturaCompra,
  FiltrosComparadorPrecios,
  ImpactoRecetaAlza,
  Insumo,
  InsumoReceta,
  MovimientoKardex,
  OfertaProveedorInsumo,
  OrigenRegistroPrecioInsumo,
  Producto,
  Proveedor,
  PuntoEvolucionInflacionMensual,
  PuntoSeriePrecioInsumo,
  RangoPeriodoPrecios,
  RegistroPrecioInsumo,
  ResumenInflacionBodega,
  SeveridadAlzaPrecio,
} from '@/types';
import { toValidAdminDate } from './adminAnalytics';
import { formatCOP } from './formatCOP';
import { construirMapaCostosInsumos } from './ingenieriaMenuUtils';
import { determinarTipoMovimiento } from './kardexInventarioUtils';
import { obtenerFechaIsoColombia, sumarDiasAFechaIso } from './lotesInventarioUtils';

export const UMBRAL_ALZA_CRITICA_PCT = 10;

export const ORIGEN_PRECIO_META: Record<
  OrigenRegistroPrecioInsumo,
  { id: OrigenRegistroPrecioInsumo; label: string; shortLabel: string; badgeClass: string }
> = {
  orden_compra: {
    id: 'orden_compra',
    label: 'Orden de Compra',
    shortLabel: 'Orden OC',
    badgeClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
  },
  factura_compra: {
    id: 'factura_compra',
    label: 'Factura Proveedor',
    shortLabel: 'Factura',
    badgeClass: 'border-gold-400/40 bg-gold-400/15 text-gold-300',
  },
  entrada_kardex: {
    id: 'entrada_kardex',
    label: 'Entrada Kardex',
    shortLabel: 'Kardex',
    badgeClass: 'border-sky-500/40 bg-sky-500/15 text-sky-300',
  },
  cotizacion_manual: {
    id: 'cotizacion_manual',
    label: 'Cotización Manual',
    shortLabel: 'Cotización',
    badgeClass: 'border-purple-500/40 bg-purple-500/15 text-purple-300',
  },
};

export const SEVERIDAD_ALZA_META: Record<
  SeveridadAlzaPrecio,
  { id: SeveridadAlzaPrecio; label: string; badgeClass: string; textClass: string }
> = {
  alza_critica: {
    id: 'alza_critica',
    label: 'Alza > 10%',
    badgeClass: 'border-red-500/50 bg-red-500/15 text-red-300',
    textClass: 'text-red-400',
  },
  alza_moderada: {
    id: 'alza_moderada',
    label: 'Alza Moderada',
    badgeClass: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
    textClass: 'text-amber-300',
  },
  estable: {
    id: 'estable',
    label: 'Estable',
    badgeClass: 'border-neutral-700 bg-neutral-800/80 text-neutral-300',
    textClass: 'text-neutral-300',
  },
  baja: {
    id: 'baja',
    label: 'Baja de Precio',
    badgeClass: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300',
    textClass: 'text-emerald-400',
  },
};

export function sanitizarCostoUnitarioCOP(valor: number): number {
  if (!Number.isFinite(valor) || valor <= 0) return 0;
  return Math.round(valor);
}

export function calcularVariacionPrecioPct(
  costoAnteriorCOP: number,
  costoNuevoCOP: number
): number {
  const prev = sanitizarCostoUnitarioCOP(costoAnteriorCOP);
  const next = sanitizarCostoUnitarioCOP(costoNuevoCOP);
  if (prev <= 0 || next <= 0) return 0;
  return Number((((next - prev) / prev) * 100).toFixed(1));
}

export function evaluarSeveridadAlza(variacionPct: number): SeveridadAlzaPrecio {
  if (!Number.isFinite(variacionPct) || variacionPct === 0) return 'estable';
  if (variacionPct > UMBRAL_ALZA_CRITICA_PCT) return 'alza_critica';
  if (variacionPct > 0) return 'alza_moderada';
  return 'baja';
}

export function normalizarNombreProveedorKey(nombre: string): string {
  return (nombre || 'Sin proveedor')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function parseFechaRegistroPrecio(valor: unknown, fallbackIso?: string): Date {
  const valid = toValidAdminDate(valor);
  if (valid) return valid;

  if (
    valor &&
    typeof valor === 'object' &&
    'seconds' in valor &&
    typeof (valor as { seconds?: unknown }).seconds === 'number'
  ) {
    const dt = new Date((valor as { seconds: number }).seconds * 1000);
    if (Number.isFinite(dt.getTime())) return dt;
  }

  if (typeof valor === 'string' || typeof valor === 'number') {
    const dt = new Date(valor);
    if (Number.isFinite(dt.getTime())) return dt;
  }

  if (fallbackIso && /^\d{4}-\d{2}-\d{2}$/.test(fallbackIso)) {
    const dt = new Date(`${fallbackIso}T12:00:00-05:00`);
    if (Number.isFinite(dt.getTime())) return dt;
  }

  return new Date(0);
}

function formatearFechaCortaIso(fechaIso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec((fechaIso || '').trim());
  if (!match) return fechaIso;
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const mesIdx = Number(match[2]) - 1;
  const mes = meses[mesIdx] || match[2];
  return `${match[3]} ${mes}`;
}

function formatearMesLabel(mesKey: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(mesKey);
  if (!match) return mesKey;
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const mes = meses[Number(match[2]) - 1] || match[2];
  return `${mes} ${match[1].slice(-2)}`;
}

export interface UnificarRegistrosPreciosParams {
  registrosHistorial?: RegistroPrecioInsumo[];
  facturas?: FacturaCompra[];
  movimientosKardex?: MovimientoKardex[];
  proveedores?: Proveedor[];
  insumos?: Insumo[];
}

/**
 * Fusiona los registros persistidos en `historial_precios_insumos` con compras
 * históricas existentes en `facturas_compra` y `entradas_inventario`, sin duplicar.
 */
export function unificarRegistrosPrecios(
  params: UnificarRegistrosPreciosParams
): RegistroPrecioInsumo[] {
  const {
    registrosHistorial = [],
    facturas = [],
    movimientosKardex = [],
    proveedores = [],
    insumos = [],
  } = params;

  const insumoById = new Map(insumos.map((i) => [i.id, i]));
  const insumoByNombre = new Map(
    insumos.map((i) => [i.nombre.trim().toLowerCase(), i])
  );
  const proveedorById = new Map(proveedores.map((p) => [p.id, p]));
  const proveedorByNombre = new Map(
    proveedores.map((p) => [normalizarNombreProveedorKey(p.nombre), p])
  );

  const resultados: RegistroPrecioInsumo[] = [];
  const seenRefs = new Set<string>();
  const seenSignatures = new Set<string>();

  const registrarSiNuevo = (reg: RegistroPrecioInsumo) => {
    if (!reg.insumoId || reg.costoUnitarioCOP <= 0) return;

    const provKey = normalizarNombreProveedorKey(reg.proveedorNombre);
    const sigKey = `${reg.fechaIso}|${reg.insumoId}|${provKey}|${reg.costoUnitarioCOP}`;
    const refKey = reg.referenciaId
      ? `${reg.origen}:${reg.referenciaId}:${reg.insumoId}`
      : undefined;

    if (refKey && seenRefs.has(refKey)) return;
    if (seenSignatures.has(sigKey)) return;

    if (refKey) seenRefs.add(refKey);
    seenSignatures.add(sigKey);
    resultados.push(reg);
  };

  // 1. Registros persistidos explícitamente en `historial_precios_insumos`
  for (const reg of registrosHistorial) {
    const costo = sanitizarCostoUnitarioCOP(reg.costoUnitarioCOP);
    if (costo <= 0 || !reg.insumoId) continue;

    const fechaDt = parseFechaRegistroPrecio(reg.fecha, reg.fechaIso);
    const fechaIso =
      reg.fechaIso && /^\d{4}-\d{2}-\d{2}$/.test(reg.fechaIso)
        ? reg.fechaIso
        : obtenerFechaIsoColombia(fechaDt);
    const insumo = insumoById.get(reg.insumoId);
    const provMatch =
      (reg.proveedorId ? proveedorById.get(reg.proveedorId) : undefined) ||
      proveedorByNombre.get(normalizarNombreProveedorKey(reg.proveedorNombre));

    registrarSiNuevo({
      ...reg,
      insumoNombre: reg.insumoNombre || insumo?.nombre || 'Insumo',
      unidad: reg.unidad || insumo?.unidad || 'unidad',
      proveedorId: reg.proveedorId || provMatch?.id,
      proveedorNombre: (reg.proveedorNombre || provMatch?.nombre || 'Proveedor').trim(),
      costoUnitarioCOP: costo,
      fechaIso,
      fecha: reg.fecha ?? Timestamp.fromDate(fechaDt),
      creadoEn: reg.creadoEn ?? Timestamp.fromDate(fechaDt),
    });
  }

  // 2. Compras registradas en `facturas_compra` (excluyendo anuladas)
  for (const fac of facturas) {
    if (fac.estado === 'anulada' || !Array.isArray(fac.items)) continue;
    const fechaDt = parseFechaRegistroPrecio(fac.fechaEmision);
    const fechaIso = obtenerFechaIsoColombia(fechaDt);
    const provMatch = proveedorById.get(fac.proveedorId);

    for (const item of fac.items) {
      const cantidad = Number(item.cantidad) || 0;
      const costoUnitario = sanitizarCostoUnitarioCOP(
        item.costoUnitario > 0
          ? item.costoUnitario
          : cantidad > 0 && item.subtotal > 0
            ? item.subtotal / cantidad
            : 0
      );
      if (costoUnitario <= 0) continue;

      const insumoMatch =
        (item.insumoId ? insumoById.get(item.insumoId) : undefined) ||
        insumoByNombre.get((item.descripcion || '').trim().toLowerCase());
      if (!insumoMatch) continue;

      registrarSiNuevo({
        id: `fac_${fac.id}_${insumoMatch.id}`,
        negocioId: fac.negocioId,
        insumoId: insumoMatch.id,
        insumoNombre: insumoMatch.nombre,
        unidad: item.unidad || insumoMatch.unidad || 'unidad',
        proveedorId: fac.proveedorId || provMatch?.id,
        proveedorNombre: (fac.proveedorNombre || provMatch?.nombre || 'Proveedor').trim(),
        costoUnitarioCOP: costoUnitario,
        cantidadComprada: cantidad > 0 ? cantidad : undefined,
        origen: 'factura_compra',
        referenciaId: fac.id,
        referenciaCodigo: fac.numeroFactura,
        fechaIso,
        fecha: fac.fechaEmision ?? Timestamp.fromDate(fechaDt),
        registradoPor: 'Factura Compra',
        notas: fac.notas,
        creadoEn: fac.creadoEn ?? Timestamp.fromDate(fechaDt),
      });
    }
  }

  // 3. Entradas de compra en `entradas_inventario` con costo unitario válido
  for (const mov of movimientosKardex) {
    const tipo = determinarTipoMovimiento(mov);
    if (tipo !== 'entrada' || !mov.insumoId || !(mov.cantidad > 0)) continue;

    const costoUnitario = sanitizarCostoUnitarioCOP(
      typeof mov.costoUnitario === 'number' && mov.costoUnitario > 0
        ? mov.costoUnitario
        : mov.costo > 0 && mov.cantidad > 0
          ? mov.costo / mov.cantidad
          : 0
    );
    if (costoUnitario <= 0) continue;

    const fechaDt = parseFechaRegistroPrecio(mov.fecha);
    const fechaIso = obtenerFechaIsoColombia(fechaDt);
    const insumoMatch = insumoById.get(mov.insumoId);
    const provNombreRaw =
      mov.proveedor && mov.proveedor.trim() && mov.proveedor !== 'Manual'
        ? mov.proveedor.trim()
        : insumoMatch?.proveedor?.trim() || 'Compra Directa';
    const provMatch = proveedorByNombre.get(normalizarNombreProveedorKey(provNombreRaw));

    registrarSiNuevo({
      id: `kar_${mov.id}`,
      negocioId: mov.negocioId,
      insumoId: mov.insumoId,
      insumoNombre: mov.insumoNombre || insumoMatch?.nombre || 'Insumo',
      unidad: mov.unidadMedida || insumoMatch?.unidad || 'unidad',
      proveedorId: provMatch?.id,
      proveedorNombre: provMatch?.nombre || provNombreRaw,
      costoUnitarioCOP: costoUnitario,
      cantidadComprada: mov.cantidad,
      origen: 'entrada_kardex',
      referenciaId: mov.id,
      fechaIso,
      fecha: mov.fecha ?? Timestamp.fromDate(fechaDt),
      registradoPor: mov.responsable || 'Bodega',
      notas: mov.notas,
      creadoEn: mov.fecha ?? Timestamp.fromDate(fechaDt),
    });
  }

  return resultados.sort((a, b) => {
    const timeA = parseFechaRegistroPrecio(a.fecha, a.fechaIso).getTime();
    const timeB = parseFechaRegistroPrecio(b.fecha, b.fechaIso).getTime();
    if (timeB !== timeA) return timeB - timeA;
    return b.fechaIso.localeCompare(a.fechaIso);
  });
}

export function filtrarRegistrosPorPeriodo(
  registros: RegistroPrecioInsumo[],
  periodo: RangoPeriodoPrecios,
  hoyIso?: string
): RegistroPrecioInsumo[] {
  if (periodo === 'todo') return registros;
  const hoy =
    hoyIso && /^\d{4}-\d{2}-\d{2}$/.test(hoyIso)
      ? hoyIso
      : obtenerFechaIsoColombia();
  const dias = periodo === '30d' ? 30 : periodo === '90d' ? 90 : 180;
  const limiteIso = sumarDiasAFechaIso(hoy, -dias);
  return registros.filter((r) => r.fechaIso >= limiteIso);
}

function acumularConsumoInsumoEnLista(
  receta: InsumoReceta[] | undefined,
  insumoTargetId: string,
  multiplicador: number,
  insumosMap: Map<string, Insumo>,
  costosBaseMap: Map<string, { costoUnitario: number }>,
  visitados: Set<string> = new Set()
): { cantidadInsumo: number; costoOtrosBase: number } {
  if (!Array.isArray(receta) || receta.length === 0 || multiplicador <= 0) {
    return { cantidadInsumo: 0, costoOtrosBase: 0 };
  }

  let cantidadInsumo = 0;
  let costoOtrosBase = 0;

  for (const ing of receta) {
    const cant = Number(ing.cantidad) || 0;
    if (!ing.insumoId || cant <= 0) continue;
    const cantEscalada = cant * multiplicador;

    if (ing.insumoId === insumoTargetId) {
      cantidadInsumo += cantEscalada;
      continue;
    }

    const ins = insumosMap.get(ing.insumoId);
    if (
      ins?.esSubReceta &&
      typeof ins.rendimientoLote === 'number' &&
      ins.rendimientoLote > 0 &&
      Array.isArray(ins.recetaInsumos) &&
      ins.recetaInsumos.length > 0 &&
      !visitados.has(ins.id)
    ) {
      const nextVisited = new Set(visitados);
      nextVisited.add(ins.id);
      const sub = acumularConsumoInsumoEnLista(
        ins.recetaInsumos,
        insumoTargetId,
        cantEscalada / ins.rendimientoLote,
        insumosMap,
        costosBaseMap,
        nextVisited
      );
      if (sub.cantidadInsumo > 0) {
        cantidadInsumo += sub.cantidadInsumo;
        costoOtrosBase += sub.costoOtrosBase;
        continue;
      }
    }

    const costoUnit = costosBaseMap.get(ing.insumoId)?.costoUnitario ?? 0;
    costoOtrosBase += cantEscalada * costoUnit;
  }

  return { cantidadInsumo, costoOtrosBase };
}

export interface CalcularImpactoRecetasParams {
  insumoId: string;
  costoAnteriorCOP: number;
  costoNuevoCOP: number;
  productos?: Producto[];
  combos?: Combo[];
  insumos?: Insumo[];
  movimientosKardex?: MovimientoKardex[];
}

/**
 * Calcula el impacto de una variación de costo de un insumo sobre el costo unitario,
 * Food Cost % y margen de cada plato o combo cuyo escandallo lo utiliza.
 */
export function calcularImpactoRecetasPorAlzaInsumo(
  params: CalcularImpactoRecetasParams
): ImpactoRecetaAlza[] {
  const {
    insumoId,
    costoAnteriorCOP,
    costoNuevoCOP,
    productos = [],
    combos = [],
    insumos = [],
    movimientosKardex = [],
  } = params;

  if (!insumoId) return [];
  const prevCost = sanitizarCostoUnitarioCOP(costoAnteriorCOP);
  const newCost = sanitizarCostoUnitarioCOP(costoNuevoCOP);
  if (newCost <= 0) return [];

  const insumosMap = new Map(insumos.map((i) => [i.id, i]));
  const productosMap = new Map(productos.map((p) => [p.id, p]));
  const costosBaseMap = construirMapaCostosInsumos(insumos, movimientosKardex);
  const unidadInsumo = insumosMap.get(insumoId)?.unidad || 'unidad';

  const impactos: ImpactoRecetaAlza[] = [];

  for (const prod of productos) {
    const rPrincipal = acumularConsumoInsumoEnLista(
      prod.receta,
      insumoId,
      1,
      insumosMap,
      costosBaseMap
    );
    const rEmpaque = acumularConsumoInsumoEnLista(
      prod.recetaEmpaque,
      insumoId,
      1,
      insumosMap,
      costosBaseMap
    );

    const cantidadTotal = rPrincipal.cantidadInsumo + rEmpaque.cantidadInsumo;
    if (cantidadTotal <= 0) continue;

    const costoOtros = rPrincipal.costoOtrosBase + rEmpaque.costoOtrosBase;
    const basePrev = prevCost > 0 ? prevCost : newCost;
    const costoAnteriorReceta = Math.round(costoOtros + cantidadTotal * basePrev);
    const costoNuevoReceta = Math.round(costoOtros + cantidadTotal * newCost);
    const precioVenta = Math.max(0, Math.round(Number(prod.precio) || 0));

    const foodCostAnteriorPct =
      precioVenta > 0 ? Number(((costoAnteriorReceta / precioVenta) * 100).toFixed(1)) : 0;
    const foodCostNuevoPct =
      precioVenta > 0 ? Number(((costoNuevoReceta / precioVenta) * 100).toFixed(1)) : 0;

    impactos.push({
      itemId: prod.id,
      itemTipo: 'producto',
      itemNombre: prod.nombre,
      categoria: prod.categoria || 'Sin categoría',
      precioVentaCOP: precioVenta,
      cantidadInsumoEnReceta: Number(cantidadTotal.toFixed(4)),
      unidad: unidadInsumo,
      costoRecetaAnteriorCOP: costoAnteriorReceta,
      costoRecetaNuevoCOP: costoNuevoReceta,
      impactoCostoUnitarioCOP: costoNuevoReceta - costoAnteriorReceta,
      foodCostAnteriorPct,
      foodCostNuevoPct,
      deltaFoodCostPts: Number((foodCostNuevoPct - foodCostAnteriorPct).toFixed(1)),
      margenAnteriorCOP: precioVenta - costoAnteriorReceta,
      margenNuevoCOP: precioVenta - costoNuevoReceta,
    });
  }

  for (const combo of combos) {
    let cantidadTotal = 0;
    let costoOtros = 0;

    const acumular = (receta: InsumoReceta[] | undefined, mult = 1) => {
      const res = acumularConsumoInsumoEnLista(
        receta,
        insumoId,
        mult,
        insumosMap,
        costosBaseMap
      );
      cantidadTotal += res.cantidadInsumo;
      costoOtros += res.costoOtrosBase;
    };

    acumular(combo.receta, 1);
    acumular(combo.recetaEmpaque, 1);

    for (const item of combo.items || []) {
      const cantComp = Number(item.cantidad) || 0;
      if (cantComp <= 0) continue;
      const prodComp = productosMap.get(item.productoId);
      if (!prodComp) continue;
      acumular(prodComp.receta, cantComp);
      acumular(prodComp.recetaEmpaque, cantComp);
    }

    if (combo.esPersonalizable && Array.isArray(combo.gruposEleccion)) {
      for (const grupo of combo.gruposEleccion) {
        if (!grupo.obligatorio || !grupo.opciones?.length) continue;
        const opcionBase =
          grupo.opciones.find((op) => op.disponible !== false && op.porDefecto) ||
          grupo.opciones.find((op) => op.disponible !== false);
        if (!opcionBase) continue;
        if (opcionBase.productoId) {
          const prodOpc = productosMap.get(opcionBase.productoId);
          if (prodOpc) {
            const cantOpc =
              opcionBase.cantidadProducto && opcionBase.cantidadProducto > 0
                ? opcionBase.cantidadProducto
                : 1;
            acumular(prodOpc.receta, cantOpc);
            acumular(prodOpc.recetaEmpaque, cantOpc);
          }
        }
        acumular(opcionBase.recetaExtra, 1);
      }
    }

    if (cantidadTotal <= 0) continue;

    const basePrev = prevCost > 0 ? prevCost : newCost;
    const costoAnteriorReceta = Math.round(costoOtros + cantidadTotal * basePrev);
    const costoNuevoReceta = Math.round(costoOtros + cantidadTotal * newCost);
    const precioVenta = Math.max(0, Math.round(Number(combo.precioEspecial) || 0));

    const foodCostAnteriorPct =
      precioVenta > 0 ? Number(((costoAnteriorReceta / precioVenta) * 100).toFixed(1)) : 0;
    const foodCostNuevoPct =
      precioVenta > 0 ? Number(((costoNuevoReceta / precioVenta) * 100).toFixed(1)) : 0;

    impactos.push({
      itemId: combo.id,
      itemTipo: 'combo',
      itemNombre: combo.nombre,
      categoria: combo.categoria || 'Combos',
      precioVentaCOP: precioVenta,
      cantidadInsumoEnReceta: Number(cantidadTotal.toFixed(4)),
      unidad: unidadInsumo,
      costoRecetaAnteriorCOP: costoAnteriorReceta,
      costoRecetaNuevoCOP: costoNuevoReceta,
      impactoCostoUnitarioCOP: costoNuevoReceta - costoAnteriorReceta,
      foodCostAnteriorPct,
      foodCostNuevoPct,
      deltaFoodCostPts: Number((foodCostNuevoPct - foodCostAnteriorPct).toFixed(1)),
      margenAnteriorCOP: precioVenta - costoAnteriorReceta,
      margenNuevoCOP: precioVenta - costoNuevoReceta,
    });
  }

  return impactos.sort(
    (a, b) =>
      Math.abs(b.deltaFoodCostPts) - Math.abs(a.deltaFoodCostPts) ||
      Math.abs(b.impactoCostoUnitarioCOP) - Math.abs(a.impactoCostoUnitarioCOP)
  );
}

export interface ConstruirComparativasParams {
  registros: RegistroPrecioInsumo[];
  insumos?: Insumo[];
  proveedores?: Proveedor[];
  productos?: Producto[];
  combos?: Combo[];
  movimientosKardex?: MovimientoKardex[];
  periodo?: RangoPeriodoPrecios;
  hoyIso?: string;
}

/**
 * Construye comparativas por insumo con ranking de proveedores, recomendación de
 * mejor proveedor, serie temporal, alertas de alza > 10% e impacto en Food Cost.
 */
export function construirComparativasInsumos(
  params: ConstruirComparativasParams
): ComparativaInsumoProveedores[] {
  const {
    registros,
    insumos = [],
    proveedores = [],
    productos = [],
    combos = [],
    movimientosKardex = [],
    periodo = 'todo',
    hoyIso,
  } = params;

  const registrosFiltrados = filtrarRegistrosPorPeriodo(registros, periodo, hoyIso);
  const insumoById = new Map(insumos.map((i) => [i.id, i]));
  const proveedorByNombre = new Map(
    proveedores.map((p) => [normalizarNombreProveedorKey(p.nombre), p])
  );

  const gruposPorInsumo = new Map<string, RegistroPrecioInsumo[]>();
  for (const reg of registrosFiltrados) {
    if (!reg.insumoId || reg.costoUnitarioCOP <= 0) continue;
    const lista = gruposPorInsumo.get(reg.insumoId) || [];
    lista.push(reg);
    gruposPorInsumo.set(reg.insumoId, lista);
  }

  const comparativas: ComparativaInsumoProveedores[] = [];

  for (const [insumoId, listaDesc] of gruposPorInsumo.entries()) {
    const cronologicos = [...listaDesc].sort((a, b) => {
      const tA = parseFechaRegistroPrecio(a.fecha, a.fechaIso).getTime();
      const tB = parseFechaRegistroPrecio(b.fecha, b.fechaIso).getTime();
      if (tA !== tB) return tA - tB;
      return a.fechaIso.localeCompare(b.fechaIso);
    });

    const insumo = insumoById.get(insumoId);
    const primero = cronologicos[0];
    const ultimo = cronologicos[cronologicos.length - 1];
    const penultimo =
      cronologicos.length >= 2 ? cronologicos[cronologicos.length - 2] : null;

    const costoAnteriorCOP =
      penultimo?.costoUnitarioCOP ??
      (typeof ultimo.costoAnteriorCOP === 'number' && ultimo.costoAnteriorCOP > 0
        ? sanitizarCostoUnitarioCOP(ultimo.costoAnteriorCOP)
        : ultimo.costoUnitarioCOP);

    const primerCostoPeriodoCOP =
      cronologicos.length === 1 &&
      typeof ultimo.costoAnteriorCOP === 'number' &&
      ultimo.costoAnteriorCOP > 0
        ? sanitizarCostoUnitarioCOP(ultimo.costoAnteriorCOP)
        : primero.costoUnitarioCOP;

    const sumaCostos = cronologicos.reduce((sum, r) => sum + r.costoUnitarioCOP, 0);
    const costoPromedioPeriodoCOP = Math.round(sumaCostos / cronologicos.length);

    const variacionUltimoSaltoPct = calcularVariacionPrecioPct(
      costoAnteriorCOP,
      ultimo.costoUnitarioCOP
    );
    const inflacionAcumuladaPct = calcularVariacionPrecioPct(
      primerCostoPeriodoCOP,
      ultimo.costoUnitarioCOP
    );

    const tieneAlertaAlzaCritica =
      variacionUltimoSaltoPct > UMBRAL_ALZA_CRITICA_PCT ||
      inflacionAcumuladaPct > UMBRAL_ALZA_CRITICA_PCT ||
      Boolean(ultimo.esAlzaCritica);

    let severidad: SeveridadAlzaPrecio = 'estable';
    if (tieneAlertaAlzaCritica) {
      severidad = 'alza_critica';
    } else if (variacionUltimoSaltoPct > 0 || inflacionAcumuladaPct > 0) {
      severidad = 'alza_moderada';
    } else if (variacionUltimoSaltoPct < 0 || inflacionAcumuladaPct < 0) {
      severidad = 'baja';
    }

    // Consolidar ofertas por proveedor
    const porProveedor = new Map<string, RegistroPrecioInsumo[]>();
    for (const reg of cronologicos) {
      const provKey = normalizarNombreProveedorKey(reg.proveedorNombre);
      const arr = porProveedor.get(provKey) || [];
      arr.push(reg);
      porProveedor.set(provKey, arr);
    }

    const ofertasBrutas: Omit<
      OfertaProveedorInsumo,
      'esMejorPrecio' | 'esMasCaro' | 'diferenciaVsMejorCOP' | 'diferenciaVsMejorPct'
    >[] = [];

    for (const [provKey, regsProv] of porProveedor.entries()) {
      const ultimoProv = regsProv[regsProv.length - 1];
      const provMatch =
        (ultimoProv.proveedorId
          ? proveedores.find((p) => p.id === ultimoProv.proveedorId)
          : undefined) || proveedorByNombre.get(provKey);

      const costos = regsProv.map((r) => r.costoUnitarioCOP);
      const sumProv = costos.reduce((s, c) => s + c, 0);

      ofertasBrutas.push({
        proveedorKey: provKey,
        proveedorId: ultimoProv.proveedorId || provMatch?.id,
        proveedorNombre: provMatch?.nombre || ultimoProv.proveedorNombre,
        ultimoCostoCOP: ultimoProv.costoUnitarioCOP,
        costoPromedioCOP: Math.round(sumProv / regsProv.length),
        costoMinimoCOP: Math.min(...costos),
        costoMaximoCOP: Math.max(...costos),
        cantidadRegistros: regsProv.length,
        ultimaFechaIso: ultimoProv.fechaIso,
        ultimoOrigen: ultimoProv.origen,
      });
    }

    ofertasBrutas.sort((a, b) => {
      if (a.ultimoCostoCOP !== b.ultimoCostoCOP) {
        return a.ultimoCostoCOP - b.ultimoCostoCOP;
      }
      if (b.ultimaFechaIso !== a.ultimaFechaIso) {
        return b.ultimaFechaIso.localeCompare(a.ultimaFechaIso);
      }
      return a.costoPromedioCOP - b.costoPromedioCOP;
    });

    const mejorBase = ofertasBrutas[0] ?? null;
    const peorBase =
      ofertasBrutas.length > 1 ? ofertasBrutas[ofertasBrutas.length - 1] : null;

    const ofertasProveedores: OfertaProveedorInsumo[] = ofertasBrutas.map((of, idx) => {
      const diffCOP = mejorBase ? Math.max(0, of.ultimoCostoCOP - mejorBase.ultimoCostoCOP) : 0;
      const diffPct =
        mejorBase && mejorBase.ultimoCostoCOP > 0
          ? Number(((diffCOP / mejorBase.ultimoCostoCOP) * 100).toFixed(1))
          : 0;
      return {
        ...of,
        esMejorPrecio: idx === 0,
        esMasCaro:
          ofertasBrutas.length > 1 &&
          idx === ofertasBrutas.length - 1 &&
          Boolean(mejorBase && of.ultimoCostoCOP > mejorBase.ultimoCostoCOP),
        diferenciaVsMejorCOP: diffCOP,
        diferenciaVsMejorPct: diffPct,
      };
    });

    const mejorProveedor = ofertasProveedores[0] ?? null;
    const proveedorMasCaro =
      ofertasProveedores.length > 1 && peorBase && mejorBase && peorBase.ultimoCostoCOP > mejorBase.ultimoCostoCOP
        ? ofertasProveedores[ofertasProveedores.length - 1]
        : null;

    let ahorroPotencialUnitarioCOP = 0;
    let baseParaAhorroPct = 0;
    if (mejorProveedor && ultimo.costoUnitarioCOP > mejorProveedor.ultimoCostoCOP) {
      ahorroPotencialUnitarioCOP = ultimo.costoUnitarioCOP - mejorProveedor.ultimoCostoCOP;
      baseParaAhorroPct = ultimo.costoUnitarioCOP;
    } else if (mejorProveedor && proveedorMasCaro) {
      ahorroPotencialUnitarioCOP = Math.max(
        0,
        proveedorMasCaro.ultimoCostoCOP - mejorProveedor.ultimoCostoCOP
      );
      baseParaAhorroPct = proveedorMasCaro.ultimoCostoCOP;
    }

    const ahorroPotencialPct =
      ahorroPotencialUnitarioCOP > 0 && baseParaAhorroPct > 0
        ? Number(((ahorroPotencialUnitarioCOP / baseParaAhorroPct) * 100).toFixed(1))
        : 0;

    const serieHistorica: PuntoSeriePrecioInsumo[] = cronologicos.map((reg, idx) => {
      const prevReg = idx > 0 ? cronologicos[idx - 1] : null;
      const varPct = prevReg
        ? calcularVariacionPrecioPct(prevReg.costoUnitarioCOP, reg.costoUnitarioCOP)
        : typeof reg.variacionPct === 'number'
          ? reg.variacionPct
          : 0;
      return {
        registroId: reg.id,
        fechaIso: reg.fechaIso,
        fechaLabel: formatearFechaCortaIso(reg.fechaIso),
        proveedorNombre: reg.proveedorNombre,
        costoUnitarioCOP: reg.costoUnitarioCOP,
        variacionPct: varPct,
        origen: reg.origen,
      };
    });

    const costoBaseComparacionRecetas =
      costoAnteriorCOP !== ultimo.costoUnitarioCOP
        ? costoAnteriorCOP
        : primerCostoPeriodoCOP;

    const recetasAfectadas = calcularImpactoRecetasPorAlzaInsumo({
      insumoId,
      costoAnteriorCOP: costoBaseComparacionRecetas,
      costoNuevoCOP: ultimo.costoUnitarioCOP,
      productos,
      combos,
      insumos,
      movimientosKardex,
    });

    const maxDeltaFoodCostPts = recetasAfectadas.reduce(
      (max, r) => (r.deltaFoodCostPts > max ? r.deltaFoodCostPts : max),
      0
    );

    comparativas.push({
      insumoId,
      insumoNombre: insumo?.nombre || ultimo.insumoNombre,
      unidad: insumo?.unidad || ultimo.unidad || 'unidad',
      stockActual: typeof insumo?.stockActual === 'number' ? insumo.stockActual : 0,
      costoCatalogoActualCOP: sanitizarCostoUnitarioCOP(insumo?.costoUnitario ?? 0),
      ultimoCostoCOP: ultimo.costoUnitarioCOP,
      costoAnteriorCOP,
      primerCostoPeriodoCOP,
      costoPromedioPeriodoCOP,
      variacionUltimoSaltoPct,
      inflacionAcumuladaPct,
      severidad,
      tieneAlertaAlzaCritica,
      ultimaFechaIso: ultimo.fechaIso,
      ultimoProveedorNombre: ultimo.proveedorNombre,
      totalRegistros: cronologicos.length,
      ofertasProveedores,
      cantidadProveedores: ofertasProveedores.length,
      esComparableMultiProveedor: ofertasProveedores.length >= 2,
      mejorProveedor,
      proveedorMasCaro,
      ahorroPotencialUnitarioCOP,
      ahorroPotencialPct,
      serieHistorica,
      recetasAfectadas,
      maxDeltaFoodCostPts,
      registros: [...cronologicos].reverse(),
    });
  }

  return comparativas.sort((a, b) => {
    if (a.tieneAlertaAlzaCritica !== b.tieneAlertaAlzaCritica) {
      return a.tieneAlertaAlzaCritica ? -1 : 1;
    }
    if (b.variacionUltimoSaltoPct !== a.variacionUltimoSaltoPct) {
      return b.variacionUltimoSaltoPct - a.variacionUltimoSaltoPct;
    }
    return b.ahorroPotencialUnitarioCOP - a.ahorroPotencialUnitarioCOP;
  });
}

/**
 * Calcula el Índice de Inflación de Bodega agregado, evolución mensual Base 100
 * y métricas ejecutivas de ahorro y riesgo de Food Cost.
 */
export function calcularResumenInflacionBodega(
  comparativas: ComparativaInsumoProveedores[],
  registrosPeriodo: RegistroPrecioInsumo[],
  periodo: RangoPeriodoPrecios = 'todo'
): ResumenInflacionBodega {
  const conHistorico = comparativas.filter(
    (c) => c.totalRegistros >= 2 || c.variacionUltimoSaltoPct !== 0 || c.inflacionAcumuladaPct !== 0
  );
  const muestra = conHistorico.length > 0 ? conHistorico : comparativas;

  const indiceInflacionPromedioPct =
    muestra.length > 0
      ? Number(
          (
            muestra.reduce((acc, c) => acc + c.inflacionAcumuladaPct, 0) /
            muestra.length
          ).toFixed(1)
        )
      : 0;

  const indiceInflacionUltimoSaltoPct =
    muestra.length > 0
      ? Number(
          (
            muestra.reduce((acc, c) => acc + c.variacionUltimoSaltoPct, 0) /
            muestra.length
          ).toFixed(1)
        )
      : 0;

  const alertasAlzaCriticaCount = comparativas.filter((c) => c.tieneAlertaAlzaCritica).length;
  const insumosConBajaCount = comparativas.filter(
    (c) => c.variacionUltimoSaltoPct < 0 || c.inflacionAcumuladaPct < 0
  ).length;
  const insumosComparablesMultiProveedor = comparativas.filter(
    (c) => c.esComparableMultiProveedor
  ).length;

  const recetasImpactadasSet = new Set<string>();
  for (const comp of comparativas) {
    if (!comp.tieneAlertaAlzaCritica && comp.variacionUltimoSaltoPct <= 0) continue;
    for (const rec of comp.recetasAfectadas) {
      if (rec.impactoCostoUnitarioCOP > 0) {
        recetasImpactadasSet.add(`${rec.itemTipo}:${rec.itemId}`);
      }
    }
  }

  const ahorroPotencialUnitarioTotalCOP = comparativas.reduce(
    (acc, c) => acc + c.ahorroPotencialUnitarioCOP,
    0
  );

  // Evolución mensual Base 100 usando el primer precio de cada insumo como base 100
  const basePorInsumo = new Map<string, number>();
  for (const comp of comparativas) {
    if (comp.primerCostoPeriodoCOP > 0) {
      basePorInsumo.set(comp.insumoId, comp.primerCostoPeriodoCOP);
    }
  }

  const gruposMes = new Map<
    string,
    { insumos: Map<string, number[]>; registrosCount: number }
  >();
  for (const reg of registrosPeriodo) {
    const mesKey = reg.fechaIso?.slice(0, 7);
    if (!mesKey || !/^\d{4}-\d{2}$/.test(mesKey)) continue;
    const grupo = gruposMes.get(mesKey) || {
      insumos: new Map<string, number[]>(),
      registrosCount: 0,
    };
    const arr = grupo.insumos.get(reg.insumoId) || [];
    arr.push(reg.costoUnitarioCOP);
    grupo.insumos.set(reg.insumoId, arr);
    grupo.registrosCount += 1;
    gruposMes.set(mesKey, grupo);
  }

  const evolucionMensualIndice: PuntoEvolucionInflacionMensual[] = Array.from(
    gruposMes.entries()
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mesKey, data]) => {
      const indices: number[] = [];
      for (const [insumoId, costos] of data.insumos.entries()) {
        const base = basePorInsumo.get(insumoId) || costos[0];
        if (base > 0) {
          const promMes = costos.reduce((s, v) => s + v, 0) / costos.length;
          indices.push((promMes / base) * 100);
        }
      }
      const indiceBase100 =
        indices.length > 0
          ? Number((indices.reduce((s, v) => s + v, 0) / indices.length).toFixed(1))
          : 100;

      return {
        mesKey,
        mesLabel: formatearMesLabel(mesKey),
        indiceBase100,
        variacionVsBasePct: Number((indiceBase100 - 100).toFixed(1)),
        registrosCount: data.registrosCount,
        insumosMedidosCount: data.insumos.size,
      };
    });

  const estadoGlobal: ResumenInflacionBodega['estadoGlobal'] =
    alertasAlzaCriticaCount > 0 || indiceInflacionPromedioPct > UMBRAL_ALZA_CRITICA_PCT
      ? 'alerta_inflacion'
      : indiceInflacionPromedioPct > 3 ||
          comparativas.some((c) => c.severidad === 'alza_moderada')
        ? 'vigilancia'
        : 'estable';

  const topAlzas = [...comparativas]
    .filter((c) => c.variacionUltimoSaltoPct > 0 || c.inflacionAcumuladaPct > 0)
    .sort(
      (a, b) =>
        Math.max(b.variacionUltimoSaltoPct, b.inflacionAcumuladaPct) -
        Math.max(a.variacionUltimoSaltoPct, a.inflacionAcumuladaPct)
    )
    .slice(0, 5);

  const topOportunidadesAhorro = [...comparativas]
    .filter((c) => c.ahorroPotencialUnitarioCOP > 0 && c.mejorProveedor)
    .sort((a, b) => b.ahorroPotencialUnitarioCOP - a.ahorroPotencialUnitarioCOP)
    .slice(0, 5);

  return {
    periodo,
    totalInsumosMonitoreados: comparativas.length,
    totalRegistrosPrecios: registrosPeriodo.length,
    insumosComparablesMultiProveedor,
    indiceInflacionPromedioPct,
    indiceInflacionUltimoSaltoPct,
    alertasAlzaCriticaCount,
    insumosConBajaCount,
    recetasImpactadasCount: recetasImpactadasSet.size,
    ahorroPotencialUnitarioTotalCOP,
    estadoGlobal,
    topAlzas,
    topOportunidadesAhorro,
    evolucionMensualIndice,
  };
}

function normalizarTextoBusqueda(texto: string): string {
  return (texto || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function filtrarYOrdenarComparativas(
  comparativas: ComparativaInsumoProveedores[],
  filtros: FiltrosComparadorPrecios
): ComparativaInsumoProveedores[] {
  const q = normalizarTextoBusqueda(filtros.busqueda);

  const filtradas = comparativas.filter((c) => {
    if (filtros.soloAlzasCriticas && !c.tieneAlertaAlzaCritica) return false;
    if (filtros.soloMultiProveedor && !c.esComparableMultiProveedor) return false;
    if (q) {
      const matchNombre = normalizarTextoBusqueda(c.insumoNombre).includes(q);
      const matchProv = c.ofertasProveedores.some((o) =>
        normalizarTextoBusqueda(o.proveedorNombre).includes(q)
      );
      const matchReceta = c.recetasAfectadas.some((r) =>
        normalizarTextoBusqueda(r.itemNombre).includes(q)
      );
      if (!matchNombre && !matchProv && !matchReceta) return false;
    }
    return true;
  });

  return [...filtradas].sort((a, b) => {
    switch (filtros.orden) {
      case 'ahorro_desc':
        return (
          b.ahorroPotencialUnitarioCOP - a.ahorroPotencialUnitarioCOP ||
          b.ahorroPotencialPct - a.ahorroPotencialPct
        );
      case 'impacto_foodcost_desc':
        return (
          b.maxDeltaFoodCostPts - a.maxDeltaFoodCostPts ||
          b.recetasAfectadas.length - a.recetasAfectadas.length
        );
      case 'nombre_asc':
        return a.insumoNombre.localeCompare(b.insumoNombre, 'es-CO');
      case 'alza_desc':
      default:
        if (a.tieneAlertaAlzaCritica !== b.tieneAlertaAlzaCritica) {
          return a.tieneAlertaAlzaCritica ? -1 : 1;
        }
        return (
          b.variacionUltimoSaltoPct - a.variacionUltimoSaltoPct ||
          b.inflacionAcumuladaPct - a.inflacionAcumuladaPct
        );
    }
  });
}

function escapeCsvSeguro(valor: unknown): string {
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? String(valor) : '0';
  }
  const raw = valor === null || valor === undefined ? '' : String(valor);
  const sinSaltos = raw.replace(/\r?\n/g, ' ').trim();
  const neutralizado = /^[=+\-@\t\r]/.test(sinSaltos) ? `'${sinSaltos}` : sinSaltos;
  if (/[",]/.test(neutralizado)) {
    return `"${neutralizado.replace(/"/g, '""')}"`;
  }
  return neutralizado;
}

/**
 * Genera el CSV contable UTF-8 BOM del Comparador de Precios e Inflación de Bodega.
 */
export function generarCsvComparadorPrecios(
  comparativas: ComparativaInsumoProveedores[],
  resumen: ResumenInflacionBodega,
  nombreNegocio: string = 'La Parada'
): string {
  const headers = [
    'Negocio',
    'Insumo',
    'Unidad',
    'Ultimo Precio COP',
    'Precio Anterior COP',
    'Variacion Ultimo Salto %',
    'Inflacion Acumulada Periodo %',
    'Alerta > 10%',
    'Ultimo Proveedor',
    'Mejor Proveedor Recomendado',
    'Mejor Precio COP',
    'Ahorro Potencial Unitario COP',
    'Proveedores Comparados',
    'Recetas Afectadas',
    'Max Impacto Food Cost (pp)',
    'Indice Inflacion Bodega %',
  ];

  const filas = comparativas.map((c) =>
    [
      escapeCsvSeguro(nombreNegocio),
      escapeCsvSeguro(c.insumoNombre),
      escapeCsvSeguro(c.unidad),
      escapeCsvSeguro(c.ultimoCostoCOP),
      escapeCsvSeguro(c.costoAnteriorCOP),
      escapeCsvSeguro(c.variacionUltimoSaltoPct),
      escapeCsvSeguro(c.inflacionAcumuladaPct),
      escapeCsvSeguro(c.tieneAlertaAlzaCritica ? 'SI (>10%)' : 'NO'),
      escapeCsvSeguro(c.ultimoProveedorNombre),
      escapeCsvSeguro(c.mejorProveedor?.proveedorNombre || c.ultimoProveedorNombre),
      escapeCsvSeguro(c.mejorProveedor?.ultimoCostoCOP ?? c.ultimoCostoCOP),
      escapeCsvSeguro(c.ahorroPotencialUnitarioCOP),
      escapeCsvSeguro(c.cantidadProveedores),
      escapeCsvSeguro(c.recetasAfectadas.map((r) => r.itemNombre).join(' | ')),
      escapeCsvSeguro(c.maxDeltaFoodCostPts),
      escapeCsvSeguro(resumen.indiceInflacionPromedioPct),
    ].join(',')
  );

  return `\uFEFF${[headers.map(escapeCsvSeguro).join(','), ...filas].join('\r\n')}`;
}

export function descargarCsvComparadorPrecios(params: {
  comparativas: ComparativaInsumoProveedores[];
  resumen: ResumenInflacionBodega;
  nombreNegocio: string;
}): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const contenido = generarCsvComparadorPrecios(
    params.comparativas,
    params.resumen,
    params.nombreNegocio
  );
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fechaHoy = obtenerFechaIsoColombia();
  const safeNegocio = (params.nombreNegocio || 'negocio')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  a.href = url;
  a.download = `comparador_precios_inflacion_${safeNegocio}_${fechaHoy}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Genera el reporte ejecutivo de Inflación de Bodega y Mejor Proveedor para WhatsApp.
 */
export function generarResumenInflacionWhatsApp(
  nombreNegocio: string,
  resumen: ResumenInflacionBodega
): string {
  const icono =
    resumen.estadoGlobal === 'alerta_inflacion'
      ? '🔴'
      : resumen.estadoGlobal === 'vigilancia'
        ? '🟡'
        : '🟢';

  let texto = `*📊 INFORME DE INFLACIÓN Y PROVEEDORES — ${(nombreNegocio || 'La Parada').toUpperCase()}*\n`;
  texto += `📅 Corte: ${obtenerFechaIsoColombia()}\n`;
  texto += `${icono} Índice Inflación Bodega: *${resumen.indiceInflacionPromedioPct > 0 ? '+' : ''}${resumen.indiceInflacionPromedioPct}%*\n`;
  texto += `• Insumos monitoreados: *${resumen.totalInsumosMonitoreados}* (${resumen.insumosComparablesMultiProveedor} multi-proveedor)\n`;
  texto += `• Alertas alza > 10%: *${resumen.alertasAlzaCriticaCount}* (${resumen.recetasImpactadasCount} platos impactados)\n`;
  texto += `• Ahorro potencial unitario: *${formatCOP(resumen.ahorroPotencialUnitarioTotalCOP)}*\n`;

  if (resumen.topAlzas.length > 0) {
    texto += `\n*🔥 Mayores Alzas:*\n`;
    resumen.topAlzas.slice(0, 3).forEach((c) => {
      texto += `• ${c.insumoNombre}: +${Math.max(c.variacionUltimoSaltoPct, c.inflacionAcumuladaPct)}% (${formatCOP(c.ultimoCostoCOP)}/${c.unidad})\n`;
    });
  }

  if (resumen.topOportunidadesAhorro.length > 0) {
    texto += `\n*💡 Mejores Proveedores Recomendados:*\n`;
    resumen.topOportunidadesAhorro.slice(0, 3).forEach((c) => {
      if (!c.mejorProveedor) return;
      texto += `• ${c.insumoNombre}: *${c.mejorProveedor.proveedorNombre}* a ${formatCOP(c.mejorProveedor.ultimoCostoCOP)} (ahorra ${formatCOP(c.ahorroPotencialUnitarioCOP)}/${c.unidad})\n`;
    });
  }

  return encodeURIComponent(texto);
}
