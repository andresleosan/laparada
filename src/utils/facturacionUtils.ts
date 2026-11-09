import type {
  AlertasResolucionConfig,
  ComprobanteZ,
  ConfiguracionFiscal,
  DesgloseImpuestoCalculado,
  EvaluacionResolucionDian,
  ResolucionDian,
  TipoImpuestoFiscal,
  Venta,
} from '@/types';
import { formatCOP } from './formatCOP';

/**
 * Calcula la base gravable y el valor del impuesto para un importe dado.
 * En gastronomía en Colombia, los precios exhibidos al público por norma general
 * incluyen el impuesto (preciosIncluyenImpuesto = true).
 */
export function calcularDesgloseFiscal(
  totalBruto: number,
  tarifaPorcentaje: number,
  preciosIncluyenImpuesto: boolean = true,
  tipoImpuesto: TipoImpuestoFiscal = 'inc'
): DesgloseImpuestoCalculado {
  const montoSeguro = Math.max(0, Math.round(totalBruto));

  if (montoSeguro === 0 || tarifaPorcentaje <= 0 || tipoImpuesto === 'ninguno') {
    return {
      baseGravable: montoSeguro,
      valorImpuesto: 0,
      tarifa: 0,
      tipo: tipoImpuesto === 'ninguno' ? 'ninguno' : tipoImpuesto,
      totalBruto: montoSeguro,
    };
  }

  if (preciosIncluyenImpuesto) {
    const factor = 1 + tarifaPorcentaje / 100;
    const baseGravable = Math.round(montoSeguro / factor);
    const valorImpuesto = Math.max(0, montoSeguro - baseGravable);
    return {
      baseGravable,
      valorImpuesto,
      tarifa: tarifaPorcentaje,
      tipo: tipoImpuesto,
      totalBruto: montoSeguro,
    };
  } else {
    const valorImpuesto = Math.round(montoSeguro * (tarifaPorcentaje / 100));
    return {
      baseGravable: montoSeguro,
      valorImpuesto,
      tarifa: tarifaPorcentaje,
      tipo: tipoImpuesto,
      totalBruto: montoSeguro + valorImpuesto,
    };
  }
}

/**
 * Formatea un número correlativo en el formato oficial de Documento Equivalente POS (ej: POS-00154).
 */
export function formatearConsecutivoFiscal(
  prefijo: string,
  numero: number,
  longitud: number = 5
): string {
  const prefijoLimpio = (prefijo || 'POS').trim().toUpperCase();
  const numPositivo = Math.max(1, Math.round(numero));
  return `${prefijoLimpio}-${String(numPositivo).padStart(longitud, '0')}`;
}

/**
 * Extrae el número numérico de un consecutivo con prefijo (ej: "POS-00154" -> 154).
 */
export function extraerNumeroConsecutivo(consecutivoTexto?: string): number | null {
  if (!consecutivoTexto) return null;
  const match = consecutivoTexto.match(/(\d+)$/);
  if (!match) return null;
  const parsed = parseInt(match[1], 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Evalúa el estado de vigencia y folios de una resolución DIAN.
 */
export function calcularAlertaResolucion(
  resolucion: ResolucionDian,
  alertasConfig?: AlertasResolucionConfig,
  fechaReferencia: Date = new Date()
): EvaluacionResolucionDian {
  const fechaVenc = new Date(resolucion.fechaVencimiento);
  const diffTiempo = fechaVenc.getTime() - fechaReferencia.getTime();
  const diasRestantes = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24));

  const rangoTotal = Math.max(1, resolucion.rangoFinal - resolucion.rangoInicial + 1);
  const foliosRestantes = Math.max(0, resolucion.rangoFinal - resolucion.consecutivoActual + 1);
  const foliosUsados = Math.max(0, resolucion.consecutivoActual - resolucion.rangoInicial);
  const porcentajeFoliosUsados = Math.min(
    100,
    Math.max(0, Math.round((foliosUsados / rangoTotal) * 100))
  );

  const diasMinimos = alertasConfig?.diasAnticipacionVencimiento ?? 30;
  const foliosMinimos = alertasConfig?.consecutivosMinimosRestantes ?? 100;

  if (diasRestantes < 0) {
    return {
      estado: 'vencida',
      diasRestantes,
      foliosRestantes,
      porcentajeFoliosUsados,
      color: 'rojo',
      mensaje: `Resolución DIAN vencida hace ${Math.abs(diasRestantes)} días. Requiere renovación urgente ante la DIAN.`,
      requiereAtencion: true,
    };
  }

  if (foliosRestantes <= 0) {
    return {
      estado: 'agotada',
      diasRestantes,
      foliosRestantes: 0,
      porcentajeFoliosUsados: 100,
      color: 'rojo',
      mensaje: 'Rango de consecutivos DIAN 100% agotado. Solicita nueva habilitación de numeración.',
      requiereAtencion: true,
    };
  }

  if (foliosRestantes <= foliosMinimos) {
    return {
      estado: 'agotando_folios',
      diasRestantes,
      foliosRestantes,
      porcentajeFoliosUsados,
      color: 'amarillo',
      mensaje: `Quedan solo ${foliosRestantes} consecutivos DIAN disponibles (${100 - porcentajeFoliosUsados}% restante).`,
      requiereAtencion: true,
    };
  }

  if (diasRestantes <= diasMinimos) {
    return {
      estado: 'proximo_a_vencer',
      diasRestantes,
      foliosRestantes,
      porcentajeFoliosUsados,
      color: 'amarillo',
      mensaje: `La resolución DIAN vence en ${diasRestantes} días (fecha límite: ${resolucion.fechaVencimiento}).`,
      requiereAtencion: true,
    };
  }

  return {
    estado: 'optimo',
    diasRestantes,
    foliosRestantes,
    porcentajeFoliosUsados,
    color: 'verde',
    mensaje: `Resolución DIAN vigente. ${foliosRestantes} folios disponibles (${diasRestantes} días restantes).`,
    requiereAtencion: false,
  };
}

