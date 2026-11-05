// src/utils/analiticaFinancieraUtils.ts
import type {
  Combo,
  EstadoResultadosPL,
  Gasto,
  Insumo,
  InsumoConsumoCMV,
  MovimientoKardex,
  Producto,
  RangoFechaReporte,
  SaludFinancieraPyg,
  TipoPeriodoReporte,
  Venta,
} from '@/types';
import { calcularConsumoInsumos } from './recetasEscandallo';
import { calcularCostosUnitariosRecientes, determinarTipoMovimiento } from './kardexInventarioUtils';

function safeNumber(val: unknown): number {
  const num = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Nombres de meses en español para etiquetas de períodos
 */
const MESES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Genera el rango de fechas con límites de inicio y fin para el período seleccionado
 */
export function obtenerRangoFechaReporte(
  tipo: TipoPeriodoReporte,
  customInicio?: Date,
  customFin?: Date,
  ahora = new Date()
): RangoFechaReporte {
  const y = ahora.getFullYear();
  const m = ahora.getMonth();
  const d = ahora.getDate();

  switch (tipo) {
    case 'hoy': {
      const inicio = new Date(y, m, d, 0, 0, 0, 0);
      const fin = new Date(y, m, d, 23, 59, 59, 999);
      const etiqueta = `Hoy (${String(d).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${y})`;
      return { tipo, inicio, fin, etiqueta };
    }

    case '7dias': {
      const fin = new Date(y, m, d, 23, 59, 59, 999);
      const inicio = new Date(fin);
      inicio.setDate(inicio.getDate() - 6);
      inicio.setHours(0, 0, 0, 0);
      const etiqueta = 'Últimos 7 días';
      return { tipo, inicio, fin, etiqueta };
    }

    case '30dias': {
      const fin = new Date(y, m, d, 23, 59, 59, 999);
      const inicio = new Date(fin);
      inicio.setDate(inicio.getDate() - 29);
      inicio.setHours(0, 0, 0, 0);
      const etiqueta = 'Últimos 30 días';
      return { tipo, inicio, fin, etiqueta };
    }

    case 'mes_actual': {
      const inicio = new Date(y, m, 1, 0, 0, 0, 0);
      const fin = new Date(y, m + 1, 0, 23, 59, 59, 999);
      const etiqueta = `Este Mes (${MESES_ES[m]} ${y})`;
      return { tipo, inicio, fin, etiqueta };
    }

    case 'mes_anterior': {
      const mesAnt = m === 0 ? 11 : m - 1;
      const anioAnt = m === 0 ? y - 1 : y;
      const inicio = new Date(anioAnt, mesAnt, 1, 0, 0, 0, 0);
      const fin = new Date(anioAnt, mesAnt + 1, 0, 23, 59, 59, 999);
      const etiqueta = `Mes Anterior (${MESES_ES[mesAnt]} ${anioAnt})`;
      return { tipo, inicio, fin, etiqueta };
    }

    case 'personalizado': {
      const inicio = customInicio ? new Date(customInicio) : new Date(y, m, d, 0, 0, 0, 0);
      inicio.setHours(0, 0, 0, 0);
      const fin = customFin ? new Date(customFin) : new Date(y, m, d, 23, 59, 59, 999);
      fin.setHours(23, 59, 59, 999);
      const etiqueta = `Personalizado (${inicio.toLocaleDateString('es-CO')} - ${fin.toLocaleDateString('es-CO')})`;
      return { tipo, inicio, fin, etiqueta };
    }
  }
}

export interface CalcularPLParams {
  ventas: Venta[];
  gastos: Gasto[];
  movimientosKardex: MovimientoKardex[];
  productos: Producto[];
  combos: Combo[];
  insumos: Insumo[];
  periodo: RangoFechaReporte;
}

/**
 * Calcula el Estado de Resultados (P&L Gastronómico) consolidado con precisión contable
 */
export function calcularEstadoResultados(params: CalcularPLParams): EstadoResultadosPL {
  const {
    ventas,
    gastos,
    movimientosKardex,
    productos,
    combos,
    insumos,
    periodo,
  } = params;

  // 1. Filtrar ventas válidas y anuladas
  const ventasValidas = ventas.filter((v) => v.estado !== 'anulada');
  const ventasAnuladas = ventas.filter((v) => v.estado === 'anulada');

  let ventasBrutasAcum = 0;
  let descuentosConcedidos = 0;
  let propinasRecaudadas = 0;
  let ventasAnuladasMonto = 0;

  const canales = { pos: 0, domicilios: 0, mesas: 0, otros: 0 };
  const metodosPago = { efectivo: 0, transferencia: 0, otros: 0 };

  for (const venta of ventasValidas) {
    const totalVenta = safeNumber(venta.total);
    const desc = safeNumber(venta.descuento);
    const prop = safeNumber(venta.propina);
    
    // Si la venta tiene subtotal registrado, se usa como venta bruta base;
    // de lo contrario, se reconstruye: total + descuento - propina.
    const bruta = typeof venta.subtotal === 'number' && venta.subtotal > 0
      ? venta.subtotal
      : Math.max(0, totalVenta + desc - prop);

    ventasBrutasAcum += bruta;
    descuentosConcedidos += desc;
    propinasRecaudadas += prop;

    // Clasificación por canal
    const origenStr = String(venta.origen || '');
    const esMesa = Boolean(venta.mesaNombre || venta.cuentaMesaId || origenStr === 'salon');
    const esDomicilio = Boolean(
      origenStr === 'whatsapp' ||
      origenStr === 'web' ||
      origenStr === 'tienda_web' ||
      origenStr === 'storefront' ||
      venta.tipoEntrega === 'domicilio'
    );
    const esPos = Boolean(
      venta.origen === 'pos' ||
      (!esMesa && !esDomicilio)
    );

    if (esMesa) {
      canales.mesas += totalVenta;
    } else if (esDomicilio) {
      canales.domicilios += totalVenta;
    } else if (esPos) {
      canales.pos += totalVenta;
    } else {
      canales.otros += totalVenta;
    }

    // Clasificación por método de pago
    if (venta.metodoPago === 'efectivo') {
      metodosPago.efectivo += totalVenta;
    } else if (venta.metodoPago === 'transferencia') {
      metodosPago.transferencia += totalVenta;
    } else {
      metodosPago.otros += totalVenta;
    }
  }

  for (const venta of ventasAnuladas) {
    ventasAnuladasMonto += safeNumber(venta.total);
  }

  const ventasBrutas = Math.round(ventasBrutasAcum);
  descuentosConcedidos = Math.round(descuentosConcedidos);
  const ventasNetas = Math.max(0, ventasBrutas - descuentosConcedidos);
  propinasRecaudadas = Math.round(propinasRecaudadas);
  ventasAnuladasMonto = Math.round(ventasAnuladasMonto);
  const cantidadVentasValidas = ventasValidas.length;
  const cantidadVentasAnuladas = ventasAnuladas.length;
  const ticketPromedio = cantidadVentasValidas > 0 ? Math.round(ventasNetas / cantidadVentasValidas) : 0;

  // 2. Costo de Mercancía Vendida (CMV / Food Cost)
  // Obtenemos mapa de costos unitarios de insumos
  const costosUnitariosKardex = calcularCostosUnitariosRecientes(movimientosKardex);
  const insumosMap = new Map<string, Insumo>();
  insumos.forEach((ins) => insumosMap.set(ins.id, ins));

  const getCostoUnitario = (insumoId: string): number => {
    if (typeof costosUnitariosKardex[insumoId] === 'number' && costosUnitariosKardex[insumoId] > 0) {
      return costosUnitariosKardex[insumoId];
    }
    const ins = insumosMap.get(insumoId);
    if (ins && typeof ins.costoUnitario === 'number' && ins.costoUnitario > 0) {
      return ins.costoUnitario;
    }
    return 0;
  };

  // Consolidar todos los ítems vendidos en ventas válidas
  const todosLosItems = ventasValidas.flatMap((v) => v.items || []);
  const consumosCalculados = calcularConsumoInsumos(todosLosItems, productos, combos);

  let cmvInsumosTotal = 0;
  const insumosClaveCMV: InsumoConsumoCMV[] = [];

  for (const consumo of consumosCalculados) {
    const costoUnit = getCostoUnitario(consumo.insumoId);
    const costoTotalInsumo = Math.round(consumo.cantidadTotal * costoUnit);
    cmvInsumosTotal += costoTotalInsumo;

    const ins = insumosMap.get(consumo.insumoId);
    const unidad = consumo.unidadSnapshot || ins?.unidad || 'unidad';

    insumosClaveCMV.push({
      insumoId: consumo.insumoId,
      nombre: consumo.nombreSnapshot || ins?.nombre || 'Insumo',
      unidad,
      cantidadConsumida: consumo.cantidadTotal,
      costoUnitarioEstimado: costoUnit,
      costoTotalCOP: costoTotalInsumo,
      porcentajeCMV: 0, // Se computa luego con el total de CMV
    });
  }

  // Ordenar insumos por mayor costo de consumo
  insumosClaveCMV.sort((a, b) => b.costoTotalCOP - a.costoTotalCOP);
  if (cmvInsumosTotal > 0) {
    for (const item of insumosClaveCMV) {
      item.porcentajeCMV = Number(((item.costoTotalCOP / cmvInsumosTotal) * 100).toFixed(1));
    }
  }

  const cmvInsumos = Math.round(cmvInsumosTotal);
  const porcentajeCMV = ventasNetas > 0 ? Number(((cmvInsumos / ventasNetas) * 100).toFixed(1)) : 0;

  // 3. Utilidad Bruta
  const utilidadBruta = ventasNetas - cmvInsumos;
  const margenBruto = ventasNetas > 0 ? Number(((utilidadBruta / ventasNetas) * 100).toFixed(1)) : 0;

  // 4. Mermas y Desperdicios
  let totalMermasCOP = 0;
  let cantidadMermas = 0;
  const mermasPorMotivo: Record<string, number> = {};

  for (const mov of movimientosKardex) {
    const tipo = determinarTipoMovimiento(mov);
    if (tipo === 'merma') {
      cantidadMermas += 1;
      const cantAbs = Math.abs(safeNumber(mov.cantidad));
      const costoKardex = safeNumber(mov.costo);
      const costoEstimado = costoKardex > 0
        ? costoKardex
        : Math.round(cantAbs * getCostoUnitario(mov.insumoId));
      
      totalMermasCOP += costoEstimado;
      const motivoKey = (mov.motivo || 'otro').toLowerCase();
      mermasPorMotivo[motivoKey] = (mermasPorMotivo[motivoKey] || 0) + costoEstimado;
    }
  }

  totalMermasCOP = Math.round(totalMermasCOP);
  const porcentajeMermas = ventasNetas > 0 ? Number(((totalMermasCOP / ventasNetas) * 100).toFixed(1)) : 0;

  // 5. Gastos Operativos (OPEX)
  let totalGastosOperativos = 0;
  const gastosPorCategoria: Record<string, number> = {};

  for (const gasto of gastos) {
    const monto = safeNumber(gasto.monto);
    if (monto <= 0) continue;
    totalGastosOperativos += monto;
    const cat = (gasto.categoria || 'otros').toLowerCase().trim();
    gastosPorCategoria[cat] = (gastosPorCategoria[cat] || 0) + monto;
  }

  totalGastosOperativos = Math.round(totalGastosOperativos);
  const porcentajeGastos = ventasNetas > 0 ? Number(((totalGastosOperativos / ventasNetas) * 100).toFixed(1)) : 0;

  // 6. Utilidad Neta
  const utilidadNeta = utilidadBruta - totalMermasCOP - totalGastosOperativos;
  const margenNeto = ventasNetas > 0 ? Number(((utilidadNeta / ventasNetas) * 100).toFixed(1)) : 0;

  // Salud Financiera
  let saludFinanciera: SaludFinancieraPyg;
  let recomendacionOperativa: string;

  if (ventasNetas === 0) {
    saludFinanciera = 'atencion';
    recomendacionOperativa = 'Sin ventas netas registradas en el período seleccionado. Ingresa pedidos en POS o Domicilios.';
  } else if (margenNeto >= 20) {
    saludFinanciera = 'excelente';
    recomendacionOperativa = 'Margen neto óptimo (>20%). El balance entre precios de venta, costos de recetas y gastos operativos es excelente.';
  } else if (margenNeto >= 10) {
    saludFinanciera = 'saludable';
    recomendacionOperativa = 'Margen neto saludable (10% - 20%). Monitorea las mermas de insumos críticos para maximizar rentabilidad.';
  } else if (margenNeto >= 0) {
    saludFinanciera = 'atencion';
    recomendacionOperativa = 'Margen neto ajustado (<10%). La operación está cerca del equilibrio. Revisa el % de CMV de tus platos principales.';
  } else {
    saludFinanciera = 'critica';
    recomendacionOperativa = 'Operación en déficit en este período. El costo de insumos y los gastos superaron los ingresos netos. Auditoría urgente recomendada.';
  }

  return {
    periodo,
    ventasBrutas,
    descuentosConcedidos,
    ventasNetas,
    propinasRecaudadas,
    ventasAnuladasMonto,
    cantidadVentasValidas,
    cantidadVentasAnuladas,
    ticketPromedio,
    canales,
    metodosPago,
    cmvInsumos,
    porcentajeCMV,
    insumosClaveCMV,
    utilidadBruta,
    margenBruto,
    totalMermasCOP,
    porcentajeMermas,
    cantidadMermas,
    mermasPorMotivo,
    totalGastosOperativos,
    porcentajeGastos,
    cantidadGastos: gastos.length,
    gastosPorCategoria,
    utilidadNeta,
    margenNeto,
    saludFinanciera,
    recomendacionOperativa,
  };
}

/**
 * Genera el archivo CSV con UTF-8 BOM estructurado como Estado de Resultados oficial
 */
export function generarReporteContablePLCSV(
  pl: EstadoResultadosPL,
  negocioNombre: string
): string {
  const lineas: string[] = [];

  const esc = (texto: string | number) => {
    const str = String(texto ?? '').replace(/"/g, '""');
    return `"${str}"`;
  };

  // Encabezado institucional
  lineas.push(`"ESTADO DE RESULTADOS (P&L) - ${negocioNombre.toUpperCase()}"`);
  lineas.push(`"Período:",${esc(pl.periodo.etiqueta)}`);
  lineas.push(`"Desde:",${esc(pl.periodo.inicio.toLocaleDateString('es-CO'))},"Hasta:",${esc(pl.periodo.fin.toLocaleDateString('es-CO'))}`);
  lineas.push(`"Generado:",${esc(new Date().toLocaleString('es-CO'))}`);
  lineas.push('');

  // 1. Ingresos
  lineas.push('"1. INGRESOS OPERACIONALES","MONTO (COP)","% SOBRE VENTAS NETAS"');
  lineas.push(`"Ventas Brutas",${pl.ventasBrutas},${pl.ventasNetas > 0 ? ((pl.ventasBrutas / pl.ventasNetas) * 100).toFixed(1) + '%' : '100.0%'}`);
  lineas.push(`"(-) Descuentos Comerciales y Cortesías",-${pl.descuentosConcedidos},${pl.ventasNetas > 0 ? ((pl.descuentosConcedidos / pl.ventasNetas) * 100).toFixed(1) + '%' : '0.0%'}`);
  lineas.push(`"(=) VENTAS NETAS",${pl.ventasNetas},"100.0%"`);
  lineas.push(`"Cantidad de Ventas Realizadas",${pl.cantidadVentasValidas},""`);
  lineas.push(`"Ticket Promedio de Consumo",${pl.ticketPromedio},""`);
  lineas.push('');

  // Desglose Canales
  lineas.push('"INGRESOS POR CANAL DE VENTA","MONTO (COP)","PARTICIPACIÓN"');
  lineas.push(`"Punto de Venta / Mostrador (POS)",${pl.canales.pos},${pl.ventasNetas > 0 ? ((pl.canales.pos / pl.ventasNetas) * 100).toFixed(1) + '%' : '0.0%'}`);
  lineas.push(`"Domicilios (WhatsApp / Storefront Web)",${pl.canales.domicilios},${pl.ventasNetas > 0 ? ((pl.canales.domicilios / pl.ventasNetas) * 100).toFixed(1) + '%' : '0.0%'}`);
  lineas.push(`"Salón / Mesas",${pl.canales.mesas},${pl.ventasNetas > 0 ? ((pl.canales.mesas / pl.ventasNetas) * 100).toFixed(1) + '%' : '0.0%'}`);
  if (pl.canales.otros > 0) {
    lineas.push(`"Otros Canales",${pl.canales.otros},${pl.ventasNetas > 0 ? ((pl.canales.otros / pl.ventasNetas) * 100).toFixed(1) + '%' : '0.0%'}`);
  }
  lineas.push('');

  // Desglose Métodos de Pago
  lineas.push('"MÉTODOS DE PAGO OFFLINE","MONTO (COP)","PARTICIPACIÓN"');
  lineas.push(`"Efectivo",${pl.metodosPago.efectivo},${pl.ventasNetas > 0 ? ((pl.metodosPago.efectivo / pl.ventasNetas) * 100).toFixed(1) + '%' : '0.0%'}`);
  lineas.push(`"Transferencia",${pl.metodosPago.transferencia},${pl.metodosPago.transferencia > 0 && pl.ventasNetas > 0 ? ((pl.metodosPago.transferencia / pl.ventasNetas) * 100).toFixed(1) + '%' : '0.0%'}`);
  lineas.push('');

  // 2. Costo de Ventas (CMV)
  lineas.push('"2. COSTO DE MERCANCÍA VENDIDA (CMV / FOOD COST)","MONTO (COP)","% SOBRE VENTAS NETAS"');
  lineas.push(`"Costo de Insumos y Materias Primas Consumidas",${pl.cmvInsumos},"${pl.porcentajeCMV}%"`);
  lineas.push('');

  // Insumos Clave
  if (pl.insumosClaveCMV.length > 0) {
    lineas.push('"INSUMO CONSUMIDO","CANTIDAD TOTAL","UNIDAD","COSTO UNITARIO EST.","COSTO TOTAL (COP)","% DEL CMV"');
    for (const item of pl.insumosClaveCMV) {
      lineas.push(`${esc(item.nombre)},${item.cantidadConsumida},${esc(item.unidad)},${item.costoUnitarioEstimado},${item.costoTotalCOP},"${item.porcentajeCMV}%"`);
    }
    lineas.push('');
  }

  // 3. Utilidad Bruta
  lineas.push('"3. UTILIDAD BRUTA OPERACIONAL","MONTO (COP)","MARGEN BRUTO"');
  lineas.push(`"(=) UTILIDAD BRUTA (Ventas Netas - CMV)",${pl.utilidadBruta},"${pl.margenBruto}%"`);
  lineas.push('');

  // 4. Mermas y Desperdicios
  lineas.push('"4. MERMAS Y DESPERDICIOS DE INVENTARIO","MONTO (COP)","% SOBRE VENTAS NETAS"');
  lineas.push(`"Total Mermas Registradas",${pl.totalMermasCOP},"${pl.porcentajeMermas}%"`);
  lineas.push(`"Cantidad de Registros de Merma",${pl.cantidadMermas},""`);
  for (const [motivo, monto] of Object.entries(pl.mermasPorMotivo)) {
    lineas.push(`"  - Merma: ${motivo.charAt(0).toUpperCase() + motivo.slice(1)}",${monto},""`);
  }
  lineas.push('');

  // 5. Gastos Operativos (OPEX)
  lineas.push('"5. GASTOS OPERATIVOS (OPEX)","MONTO (COP)","% SOBRE VENTAS NETAS"');
  lineas.push(`"Total Gastos Operativos",${pl.totalGastosOperativos},"${pl.porcentajeGastos}%"`);
  lineas.push(`"Cantidad de Registros de Gasto",${pl.cantidadGastos},""`);
  for (const [categoria, monto] of Object.entries(pl.gastosPorCategoria)) {
    const catFormateada = categoria.charAt(0).toUpperCase() + categoria.slice(1);
    lineas.push(`"  - Gasto: ${catFormateada}",${monto},${pl.ventasNetas > 0 ? ((monto / pl.ventasNetas) * 100).toFixed(1) + '%' : '0.0%'}`);
  }
  lineas.push('');

  // 6. Utilidad Neta
  lineas.push('"6. RESULTADO FINAL (UTILIDAD NETA)","MONTO (COP)","MARGEN NETO"');
  lineas.push(`"(=) UTILIDAD NETA DEL PERÍODO",${pl.utilidadNeta},"${pl.margenNeto}%"`);
  lineas.push(`"Estado de Salud Financiera",${esc(pl.saludFinanciera.toUpperCase())},""`);
  lineas.push(`"Diagnóstico Operativo",${esc(pl.recomendacionOperativa)},""`);
  lineas.push('');

  // 7. Auditoría Adicional
  lineas.push('"7. FONDOS ESPECIALES Y AUDITORÍA","VALOR","NOTAS"');
  lineas.push(`"Propinas Voluntarias Recaudadas (Personal)",${pl.propinasRecaudadas},"Fondo exclusivo de meseros y staff"`);
  lineas.push(`"Ventas Anuladas en el Período",${pl.ventasAnuladasMonto},"${pl.cantidadVentasAnuladas} operaciones canceladas"`);

  return '\uFEFF' + lineas.join('\r\n');
}

/**
 * Dispara la descarga del Estado de Resultados P&L en formato CSV para Excel
 */
export function descargarReportePLCSV(
  pl: EstadoResultadosPL,
  negocioNombre: string
): void {
  const contenido = generarReporteContablePLCSV(pl, negocioNombre);
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');

  const fechaIso = new Date().toISOString().split('T')[0];
  const nombreSanitizado = (negocioNombre || 'negocio')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_');

  enlace.href = url;
  enlace.setAttribute('download', `Estado_Resultados_${nombreSanitizado}_${fechaIso}.csv`);
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

