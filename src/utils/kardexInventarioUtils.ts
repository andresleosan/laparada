import type {
  FiltrosKardex,
  Insumo,
  MetricasKardex,
  MotivoAjusteInventario,
  MotivoMerma,
  MovimientoKardex,
  TipoMovimientoKardex,
} from '@/types';
import { toValidAdminDate } from './adminAnalytics';

export const MOTIVOS_MERMA: Array<{ id: MotivoMerma; label: string; descripcion: string }> = [
  { id: 'vencimiento', label: 'Vencimiento / Expirado', descripcion: 'Insumo superó su fecha límite de consumo' },
  { id: 'dañado_almacenamiento', label: 'Dañado en Bodega / Descomposición', descripcion: 'Deterioro por temperatura, empaque o humedad' },
  { id: 'desperdicio_cocina', label: 'Desperdicio en Preparación', descripcion: 'Recortes no aprovechables, quemado o caída de insumo' },
  { id: 'error_preparacion', label: 'Error de Comanda / Cocina', descripcion: 'Plato mal preparado que tuvo que desecharse' },
  { id: 'degustacion_personal', label: 'Consumo Interno / Personal', descripcion: 'Uso del insumo para alimentación de staff o prueba' },
  { id: 'otro', label: 'Otro Desperdicio', descripcion: 'Merma no categorizada' },
];

export const MOTIVOS_AJUSTE: Array<{ id: MotivoAjusteInventario; label: string; descripcion: string }> = [
  { id: 'conteo_fisico', label: 'Auditoría / Conteo Físico', descripcion: 'Ajuste tras conteo manual en estanterías o neveras' },
  { id: 'correccion_error', label: 'Corrección de Digitación', descripcion: 'Subsanación de error en entrada o salida previa' },
  { id: 'diferencia_recepcion', label: 'Diferencia en Recepción', descripcion: 'Diferencia entre factura y entrega real de proveedor' },
  { id: 'otro', label: 'Otro Ajuste', descripcion: 'Ajuste operativo' },
];

/**
 * Determina el tipo de movimiento contable con inferencia retrocompatible
 */
export function determinarTipoMovimiento(
  movimiento: Partial<MovimientoKardex>
): TipoMovimientoKardex {
  if (movimiento.tipoMovimiento) {
    return movimiento.tipoMovimiento;
  }

  const cantidad = movimiento.cantidad ?? 0;
  const proveedor = (movimiento.proveedor || '').toLowerCase();

  // Comprobar primero mermas, ajustes y reversiones explícitas
  if (/merma|desperdicio|vencid|dañad|vencimiento/i.test(proveedor)) {
    return 'merma';
  }
  if (/ajuste|conteo/i.test(proveedor)) {
    return 'ajuste';
  }
  if (/reversi[oó]n|anulaci[oó]n/i.test(proveedor)) {
    return 'reversion';
  }

  if (cantidad < 0) {
    if (/\b(venta|ventas|pos|domicilio|mesa|comanda)\b/i.test(proveedor)) {
      return 'salida_venta';
    }
    return 'salida_manual';
  }

  // cantidad >= 0
  return 'entrada';
}

/**
 * Información visual y de estilo para badges de tipo de movimiento
 */
export function getBadgeInfoTipoMovimiento(tipo: TipoMovimientoKardex): {
  label: string;
  shortLabel: string;
  badgeClasses: string;
  signo: string;
} {
  switch (tipo) {
    case 'entrada':
      return {
        label: 'Entrada / Compra',
        shortLabel: 'Entrada',
        badgeClasses: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
        signo: '+',
      };
    case 'salida_venta':
      return {
        label: 'Salida por Venta',
        shortLabel: 'Venta',
        badgeClasses: 'border-sky-500/30 text-sky-400 bg-sky-500/10',
        signo: '-',
      };
    case 'salida_manual':
      return {
        label: 'Salida Manual',
        shortLabel: 'Salida',
        badgeClasses: 'border-neutral-700 text-neutral-300 bg-neutral-800/80',
        signo: '-',
      };
    case 'merma':
      return {
        label: 'Merma / Desperdicio',
        shortLabel: 'Merma',
        badgeClasses: 'border-red-500/30 text-red-400 bg-red-500/10',
        signo: '-',
      };
    case 'ajuste':
      return {
        label: 'Ajuste de Conteo',
        shortLabel: 'Ajuste',
        badgeClasses: 'border-amber-500/30 text-amber-400 bg-amber-500/10',
        signo: '±',
      };
    case 'reversion':
      return {
        label: 'Reversión (Anulada)',
        shortLabel: 'Reversión',
        badgeClasses: 'border-purple-500/30 text-purple-400 bg-purple-500/10',
        signo: '+',
      };
    default:
      return {
        label: 'Movimiento',
        shortLabel: 'Movimiento',
        badgeClasses: 'border-neutral-700 text-neutral-400 bg-neutral-800',
        signo: '',
      };
  }
}