/**
 * Consolida las operaciones del día para generar el Comprobante Z Diario de Corte Fiscal POS.
 */
export function generarComprobanteZ(
  ventas: Venta[],
  config: ConfiguracionFiscal,
  fechaCorte: string,
  generadoPor: string = 'Cajero Principal'
): ComprobanteZ {
  const fechaSegura = fechaCorte || new Date().toISOString().slice(0, 10);
  const horaActual = new Date().toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const ventasValidas = ventas.filter((v) => v.estado !== 'anulada');
  const ventasAnuladas = ventas.filter((v) => v.estado === 'anulada');

  let totalVentasBrutas = 0;
  let totalDescuentos = 0;
  let totalVentasNetas = 0;
  let baseGravableInc8 = 0;
  let impuestoInc8 = 0;
  let baseGravableIva19 = 0;
  let impuestoIva19 = 0;
  let baseExenta = 0;
  let totalPropinas = 0;
  let totalEfectivo = 0;
  let totalTransferencia = 0;

  const numerosConsecutivos: number[] = [];

  for (const venta of ventasValidas) {
    const subtotal = typeof venta.subtotal === 'number' ? venta.subtotal : venta.total;
    const desc = typeof venta.descuento === 'number' ? venta.descuento : 0;
    const prop = typeof venta.propina === 'number' ? venta.propina : 0;

    totalVentasBrutas += subtotal;
    totalDescuentos += desc;
    totalPropinas += prop;

    const netoVenta = Math.max(0, subtotal - desc);
    totalVentasNetas += netoVenta;

    if (venta.metodoPago === 'efectivo') {
      totalEfectivo += venta.total;
    } else {
      totalTransferencia += venta.total;
    }

    // Discriminación impositiva
    if (typeof venta.baseGravable === 'number' && typeof venta.valorImpuesto === 'number') {
      if (venta.tipoImpuesto === 'iva' || venta.tarifaImpuesto === 19) {
        baseGravableIva19 += venta.baseGravable;
        impuestoIva19 += venta.valorImpuesto;
      } else if (venta.tipoImpuesto === 'inc' || venta.tarifaImpuesto === 8) {
        baseGravableInc8 += venta.baseGravable;
        impuestoInc8 += venta.valorImpuesto;
      } else {
        baseExenta += venta.baseGravable;
      }
    } else {
      // Si la venta no tenía desglose precalculado, lo calculamos según la configuración
      const tarifa = config.tarifaDefault.porcentaje;
      const tipo = config.tarifaDefault.tipo;
      const desglose = calcularDesgloseFiscal(netoVenta, tarifa, config.preciosIncluyenImpuesto, tipo);

      if (tipo === 'iva') {
        baseGravableIva19 += desglose.baseGravable;
        impuestoIva19 += desglose.valorImpuesto;
      } else if (tipo === 'inc') {
        baseGravableInc8 += desglose.baseGravable;
        impuestoInc8 += desglose.valorImpuesto;
      } else {
        baseExenta += desglose.baseGravable;
      }
    }

    const numConsecutivo = extraerNumeroConsecutivo(venta.consecutivoFiscal);
    if (numConsecutivo !== null) {
      numerosConsecutivos.push(numConsecutivo);
    }
  }

  const prefijo = config.resolucion.prefijo || 'POS';
  let minConsecutivo = config.resolucion.consecutivoActual;
  let maxConsecutivo = config.resolucion.consecutivoActual;

  if (numerosConsecutivos.length > 0) {
    minConsecutivo = Math.min(...numerosConsecutivos);
    maxConsecutivo = Math.max(...numerosConsecutivos);
  }

  const totalImpuestos = impuestoInc8 + impuestoIva19;

  // Generar ID único amigable para el comprobante Z
  const numeroZ = `Z-${fechaSegura.replace(/-/g, '')}-${String(config.resolucion.consecutivoActual).padStart(4, '0')}`;

  return {
    id: `corte_${fechaSegura}_${Date.now()}`,
    negocioId: config.negocioId,
    numeroZ,
    fechaCorte: fechaSegura,
    horaGeneracion: horaActual,
    generadoPor,
    resolucionNumero: config.resolucion.numeroResolucion,
    prefijo,
    rangoInicial: minConsecutivo,
    rangoFinal: maxConsecutivo,
    consecutivoInicialTexto: formatearConsecutivoFiscal(prefijo, minConsecutivo),
    consecutivoFinalTexto: formatearConsecutivoFiscal(prefijo, maxConsecutivo),
    totalDocumentosEmitidos: ventasValidas.length,
    totalDocumentosAnulados: ventasAnuladas.length,
    totalVentasBrutas,
    totalDescuentos,
    totalVentasNetas,
    baseGravableInc8,
    impuestoInc8,
    baseGravableIva19,
    impuestoIva19,
    baseExenta,
    totalImpuestos,
    totalPropinas,
    totalCobrado: totalEfectivo + totalTransferencia,
    totalEfectivo,
    totalTransferencia,
  };
}

