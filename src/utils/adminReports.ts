export interface AdminReportSale {
  total: number;
  metodoPago: string;
  items?: Array<{ nombre: string; cantidad: number }>;
  propina?: number;
  descuento?: number;
  estado?: string;
}

export interface AdminReportExpense {
  monto: number;
  categoria: string;
}

export interface AdminReportSummary {
  totalVentas: number;
  ventasEfectivo: number;
  totalGastos: number;
  gananciaNeta: number;
  cantidadVentas: number;
  ventaPromedio: number;
  totalPropinas?: number;
  totalDescuentos?: number;
  cantidadDescuentos?: number;
  totalAnuladas?: number;
  cantidadAnuladas?: number;
  productoMasVendido: { nombre: string; cantidad: number } | null;
  gastosPorCategoria: Record<string, number>;
}

export type AdminSalesPeriod = 'todas' | 'hoy' | 'semana' | 'mes';

const adminSalesPeriodDays: Record<AdminSalesPeriod, number> = {
  hoy: 1,
  semana: 7,
  mes: 30,
  todas: 90,
};

function safeAmount(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

export function getRollingReportRange(days: number, now = new Date()) {
  if (!Number.isInteger(days) || days <= 0) {
    throw new Error('El rango debe tener al menos un día');
  }

  const fin = new Date(now);
  fin.setHours(23, 59, 59, 999);
  const inicio = new Date(fin);
  inicio.setDate(inicio.getDate() - (days - 1));
  inicio.setHours(0, 0, 0, 0);
  return { inicio, fin };
}

/**
 * Traduce los filtros del historial a ventanas acotadas e inclusivas. El filtro
 * legado `todas` representa los últimos 90 días para evitar lecturas sin límite.
 */
export function getAdminSalesPeriodRange(period: AdminSalesPeriod, now = new Date()) {
  const range = getRollingReportRange(adminSalesPeriodDays[period], now);
  const finExclusivo = new Date(range.fin.getTime() + 1);
  return { ...range, finExclusivo };
}

export function buildAdminReportSummary(
  sales: AdminReportSale[],
  expenses: AdminReportExpense[]
): AdminReportSummary {
  const validSales = sales.filter((sale) => sale.estado !== 'anulada');
  const cancelledSales = sales.filter((sale) => sale.estado === 'anulada');

  const totalVentas = validSales.reduce((sum, sale) => sum + safeAmount(sale.total), 0);
  const ventasEfectivo = validSales
    .filter((sale) => sale.metodoPago === 'efectivo')
    .reduce((sum, sale) => sum + safeAmount(sale.total), 0);
  const totalGastos = expenses.reduce((sum, expense) => sum + safeAmount(expense.monto), 0);
  const products = new Map<string, number>();

  validSales.forEach((sale) => {
    sale.items?.forEach((item) => {
      if (!item.nombre.trim() || !Number.isFinite(item.cantidad) || item.cantidad <= 0) return;
      products.set(item.nombre, (products.get(item.nombre) || 0) + item.cantidad);
    });
  });

  const topProduct = Array.from(products.entries())
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];
  const gastosPorCategoria = expenses.reduce<Record<string, number>>((grouped, expense) => {
    const amount = safeAmount(expense.monto);
    if (!expense.categoria || amount === 0) return grouped;
    grouped[expense.categoria] = (grouped[expense.categoria] || 0) + amount;
    return grouped;
  }, {});

  const totalPropinas = validSales.reduce((sum, sale) => sum + safeAmount(sale.propina || 0), 0);
  const totalDescuentos = validSales.reduce((sum, sale) => sum + safeAmount(sale.descuento || 0), 0);
  const cantidadDescuentos = validSales.filter((sale) => safeAmount(sale.descuento || 0) > 0).length;

  const totalAnuladas = cancelledSales.reduce((sum, sale) => sum + safeAmount(sale.total), 0);
  const cantidadAnuladas = cancelledSales.length;

  return {
    totalVentas,
    ventasEfectivo,
    totalGastos,
    gananciaNeta: totalVentas - totalGastos,
    cantidadVentas: validSales.length,
    ventaPromedio: validSales.length > 0 ? totalVentas / validSales.length : 0,
    totalPropinas,
    totalDescuentos,
    cantidadDescuentos,
    totalAnuladas,
    cantidadAnuladas,
    productoMasVendido: topProduct
      ? { nombre: topProduct[0], cantidad: topProduct[1] }
      : null,
    gastosPorCategoria,
  };
}
