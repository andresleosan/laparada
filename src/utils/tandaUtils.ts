import type {
  AnaliticaTandasConsolidada,
  ItemTanda,
  MetricaProductoVitrina,
  ResumenTanda,
  SaludMermaVitrina,
  TandaVitrina,
  TransferenciaTanda,
} from '@/types/tanda';
import { toValidAdminDate } from './adminAnalytics';
import { descargarArchivoCsv } from './contabilidadUtils';
import { formatFecha, formatHora } from './dateUtils';
import { formatCOP } from './formatCOP';

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

function redondear1Decimal(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.round(valor * 10) / 10;
}

function evaluarSaludMerma(tasaMermaPct: number): SaludMermaVitrina {
  if (tasaMermaPct <= 3) return 'optima';
  if (tasaMermaPct <= 7) return 'atencion';
  return 'critica';
}

function escapeCsv(valor: string | number | undefined | null): string {
  const texto = String(valor ?? '');
  return `"${texto.replace(/"/g, '""')}"`;
}

interface AcumuladorProductoVitrina {
  productoId: string;
  nombre: string;
  categoria?: string;
  tandasIds: Set<string>;
  sumaPrecios: number;
  registrosPrecio: number;
  totalInicial: number;
  totalAdiciones: number;
  totalPuesto: number;
  totalVendidos: number;
  totalMermas: number;
  totalSobrantes: number;
  ingresosBrutos: number;
  costoMermaEstimado: number;
}

/**
 * Calcula la analítica consolidada de un listado de tandas de vitrina y ranking de rentabilidad por producto
 */
