import type { Venta } from '@/types';
import { formatCOP } from './formatCOP';
import { toValidAdminDate } from './adminAnalytics';

export function generarVentasCsvContent(ventas: Venta[], nombreNegocio: string): string {
  const BOM = '\uFEFF';
  const headers = [
    'ID Venta',
    'Fecha',
    'Hora',
    'Negocio',
    'Origen',
    'Método Pago',
    'Tipo Entrega',
    'Total COP',
    'Cant. Ítems',
    'Detalle Productos',
  ];

  const filas = ventas.map((venta) => {
    const date = toValidAdminDate(venta.fecha) || new Date();
    const fechaStr = date.toLocaleDateString('es-CO');
    const horaStr = date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    const origenStr = venta.origen || 'pos';
    const metodoPagoStr = venta.metodoPago || 'efectivo';
    const tipoEntregaStr = venta.tipoEntrega || 'mostrador';
    const totalNum = Number.isFinite(venta.total) ? venta.total : 0;
    const cantItems = venta.items ? venta.items.reduce((acc, i) => acc + (i.cantidad || 0), 0) : 0;
    const detalleProductos = venta.items
      ? venta.items.map((i) => `${i.cantidad}x ${i.nombre} (${formatCOP(i.subtotal)})`).join(' | ')
      : '';

    return [
      `"${venta.id}"`,
      `"${fechaStr}"`,
      `"${horaStr}"`,
      `"${(nombreNegocio || 'La Parada').replace(/"/g, '""')}"`,
      `"${origenStr}"`,
      `"${metodoPagoStr}"`,
      `"${tipoEntregaStr}"`,
      String(totalNum),
      String(cantItems),
      `"${detalleProductos.replace(/"/g, '""')}"`,
    ].join(',');
  });

  return BOM + [headers.join(','), ...filas].join('\r\n');
}

export function descargarVentasCsv(ventas: Venta[], nombreNegocio: string): void {
  const contenido = generarVentasCsvContent(ventas, nombreNegocio);
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const fechaHoy = new Date().toISOString().split('T')[0];
  const safeNegocio = (nombreNegocio || 'negocio').toLowerCase().replace(/[^a-z0-9]/g, '_');
  a.href = url;
  a.download = `ventas_${safeNegocio}_${fechaHoy}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

