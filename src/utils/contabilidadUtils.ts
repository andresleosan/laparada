import type {
  AsientoContableExportacion,
  ConsolidadoLibroFiscal,
  EntradaLibroFiscalDiario,
  ItemConciliacionCajaVenta,
  LiquidacionFormulario310,
  MapeoPlanCuentasPUC,
  RangoFechaContable,
  RenglonFormulario310,
  ResumenConciliacionContable,
  SoftwareContableTarget,
  TipoPeriodoContable,
} from '@/types/contabilidad';
import type { ConfiguracionFiscal } from '@/types/facturacion';
import type { CierreCaja } from '@/types/cierreCaja';
import type { Gasto } from '@/types';
import type { Venta } from '@/types';
import { calcularDesgloseFiscal, extraerNumeroConsecutivo } from './facturacionUtils';
import { formatCOP } from './formatCOP';

/**
 * Retorna el mapeo predeterminado de cuentas PUC comercial para gastronomía en Colombia
 */
export function getMapeoPucDefault(): MapeoPlanCuentasPUC {
  return {
    cuentaCaja: '110505',
    cuentaBancos: '111005',
    cuentaIngresosRestaurante: '414005',
    cuentaImpoconsumoPorPagar: '249501',
    cuentaIvaPorPagar: '240801',
    cuentaDescuentosVentas: '417505',
    cuentaPropinasPorPagar: '233525',
    cuentaCuentasPorCobrar: '130505',
    cuentaGastosInsumos: '513505',
    centroCostosDefault: '001',
    nitClienteGenerico: '222222222222',
  };
}

/**
 * Retorna los 6 bimestres fiscales del año para la declaración DIAN (Formulario 310)
 */