/**
 * Genera el texto estructurado del Comprobante Z para compartir por WhatsApp.
 */
export function generarComprobanteZTextoWhatsApp(
  comprobante: ComprobanteZ,
  config: ConfiguracionFiscal
): string {
  const lineas: string[] = [];

  lineas.push(`📋 *COMPROBANTE Z DIARIO DE CORTE FISCAL POS* 📋`);
  lineas.push(`🏢 *${config.razonSocial.toUpperCase()}*`);
  lineas.push(`📑 NIT: ${config.nit}-${config.dv || '0'} · ${config.regimenFiscal.toUpperCase()}`);
  lineas.push(`📍 ${config.direccionFiscal}, ${config.municipio}`);
  lineas.push('──────────────────────────────');
  lineas.push(`📅 *Fecha de Corte:* ${comprobante.fechaCorte} (${comprobante.horaGeneracion})`);
  lineas.push(`🆔 *Comprobante Z No.:* ${comprobante.numeroZ}`);
  lineas.push(`🏛️ *Resolución DIAN:* No. ${comprobante.resolucionNumero}`);
  lineas.push(`🔢 *Rango Expedido:* ${comprobante.consecutivoInicialTexto} a ${comprobante.consecutivoFinalTexto}`);
  lineas.push(`🧾 *Documentos Emitidos:* ${comprobante.totalDocumentosEmitidos}`);
  if (comprobante.totalDocumentosAnulados > 0) {
    lineas.push(`⚠️ *Documentos Anulados:* ${comprobante.totalDocumentosAnulados}`);
  }
  lineas.push('──────────────────────────────');
  lineas.push('*RESUMEN GENERAL DE OPERACIONES:*');
  lineas.push(`• Ventas Brutas: ${formatCOP(comprobante.totalVentasBrutas)} COP`);
  if (comprobante.totalDescuentos > 0) {
    lineas.push(`• Descuentos Comerciales: -${formatCOP(comprobante.totalDescuentos)} COP`);
  }
  lineas.push(`• Ventas Netas: ${formatCOP(comprobante.totalVentasNetas)} COP`);
  lineas.push('──────────────────────────────');
  lineas.push('*DISCRIMINACIÓN IMPOSITIVA:*');
  if (comprobante.baseGravableInc8 > 0 || comprobante.impuestoInc8 > 0) {
    lineas.push(`• Base Gravable INC (8%): ${formatCOP(comprobante.baseGravableInc8)} COP`);
    lineas.push(`• Impuesto Consumo (8%): ${formatCOP(comprobante.impuestoInc8)} COP`);
  }
  if (comprobante.baseGravableIva19 > 0 || comprobante.impuestoIva19 > 0) {
    lineas.push(`• Base Gravable IVA (19%): ${formatCOP(comprobante.baseGravableIva19)} COP`);
    lineas.push(`• Impuesto IVA (19%): ${formatCOP(comprobante.impuestoIva19)} COP`);
  }
  if (comprobante.baseExenta > 0) {
    lineas.push(`• Base Exenta / No Gravada: ${formatCOP(comprobante.baseExenta)} COP`);
  }
  lineas.push(`• Total Impuestos Recaudados: ${formatCOP(comprobante.totalImpuestos)} COP`);
  if (comprobante.totalPropinas > 0) {
    lineas.push(`• Propinas Voluntarias (No gravado): ${formatCOP(comprobante.totalPropinas)} COP`);
  }
  lineas.push('──────────────────────────────');
  lineas.push('*FORMAS DE PAGO RECIBIDAS:*');
  lineas.push(`💵 Efectivo: ${formatCOP(comprobante.totalEfectivo)} COP`);
  lineas.push(`📱 Transferencia / Bancos: ${formatCOP(comprobante.totalTransferencia)} COP`);
  lineas.push(`💰 *TOTAL CONSOLIDADO:* ${formatCOP(comprobante.totalCobrado)} COP`);
  lineas.push('──────────────────────────────');
  lineas.push(`👤 Generado por: ${comprobante.generadoPor}`);
  lineas.push('Sistema POS La Parada · Conforme art. 616-1 E.T.');

  return lineas.join('\n');
}

