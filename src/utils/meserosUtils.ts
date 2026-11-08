import type { Venta } from '@/types';
import type { Mesa } from '@/types/mesa';
import type { EmpleadoPersonal } from '@/types/personal';
import type {
  ConfiguracionMesero,
  DesempenoMesero,
  ResumenSalonMeseros,
} from '@/types/mesero';
import { formatCOP } from './formatCOP';

/**
 * Calcula la comisión por ventas de un mesero dada la base y el porcentaje.
 * Retorna siempre un número entero positivo o cero (redondeado en COP).
 */
export function calcularComisionVenta(baseVenta: number, porcentajeComision: number): number {
  if (baseVenta <= 0 || porcentajeComision <= 0) return 0;
  return Math.max(0, Math.round((baseVenta * porcentajeComision) / 100));
}

/**
 * Calcula el ticket promedio de forma defensiva evitando divisiones por cero.
 */
export function calcularTicketPromedio(totalVentas: number, cantidadVentas: number): number {
  if (cantidadVentas <= 0 || totalVentas <= 0) return 0;
  return Math.round(totalVentas / cantidadVentas);
}

/**
 * Normaliza una cadena de texto para comparación agnóstica de mayúsculas y acentos.
 */
export function normalizarNombreMesero(nombre?: string | null): string {
  if (!nombre) return '';
  return nombre.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Motor central de cálculo de desempeño de meseros a partir del histórico de ventas
 * y estado en vivo del salón.
 */
export function calcularDesempenoMeseros(params: {
  ventas: Venta[];
  mesasActivas?: Mesa[];
  empleadosMeseros?: EmpleadoPersonal[];
  configuraciones?: ConfiguracionMesero[];
  fechaInicio?: Date;
  fechaFin?: Date;
}): DesempenoMesero[] {
  const {
    ventas,
    mesasActivas = [],
    empleadosMeseros = [],
    configuraciones = [],
    fechaInicio,
    fechaFin,
  } = params;

  // 1. Filtrar ventas válidas en el rango de fechas solicitado
  const ventasFiltradas = ventas.filter((v) => {
    if (v.estado === 'anulada') return false;
    // Si se especifica fecha, validar contra la fecha de cobro de la venta
    if (v.fecha && (fechaInicio || fechaFin)) {
      const fechaVenta = v.fecha.toDate ? v.fecha.toDate() : new Date((v.fecha as unknown as { seconds: number }).seconds * 1000);
      if (fechaInicio && fechaVenta < fechaInicio) return false;
      if (fechaFin && fechaVenta > fechaFin) return false;
    }
    return true;
  });

  // 2. Mapa de configuraciones por ID y nombre
  const configMap = new Map<string, ConfiguracionMesero>();
  const configPorNombreMap = new Map<string, ConfiguracionMesero>();
  for (const cfg of configuraciones) {
    if (cfg.empleadoId) configMap.set(cfg.empleadoId, cfg);
    if (cfg.nombre) configPorNombreMap.set(normalizarNombreMesero(cfg.nombre), cfg);
  }

  // 3. Estructura acumulativa por mesero
  interface AcumuladorMesero {
    meseroId: string;
    meseroNombre: string;
    telefono?: string;
    documento?: string;
    activo: boolean;
    totalVentas: number;
    cantidadVentas: number;
    totalPropinas: number;
    porcentajeComision: number;
    porcentajePropina: number;
    metaVentaTurno?: number;
  }

  const acumuladores = new Map<string, AcumuladorMesero>();

  // A. Registrar meseros desde empleados de personal (si los hay)
  for (const emp of empleadosMeseros) {
    // Si el cargo es mesero o está activo
    const key = emp.id;
    const cfg = configMap.get(emp.id) || configPorNombreMap.get(normalizarNombreMesero(emp.nombre));
    acumuladores.set(key, {
      meseroId: emp.id,
      meseroNombre: emp.nombre,
      telefono: emp.telefono,
      documento: emp.documento,
      activo: emp.activo,
      totalVentas: 0,
      cantidadVentas: 0,
      totalPropinas: 0,
      porcentajeComision: cfg?.porcentajeComision ?? 0,
      porcentajePropina: cfg?.porcentajePropina ?? 100,
      metaVentaTurno: cfg?.metaVentaTurno,
    });
  }

  // B. Acumular ventas vinculadas a meseros
  for (const venta of ventasFiltradas) {
    const rawNombre = venta.meseroNombre?.trim();
    const rawId = venta.meseroId?.trim();

    if (!rawNombre && !rawId) continue;

    // Buscar si ya existe por ID o por nombre normalizado
    let targetKey: string | null = null;
    if (rawId && acumuladores.has(rawId)) {
      targetKey = rawId;
    } else if (rawNombre) {
      const normNombre = normalizarNombreMesero(rawNombre);
      for (const [k, acum] of acumuladores.entries()) {
        if (normalizarNombreMesero(acum.meseroNombre) === normNombre) {
          targetKey = k;
          break;
        }
      }
    }

    // Si es un mesero nuevo no registrado en personal, crearlo dinámicamente
    if (!targetKey) {
      const nuevoId = rawId || `manual_${normalizarNombreMesero(rawNombre || 'mesero')}`;
      targetKey = nuevoId;
      const cfg = configMap.get(nuevoId) || (rawNombre ? configPorNombreMap.get(normalizarNombreMesero(rawNombre)) : undefined);
      acumuladores.set(nuevoId, {
        meseroId: nuevoId,
        meseroNombre: rawNombre || 'Mesero Salón',
        activo: true,
        totalVentas: 0,
        cantidadVentas: 0,
        totalPropinas: 0,
        porcentajeComision: cfg?.porcentajeComision ?? 0,
        porcentajePropina: cfg?.porcentajePropina ?? 100,
        metaVentaTurno: cfg?.metaVentaTurno,
      });
    }

    const acum = acumuladores.get(targetKey)!;

    // Base de venta neta (subtotal sin propina y tras descuentos)
    const subtotalBruto = typeof venta.subtotal === 'number' && venta.subtotal > 0
      ? venta.subtotal
      : (venta.total - (venta.propina || 0) + (venta.descuento || 0));
    const baseVenta = Math.max(0, subtotalBruto - (venta.descuento || 0));

    acum.totalVentas += baseVenta;
    acum.cantidadVentas += 1;
    acum.totalPropinas += Math.max(0, venta.propina || 0);
  }

  // 4. Calcular mesas asignadas actualmente en salón
  const mesasPorMesero = new Map<string, string[]>();
  for (const m of mesasActivas) {
    if (m.estado === 'ocupada' || m.estado === 'por_cobrar') {
      const rawNombre = m.meseroNombre || m.mesero;
      const rawId = m.meseroId;
      if (!rawNombre && !rawId) continue;

      let targetKey: string | null = null;
      if (rawId && acumuladores.has(rawId)) {
        targetKey = rawId;
      } else if (rawNombre) {
        const norm = normalizarNombreMesero(rawNombre);
        for (const [k, acum] of acumuladores.entries()) {
          if (normalizarNombreMesero(acum.meseroNombre) === norm) {
            targetKey = k;
            break;
          }
        }
      }

      if (!targetKey) {
        targetKey = rawId || `manual_${normalizarNombreMesero(rawNombre || 'mesero')}`;
        acumuladores.set(targetKey, {
          meseroId: targetKey,
          meseroNombre: rawNombre || 'Mesero Salón',
          activo: true,
          totalVentas: 0,
          cantidadVentas: 0,
          totalPropinas: 0,
          porcentajeComision: 0,
          porcentajePropina: 100,
        });
      }

      const lista = mesasPorMesero.get(targetKey) || [];
      lista.push(m.nombre || `Mesa ${m.numero}`);
      mesasPorMesero.set(targetKey, lista);
    }
  }

  // 5. Convertir a DesempenoMesero y calcular métricas derivadas
  const listaDesempenos: DesempenoMesero[] = [];

  for (const acum of acumuladores.values()) {
    const ticketPromedio = calcularTicketPromedio(acum.totalVentas, acum.cantidadVentas);
    const comisionVentas = calcularComisionVenta(acum.totalVentas, acum.porcentajeComision);

    // Reparto de propina: porción directa vs pool
    const propinaDirecta = Math.max(
      0,
      Math.round((acum.totalPropinas * Math.min(100, Math.max(0, acum.porcentajePropina))) / 100)
    );
    const propinaPool = Math.max(0, acum.totalPropinas - propinaDirecta);
    const totalIncentivos = propinaDirecta + comisionVentas;

    const mesasNombres = mesasPorMesero.get(acum.meseroId) || [];
    const porcentajeMeta = acum.metaVentaTurno && acum.metaVentaTurno > 0
      ? Math.round((acum.totalVentas / acum.metaVentaTurno) * 100)
      : 0;

    listaDesempenos.push({
      meseroId: acum.meseroId,
      meseroNombre: acum.meseroNombre,
      telefono: acum.telefono,
      documento: acum.documento,
      activo: acum.activo,
      totalVentas: acum.totalVentas,
      cantidadVentas: acum.cantidadVentas,
      ticketPromedio,
      totalPropinas: acum.totalPropinas,
      propinaDirecta,
      propinaPool,
      porcentajeComision: acum.porcentajeComision,
      comisionVentas,
      totalIncentivos,
      mesasActivasCount: mesasNombres.length,
      mesasActivasNombres: mesasNombres,
      metaVentaTurno: acum.metaVentaTurno,
      porcentajeMeta,
      ranking: 1, // Se ajusta en el ordenamiento
      esEstrella: false,
    });
  }

  // 6. Ordenar por totalVentas desc (luego por cantidadVentas desc)
  listaDesempenos.sort((a, b) => {
    if (b.totalVentas !== a.totalVentas) return b.totalVentas - a.totalVentas;
    return b.cantidadVentas - a.cantidadVentas;
  });

  // Asignar ranking y mesero estrella
  listaDesempenos.forEach((item, index) => {
    item.ranking = index + 1;
    item.esEstrella = index === 0 && item.totalVentas > 0;
  });

  return listaDesempenos;
}

/**
 * Consolida las métricas del salón a nivel general.
 */
export function calcularResumenSalon(
  desempenos: DesempenoMesero[],
  mesas?: Mesa[]
): ResumenSalonMeseros {
  let totalVentasSalon = 0;
  let totalPropinasSalon = 0;
  let totalComisionesSalon = 0;
  let totalCantidadVentas = 0;

  for (const d of desempenos) {
    totalVentasSalon += d.totalVentas;
    totalPropinasSalon += d.totalPropinas;
    totalComisionesSalon += d.comisionVentas;
    totalCantidadVentas += d.cantidadVentas;
  }

  const ticketPromedioSalon = calcularTicketPromedio(totalVentasSalon, totalCantidadVentas);

  const mesasOcupadasEnSalon = mesas
    ? mesas.filter((m) => m.estado === 'ocupada' || m.estado === 'por_cobrar').length
    : desempenos.reduce((acc, curr) => acc + curr.mesasActivasCount, 0);

  const meseroEstrella = desempenos.length > 0 && desempenos[0].esEstrella
    ? desempenos[0]
    : null;

  return {
    totalVentasSalon,
    totalPropinasSalon,
    ticketPromedioSalon,
    totalComisionesSalon,
    mesasOcupadasEnSalon,
    meseroEstrella,
    rankingMeseros: desempenos,
  };
}

/**
 * Genera un texto fidedigno y motivador para enviar al mesero por WhatsApp
 * con su desempeño, comisiones y propinas de la jornada.
 */
export function generarComprobanteMeseroWhatsApp(
  desempeno: DesempenoMesero,
  periodoTexto: string,
  negocioNombre: string
): string {
  const lineas: string[] = [];

  lineas.push(`🍽️ *${negocioNombre.toUpperCase()}*`);
  lineas.push(`📋 *REPORTE DE DESEMPEÑO Y LIQUIDACIÓN*`);
  lineas.push(`👤 Mesero: *${desempeno.meseroNombre}*`);
  lineas.push(`📅 Período: ${periodoTexto}`);
  lineas.push(desempeno.esEstrella ? `🏆 *¡MESERO ESTRELLA DEL SALÓN! (Puesto #1)*` : `🎖️ *Puesto #${desempeno.ranking} en Salón*`);
  lineas.push(`────────────────────────────`);

  lineas.push(`🛎️ *Mesas / Cuentas Cobradas:* ${desempeno.cantidadVentas}`);
  lineas.push(`💰 *Total Ventas Facturadas:* ${formatCOP(desempeno.totalVentas)}`);
  lineas.push(`📊 *Ticket Promedio:* ${formatCOP(desempeno.ticketPromedio)}`);

  if (desempeno.metaVentaTurno && desempeno.metaVentaTurno > 0) {
    const iconoMeta = desempeno.porcentajeMeta >= 100 ? '✅' : '🎯';
    lineas.push(`${iconoMeta} *Meta de Turno:* ${formatCOP(desempeno.metaVentaTurno)} (${desempeno.porcentajeMeta}%)`);
  }

  lineas.push(`────────────────────────────`);
  lineas.push(`💵 *Propinas Recaudadas:* ${formatCOP(desempeno.totalPropinas)}`);
  if (desempeno.propinaDirecta !== desempeno.totalPropinas) {
    lineas.push(`   └ Propina Directa: ${formatCOP(desempeno.propinaDirecta)}`);
    lineas.push(`   └ Aporte Pool Cocina: ${formatCOP(desempeno.propinaPool)}`);
  } else {
    lineas.push(`   └ 100% Asignación Directa`);
  }

  if (desempeno.porcentajeComision > 0) {
    lineas.push(`📈 *Comisión por Ventas (${desempeno.porcentajeComision}%):* ${formatCOP(desempeno.comisionVentas)}`);
  }

  lineas.push(`────────────────────────────`);
  lineas.push(`✨ *TOTAL INCENTIVOS A RECIBIR:* *${formatCOP(desempeno.totalIncentivos)}*`);
  lineas.push(`────────────────────────────`);
  lineas.push(`_¡Gracias por tu excelente atención y servicio en sala!_`);

  return lineas.join('\n');
}

/**
 * Genera el contenido de una planilla contable en formato CSV con UTF-8 BOM
 * para exportación a Microsoft Excel o Google Sheets.
 */
export function generarCsvMeseros(
  desempenos: DesempenoMesero[],
  periodoTexto: string
): string {
  const encabezados = [
    'Ranking',
    'Mesero',
    'Documento',
    'Teléfono',
    'Estado',
    'Cuentas Cobradas',
    'Total Ventas (COP)',
    'Ticket Promedio (COP)',
    'Meta Turno (COP)',
    '% Cumplimiento',
    'Propinas Total (COP)',
    'Propina Directa (COP)',
    'Aporte Pool (COP)',
    '% Comisión',
    'Comisión Ventas (COP)',
    'Total Incentivos (COP)',
    'Mesas Activas Actuales',
  ];

  const filas = desempenos.map((d) => [
    `#${d.ranking}`,
    `"${d.meseroNombre.replace(/"/g, '""')}"`,
    `"${d.documento || ''}"`,
    `"${d.telefono || ''}"`,
    d.activo ? 'Activo' : 'Inactivo',
    d.cantidadVentas,
    d.totalVentas,
    d.ticketPromedio,
    d.metaVentaTurno || 0,
    `${d.porcentajeMeta}%`,
    d.totalPropinas,
    d.propinaDirecta,
    d.propinaPool,
    `${d.porcentajeComision}%`,
    d.comisionVentas,
    d.totalIncentivos,
    `"${d.mesasActivasNombres.join(', ')}"`,
  ]);

  const lineas = [
    `"REPORTE DE DESEMPEÑO DE MESEROS Y SALÓN - PERÍODO: ${periodoTexto}"`,
    '',
    encabezados.join(','),
    ...filas.map((f) => f.join(',')),
  ];

  return '\uFEFF' + lineas.join('\r\n');
}

/**
 * Dispara la descarga del archivo CSV en el navegador cliente.
 */
export function descargarCsvMeseros(
  desempenos: DesempenoMesero[],
  periodoTexto: string,
  negocioSlug?: string
): void {
  const csvContent = generarCsvMeseros(desempenos, periodoTexto);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const slug = negocioSlug || 'la-parada';
  const fechaStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('href', url);
  link.setAttribute('download', `desempeno-meseros-${slug}-${fechaStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
