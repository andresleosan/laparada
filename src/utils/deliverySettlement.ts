import type { Domicilio } from '@/types';

export interface LiquidacionRepartidor {
  totalEntregas: number;
  totalEfectivo: number;
  totalTransferencia: number;
  granTotal: number;
  entregas: Domicilio[];
}

/**
 * Calcula la liquidación del turno para un repartidor (o todos) basada en los domicilios
 * entregados en la jornada.
 */
export function calcularLiquidacionRepartidor(
  domiciliosEntregados: Domicilio[],
  domiciliarioId?: string
): LiquidacionRepartidor {
  const filtrados = (domiciliosEntregados || []).filter((d) => {
    if (d.estado !== 'entregado') return false;
    if (domiciliarioId && d.domiciliarioId && d.domiciliarioId !== domiciliarioId) {
      return false;
    }
    return true;
  });

  let totalEfectivo = 0;
  let totalTransferencia = 0;

  for (const dom of filtrados) {
    const monto = Math.max(0, Math.round(Number.isFinite(dom.total) ? dom.total : 0));
    if (dom.metodoPago === 'transferencia') {
      totalTransferencia += monto;
    } else {
      totalEfectivo += monto;
    }
  }

  return {
    totalEntregas: filtrados.length,
    totalEfectivo,
    totalTransferencia,
    granTotal: totalEfectivo + totalTransferencia,
    entregas: filtrados,
  };
}