/**
 * Calcula mapa de costos unitarios estimados más recientes por insumo
 */
export function calcularCostosUnitariosRecientes(
  movimientos: MovimientoKardex[]
): Record<string, number> {
  const costosPorInsumo: Record<string, number> = {};

  // Ordenar cronológicamente ascendente para que la última entrada sobreescriba
  const ordenados = [...movimientos].sort((a, b) => {
    const da = toValidAdminDate(a.fecha)?.getTime() || 0;
    const db = toValidAdminDate(b.fecha)?.getTime() || 0;
    return da - db;
  });

  for (const mov of ordenados) {
    const tipo = determinarTipoMovimiento(mov);
    if (tipo === 'entrada' && mov.cantidad > 0 && mov.costo > 0) {
      const unitario = typeof mov.costoUnitario === 'number' && mov.costoUnitario > 0
        ? mov.costoUnitario
        : Math.round(mov.costo / mov.cantidad);
      costosPorInsumo[mov.insumoId] = unitario;
    }
  }

  return costosPorInsumo;
}

/**
 * Calcula la valuación monetaria actual del inventario en bodega en COP
 */
export function calcularValoracionBodega(
  insumos: Insumo[],
  movimientos: MovimientoKardex[]
): number {
  const costosUnitarios = calcularCostosUnitariosRecientes(movimientos);
  let total = 0;

  for (const insumo of insumos) {
    const stock = Number.isFinite(insumo.stockActual) ? Math.max(0, insumo.stockActual) : 0;
    const costoUnit = costosUnitarios[insumo.id] || 0;
    total += Math.round(stock * costoUnit);
  }

  return total;
}

/**
 * Calcula métricas contables consolidadas para un conjunto de movimientos
 */
export function calcularMetricasKardex(
  movimientos: MovimientoKardex[],
  insumos: Insumo[] = []
): MetricasKardex {
  let totalEntradasCantidad = 0;
  let totalEntradasCostoCOP = 0;
  let totalSalidasVentaCantidad = 0;
  let totalMermasCantidad = 0;
  let totalMermasValorCOP = 0;
  let totalAjustesNetosCantidad = 0;

  const costosUnitarios = calcularCostosUnitariosRecientes(movimientos);

  for (const mov of movimientos) {
    const tipo = determinarTipoMovimiento(mov);
    const cantAbs = Math.abs(Number.isFinite(mov.cantidad) ? mov.cantidad : 0);
    const cantSigno = Number.isFinite(mov.cantidad) ? mov.cantidad : 0;
    const costo = Number.isFinite(mov.costo) ? Math.max(0, mov.costo) : 0;

    switch (tipo) {
      case 'entrada':
        totalEntradasCantidad += cantAbs;
        totalEntradasCostoCOP += costo;
        break;
      case 'salida_venta':
        totalSalidasVentaCantidad += cantAbs;
        break;
      case 'merma': {
        totalMermasCantidad += cantAbs;
        const costoEstimado = costo > 0 ? costo : Math.round(cantAbs * (costosUnitarios[mov.insumoId] || 0));
        totalMermasValorCOP += costoEstimado;
        break;
      }
      case 'ajuste':
        totalAjustesNetosCantidad += cantSigno;
        break;
      default:
        break;
    }
  }

  const valorTotalBodegaCOP = calcularValoracionBodega(insumos, movimientos);

  return {
    totalEntradasCantidad: Number(totalEntradasCantidad.toFixed(2)),
    totalEntradasCostoCOP: Math.round(totalEntradasCostoCOP),
    totalSalidasVentaCantidad: Number(totalSalidasVentaCantidad.toFixed(2)),
    totalMermasCantidad: Number(totalMermasCantidad.toFixed(2)),
    totalMermasValorCOP: Math.round(totalMermasValorCOP),
    totalAjustesNetosCantidad: Number(totalAjustesNetosCantidad.toFixed(2)),
    cantidadMovimientos: movimientos.length,
    valorTotalBodegaCOP,
  };
}

/**
 * Filtra los movimientos de inventario según criterios seleccionados
 */