export function calcularAnaliticaTandas(tandas: TandaVitrina[]): AnaliticaTandasConsolidada {
  const tandasCerradas = tandas.filter((t) => t.estado === 'cerrada');
  const cantidadTandasCerradas = tandasCerradas.length;
  const cantidadTandasAbiertas = tandas.filter((t) => t.estado === 'abierta').length;

  let totalUnidadesPuestas = 0;
  let totalUnidadesVendidas = 0;
  let totalUnidadesMerma = 0;
  let totalUnidadesSobrantes = 0;
  let ingresosTotalesVitrina = 0;
  let totalTransferenciasVitrina = 0;
  let totalEfectivoVitrina = 0;
  let valorComercialMerma = 0;

  const productosMap = new Map<string, AcumuladorProductoVitrina>();

  for (const tanda of tandasCerradas) {
    const items = tanda.items || [];
    const resumenTanda = tanda.resumen ?? calcularResumenTanda(items, tanda.transferencias || []);

    totalTransferenciasVitrina += Math.max(0, resumenTanda.totalTransferencias || 0);
    totalEfectivoVitrina += Math.max(0, resumenTanda.totalEfectivoEsperado || 0);

    for (const item of items) {
      const calc = calcularTotalesItem(item);
      const precio = Math.max(0, item.precioUnitario || 0);
      const costoMermaItem = Math.round(calc.totalMermas * precio);

      totalUnidadesPuestas += calc.totalPuesto;
      totalUnidadesVendidas += calc.vendidos;
      totalUnidadesMerma += calc.totalMermas;
      totalUnidadesSobrantes += calc.sobrantes;
      ingresosTotalesVitrina += calc.subtotal;
      valorComercialMerma += costoMermaItem;

      const existente = productosMap.get(item.productoId);
      if (existente) {
        existente.tandasIds.add(tanda.id);
        existente.sumaPrecios += precio;
        existente.registrosPrecio += 1;
        if (!existente.categoria && item.categoria) existente.categoria = item.categoria;
        existente.totalInicial += Math.max(0, item.cantidadInicial || 0);
        existente.totalAdiciones += calc.totalAdiciones;
        existente.totalPuesto += calc.totalPuesto;
        existente.totalVendidos += calc.vendidos;
        existente.totalMermas += calc.totalMermas;
        existente.totalSobrantes += calc.sobrantes;
        existente.ingresosBrutos += calc.subtotal;
        existente.costoMermaEstimado += costoMermaItem;
      } else {
        productosMap.set(item.productoId, {
          productoId: item.productoId,
          nombre: item.nombre,
          categoria: item.categoria || undefined,
          tandasIds: new Set([tanda.id]),
          sumaPrecios: precio,
          registrosPrecio: 1,
          totalInicial: Math.max(0, item.cantidadInicial || 0),
          totalAdiciones: calc.totalAdiciones,
          totalPuesto: calc.totalPuesto,
          totalVendidos: calc.vendidos,
          totalMermas: calc.totalMermas,
          totalSobrantes: calc.sobrantes,
          ingresosBrutos: calc.subtotal,
          costoMermaEstimado: costoMermaItem,
        });
      }
    }
  }

  const rankingProductos: MetricaProductoVitrina[] = Array.from(productosMap.values())
    .map((acc) => {
      const precioUnitarioPromedio =
        acc.registrosPrecio > 0 ? Math.round(acc.sumaPrecios / acc.registrosPrecio) : 0;
      const tasaRotacionPct =
        acc.totalPuesto > 0 ? redondear1Decimal((acc.totalVendidos / acc.totalPuesto) * 100) : 0;
      const tasaMermaPct =
        acc.totalPuesto > 0 ? redondear1Decimal((acc.totalMermas / acc.totalPuesto) * 100) : 0;
      const tasaSobrantePct =
        acc.totalPuesto > 0 ? redondear1Decimal((acc.totalSobrantes / acc.totalPuesto) * 100) : 0;
      const participacionIngresosPct =
        ingresosTotalesVitrina > 0
          ? redondear1Decimal((acc.ingresosBrutos / ingresosTotalesVitrina) * 100)
          : 0;

      return {
        productoId: acc.productoId,
        nombre: acc.nombre,
        categoria: acc.categoria,
        precioUnitarioPromedio,
        tandasParticipadas: acc.tandasIds.size,
        totalInicial: acc.totalInicial,
        totalAdiciones: acc.totalAdiciones,
        totalPuesto: acc.totalPuesto,
        totalVendidos: acc.totalVendidos,
        totalMermas: acc.totalMermas,
        totalSobrantes: acc.totalSobrantes,
        ingresosBrutos: acc.ingresosBrutos,
        costoMermaEstimado: acc.costoMermaEstimado,
        tasaRotacionPct,
        tasaMermaPct,
        tasaSobrantePct,
        participacionIngresosPct,
      };
    })
    .sort(
      (a, b) =>
        b.ingresosBrutos - a.ingresosBrutos ||
        b.totalVendidos - a.totalVendidos ||
        a.nombre.localeCompare(b.nombre, 'es-CO')
    );

  const topProductosRentables = rankingProductos.filter((p) => p.totalVendidos > 0).slice(0, 5);
  const productosMayorMerma = [...rankingProductos]
    .filter((p) => p.totalMermas > 0)
    .sort(
      (a, b) =>
        b.totalMermas - a.totalMermas ||
        b.costoMermaEstimado - a.costoMermaEstimado ||
        b.tasaMermaPct - a.tasaMermaPct
    );

  const tasaRotacionGlobalPct =
    totalUnidadesPuestas > 0
      ? redondear1Decimal((totalUnidadesVendidas / totalUnidadesPuestas) * 100)
      : 0;
  const tasaMermaGlobalPct =
    totalUnidadesPuestas > 0
      ? redondear1Decimal((totalUnidadesMerma / totalUnidadesPuestas) * 100)
      : 0;
  const tasaSobranteGlobalPct =
    totalUnidadesPuestas > 0
      ? redondear1Decimal((totalUnidadesSobrantes / totalUnidadesPuestas) * 100)
      : 0;
  const ticketPromedioPorTanda =
    cantidadTandasCerradas > 0 ? Math.round(ingresosTotalesVitrina / cantidadTandasCerradas) : 0;

  return {
    cantidadTandasCerradas,
    cantidadTandasAbiertas,
    totalUnidadesPuestas,
    totalUnidadesVendidas,
    totalUnidadesMerma,
    totalUnidadesSobrantes,
    ingresosTotalesVitrina,
    totalTransferenciasVitrina,
    totalEfectivoVitrina,
    valorComercialMerma,
    ticketPromedioPorTanda,
    tasaRotacionGlobalPct,
    tasaMermaGlobalPct,
    tasaSobranteGlobalPct,
    saludMerma: evaluarSaludMerma(tasaMermaGlobalPct),
    rankingProductos,
    topProductosRentables,
    productosMayorMerma,
  };
}

/**
 * Genera un resumen legible para compartir por WhatsApp el acta de cierre de una tanda
 */
