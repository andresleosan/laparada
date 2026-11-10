import type { ItemTanda, ResumenTanda, TransferenciaTanda } from '@/types/tanda';

export interface TotalesItemCalculado {
  totalAdiciones: number;
  totalMermas: number;
  totalPuesto: number;
  sobrantes: number;
  vendidos: number;
  subtotal: number;
}

/**
 * Calcula los totales consolidados para un ítem individual de una tanda
 */
export function calcularTotalesItem(item: ItemTanda): TotalesItemCalculado {
  const totalAdiciones = (item.adiciones || []).reduce((acc, a) => acc + (a.cantidad || 0), 0);
  const totalMermas = (item.mermas || []).reduce((acc, m) => acc + (m.cantidad || 0), 0);
  const totalPuesto = Math.max(0, (item.cantidadInicial || 0) + totalAdiciones);
  const sobrantes = Math.max(0, item.sobrantes ?? 0);

  // Unidades vendidas no pueden ser menores a 0
  const vendidos = Math.max(0, totalPuesto - totalMermas - sobrantes);
  const subtotal = Math.round(vendidos * (item.precioUnitario || 0));

  return {
    totalAdiciones,
    totalMermas,
    totalPuesto,
    sobrantes,
    vendidos,
    subtotal,
  };
}

/**
 * Calcula el resumen consolidado de toda la tanda
 */
export function calcularResumenTanda(
  items: ItemTanda[],
  transferencias: TransferenciaTanda[] = []
): ResumenTanda {
  let totalInicial = 0;
  let totalAdiciones = 0;
  let totalMermas = 0;
  let totalSobrantes = 0;
  let totalVendidos = 0;
  let totalVentaEstimada = 0;

  for (const item of items) {
    const calc = calcularTotalesItem(item);
    totalInicial += item.cantidadInicial || 0;
    totalAdiciones += calc.totalAdiciones;
    totalMermas += calc.totalMermas;
    totalSobrantes += calc.sobrantes;
    totalVendidos += calc.vendidos;
    totalVentaEstimada += calc.subtotal;
  }

  const totalTransferencias = transferencias.reduce((acc, t) => acc + (t.monto || 0), 0);
  const totalEfectivoEsperado = Math.max(0, totalVentaEstimada - totalTransferencias);

  return {
    totalInicial,
    totalAdiciones,
    totalMermas,
    totalSobrantes,
    totalVendidos,
    totalVentaEstimada,
    totalTransferencias,
    totalEfectivoEsperado,
  };
}