export function filtrarMovimientosKardex(
  movimientos: MovimientoKardex[],
  filtros: FiltrosKardex
): MovimientoKardex[] {
  const ahora = new Date();
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
  const hace7Dias = inicioHoy - 7 * 24 * 60 * 60 * 1000;
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime();

  const termBusqueda = (filtros.busqueda || '').trim().toLowerCase();

  return movimientos.filter((mov) => {
    // 1. Filtro por insumo
    if (filtros.insumoId && filtros.insumoId !== 'todos' && mov.insumoId !== filtros.insumoId) {
      return false;
    }

    // 2. Filtro por tipo de movimiento
    const tipo = determinarTipoMovimiento(mov);
    if (filtros.tipoMovimiento && filtros.tipoMovimiento !== 'todos' && tipo !== filtros.tipoMovimiento) {
      return false;
    }

    // 3. Filtro por rango de fecha
    const fechaMov = toValidAdminDate(mov.fecha)?.getTime() || 0;
    if (filtros.rangoFecha && filtros.rangoFecha !== 'todos') {
      if (filtros.rangoFecha === 'hoy' && fechaMov < inicioHoy) return false;
      if (filtros.rangoFecha === '7dias' && fechaMov < hace7Dias) return false;
      if (filtros.rangoFecha === 'mes' && fechaMov < inicioMes) return false;
    }

    // 4. Búsqueda por texto libre
    if (termBusqueda) {
      const matchInsumo = (mov.insumoNombre || '').toLowerCase().includes(termBusqueda);
      const matchProveedor = (mov.proveedor || '').toLowerCase().includes(termBusqueda);
      const matchMotivo = (mov.motivo || '').toLowerCase().includes(termBusqueda);
      const matchNotas = (mov.notas || '').toLowerCase().includes(termBusqueda);
      const matchResp = (mov.responsable || '').toLowerCase().includes(termBusqueda);
      if (!matchInsumo && !matchProveedor && !matchMotivo && !matchNotas && !matchResp) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Genera el contenido de exportación contable a formato CSV (RFC 4180 con UTF-8 BOM)
 */
export function generarKardexCsvContent(
  movimientos: MovimientoKardex[],
  nombreNegocio: string
): string {
  const BOM = '\uFEFF';
  const headers = [
    'ID Movimiento',
    'Fecha',
    'Hora',
    'Negocio',
    'Insumo',
    'Tipo Movimiento',
    'Cantidad',
    'Unidad',
    'Stock Previo',
    'Stock Resultante',
    'Costo Total COP',
    'Costo Unitario COP',
    'Proveedor / Referencia',
    'Motivo',
    'Responsable',
    'Notas',
  ];

  const filas = movimientos.map((mov) => {
    const date = toValidAdminDate(mov.fecha) || new Date();
    const fechaStr = date.toLocaleDateString('es-CO');
    const horaStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const tipo = determinarTipoMovimiento(mov);
    const badgeInfo = getBadgeInfoTipoMovimiento(tipo);
    const cantidadNum = Number.isFinite(mov.cantidad) ? mov.cantidad : 0;
    const stockPrev = typeof mov.stockPrevio === 'number' ? String(mov.stockPrevio) : '';
    const stockPost = typeof mov.stockResultante === 'number' ? String(mov.stockResultante) : '';
    const costoTotal = Number.isFinite(mov.costo) ? mov.costo : 0;
    const costoUnit = typeof mov.costoUnitario === 'number'
      ? mov.costoUnitario
      : (cantidadNum > 0 && costoTotal > 0 ? Math.round(costoTotal / cantidadNum) : 0);

    return [
      `"${mov.id || ''}"`,
      `"${fechaStr}"`,
      `"${horaStr}"`,
      `"${(nombreNegocio || 'La Parada').replace(/"/g, '""')}"`,
      `"${(mov.insumoNombre || '').replace(/"/g, '""')}"`,
      `"${badgeInfo.label}"`,
      String(cantidadNum),
      `"${(mov.unidadMedida || 'unidades').replace(/"/g, '""')}"`,
      stockPrev,
      stockPost,
      String(costoTotal),
      String(costoUnit),
      `"${(mov.proveedor || '').replace(/"/g, '""')}"`,
      `"${(mov.motivo || '').replace(/"/g, '""')}"`,
      `"${(mov.responsable || '').replace(/"/g, '""')}"`,
      `"${(mov.notas || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  return BOM + [headers.join(','), ...filas].join('\r\n');
}

/**
 * Dispara la descarga del archivo CSV del Kardex en el navegador
 */
export function descargarKardexCsv(
  movimientos: MovimientoKardex[],
  nombreNegocio: string
): void {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return;
  }
  const contenido = generarKardexCsvContent(movimientos, nombreNegocio);
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fechaHoy = new Date().toISOString().split('T')[0];
  const safeNegocio = (nombreNegocio || 'negocio').toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.href = url;
  a.download = `kardex_inventario_${safeNegocio}_${fechaHoy}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