/**
 * Genera el archivo CSV con BOM UTF-8 del Comprobante Z Diario de Corte.
 */
export function generarComprobanteZCsv(
  comprobante: ComprobanteZ,
  config: ConfiguracionFiscal
): string {
  const lineas: string[] = [];

  lineas.push('COMPROBANTE Z DIARIO DE CORTE FISCAL POS');
  lineas.push(`"Razón Social";"${config.razonSocial}"`);
  lineas.push(`"NIT";"${config.nit}-${config.dv || '0'}"`);
  lineas.push(`"Régimen Fiscal";"${config.regimenFiscal}"`);
  lineas.push(`"Resolución DIAN";"${comprobante.resolucionNumero}"`);
  lineas.push(`"Fecha de Corte";"${comprobante.fechaCorte}"`);
  lineas.push(`"Hora Generación";"${comprobante.horaGeneracion}"`);
  lineas.push(`"Número Comprobante Z";"${comprobante.numeroZ}"`);
  lineas.push(`"Rango Consecutivos";"${comprobante.consecutivoInicialTexto} a ${comprobante.consecutivoFinalTexto}"`);
  lineas.push(`"Generado Por";"${comprobante.generadoPor}"`);
  lineas.push('');
  lineas.push('CONCEPTO;VALOR_COP');
  lineas.push(`"Documentos Equivalentes Emitidos";${comprobante.totalDocumentosEmitidos}`);
  lineas.push(`"Documentos Equivalentes Anulados";${comprobante.totalDocumentosAnulados}`);
  lineas.push(`"Total Ventas Brutas";${comprobante.totalVentasBrutas}`);
  lineas.push(`"Total Descuentos Comerciales";${comprobante.totalDescuentos}`);
  lineas.push(`"Total Ventas Netas";${comprobante.totalVentasNetas}`);
  lineas.push(`"Base Gravable Impoconsumo (INC 8%)";${comprobante.baseGravableInc8}`);
  lineas.push(`"Impuesto al Consumo (INC 8%)";${comprobante.impuestoInc8}`);
  lineas.push(`"Base Gravable IVA (19%)";${comprobante.baseGravableIva19}`);
  lineas.push(`"Impuesto IVA (19%)";${comprobante.impuestoIva19}`);
  lineas.push(`"Base Exenta / No Sujeta";${comprobante.baseExenta}`);
  lineas.push(`"Total Impuestos Recaudados";${comprobante.totalImpuestos}`);
  lineas.push(`"Total Propinas Voluntarias";${comprobante.totalPropinas}`);
  lineas.push(`"Total Cobrado en Efectivo";${comprobante.totalEfectivo}`);
  lineas.push(`"Total Cobrado en Transferencia";${comprobante.totalTransferencia}`);
  lineas.push(`"TOTAL GENERAL RECAUDADO";${comprobante.totalCobrado}`);

  return '\uFEFF' + lineas.join('\r\n');
}

/**
 * Dispara la descarga del Comprobante Z en formato CSV.
 */
