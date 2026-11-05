import type {
  FacturaCompra,
  Proveedor,
  CategoriaProveedor,
  EstadoVencimientoFactura,
  EstadoFacturaCompra,
  MetricasCuentasPorPagar,
  ResumenProveedorTotales,
} from '@/types/proveedor';
import { formatCOP } from './formatCOP';

/**
 * Configuración descriptiva de las categorías de proveedores
 */
export const CATEGORIAS_PROVEEDOR_CONFIG: Record<
  CategoriaProveedor,
  { label: string; color: string; badgeBg: string }
> = {
  carnes: {
    label: 'Carnes & Pollo',
    color: 'text-rose-400',
    badgeBg: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  },
  panaderia: {
    label: 'Panadería',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  lacteos: {
    label: 'Lácteos & Quesos',
    color: 'text-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  },
  verduras_frutas: {
    label: 'Fruver & Legumbres',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
  bebidas: {
    label: 'Bebidas & Gaseosas',
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  },
  empaques: {
    label: 'Empaques & Desechables',
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  },
  gas_servicios: {
    label: 'Gas & Servicios',
    color: 'text-orange-400',
    badgeBg: 'bg-orange-500/10 text-orange-300 border-orange-500/30',
  },
  limpieza: {
    label: 'Aseo & Limpieza',
    color: 'text-teal-400',
    badgeBg: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
  },
  otros: {
    label: 'Otros / Varios',
    color: 'text-neutral-400',
    badgeBg: 'bg-neutral-800 text-neutral-300 border-neutral-700',
  },
};

/**
 * Calcula la diferencia en días enteros entre dos fechas (vencimiento - referencia)
 */
export function calcularDiferenciaDias(fechaVencimiento: Date, fechaReferencia: Date = new Date()): number {
  const inicioRef = new Date(
    fechaReferencia.getFullYear(),
    fechaReferencia.getMonth(),
    fechaReferencia.getDate()
  ).getTime();

  const inicioVenc = new Date(
    fechaVencimiento.getFullYear(),
    fechaVencimiento.getMonth(),
    fechaVencimiento.getDate()
  ).getTime();

  return Math.round((inicioVenc - inicioRef) / (1000 * 60 * 60 * 24));
}

/**
 * Determina el estado del semáforo de vencimiento para una factura
 */
export function determinarEstadoVencimiento(
  factura: FacturaCompra,
  fechaReferencia: Date = new Date()
): EstadoVencimientoFactura {
  if (factura.estado === 'pagada' || (typeof factura.saldoPendiente === 'number' && factura.saldoPendiente <= 0)) {
    return 'pagada';
  }

  const fechaVencDate = factura.fechaVencimiento && typeof factura.fechaVencimiento.toDate === 'function'
    ? factura.fechaVencimiento.toDate()
    : new Date(factura.fechaVencimiento as unknown as string);

  const diffDias = calcularDiferenciaDias(fechaVencDate, fechaReferencia);

  if (diffDias < 0) {
    return 'vencida';
  }
  if (diffDias <= 3) {
    return 'por_vencer';
  }
  return 'al_dia';
}

/**
 * Calcula el saldo pendiente seguro de una factura (evitando valores negativos)
 */
export function calcularSaldoPendiente(total: number, montoPagado: number): number {
  const t = Math.max(0, Math.round(Number(total) || 0));
  const p = Math.max(0, Math.round(Number(montoPagado) || 0));
  return Math.max(0, t - p);
}

/**
 * Determina el estado que debe tener la factura de acuerdo a sus pagos
 */
export function determinarNuevoEstadoFactura(
  total: number,
  nuevoMontoPagado: number
): EstadoFacturaCompra {
  const t = Math.max(0, Math.round(Number(total) || 0));
  const p = Math.max(0, Math.round(Number(nuevoMontoPagado) || 0));

  if (t > 0 && p >= t) {
    return 'pagada';
  }
  if (p > 0) {
    return 'parcial';
  }
  return 'pendiente';
}

/**
 * Calcula la fecha estimada de vencimiento sumando los días de crédito a la fecha de emisión
 */
export function calcularFechaVencimiento(fechaEmision: Date, diasCredito: number): Date {
  const fecha = new Date(fechaEmision.getTime());
  const dias = Math.max(0, Math.round(Number(diasCredito) || 0));
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}

/**
 * Calcula métricas consolidadas de proveedores y cuentas por pagar
 */
export function calcularMetricasCuentasPorPagar(
  facturas: FacturaCompra[],
  proveedores: Proveedor[],
  fechaReferencia: Date = new Date()
): MetricasCuentasPorPagar {
  let deudaTotal = 0;
  let totalVencido = 0;
  let cantidadVencidas = 0;
  let totalPorVencerSemana = 0;
  let cantidadPorVencerSemana = 0;
  let totalPagadoMes = 0;

  const inicioMes = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth(), 1).getTime();
  const finMes = new Date(fechaReferencia.getFullYear(), fechaReferencia.getMonth() + 1, 0, 23, 59, 59).getTime();

  for (const fac of facturas) {
    if (fac.estado === 'anulada') continue;

    const saldo = calcularSaldoPendiente(fac.total, fac.montoPagado);
    deudaTotal += saldo;

    // Pagos acumulados registrados este mes
    const emisionDate = fac.fechaEmision && typeof fac.fechaEmision.toDate === 'function'
      ? fac.fechaEmision.toDate()
      : new Date(fac.fechaEmision as unknown as string);
    const emisionTime = emisionDate.getTime();
    if (emisionTime >= inicioMes && emisionTime <= finMes) {
      totalPagadoMes += fac.montoPagado || 0;
    }

    if (saldo > 0) {
      const fechaVencDate = fac.fechaVencimiento && typeof fac.fechaVencimiento.toDate === 'function'
        ? fac.fechaVencimiento.toDate()
        : new Date(fac.fechaVencimiento as unknown as string);
      const diff = calcularDiferenciaDias(fechaVencDate, fechaReferencia);

      if (diff < 0) {
        totalVencido += saldo;
        cantidadVencidas += 1;
      } else if (diff <= 7) {
        totalPorVencerSemana += saldo;
        cantidadPorVencerSemana += 1;
      }
    }
  }

  const proveedoresActivos = proveedores.filter((p) => p.activo).length;

  return {
    deudaTotal,
    totalVencido,
    cantidadVencidas,
    totalPorVencerSemana,
    cantidadPorVencerSemana,
    totalPagadoMes,
    proveedoresActivos,
  };
}

/**
 * Agrupa y totaliza compras y saldos por proveedor
 */
export function calcularTotalesPorProveedor(
  facturas: FacturaCompra[]
): Record<string, ResumenProveedorTotales> {
  const resultado: Record<string, ResumenProveedorTotales> = {};

  for (const fac of facturas) {
    if (fac.estado === 'anulada') continue;

    if (!resultado[fac.proveedorId]) {
      resultado[fac.proveedorId] = {
        totalComprado: 0,
        saldoPendiente: 0,
        facturasPendientes: 0,
      };
    }

    const reg = resultado[fac.proveedorId];
    reg.totalComprado += fac.total || 0;
    const saldo = typeof fac.saldoPendiente === 'number'
      ? Math.max(0, fac.saldoPendiente)
      : calcularSaldoPendiente(fac.total, fac.montoPagado);
    reg.saldoPendiente += saldo;
    if (saldo > 0) {
      reg.facturasPendientes += 1;
    }
  }

  return resultado;
}

/**
 * Genera el texto con formato para WhatsApp hacia el proveedor
 */
export function generarMensajeWhatsAppProveedor(
  proveedor: Proveedor,
  factura?: FacturaCompra
): string {
  if (factura) {
    const vencimientoStr = factura.fechaVencimiento && typeof factura.fechaVencimiento.toDate === 'function'
      ? factura.fechaVencimiento.toDate().toLocaleDateString('es-CO')
      : new Date(factura.fechaVencimiento as unknown as string).toLocaleDateString('es-CO');

    const saldo = calcularSaldoPendiente(factura.total, factura.montoPagado);

    return `Hola ${proveedor.contacto || proveedor.nombre}, un cordial saludo desde La Parada. 👋

Te escribimos respecto a la factura/remisión *${factura.numeroFactura}*:
• Total: ${formatCOP(factura.total)}
• Abonado: ${formatCOP(factura.montoPagado)}
• Saldo pendiente: *${formatCOP(saldo)}*
• Vencimiento: ${vencimientoStr}

Quedamos atentos a tu confirmación para coordinar el pago. ¡Muchas gracias!`;
  }

  return `Hola ${proveedor.contacto || proveedor.nombre}, un saludo desde La Parada. 👋
Nos comunicamos contigo para coordinar el próximo pedido de insumos y novedades de cuenta. ¡Gracias por el apoyo!`;
}

/**
 * Genera la cadena de contenido CSV para exportación a Excel con UTF-8 BOM
 */
export function generarCuentasPorPagarCsv(
  facturas: FacturaCompra[],
  proveedores: Proveedor[]
): string {
  const proveedorMap = new Map(proveedores.map((p) => [p.id, p]));

  const headers = [
    'Proveedor',
    'NIT',
    'Teléfono',
    'Categoría',
    'N° Factura',
    'Fecha Emisión',
    'Fecha Vencimiento',
    'Condición Pago',
    'Total (COP)',
    'Monto Pagado (COP)',
    'Saldo Pendiente (COP)',
    'Estado',
    'Semáforo',
    'Notas',
  ];

  const rows = facturas.map((fac) => {
    const prov = proveedorMap.get(fac.proveedorId);
    const emisionStr = fac.fechaEmision && typeof fac.fechaEmision.toDate === 'function'
      ? fac.fechaEmision.toDate().toLocaleDateString('es-CO')
      : new Date(fac.fechaEmision as unknown as string).toLocaleDateString('es-CO');

    const vencimientoStr = fac.fechaVencimiento && typeof fac.fechaVencimiento.toDate === 'function'
      ? fac.fechaVencimiento.toDate().toLocaleDateString('es-CO')
      : new Date(fac.fechaVencimiento as unknown as string).toLocaleDateString('es-CO');

    const semaforo = determinarEstadoVencimiento(fac);

    return [
      `"${(fac.proveedorNombre || prov?.nombre || '').replace(/"/g, '""')}"`,
      `"${(prov?.nit || '').replace(/"/g, '""')}"`,
      `"${(prov?.telefono || '').replace(/"/g, '""')}"`,
      `"${prov ? CATEGORIAS_PROVEEDOR_CONFIG[prov.categoria]?.label || prov.categoria : ''}"`,
      `"${(fac.numeroFactura || '').replace(/"/g, '""')}"`,
      emisionStr,
      vencimientoStr,
      fac.condicionPago === 'contado' ? 'Contado' : 'Crédito',
      fac.total,
      fac.montoPagado,
      fac.saldoPendiente,
      fac.estado.toUpperCase(),
      semaforo.toUpperCase(),
      `"${(fac.notas || '').replace(/"/g, '""')}"`,
    ].join(';');
  });

  // UTF-8 BOM (\uFEFF) para visualización correcta de acentos en Excel
  return `\uFEFF${headers.join(';')}\n${rows.join('\n')}`;
}

/**
 * Dispara la descarga del archivo CSV en el navegador
 */
export function exportarCuentasPorPagarCsv(
  facturas: FacturaCompra[],
  proveedores: Proveedor[],
  nombreNegocio: string = 'La Parada'
): void {
  const csvContent = generarCuentasPorPagarCsv(facturas, proveedores);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const fechaStr = new Date().toISOString().split('T')[0];
  const nombreLimpio = nombreNegocio.toLowerCase().replace(/[^a-z0-9]/g, '_');

  link.setAttribute('href', url);
  link.setAttribute('download', `cuentas_por_pagar_${nombreLimpio}_${fechaStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