export function getBimestresAno(ano: number): {
  numero: number;
  etiqueta: string;
  fechaInicio: string;
  fechaFin: string;
}[] {
  const esBisiesto = (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
  const febDias = esBisiesto ? '29' : '28';

  return [
    {
      numero: 1,
      etiqueta: 'Bimestre 1 (Enero - Febrero)',
      fechaInicio: `${ano}-01-01`,
      fechaFin: `${ano}-02-${febDias}`,
    },
    {
      numero: 2,
      etiqueta: 'Bimestre 2 (Marzo - Abril)',
      fechaInicio: `${ano}-03-01`,
      fechaFin: `${ano}-04-30`,
    },
    {
      numero: 3,
      etiqueta: 'Bimestre 3 (Mayo - Junio)',
      fechaInicio: `${ano}-05-01`,
      fechaFin: `${ano}-06-30`,
    },
    {
      numero: 4,
      etiqueta: 'Bimestre 4 (Julio - Agosto)',
      fechaInicio: `${ano}-07-01`,
      fechaFin: `${ano}-08-31`,
    },
    {
      numero: 5,
      etiqueta: 'Bimestre 5 (Septiembre - Octubre)',
      fechaInicio: `${ano}-09-01`,
      fechaFin: `${ano}-10-31`,
    },
    {
      numero: 6,
      etiqueta: 'Bimestre 6 (Noviembre - Diciembre)',
      fechaInicio: `${ano}-11-01`,
      fechaFin: `${ano}-12-31`,
    },
  ];
}

/**
 * Resuelve el rango de fechas contable a partir de un tipo o fechas manuales
 */
export function getRangoFechaContable(
  tipo: TipoPeriodoContable,
  fechaReferencia: Date = new Date(),
  custom?: { inicio: Date; fin: Date },
  bimestreSeleccionado?: number
): RangoFechaContable {
  const ano = fechaReferencia.getFullYear();

  if (tipo === 'personalizado' && custom) {
    const inicio = new Date(custom.inicio);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(custom.fin);
    fin.setHours(23, 59, 59, 999);
    return {
      tipo,
      inicio,
      fin,
      etiqueta: `Personalizado (${inicio.toISOString().slice(0, 10)} a ${fin.toISOString().slice(0, 10)})`,
      ano,
    };
  }

  if (tipo === 'hoy') {
    const inicio = new Date(fechaReferencia);
    inicio.setHours(0, 0, 0, 0);
    const fin = new Date(fechaReferencia);
    fin.setHours(23, 59, 59, 999);
    return {
      tipo,
      inicio,
      fin,
      etiqueta: `Hoy (${inicio.toISOString().slice(0, 10)})`,
      ano,
    };
  }

  if (tipo === 'mes_actual') {
    const mes = fechaReferencia.getMonth();
    const inicio = new Date(ano, mes, 1, 0, 0, 0, 0);
    const fin = new Date(ano, mes + 1, 0, 23, 59, 59, 999);
    const nombreMes = inicio.toLocaleString('es-CO', { month: 'long' });
    return {
      tipo,
      inicio,
      fin,
      etiqueta: `Mes Actual (${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} ${ano})`,
      ano,
    };
  }

  if (tipo === 'mes_anterior') {
    const mes = fechaReferencia.getMonth() - 1;
    const anoRef = mes < 0 ? ano - 1 : ano;
    const mesRef = mes < 0 ? 11 : mes;
    const inicio = new Date(anoRef, mesRef, 1, 0, 0, 0, 0);
    const fin = new Date(anoRef, mesRef + 1, 0, 23, 59, 59, 999);
    const nombreMes = inicio.toLocaleString('es-CO', { month: 'long' });
    return {
      tipo,
      inicio,
      fin,
      etiqueta: `Mes Anterior (${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} ${anoRef})`,
      ano: anoRef,
    };
  }

  if (tipo === 'bimestre_actual' || tipo === 'bimestre_anterior') {
    const mes = fechaReferencia.getMonth(); // 0 a 11
    let bimestreIndex = Math.floor(mes / 2) + 1; // 1 a 6
    let anoBimestre = ano;

    if (bimestreSeleccionado && bimestreSeleccionado >= 1 && bimestreSeleccionado <= 6) {
      bimestreIndex = bimestreSeleccionado;
    } else if (tipo === 'bimestre_anterior') {
      bimestreIndex -= 1;
      if (bimestreIndex < 1) {
        bimestreIndex = 6;
        anoBimestre -= 1;
      }
    }

    const bimestres = getBimestresAno(anoBimestre);
    const bim = bimestres.find((b) => b.numero === bimestreIndex) || bimestres[0];
    const inicio = new Date(`${bim.fechaInicio}T00:00:00.000`);
    const fin = new Date(`${bim.fechaFin}T23:59:59.999`);

    return {
      tipo,
      inicio,
      fin,
      etiqueta: `${bim.etiqueta} - ${anoBimestre}`,
      ano: anoBimestre,
      bimestre: bimestreIndex,
    };
  }

  // ano_actual
  const inicio = new Date(ano, 0, 1, 0, 0, 0, 0);
  const fin = new Date(ano, 11, 31, 23, 59, 59, 999);
  return {
    tipo: 'ano_actual',
    inicio,
    fin,
    etiqueta: `Año Gravable ${ano}`,
    ano,
  };
}

/**
 * Extrae la fecha ISO en formato YYYY-MM-DD local a partir de un timestamp o Date
 */
export function obtenerFechaIsoLocal(fecha: unknown): string | null {
  if (!fecha) return null;
  let d: Date;
  if (typeof (fecha as { toMillis?: () => number }).toMillis === 'function') {
    d = new Date((fecha as { toMillis: () => number }).toMillis());
  } else if (fecha instanceof Date) {
    d = fecha;
  } else if (typeof fecha === 'string' || typeof fecha === 'number') {
    d = new Date(fecha);
  } else {
    return null;
  }

  if (Number.isNaN(d.getTime())) return null;

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Genera el Libro Fiscal de Operaciones Diarias agrupado día a día (Art. 616 del E.T.)
 */
export function generarLibroFiscalDiario(
  ventas: Venta[],
  gastos: Gasto[],
  periodo: RangoFechaContable,
  configuracionFiscal?: ConfiguracionFiscal | null
): ConsolidadoLibroFiscal {
  const inicioTime = periodo.inicio.getTime();
  const finTime = periodo.fin.getTime();

  // Filtrar ventas del periodo
  const ventasPeriodo = ventas.filter((v) => {
    if (!v.fecha) return false;
    const t = v.fecha.toMillis ? v.fecha.toMillis() : new Date(v.fecha as unknown as string).getTime();
    return t >= inicioTime && t <= finTime;
  });

  // Filtrar gastos del periodo
  const gastosPeriodo = gastos.filter((g) => {
    if (!g.fecha) return false;
    const t = g.fecha.toMillis ? g.fecha.toMillis() : new Date(g.fecha as unknown as string).getTime();
    return t >= inicioTime && t <= finTime;
  });

  // Agrupar ventas por día ISO
  const mapaDiasVentas = new Map<string, Venta[]>();
  for (const v of ventasPeriodo) {
    const iso = obtenerFechaIsoLocal(v.fecha);
    if (!iso) continue;
    const arr = mapaDiasVentas.get(iso) || [];
    arr.push(v);
    mapaDiasVentas.set(iso, arr);
  }

  // Agrupar gastos por día ISO
  const mapaDiasGastos = new Map<string, Gasto[]>();
  for (const g of gastosPeriodo) {
    const iso = obtenerFechaIsoLocal(g.fecha);
    if (!iso) continue;
    const arr = mapaDiasGastos.get(iso) || [];
    arr.push(g);
    mapaDiasGastos.set(iso, arr);
  }

  // Recolectar todos los días con operaciones
  const todosLosDias = new Set<string>([
    ...mapaDiasVentas.keys(),
    ...mapaDiasGastos.keys(),
  ]);

  const entradas: EntradaLibroFiscalDiario[] = [];

  for (const diaIso of Array.from(todosLosDias).sort()) {
    const ventasDelDia = mapaDiasVentas.get(diaIso) || [];
    const gastosDelDia = mapaDiasGastos.get(diaIso) || [];

    const ventasValidas = ventasDelDia.filter((v) => v.estado !== 'anulada');
    const ventasAnuladas = ventasDelDia.filter((v) => v.estado === 'anulada');

    let ingresosGravadosInc8 = 0;
    let impuestoInc8 = 0;
    let ingresosGravadosIva19 = 0;
    let impuestoIva19 = 0;
    let ingresosExcluidos = 0;
    let totalVentasBrutas = 0;
    let totalDescuentos = 0;
    let propinasRecaudadas = 0;
    let totalCobradoEfectivo = 0;
    let totalCobradoTransferencia = 0;

    const numerosConsecutivos: number[] = [];

    for (const v of ventasValidas) {
      const subtotal = typeof v.subtotal === 'number' ? v.subtotal : v.total;
      const desc = typeof v.descuento === 'number' ? v.descuento : 0;
      const prop = typeof v.propina === 'number' ? v.propina : 0;

      totalVentasBrutas += subtotal;
      totalDescuentos += desc;
      propinasRecaudadas += prop;

      const neto = Math.max(0, subtotal - desc);

      if (v.metodoPago === 'efectivo') {
        totalCobradoEfectivo += v.total;
      } else {
        totalCobradoTransferencia += v.total;
      }

      // Discriminación impositiva
      if (typeof v.baseGravable === 'number' && typeof v.valorImpuesto === 'number') {
        if (v.tipoImpuesto === 'iva' || v.tarifaImpuesto === 19) {
          ingresosGravadosIva19 += v.baseGravable;
          impuestoIva19 += v.valorImpuesto;
        } else if (v.tipoImpuesto === 'inc' || v.tarifaImpuesto === 8) {
          ingresosGravadosInc8 += v.baseGravable;
          impuestoInc8 += v.valorImpuesto;
        } else {
          ingresosExcluidos += v.baseGravable;
        }
      } else if (configuracionFiscal) {
        const tarifa = configuracionFiscal.tarifaDefault.porcentaje;
        const tipo = configuracionFiscal.tarifaDefault.tipo;
        const desglose = calcularDesgloseFiscal(
          neto,
          tarifa,
          configuracionFiscal.preciosIncluyenImpuesto,
          tipo
        );
        if (tipo === 'iva') {
          ingresosGravadosIva19 += desglose.baseGravable;
          impuestoIva19 += desglose.valorImpuesto;
        } else if (tipo === 'inc') {
          ingresosGravadosInc8 += desglose.baseGravable;
          impuestoInc8 += desglose.valorImpuesto;
        } else {
          ingresosExcluidos += desglose.baseGravable;
        }
      } else {
        // Fallback estándar en gastronomía colombiana: INC 8%
        const desglose = calcularDesgloseFiscal(neto, 8, true, 'inc');
        ingresosGravadosInc8 += desglose.baseGravable;
        impuestoInc8 += desglose.valorImpuesto;
      }

      const numConsecutivo = extraerNumeroConsecutivo(v.consecutivoFiscal);
      if (numConsecutivo !== null) {
        numerosConsecutivos.push(numConsecutivo);
      }
    }

    // Si hubo ventas anuladas con consecutivo, también registrar folios
    for (const va of ventasAnuladas) {
      const numConsecutivo = extraerNumeroConsecutivo(va.consecutivoFiscal);
      if (numConsecutivo !== null) {
        numerosConsecutivos.push(numConsecutivo);
      }
    }

    const prefijo = configuracionFiscal?.resolucion?.prefijo || 'POS';
    let consecutivoInicial = 'N/A';
    let consecutivoFinal = 'N/A';

    if (numerosConsecutivos.length > 0) {
      const minNum = Math.min(...numerosConsecutivos);
      const maxNum = Math.max(...numerosConsecutivos);
      consecutivoInicial = `${prefijo}-${String(minNum).padStart(5, '0')}`;
      consecutivoFinal = `${prefijo}-${String(maxNum).padStart(5, '0')}`;
    }

    const totalVentasNetas = Math.max(0, totalVentasBrutas - totalDescuentos);
    const totalEgresosGastos = gastosDelDia.reduce((acc, g) => acc + (g.monto || 0), 0);
    const saldoNetoOperacional = totalVentasNetas - totalEgresosGastos;

    entradas.push({
      fecha: diaIso,
      consecutivoInicial,
      consecutivoFinal,
      totalDocumentos: ventasValidas.length,
      totalAnulados: ventasAnuladas.length,
      ingresosGravadosInc8: Math.round(ingresosGravadosInc8),
      impuestoInc8: Math.round(impuestoInc8),
      ingresosGravadosIva19: Math.round(ingresosGravadosIva19),
      impuestoIva19: Math.round(impuestoIva19),
      ingresosExcluidos: Math.round(ingresosExcluidos),
      totalVentasBrutas: Math.round(totalVentasBrutas),
      totalDescuentos: Math.round(totalDescuentos),
      totalVentasNetas: Math.round(totalVentasNetas),
      propinasRecaudadas: Math.round(propinasRecaudadas),
      totalCobradoEfectivo: Math.round(totalCobradoEfectivo),
      totalCobradoTransferencia: Math.round(totalCobradoTransferencia),
      totalEgresosGastos: Math.round(totalEgresosGastos),
      saldoNetoOperacional: Math.round(saldoNetoOperacional),
    });
  }

  // Acumulados del consolidado
  const consolidado: ConsolidadoLibroFiscal = {
    periodo,
    entradas,
    totalDiasConOperacion: entradas.length,
    totalDocumentosEmitidos: entradas.reduce((acc, e) => acc + e.totalDocumentos, 0),
    totalDocumentosAnulados: entradas.reduce((acc, e) => acc + e.totalAnulados, 0),
    acumuladoVentasBrutas: entradas.reduce((acc, e) => acc + e.totalVentasBrutas, 0),
    acumuladoDescuentos: entradas.reduce((acc, e) => acc + e.totalDescuentos, 0),
    acumuladoVentasNetas: entradas.reduce((acc, e) => acc + e.totalVentasNetas, 0),
    acumuladoBaseInc8: entradas.reduce((acc, e) => acc + e.ingresosGravadosInc8, 0),
    acumuladoImpuestoInc8: entradas.reduce((acc, e) => acc + e.impuestoInc8, 0),
    acumuladoBaseIva19: entradas.reduce((acc, e) => acc + e.ingresosGravadosIva19, 0),
    acumuladoImpuestoIva19: entradas.reduce((acc, e) => acc + e.impuestoIva19, 0),
    acumuladoExcluidos: entradas.reduce((acc, e) => acc + e.ingresosExcluidos, 0),
    acumuladoPropinas: entradas.reduce((acc, e) => acc + e.propinasRecaudadas, 0),
    acumuladoEfectivo: entradas.reduce((acc, e) => acc + e.totalCobradoEfectivo, 0),
    acumuladoTransferencia: entradas.reduce((acc, e) => acc + e.totalCobradoTransferencia, 0),
    acumuladoEgresosGastos: entradas.reduce((acc, e) => acc + e.totalEgresosGastos, 0),
    acumuladoSaldoNeto: entradas.reduce((acc, e) => acc + e.saldoNetoOperacional, 0),
  };

  return consolidado;
}

/**
 * Liquida la declaración bimestral del Impuesto Nacional al Consumo (Formulario 310 DIAN)
 */
export function calcularLiquidacionFormulario310(
  ventas: Venta[],
  ano: number,
  bimestreNumero: number,
  configuracionFiscal?: ConfiguracionFiscal | null
): LiquidacionFormulario310 {
  const bimestres = getBimestresAno(ano);
  const bim = bimestres.find((b) => b.numero === bimestreNumero) || bimestres[0];

  const inicio = new Date(`${bim.fechaInicio}T00:00:00.000`);
  const fin = new Date(`${bim.fechaFin}T23:59:59.999`);
  const inicioTime = inicio.getTime();
  const finTime = fin.getTime();

  // Filtrar ventas del bimestre
  const ventasBimestre = ventas.filter((v) => {
    if (!v.fecha) return false;
    const t = v.fecha.toMillis ? v.fecha.toMillis() : new Date(v.fecha as unknown as string).getTime();
    return t >= inicioTime && t <= finTime;
  });

  const ventasValidas = ventasBimestre.filter((v) => v.estado !== 'anulada');

  let baseGravableInc8 = 0;
  let impuestoInc8 = 0;
  let ingresosExcluidos = 0;
  let totalDescuentos = 0;
  let propinas = 0;

  for (const v of ventasValidas) {
    const subtotal = typeof v.subtotal === 'number' ? v.subtotal : v.total;
    const desc = typeof v.descuento === 'number' ? v.descuento : 0;
    const prop = typeof v.propina === 'number' ? v.propina : 0;

    totalDescuentos += desc;
    propinas += prop;

    const neto = Math.max(0, subtotal - desc);

    if (typeof v.baseGravable === 'number' && typeof v.valorImpuesto === 'number') {
      if (v.tipoImpuesto === 'inc' || v.tarifaImpuesto === 8) {
        baseGravableInc8 += v.baseGravable;
        impuestoInc8 += v.valorImpuesto;
      } else if (v.tipoImpuesto === 'ninguno' || v.tarifaImpuesto === 0) {
        ingresosExcluidos += v.baseGravable;
      } else {
        // Otros impuestos (IVA) se consideran excluidos del Formulario 310 (van al Formulario 300)
        ingresosExcluidos += v.baseGravable;
      }
    } else if (configuracionFiscal) {
      const tarifa = configuracionFiscal.tarifaDefault.porcentaje;
      const tipo = configuracionFiscal.tarifaDefault.tipo;
      const desglose = calcularDesgloseFiscal(
        neto,
        tarifa,
        configuracionFiscal.preciosIncluyenImpuesto,
        tipo
      );
      if (tipo === 'inc') {
        baseGravableInc8 += desglose.baseGravable;
        impuestoInc8 += desglose.valorImpuesto;
      } else {
        ingresosExcluidos += desglose.baseGravable;
      }
    } else {
      const desglose = calcularDesgloseFiscal(neto, 8, true, 'inc');
      baseGravableInc8 += desglose.baseGravable;
      impuestoInc8 += desglose.valorImpuesto;
    }
  }

  const baseRedondeada = Math.round(baseGravableInc8);
  const impuestoRedondeado = Math.round(impuestoInc8);
  const descuentosRedondeados = Math.round(totalDescuentos);
  const excluidosRedondeados = Math.round(ingresosExcluidos);
  const propinasRedondeadas = Math.round(propinas);
  const totalBrutoGravado8 = baseRedondeada + descuentosRedondeados;
  const totalIngresosNetos = baseRedondeada + excluidosRedondeados;

  // Construcción estructurada de renglones del Formulario 310 DIAN
  const renglones: RenglonFormulario310[] = [
    {
      numeroRenglon: 28,
      codigo: 'ING_BRUTOS_REST',
      concepto: 'Ingresos brutos por servicios de restaurantes y bares (Tarifa 8%)',
      valor: totalBrutoGravado8,
      esCalculado: false,
      explicacion: 'Total facturado antes de descuentos por expendio a la mesa y mostrador.',
    },
    {
      numeroRenglon: 30,
      codigo: 'DEV_DESC_VENTAS',
      concepto: 'Menos devoluciones, rebajas y descuentos en ventas',
      valor: descuentosRedondeados,
      esCalculado: false,
      explicacion: 'Cortesías de la casa, promociones aplicadas y descuentos comerciales concedidos.',
    },
    {
      numeroRenglon: 31,
      codigo: 'ING_NETOS_GRAV_8',
      concepto: 'Ingresos netos gravados a la tarifa del 8%',
      valor: baseRedondeada,
      esCalculado: true,
      explicacion: 'Base gravable líquida sobre la cual se calcula el 8% de Impoconsumo (R28 - R30).',
    },
    {
      numeroRenglon: 33,
      codigo: 'TOTAL_ING_NETOS',
      concepto: 'Total ingresos netos gravados',
      valor: baseRedondeada,
      esCalculado: true,
      explicacion: 'Suma de ingresos netos gravados en el bimestre.',
    },
    {
      numeroRenglon: 40,
      codigo: 'IMP_GENERADO_8',
      concepto: 'Impuesto liquidado a la tarifa del 8%',
      valor: impuestoRedondeado,
      esCalculado: true,
      explicacion: 'Impuesto generado resultante de aplicar el 8% a la base gravable neta (R31 × 8%).',
    },
    {
      numeroRenglon: 44,
      codigo: 'TOTAL_IMP_GENERADO',
      concepto: 'Total impuesto generado en el bimestre',
      valor: impuestoRedondeado,
      esCalculado: true,
      explicacion: 'Monto total de Impuesto Nacional al Consumo a transferir a la DIAN.',
    },
    {
      numeroRenglon: 52,
      codigo: 'TOTAL_SALDO_PAGAR',
      concepto: 'Total saldo a pagar por impuesto',
      valor: impuestoRedondeado,
      esCalculado: true,
      explicacion: 'Valor final líquido a cancelar en bancos o mediante PSE en portal DIAN.',
    },
    {
      numeroRenglon: 90,
      codigo: 'ING_EXCLUIDOS',
      concepto: 'Ingresos por operaciones excluidas o no gravadas',
      valor: excluidosRedondeados,
      esCalculado: false,
      explicacion: 'Ventas de productos excluidos del INC (ej: licores gravados con IVA en formulario 300).',
    },
    {
      numeroRenglon: 98,
      codigo: 'PROPINAS_VOLUNTARIAS',
      concepto: 'Propinas voluntarias recibidas (Renglón Informativo)',
      valor: propinasRedondeadas,
      esCalculado: false,
      explicacion: 'Fondo voluntario de servicio que no constituye ingreso del establecimiento (Ley 1935).',
    },
  ];

  return {
    anoGravable: ano,
    bimestre: bimestreNumero,
    bimestreNombre: bim.etiqueta,
    fechaInicio: bim.fechaInicio,
    fechaFin: bim.fechaFin,
    ingresosBrutosRestaurantes8: totalBrutoGravado8,
    descuentosYAnulaciones: descuentosRedondeados,
    ingresosNetosGravados8: baseRedondeada,
    tarifaImpuesto: 8,
    impuestoGenerado8: impuestoRedondeado,
    ingresosExcluidosNoGravados: excluidosRedondeados,
    totalIngresosNetos,
    totalImpuestoACargo: impuestoRedondeado,
    anticiposRetenciones: 0,
    saldoAPagar: impuestoRedondeado,
    propinasInformativas: propinasRedondeadas,
    totalOperacionesPos: ventasValidas.length,
    renglones,
  };
}

/**
 * Concilia día por día las ventas del sistema vs los arqueos físicos de caja y transferencias
 */
export function calcularConciliacionVentasVsCaja(
  ventas: Venta[],
  cierres: CierreCaja[],
  gastos: Gasto[],
  periodo: RangoFechaContable
): ResumenConciliacionContable {
  const inicioTime = periodo.inicio.getTime();
  const finTime = periodo.fin.getTime();

  // Filtrar por periodo
  const ventasPeriodo = ventas.filter((v) => {
    if (!v.fecha) return false;
    const t = v.fecha.toMillis ? v.fecha.toMillis() : new Date(v.fecha as unknown as string).getTime();
    return t >= inicioTime && t <= finTime;
  });

  const cierresPeriodo = cierres.filter((c) => {
    if (!c.fecha) return false;
    const t = c.fecha.toMillis ? c.fecha.toMillis() : new Date(c.fecha as unknown as string).getTime();
    return t >= inicioTime && t <= finTime;
  });

  const gastosPeriodo = gastos.filter((g) => {
    if (!g.fecha) return false;
    const t = g.fecha.toMillis ? g.fecha.toMillis() : new Date(g.fecha as unknown as string).getTime();
    return t >= inicioTime && t <= finTime;
  });

  // Agrupar ventas por día
  const mapaVentas = new Map<string, { total: number; efectivo: number; transferencia: number }>();
  for (const v of ventasPeriodo) {
    if (v.estado === 'anulada') continue;
    const iso = obtenerFechaIsoLocal(v.fecha);
    if (!iso) continue;
    const actual = mapaVentas.get(iso) || { total: 0, efectivo: 0, transferencia: 0 };
    actual.total += v.total || 0;
    if (v.metodoPago === 'efectivo') {
      actual.efectivo += v.total || 0;
    } else {
      actual.transferencia += v.total || 0;
    }
    mapaVentas.set(iso, actual);
  }

  // Agrupar gastos por día
  const mapaGastos = new Map<string, number>();
  for (const g of gastosPeriodo) {
    const iso = obtenerFechaIsoLocal(g.fecha);
    if (!iso) continue;
    mapaGastos.set(iso, (mapaGastos.get(iso) || 0) + (g.monto || 0));
  }

  // Agrupar cierres por día (tomamos el más reciente si hay varios turnos)
  const mapaCierres = new Map<string, CierreCaja>();
  for (const c of cierresPeriodo) {
    const iso = obtenerFechaIsoLocal(c.fecha);
    if (!iso) continue;
    mapaCierres.set(iso, c);
  }

  const fechasTodas = new Set<string>([
    ...mapaVentas.keys(),
    ...mapaGastos.keys(),
    ...mapaCierres.keys(),
  ]);

  const items: ItemConciliacionCajaVenta[] = [];

  for (const diaIso of Array.from(fechasTodas).sort()) {
    const vInfo = mapaVentas.get(diaIso) || { total: 0, efectivo: 0, transferencia: 0 };
    const gastosDia = mapaGastos.get(diaIso) || 0;
    const cierre = mapaCierres.get(diaIso);

    let efectivoEsperado = vInfo.efectivo - gastosDia;
    let efectivoReal = efectivoEsperado;
    let diferencia = 0;
    let estado: 'cuadrado' | 'sobrante' | 'faltante' | 'sin_cierre' = 'sin_cierre';

    if (cierre) {
      if (cierre.arqueo) {
        efectivoEsperado = cierre.arqueo.efectivoEsperado ?? efectivoEsperado;
        efectivoReal = cierre.arqueo.totalFisico ?? efectivoEsperado;
        diferencia = cierre.arqueo.diferencia ?? 0;
      } else if (typeof cierre.diferenciaEfectivo === 'number') {
        diferencia = cierre.diferenciaEfectivo;
        efectivoEsperado = cierre.efectivoEsperado ?? efectivoEsperado;
        efectivoReal = cierre.efectivoReal ?? (efectivoEsperado + diferencia);
      }

      if (Math.abs(diferencia) <= 50) {
        estado = 'cuadrado';
      } else if (diferencia > 50) {
        estado = 'sobrante';
      } else {
        estado = 'faltante';
      }
    }

    items.push({
      fecha: diaIso,
      totalVentasSistema: Math.round(vInfo.total),
      ventasEfectivoSistema: Math.round(vInfo.efectivo),
      ventasTransferenciaSistema: Math.round(vInfo.transferencia),
      totalEgresosCaja: Math.round(gastosDia),
      efectivoEsperadoCaja: Math.round(efectivoEsperado),
      efectivoRealArqueado: Math.round(efectivoReal),
      diferenciaEfectivo: Math.round(diferencia),
      estado,
      responsableCierre: cierre?.cajeroNombre,
      cierreCajaId: cierre?.id,
      notas: cierre?.notas,
    });
  }

  const totalVentasSistema = items.reduce((acc, it) => acc + it.totalVentasSistema, 0);
  const totalCobradoEfectivo = items.reduce((acc, it) => acc + it.ventasEfectivoSistema, 0);
  const totalCobradoTransferencia = items.reduce((acc, it) => acc + it.ventasTransferenciaSistema, 0);
  const totalEgresosPeriodo = items.reduce((acc, it) => acc + it.totalEgresosCaja, 0);
  const totalArqueadoFisico = items.reduce((acc, it) => acc + it.efectivoRealArqueado, 0);
  const diferenciaTotalNeta = items.reduce((acc, it) => acc + it.diferenciaEfectivo, 0);

  const diasCuadrados = items.filter((it) => it.estado === 'cuadrado').length;
  const diasConDiferencia = items.filter((it) => it.estado === 'sobrante' || it.estado === 'faltante').length;
  const diasSinCierre = items.filter((it) => it.estado === 'sin_cierre').length;

  let saludConciliacion: 'optima' | 'alerta' | 'critica' = 'optima';
  if (diasSinCierre > 3 || Math.abs(diferenciaTotalNeta) > 50000) {
    saludConciliacion = 'critica';
  } else if (diasConDiferencia > 0 || diasSinCierre > 0) {
    saludConciliacion = 'alerta';
  }

  const pctEfectivo = totalVentasSistema > 0 ? Math.round((totalCobradoEfectivo / totalVentasSistema) * 100) : 0;
  const pctTransferencia = totalVentasSistema > 0 ? 100 - pctEfectivo : 0;

  return {
    periodo,
    items,
    totalVentasSistema,
    totalCobradoEfectivo,
    totalCobradoTransferencia,
    totalEgresosPeriodo,
    totalArqueadoFisico,
    diferenciaTotalNeta,
    diasCuadrados,
    diasConDiferencia,
    diasSinCierre,
    saludConciliacion,
    porcentajeEfectivo: pctEfectivo,
    porcentajeTransferencia: pctTransferencia,
  };
}

/**
 * Genera los asientos contables en Partida Doble para exportar a Siigo, World Office o Helisa
 */
export function generarAsientosContablesVentas(
  ventas: Venta[],
  mapeo: MapeoPlanCuentasPUC,
  nombreNegocio: string
): AsientoContableExportacion[] {
  const asientos: AsientoContableExportacion[] = [];

  const ventasValidas = ventas.filter((v) => v.estado !== 'anulada');

  for (const v of ventasValidas) {
    const fecha = obtenerFechaIsoLocal(v.fecha) || new Date().toISOString().slice(0, 10);
    const consecutivo = v.consecutivoFiscal || `#${v.id.slice(-6).toUpperCase()}`;
    const nitTercero = mapeo.nitClienteGenerico;
    const nombreTercero = v.clienteNombre?.trim() || 'CLIENTES VARIOS CONSUMIDOR FINAL';
    const centroCostos = mapeo.centroCostosDefault;

    const subtotal = typeof v.subtotal === 'number' ? v.subtotal : v.total;
    const desc = typeof v.descuento === 'number' ? v.descuento : 0;
    const prop = typeof v.propina === 'number' ? v.propina : 0;
    const netoProductos = Math.max(0, subtotal - desc);
    // Garantiza que si la venta tiene propina, el recaudo total en caja/bancos la incluya
    const totalCobrado = v.total >= netoProductos + prop ? v.total : netoProductos + prop;

    // Base gravable e impuesto
    let baseGravable = 0;
    let impuesto = 0;
    let esIva = false;

    if (typeof v.baseGravable === 'number' && typeof v.valorImpuesto === 'number') {
      baseGravable = v.baseGravable;
      impuesto = v.valorImpuesto;
      esIva = v.tipoImpuesto === 'iva' || v.tarifaImpuesto === 19;
    } else {
      const neto = Math.max(0, subtotal - desc);
      const desglose = calcularDesgloseFiscal(neto, 8, true, 'inc');
      baseGravable = desglose.baseGravable;
      impuesto = desglose.valorImpuesto;
    }

    // 1. DÉBITO A CAJA O BANCOS (Por el total cobrado al cliente)
    const esEfectivo = v.metodoPago === 'efectivo';
    asientos.push({
      fecha,
      tipoDocumento: 'RC',
      consecutivo,
      nitTercero,
      nombreTercero,
      cuentaContable: esEfectivo ? mapeo.cuentaCaja : mapeo.cuentaBancos,
      nombreCuenta: esEfectivo ? 'Caja General' : 'Bancos / Cuentas Digitales',
      debito: totalCobrado,
      credito: 0,
      centroCostos,
      concepto: `Recaudo venta ${consecutivo} - ${nombreNegocio} (${v.metodoPago})`,
    });

    // 2. DÉBITO A DESCUENTOS EN VENTAS (Si hubo descuento concedido)
    if (desc > 0) {
      asientos.push({
        fecha,
        tipoDocumento: 'RC',
        consecutivo,
        nitTercero,
        nombreTercero,
        cuentaContable: mapeo.cuentaDescuentosVentas,
        nombreCuenta: 'Devoluciones y Descuentos en Ventas',
        debito: desc,
        credito: 0,
        centroCostos,
        concepto: `Descuento concedido venta ${consecutivo}`,
      });
    }

    // 3. CRÉDITO A INGRESOS RESTAURANTE (Por la base de la venta antes de impuesto y propina)
    const creditoIngresos = baseGravable + desc; // Ingreso bruto antes de descuento
    asientos.push({
      fecha,
      tipoDocumento: 'RC',
      consecutivo,
      nitTercero,
      nombreTercero,
      cuentaContable: mapeo.cuentaIngresosRestaurante,
      nombreCuenta: 'Ingresos Hoteles y Restaurantes',
      debito: 0,
      credito: creditoIngresos,
      baseGravable,
      centroCostos,
      concepto: `Ingreso operacional venta ${consecutivo}`,
    });

    // 4. CRÉDITO A IMPUESTO POR PAGAR (INC 8% o IVA 19%)
    if (impuesto > 0) {
      asientos.push({
        fecha,
        tipoDocumento: 'RC',
        consecutivo,
        nitTercero,
        nombreTercero,
        cuentaContable: esIva ? mapeo.cuentaIvaPorPagar : mapeo.cuentaImpoconsumoPorPagar,
        nombreCuenta: esIva ? 'IVA Generado por Pagar' : 'Impoconsumo por Pagar (INC 8%)',
        debito: 0,
        credito: impuesto,
        baseGravable,
        centroCostos,
        concepto: `Impuesto liquidado venta ${consecutivo}`,
      });
    }

    // 5. CRÉDITO A PROPINAS POR PAGAR (Si hubo propina voluntaria)
    if (prop > 0) {
      asientos.push({
        fecha,
        tipoDocumento: 'RC',
        consecutivo,
        nitTercero,
        nombreTercero,
        cuentaContable: mapeo.cuentaPropinasPorPagar,
        nombreCuenta: 'Propinas por Distribuir al Personal',
        debito: 0,
        credito: prop,
        centroCostos,
        concepto: `Propina voluntaria comensal venta ${consecutivo}`,
      });
    }
  }

  return asientos;
}

/**
 * Exporta el Libro Fiscal de Operaciones Diarias a formato CSV oficial
 */
export function exportarLibroFiscalCSV(
  consolidado: ConsolidadoLibroFiscal,
  nombreNegocio: string,
  nit: string
): string {
  const lineas: string[] = [];

  lineas.push('LIBRO FISCAL DE REGISTRO DE OPERACIONES DIARIAS - ARTICULO 616 DEL E.T.');
  lineas.push(`"Establecimiento";"${nombreNegocio}"`);
  lineas.push(`"NIT";"${nit}"`);
  lineas.push(`"Período Auditado";"${consolidado.periodo.etiqueta}"`);
  lineas.push(`"Fecha de Emisión";"${new Date().toLocaleString('es-CO')}"`);
  lineas.push('');
  lineas.push(
    'FECHA;COMPROBANTE_INICIAL;COMPROBANTE_FINAL;TOTAL_DOCS;DOCS_ANULADOS;INGRESOS_GRAVADOS_INC8;IMPUESTO_INC8;INGRESOS_GRAVADOS_IVA19;IMPUESTO_IVA19;INGRESOS_EXCLUIDOS;VENTAS_BRUTAS;DESCUENTOS;VENTAS_NETAS;PROPINAS;TOTAL_EFECTIVO;TOTAL_TRANSFERENCIA;EGRESOS_COMPRAS;SALDO_NETO'
  );

  for (const e of consolidado.entradas) {
    lineas.push(
      [
        `"${e.fecha}"`,
        `"${e.consecutivoInicial}"`,
        `"${e.consecutivoFinal}"`,
        e.totalDocumentos,
        e.totalAnulados,
        e.ingresosGravadosInc8,
        e.impuestoInc8,
        e.ingresosGravadosIva19,
        e.impuestoIva19,
        e.ingresosExcluidos,
        e.totalVentasBrutas,
        e.totalDescuentos,
        e.totalVentasNetas,
        e.propinasRecaudadas,
        e.totalCobradoEfectivo,
        e.totalCobradoTransferencia,
        e.totalEgresosGastos,
        e.saldoNetoOperacional,
      ].join(';')
    );
  }

  // Fila de totales acumulados
  lineas.push('');
  lineas.push(
    [
      '"TOTALES ACUMULADOS"',
      '""',
      '""',
      consolidado.totalDocumentosEmitidos,
      consolidado.totalDocumentosAnulados,
      consolidado.acumuladoBaseInc8,
      consolidado.acumuladoImpuestoInc8,
      consolidado.acumuladoBaseIva19,
      consolidado.acumuladoImpuestoIva19,
      consolidado.acumuladoExcluidos,
      consolidado.acumuladoVentasBrutas,
      consolidado.acumuladoDescuentos,
      consolidado.acumuladoVentasNetas,
      consolidado.acumuladoPropinas,
      consolidado.acumuladoEfectivo,
      consolidado.acumuladoTransferencia,
      consolidado.acumuladoEgresosGastos,
      consolidado.acumuladoSaldoNeto,
    ].join(';')
  );

  return '\uFEFF' + lineas.join('\r\n');
}

/**
 * Exporta el Formulario 310 de Impoconsumo a CSV con renglones oficiales DIAN
 */
export function exportarFormulario310CSV(
  liq: LiquidacionFormulario310,
  nombreNegocio: string,
  nit: string
): string {
  const lineas: string[] = [];

  lineas.push('DECLARACION DE IMPUESTO NACIONAL AL CONSUMO - FORMULARIO 310 DIAN');
  lineas.push(`"Razón Social";"${nombreNegocio}"`);
  lineas.push(`"NIT";"${nit}"`);
  lineas.push(`"Año Gravable";"${liq.anoGravable}"`);
  lineas.push(`"Período Bimestral";"${liq.bimestreNombre}"`);
  lineas.push(`"Rango de Fechas";"${liq.fechaInicio} al ${liq.fechaFin}"`);
  lineas.push(`"Total Operaciones Registradas";"${liq.totalOperacionesPos}"`);
  lineas.push('');
  lineas.push('RENGLON;CODIGO;CONCEPTO;VALOR_COP;EXPLICACION');

  for (const r of liq.renglones) {
    lineas.push(
      [
        r.numeroRenglon,
        `"${r.codigo}"`,
        `"${r.concepto.replace(/"/g, '""')}"`,
        r.valor,
        `"${r.explicacion.replace(/"/g, '""')}"`,
      ].join(';')
    );
  }

  return '\uFEFF' + lineas.join('\r\n');
}

/**
 * Exporta la conciliación diaria de ventas vs caja a CSV
 */
export function exportarConciliacionCSV(
  resumen: ResumenConciliacionContable,
  nombreNegocio: string
): string {
  const lineas: string[] = [];

  lineas.push('CONCILIACION CONTABLE DE VENTAS VS CAJA Y MEDIOS DE PAGO');
  lineas.push(`"Negocio";"${nombreNegocio}"`);
  lineas.push(`"Período";"${resumen.periodo.etiqueta}"`);
  lineas.push(`"Estado Global";"${resumen.saludConciliacion.toUpperCase()}"`);
  lineas.push('');
  lineas.push(
    'FECHA;VENTAS_SISTEMA;VENTAS_EFECTIVO;VENTAS_TRANSFERENCIA;EGRESOS_CAJA;EFECTIVO_ESPERADO;EFECTIVO_ARQUEADO;DIFERENCIA;ESTADO;RESPONSABLE;NOTAS'
  );

  for (const it of resumen.items) {
    lineas.push(
      [
        `"${it.fecha}"`,
        it.totalVentasSistema,
        it.ventasEfectivoSistema,
        it.ventasTransferenciaSistema,
        it.totalEgresosCaja,
        it.efectivoEsperadoCaja,
        it.efectivoRealArqueado,
        it.diferenciaEfectivo,
        `"${it.estado}"`,
        `"${it.responsableCierre || 'N/A'}"`,
        `"${(it.notas || '').replace(/"/g, '""')}"`,
      ].join(';')
    );
  }

  lineas.push('');
  lineas.push(
    [
      '"TOTALES"',
      resumen.totalVentasSistema,
      resumen.totalCobradoEfectivo,
      resumen.totalCobradoTransferencia,
      resumen.totalEgresosPeriodo,
      '""',
      resumen.totalArqueadoFisico,
      resumen.diferenciaTotalNeta,
      `"${resuanDiferencias(resumen)}"`,
      '""',
      '""',
    ].join(';')
  );

  return '\uFEFF' + lineas.join('\r\n');
}

function resuanDiferencias(r: ResumenConciliacionContable): string {
  return `${r.diasCuadrados} cuadrados, ${r.diasConDiferencia} con diferencia, ${r.diasSinCierre} sin cierre`;
}

/**
 * Exporta los asientos contables en el formato del software contable seleccionado
 */
export function exportarSoftwareContableCSV(
  asientos: AsientoContableExportacion[],
  software: SoftwareContableTarget,
  nombreNegocio: string
): string {
  const lineas: string[] = [];

  if (software === 'siigo') {
    lineas.push('INTERFAZ CONTABLE DE VENTAS E INGRESOS PARA SIIGO');
    lineas.push(`"Empresa";"${nombreNegocio}"`);
    lineas.push(`"Generado";"${new Date().toISOString()}"`);
    lineas.push('');
    lineas.push(
      'CUENTA_CONTABLE;TERCERO_NIT;TIPO_COMPROBANTE;CONSECUTIVO;FECHA;DEBITO;CREDITO;BASE_GRAVABLE;CENTRO_COSTOS;DESCRIPCION'
    );
    for (const a of asientos) {
      lineas.push(
        [
          `"${a.cuentaContable}"`,
          `"${a.nitTercero}"`,
          `"${a.tipoDocumento}"`,
          `"${a.consecutivo}"`,
          `"${a.fecha}"`,
          a.debito,
          a.credito,
          a.baseGravable || 0,
          `"${a.centroCostos}"`,
          `"${a.concepto.replace(/"/g, '""')}"`,
        ].join(';')
      );
    }
  } else if (software === 'world_office') {
    lineas.push('IMPORTACION DE MOVIMIENTOS CONTABLES WORLD OFFICE');
    lineas.push(`"Empresa";"${nombreNegocio}"`);
    lineas.push('');
    lineas.push(
      'CODIGO_DOCUMENTO;CONSECUTIVO;FECHA;TERCERO;CUENTA_PUC;DEBITO;CREDITO;CENTRO_COSTOS;DETALLE'
    );
    for (const a of asientos) {
      lineas.push(
        [
          `"${a.tipoDocumento}"`,
          `"${a.consecutivo}"`,
          `"${a.fecha}"`,
          `"${a.nitTercero}"`,
          `"${a.cuentaContable}"`,
          a.debito,
          a.credito,
          `"${a.centroCostos}"`,
          `"${a.concepto.replace(/"/g, '""')}"`,
        ].join(';')
      );
    }
  } else if (software === 'helisa') {
    lineas.push('COMPROBANTE DE DIARIO HELISA GW');
    lineas.push(`"Empresa";"${nombreNegocio}"`);
    lineas.push('');
    lineas.push('DOCUMENTO;FECHA;CUENTA;NIT;CENTRO_COSTO;DEBITO;CREDITO;DETALLE');
    for (const a of asientos) {
      lineas.push(
        [
          `"${a.tipoDocumento}-${a.consecutivo}"`,
          `"${a.fecha}"`,
          `"${a.cuentaContable}"`,
          `"${a.nitTercero}"`,
          `"${a.centroCostos}"`,
          a.debito,
          a.credito,
          `"${a.concepto.replace(/"/g, '""')}"`,
        ].join(';')
      );
    }
  } else {
    // Generico PUC
    lineas.push('LIBRO DIARIO DE ASIENTOS CONTABLES - PLAN UNICO DE CUENTAS (PUC)');
    lineas.push(`"Empresa";"${nombreNegocio}"`);
    lineas.push('');
    lineas.push(
      'FECHA;COMPROBANTE;CONSECUTIVO;NIT_TERCERO;TERCERO;CUENTA_PUC;NOMBRE_CUENTA;DEBITO;CREDITO;BASE_GRAVABLE;CENTRO_COSTO;CONCEPTO'
    );
    for (const a of asientos) {
      lineas.push(
        [
          `"${a.fecha}"`,
          `"${a.tipoDocumento}"`,
          `"${a.consecutivo}"`,
          `"${a.nitTercero}"`,
          `"${a.nombreTercero}"`,
          `"${a.cuentaContable}"`,
          `"${a.nombreCuenta}"`,
          a.debito,
          a.credito,
          a.baseGravable || 0,
          `"${a.centroCostos}"`,
          `"${a.concepto.replace(/"/g, '""')}"`,
        ].join(';')
      );
    }
  }

  return '\uFEFF' + lineas.join('\r\n');
}

/**
 * Dispara la descarga de un archivo de texto/CSV con soporte UTF-8 en el navegador
 */
export function descargarArchivoCsv(contenido: string, nombreArchivo: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Genera el texto estructurado para enviar por WhatsApp al contador del negocio
 */
export function generarResumenWhatsAppContable(
  liq: LiquidacionFormulario310,
  conciliacion: ResumenConciliacionContable,
  consolidado: ConsolidadoLibroFiscal,
  nombreNegocio: string
): string {
  const lineas: string[] = [];

  lineas.push(`📊 *INFORME CONTABLE & TRIBUTARIO — ${nombreNegocio.toUpperCase()}*`);
  lineas.push(`📅 *Período:* ${liq.bimestreNombre} (${liq.anoGravable})`);
  lineas.push('');
  lineas.push('🏛️ *CONSOLIDADO IMPOCONSUMO (FORMULARIO 310 DIAN)*');
  lineas.push(`• *Ventas Brutas Gravadas 8%:* ${formatCOP(liq.ingresosBrutosRestaurantes8)}`);
  lineas.push(`• *Descuentos Concedidos:* -${formatCOP(liq.descuentosYAnulaciones)}`);
  lineas.push(`• *Base Gravable Líquida (R31):* ${formatCOP(liq.ingresosNetosGravados8)}`);
  lineas.push(`• *Impuesto al Consumo 8% (R40):* ${formatCOP(liq.impuestoGenerado8)}`);
  lineas.push(`• *Total Saldo a Pagar (R52):* *${formatCOP(liq.saldoAPagar)}*`);
  if (liq.propinasInformativas > 0) {
    lineas.push(`• *Propinas Voluntarias (No Gravadas):* ${formatCOP(liq.propinasInformativas)}`);
  }
  lineas.push('');
  lineas.push('💰 *CONCILIACION CAJA & MEDIOS DE PAGO*');
  lineas.push(`• *Ventas Totales Sistema:* ${formatCOP(conciliacion.totalVentasSistema)}`);
  lineas.push(`• *Cobrado Efectivo (${conciliacion.porcentajeEfectivo}%):* ${formatCOP(conciliacion.totalCobradoEfectivo)}`);
  lineas.push(`• *Cobrado Transferencia (${conciliacion.porcentajeTransferencia}%):* ${formatCOP(conciliacion.totalCobradoTransferencia)}`);
  lineas.push(`• *Egresos / Compras Registrados:* -${formatCOP(conciliacion.totalEgresosPeriodo)}`);
  lineas.push(`• *Diferencia Neta de Caja:* ${conciliacion.diferenciaTotalNeta >= 0 ? '+' : ''}${formatCOP(conciliacion.diferenciaTotalNeta)}`);
  lineas.push(`• *Estado Conciliación:* ${conciliacion.saludConciliacion === 'optima' ? '✅ Óptima' : conciliacion.saludConciliacion === 'alerta' ? '⚠️ Con diferencias menores' : '🚨 Requiere revisión'}`);
  lineas.push('');
  lineas.push('📖 *LIBRO FISCAL (ART. 616 E.T.)*');
  lineas.push(`• *Días con Operación:* ${consolidado.totalDiasConOperacion}`);
  lineas.push(`• *Documentos POS Emitidos:* ${consolidado.totalDocumentosEmitidos}`);
  lineas.push(`• *Saldo Neto Operacional:* ${formatCOP(consolidado.acumuladoSaldoNeto)}`);
  lineas.push('');
  lineas.push('_Generado automáticamente desde La Parada POS & Gestión Gastronómica._');

  return lineas.join('\n');
}
