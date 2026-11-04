import type { Venta } from '@/types';
import type { MotivoAnulacionDef, MotivoAnulacionVenta, DatosAnulacionVenta } from '@/types/anulacionVenta';

export type { MotivoAnulacionDef, MotivoAnulacionVenta, DatosAnulacionVenta };

export const CATALOGO_MOTIVOS_ANULACION: MotivoAnulacionDef[] = [
  {
    id: 'error_digitacion',
    label: 'Error de digitación / producto incorrecto',
    descripcion: 'Se cobró un producto, cantidad o combo equivocado en el sistema',
  },
  {
    id: 'cliente_cancelo',
    label: 'Cliente canceló el pedido',
    descripcion: 'El comensal desistió de la compra antes de su consumo',
  },
  {
    id: 'plato_devuelto',
    label: 'Plato o producto devuelto',
    descripcion: 'Inconformidad con el plato preparado o problema de calidad',
  },
  {
    id: 'cambio_metodo_pago',
    label: 'Cambio de método de pago o reexpedición',
    descripcion: 'Se cobró con método incorrecto y se debe rehacer la venta',
  },
  {
    id: 'pedido_duplicado',
    label: 'Pedido o cobro duplicado',
    descripcion: 'Se registró dos veces la misma comanda en mostrador o mesas',
  },
  {
    id: 'otro',
    label: 'Otro motivo específico',
    descripcion: 'Causa operativa especial justificada por escrito',
  },
];

export function getMotivoAnulacionDef(id: string): MotivoAnulacionDef | undefined {
  return CATALOGO_MOTIVOS_ANULACION.find((m) => m.id === id);
}

export function formatearMotivoAnulacion(
  motivoId?: string,
  motivoPersonalizado?: string
): string {
  if (!motivoId) return 'Anulación no especificada';
  if (motivoId === 'otro' && motivoPersonalizado && motivoPersonalizado.trim()) {
    return `Otro: ${motivoPersonalizado.trim()}`;
  }
  const def = getMotivoAnulacionDef(motivoId);
  return def ? def.label : motivoId;
}

export type FiltroEstadoVenta = 'todas' | 'completadas' | 'anuladas';

export function esVentaAnulada(venta: Pick<Venta, 'estado'>): boolean {
  return venta.estado === 'anulada';
}

export function filtrarVentasPorEstado(
  ventas: Venta[],
  filtro: FiltroEstadoVenta
): Venta[] {
  if (filtro === 'todas') return ventas;
  if (filtro === 'anuladas') {
    return ventas.filter((v) => v.estado === 'anulada');
  }
  // 'completadas': por defecto ventas sin estado explícito o con estado !== 'anulada'
  return ventas.filter((v) => v.estado !== 'anulada');
}

export interface MetricasAnulacionVentas {
  totalAnulado: number;
  cantidadAnuladas: number;
  totalValidas: number;
  cantidadValidas: number;
  tasaAnulacion: number; // Porcentaje de ventas anuladas sobre el total (0 a 100)
}

export function calcularMetricasAnulacion(ventas: Venta[]): MetricasAnulacionVentas {
  let totalAnulado = 0;
  let cantidadAnuladas = 0;
  let totalValidas = 0;
  let cantidadValidas = 0;

  for (const v of ventas) {
    const total = Number.isFinite(v.total) ? Math.max(0, v.total) : 0;
    if (v.estado === 'anulada') {
      totalAnulado += total;
      cantidadAnuladas += 1;
    } else {
      totalValidas += total;
      cantidadValidas += 1;
    }
  }

  const totalOperaciones = cantidadValidas + cantidadAnuladas;
  const tasaAnulacion = totalOperaciones > 0
    ? Number(((cantidadAnuladas / totalOperaciones) * 100).toFixed(1))
    : 0;

  return {
    totalAnulado,
    cantidadAnuladas,
    totalValidas,
    cantidadValidas,
    tasaAnulacion,
  };
}

export function validarDatosAnulacion(datos: Partial<DatosAnulacionVenta>): {
  valido: boolean;
  error?: string;
} {
  if (!datos.motivo) {
    return { valido: false, error: 'Debe seleccionar un motivo de anulación' };
  }

  if (datos.motivo === 'otro' && (!datos.motivoPersonalizado || !datos.motivoPersonalizado.trim())) {
    return { valido: false, error: 'Debe especificar el motivo personalizado de anulación' };
  }

  return { valido: true };
}