export function generarResumenTandaWhatsApp(
  tanda: TandaVitrina,
  nombreNegocio = 'La Parada'
): string {
  const fechaApertura = toValidAdminDate(tanda.fecha);
  const fechaCierre = toValidAdminDate(tanda.fechaCierre);
  const resumen = tanda.resumen ?? calcularResumenTanda(tanda.items || [], tanda.transferencias || []);

  const lineas: string[] = [
    `🥐 *ACTA DE CIERRE DE VITRINA — ${nombreNegocio.toUpperCase()}*`,
    `🆔 Tanda: ${tanda.id}`,
    `📅 Apertura: ${fechaApertura ? `${formatFecha(fechaApertura)} ${formatHora(fechaApertura)}` : 'N/A'}`,
  ];

  if (fechaCierre) {
    lineas.push(`🏁 Cierre: ${formatFecha(fechaCierre)} ${formatHora(fechaCierre)}`);
  }
  if (tanda.responsable) {
    lineas.push(`👤 Responsable: ${tanda.responsable}`);
  }

  lineas.push(
    '',
    '📦 *BALANCE DE UNIDADES*',
    `• Puestas en vitrina: ${resumen.totalInicial + resumen.totalAdiciones} unds (${resumen.totalInicial} ini + ${resumen.totalAdiciones} recargas)`,
    `• Vendidas: ${resumen.totalVendidos} unds`,
    `• Mermas: ${resumen.totalMermas} unds`,
    `• Sobrantes: ${resumen.totalSobrantes} unds`,
    '',
    '🧾 *DETALLE POR PRODUCTO*'
  );

  for (const item of tanda.items || []) {
    const calc = calcularTotalesItem(item);
    const detallesExtra: string[] = [];
    if (calc.totalMermas > 0) detallesExtra.push(`merma ${calc.totalMermas}`);
    if (calc.sobrantes > 0) detallesExtra.push(`sobró ${calc.sobrantes}`);
    const extraTxt = detallesExtra.length > 0 ? ` [${detallesExtra.join(', ')}]` : '';
    lineas.push(
      `- ${item.nombre}: ${calc.vendidos}/${calc.totalPuesto} unds${extraTxt} → ${formatCOP(calc.subtotal)}`
    );
  }

  lineas.push(
    '',
    '💰 *CUADRE FINANCIERO*',
    `• Venta Total Vitrina: ${formatCOP(resumen.totalVentaEstimada)}`,
    `• Transferencias: ${formatCOP(resumen.totalTransferencias)}`,
    `• Efectivo Esperado en Caja: *${formatCOP(resumen.totalEfectivoEsperado)}*`
  );

  if (tanda.notasCierre) {
    lineas.push('', `📝 Notas: ${tanda.notasCierre}`);
  }

  return lineas.join('\n');
}

/**
 * Genera el contenido CSV (UTF-8 con BOM) con el historial de tandas cerradas y rentabilidad por producto
 */