export function descargarComprobanteZCsv(
  comprobante: ComprobanteZ,
  config: ConfiguracionFiscal
): void {
  if (typeof window === 'undefined') return;
  const contenido = generarComprobanteZCsv(comprobante, config);
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `comprobante_z_${comprobante.fechaCorte}_${comprobante.numeroZ}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Genera el listado CSV de documentos equivalentes POS para auditoría contable.
 */
export function generarHistorialPosCsv(
  ventas: Venta[],
  config: ConfiguracionFiscal
): string {
  const lineas: string[] = [];

  lineas.push('HISTORIAL DE DOCUMENTOS EQUIVALENTES POS - LA PARADA');
  lineas.push(`"Razón Social";"${config.razonSocial}"`);
  lineas.push(`"NIT";"${config.nit}-${config.dv || '0'}"`);
  lineas.push(`"Resolución DIAN";"${config.resolucion.numeroResolucion}"`);
  lineas.push(`"Fecha de Exportación";"${new Date().toISOString()}"`);
  lineas.push('');
  lineas.push(
    'CONSECUTIVO_POS;FECHA_HORA;CLIENTE;TIPO_ENTREGA;METODO_PAGO;SUBTOTAL_BRUTO;DESCUENTO;BASE_GRAVABLE;VALOR_IMPUESTO;TARIFA_PCT;PROPINA;TOTAL_COBRADO;ESTADO'
  );

  for (const venta of ventas) {
    const consecutivo = venta.consecutivoFiscal || `#${venta.id.slice(-6).toUpperCase()}`;
    const fecha = venta.fecha ? new Date(venta.fecha.toMillis()).toLocaleString('es-CO') : 'Sin fecha';
    const cliente = (venta.clienteNombre || 'Consumidor Final').replace(/"/g, '""');
    const entrega = venta.tipoEntrega || 'mostrador';
    const pago = venta.metodoPago;
    const subtotal = venta.subtotal ?? venta.total;
    const descuento = venta.descuento ?? 0;
    const base = venta.baseGravable ?? (subtotal - descuento);
    const impuesto = venta.valorImpuesto ?? 0;
    const tarifa = venta.tarifaImpuesto ?? config.tarifaDefault.porcentaje;
    const propina = venta.propina ?? 0;
    const total = venta.total;
    const estado = venta.estado || 'completada';

    lineas.push(
      `"${consecutivo}";"${fecha}";"${cliente}";"${entrega}";"${pago}";${subtotal};${descuento};${base};${impuesto};${tarifa};${propina};${total};"${estado}"`
    );
  }

  return '\uFEFF' + lineas.join('\r\n');
}

/**
 * Descarga el listado de ventas POS en CSV.
 */
export function descargarHistorialPosCsv(
  ventas: Venta[],
  config: ConfiguracionFiscal,
  nombreArchivo?: string
): void {
  if (typeof window === 'undefined') return;
  const contenido = generarHistorialPosCsv(ventas, config);
  const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo || `documentos_pos_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Retorna la configuración fiscal por defecto para un local.
 */
export function getConfiguracionFiscalDefault(
  negocioId: string,
  nombreNegocio: string = 'LA PARADA'
): ConfiguracionFiscal {
  const anioActual = new Date().getFullYear();
  return {
    negocioId,
    habilitado: true,
    razonSocial: `${nombreNegocio.toUpperCase()} GASTRONOMÍA ARTESANAL S.A.S.`,
    nombreComercial: nombreNegocio.toUpperCase(),
    nit: '901.845.123',
    dv: '5',
    tipoDocumentoIdentidad: 'NIT',
    regimenFiscal: 'responsable_inc',
    responsabilidad: 'Responsable de Impuesto Nacional al Consumo (INC 8%)',
    direccionFiscal: 'Av. 0 # 10-20, Barrio La Playa',
    municipio: 'Cúcuta',
    departamento: 'Norte de Santander',
    telefonoContacto: '310 123 4567',
    correoFiscal: 'facturacion@laparada.com',
    leyendaFiscal:
      'Documento Equivalente Electrónico POS expedido conforme al Decreto 358 de 2020 y Resolución DIAN vigente.',
    tarifaDefault: {
      tipo: 'inc',
      porcentaje: 8,
      nombre: 'Impuesto Nacional al Consumo (INC 8%)',
    },
    preciosIncluyenImpuesto: true,
    resolucion: {
      numeroResolucion: '18764089123456',
      fechaExpedicion: `${anioActual}-01-15`,
      fechaVencimiento: `${anioActual + 1}-01-15`,
      prefijo: 'POS',
      rangoInicial: 1,
      rangoFinal: 10000,
      consecutivoActual: 1,
      vigenciaMeses: 12,
    },
    alertas: {
      diasAnticipacionVencimiento: 30,
      consecutivosMinimosRestantes: 100,
    },
  };
}