export function generarHistorialTandasCsv(
  tandas: TandaVitrina[],
  nombreNegocio = 'La Parada'
): string {
  const analitica = calcularAnaliticaTandas(tandas);
  const tandasCerradas = tandas.filter((t) => t.estado === 'cerrada');

  const lineas: string[] = [
    [
      escapeCsv('REPORTE HISTÓRICO Y RENTABILIDAD DE TANDAS DE VITRINA'),
      escapeCsv(nombreNegocio),
      escapeCsv(`Generado: ${new Date().toLocaleString('es-CO')}`),
    ].join(','),
    '',
    [
      escapeCsv('RESUMEN CONSOLIDADO'),
      escapeCsv('Tandas Cerradas'),
      escapeCsv('Unidades Puestas'),
      escapeCsv('Unidades Vendidas'),
      escapeCsv('Mermas (unds)'),
      escapeCsv('Sobrantes (unds)'),
      escapeCsv('Rotación Global (%)'),
      escapeCsv('Merma Global (%)'),
      escapeCsv('Venta Total Vitrina (COP)'),
      escapeCsv('Transferencias (COP)'),
      escapeCsv('Efectivo Esperado (COP)'),
      escapeCsv('Valor Comercial Merma (COP)'),
    ].join(','),
    [
      escapeCsv(nombreNegocio),
      String(analitica.cantidadTandasCerradas),
      String(analitica.totalUnidadesPuestas),
      String(analitica.totalUnidadesVendidas),
      String(analitica.totalUnidadesMerma),
      String(analitica.totalUnidadesSobrantes),
      String(analitica.tasaRotacionGlobalPct),
      String(analitica.tasaMermaGlobalPct),
      String(analitica.ingresosTotalesVitrina),
      String(analitica.totalTransferenciasVitrina),
      String(analitica.totalEfectivoVitrina),
      String(analitica.valorComercialMerma),
    ].join(','),
    '',
    escapeCsv('HISTORIAL DE TANDAS CERRADAS'),
    [
      'ID Tanda',
      'Fecha Apertura',
      'Hora Apertura',
      'Fecha Cierre',
      'Hora Cierre',
      'Responsable',
      'Cant. Productos',
      'Puestas',
      'Vendidas',
      'Mermas',
      'Sobrantes',
      'Rotación (%)',
      'Venta Total (COP)',
      'Transferencias (COP)',
      'Efectivo Esperado (COP)',
      'Notas Cierre',
    ]
      .map(escapeCsv)
      .join(','),
  ];

  for (const tanda of tandasCerradas) {
    const apertura = toValidAdminDate(tanda.fecha);
    const cierre = toValidAdminDate(tanda.fechaCierre);
    const resumen = tanda.resumen ?? calcularResumenTanda(tanda.items || [], tanda.transferencias || []);
    const totalPuestas = resumen.totalInicial + resumen.totalAdiciones;
    const rotacion =
      totalPuestas > 0 ? redondear1Decimal((resumen.totalVendidos / totalPuestas) * 100) : 0;

    lineas.push(
      [
        escapeCsv(tanda.id),
        escapeCsv(apertura ? apertura.toLocaleDateString('es-CO') : ''),
        escapeCsv(apertura ? formatHora(apertura) : ''),
        escapeCsv(cierre ? cierre.toLocaleDateString('es-CO') : ''),
        escapeCsv(cierre ? formatHora(cierre) : ''),
        escapeCsv(tanda.responsable || 'Sin asignar'),
        String((tanda.items || []).length),
        String(totalPuestas),
        String(resumen.totalVendidos),
        String(resumen.totalMermas),
        String(resumen.totalSobrantes),
        String(rotacion),
        String(resumen.totalVentaEstimada),
        String(resumen.totalTransferencias),
        String(resumen.totalEfectivoEsperado),
        escapeCsv(tanda.notasCierre || ''),
      ].join(',')
    );
  }

  lineas.push(
    '',
    escapeCsv('RENTABILIDAD Y ROTACIÓN POR PRODUCTO DE VITRINA'),
    [
      'Producto',
      'Categoría',
      'Tandas',
      'Precio Promedio (COP)',
      'Inicial',
      'Recargas',
      'Total Puesto',
      'Vendidos',
      'Mermas',
      'Sobrantes',
      'Rotación (%)',
      'Merma (%)',
      'Ingresos Brutos (COP)',
      'Valor Comercial Merma (COP)',
      'Participación Ingresos (%)',
    ]
      .map(escapeCsv)
      .join(',')
  );

  for (const prod of analitica.rankingProductos) {
    lineas.push(
      [
        escapeCsv(prod.nombre),
        escapeCsv(prod.categoria || 'General'),
        String(prod.tandasParticipadas),
        String(prod.precioUnitarioPromedio),
        String(prod.totalInicial),
        String(prod.totalAdiciones),
        String(prod.totalPuesto),
        String(prod.totalVendidos),
        String(prod.totalMermas),
        String(prod.totalSobrantes),
        String(prod.tasaRotacionPct),
        String(prod.tasaMermaPct),
        String(prod.ingresosBrutos),
        String(prod.costoMermaEstimado),
        String(prod.participacionIngresosPct),
      ].join(',')
    );
  }

  return '\uFEFF' + lineas.join('\r\n');
}

/**
 * Descarga el reporte histórico y de rentabilidad de tandas en formato Excel CSV
 */
export function descargarHistorialTandasCsv(
  tandas: TandaVitrina[],
  nombreNegocio = 'La Parada'
): void {
  const contenido = generarHistorialTandasCsv(tandas, nombreNegocio);
  const fechaIso = new Date().toISOString().split('T')[0];
  const safeNegocio = (nombreNegocio || 'negocio')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');
  descargarArchivoCsv(contenido, `tandas_vitrina_${safeNegocio}_${fechaIso}.csv`);
}
