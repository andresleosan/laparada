// src/utils/promocionesUtils.ts
import type {
  CanalPromocion,
  KpisPromociones,
  Promocion,
  ResultadoEvaluacionPromocion,
} from '@/types/promocion';
import type { ItemVenta } from '@/types';
import { formatCOP } from './formatCOP';
import QRCode from 'qrcode';

/**
 * Nombres cortos de los días de la semana (0 = Domingo)
 */
export const DIAS_SEMANA_LABELS = [
  { dia: 0, label: 'Dom', fullLabel: 'Domingo' },
  { dia: 1, label: 'Lun', fullLabel: 'Lunes' },
  { dia: 2, label: 'Mar', fullLabel: 'Martes' },
  { dia: 3, label: 'Mié', fullLabel: 'Miércoles' },
  { dia: 4, label: 'Jue', fullLabel: 'Jueves' },
  { dia: 5, label: 'Vie', fullLabel: 'Viernes' },
  { dia: 6, label: 'Sáb', fullLabel: 'Sábado' },
] as const;

/**
 * Formatea una hora en formato "HH:mm" a formato amigable "H:MM AM/PM"
 */
export function formatearHora12(horaHHmm?: string): string {
  if (!horaHHmm || !horaHHmm.includes(':')) return '';
  const [hStr, mStr] = horaHHmm.split(':');
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return horaHHmm;

  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mFmt = m.toString().padStart(2, '0');
  return `${h12}:${mFmt} ${ampm}`;
}

/**
 * Formatea los días de la semana en un texto conciso y comprensible
 */
export function formatearDiasSemana(dias?: number[]): string {
  if (!dias || dias.length === 0 || dias.length === 7) {
    return 'Todos los días';
  }
  const ordenados = [...dias].sort((a, b) => a - b);
  const diasStr = ordenados.join(',');

  if (diasStr === '1,2,3,4,5') return 'Lunes a Viernes';
  if (diasStr === '0,6') return 'Fines de semana';
  if (diasStr === '4,5,6') return 'Jueves a Sábado';
  if (diasStr === '5,6,0' || diasStr === '0,5,6') return 'Vie, Sáb y Dom';

  return ordenados
    .map((d) => DIAS_SEMANA_LABELS.find((item) => item.dia === d)?.label || `${d}`)
    .join(', ');
}

/**
 * Formatea el rango horario de una promoción
 */
export function formatearHorarioPromocion(horaInicio?: string, horaFin?: string): string {
  if (!horaInicio && !horaFin) return 'Todo el día';
  if (horaInicio && horaFin) {
    return `${formatearHora12(horaInicio)} – ${formatearHora12(horaFin)}`;
  }
  if (horaInicio) return `Desde las ${formatearHora12(horaInicio)}`;
  return `Hasta las ${formatearHora12(horaFin)}`;
}

/**
 * Evalúa si una promoción está vigente en un momento específico (día, hora y fechas)
 */
export function estaPromocionVigente(promocion: Promocion, ahora: Date = new Date()): boolean {
  if (!promocion.activo) return false;

  // 1. Límite de usos de cupones
  if (
    promocion.tipo === 'cupon_descuento' &&
    typeof promocion.limiteUsos === 'number' &&
    promocion.limiteUsos > 0
  ) {
    if ((promocion.usosActuales ?? 0) >= promocion.limiteUsos) {
      return false;
    }
  }

  // 2. Validación de rango de fechas calendario ("YYYY-MM-DD")
  const yyyy = ahora.getFullYear();
  const mm = String(ahora.getMonth() + 1).padStart(2, '0');
  const dd = String(ahora.getDate()).padStart(2, '0');
  const fechaActualIso = `${yyyy}-${mm}-${dd}`;

  if (promocion.fechaInicio && fechaActualIso < promocion.fechaInicio) {
    return false;
  }
  if (promocion.fechaFin && fechaActualIso > promocion.fechaFin) {
    return false;
  }

  // 3. Validación de días de la semana
  if (promocion.diasSemana && promocion.diasSemana.length > 0 && promocion.diasSemana.length < 7) {
    const diaActual = ahora.getDay(); // 0 a 6
    if (!promocion.diasSemana.includes(diaActual)) {
      return false;
    }
  }

  // 4. Validación de franja horaria ("HH:mm")
  if (promocion.horaInicio && promocion.horaFin) {
    const horaActual = ahora.getHours();
    const minActual = ahora.getMinutes();
    const minutosActuales = horaActual * 60 + minActual;

    const [hIni, mIni] = promocion.horaInicio.split(':').map((v) => parseInt(v, 10));
    const [hFin, mFin] = promocion.horaFin.split(':').map((v) => parseInt(v, 10));

    if (!isNaN(hIni) && !isNaN(mIni) && !isNaN(hFin) && !isNaN(mFin)) {
      const minutosInicio = hIni * 60 + mIni;
      const minutosFin = hFin * 60 + mFin;

      if (minutosFin >= minutosInicio) {
        // Franja dentro del mismo día (ej: 17:00 a 20:00)
        if (minutosActuales < minutosInicio || minutosActuales > minutosFin) {
          return false;
        }
      } else {
        // Franja que cruza la medianoche (ej: 21:00 a 02:00)
        if (minutosActuales < minutosInicio && minutosActuales > minutosFin) {
          return false;
        }
      }
    }
  }

  return true;
}

/**
 * Parámetros para la evaluación del carrito de compras
 */
export interface EvaluacionCarritoParams {
  promociones: Promocion[];
  items: ItemVenta[];
  subtotal?: number;
  canal?: CanalPromocion;
  codigoCupon?: string;
  ahora?: Date;
  categoriaPorProductoMap?: Record<string, string>;
}

/**
 * Evalúa las promociones aplicables a los ítems del carrito y retorna las mejores opciones
 */
export function evaluarPromocionesParaCarrito({
  promociones,
  items,
  subtotal,
  canal = 'todos',
  codigoCupon,
  ahora = new Date(),
  categoriaPorProductoMap = {},
}: EvaluacionCarritoParams): ResultadoEvaluacionPromocion[] {
  const subtotalSeguro =
    typeof subtotal === 'number' && subtotal >= 0
      ? Math.round(subtotal)
      : items.reduce((sum, item) => sum + (item.subtotal || item.precioUnitario * item.cantidad), 0);

  if (items.length === 0 || subtotalSeguro <= 0) {
    return [];
  }

  const resultados: ResultadoEvaluacionPromocion[] = [];
  const cuponBuscado = codigoCupon?.trim().toUpperCase();

  for (const promo of promociones) {
    // Si no está vigente temporalmente, continuar
    if (!estaPromocionVigente(promo, ahora)) {
      continue;
    }

    // Si la promoción está restringida a un canal y no coincide con el actual
    if (canal !== 'todos' && promo.canales && !promo.canales.includes('todos') && !promo.canales.includes(canal)) {
      continue;
    }

    // Si es tipo cupón, solo se evalúa si el código ingresado coincide
    if (promo.tipo === 'cupon_descuento') {
      if (!cuponBuscado || promo.codigoCupon?.toUpperCase() !== cuponBuscado) {
        continue;
      }
    }

    // Validar subtotal mínimo de la promoción si existe
    if (promo.montoMinimoSubtotal && subtotalSeguro < promo.montoMinimoSubtotal) {
      resultados.push({
        promocion: promo,
        esAplicable: false,
        montoDescuentoCOP: 0,
        mensaje: `Requiere una compra mínima de ${formatCOP(promo.montoMinimoSubtotal)} (faltan ${formatCOP(promo.montoMinimoSubtotal - subtotalSeguro)})`,
      });
      continue;
    }

    // Evaluación según el tipo de promoción
    let montoDescuentoCalculado = 0;
    let mensaje = '';
    const itemsAfectados: string[] = [];

    if (promo.tipo === 'dos_por_uno') {
      // 2x1 en productos o categorías seleccionadas
      let itemsElegibles = items;

      if (promo.productoIds && promo.productoIds.length > 0) {
        itemsElegibles = itemsElegibles.filter((item) => promo.productoIds?.includes(item.referenciaId));
      } else if (promo.categoriaIds && promo.categoriaIds.length > 0) {
        itemsElegibles = itemsElegibles.filter((item) => {
          const catId = categoriaPorProductoMap[item.referenciaId];
          return catId && promo.categoriaIds?.includes(catId);
        });
      }

      if (itemsElegibles.length === 0) {
        resultados.push({
          promocion: promo,
          esAplicable: false,
          montoDescuentoCOP: 0,
          mensaje: 'Agrega los productos en promoción para activar el 2x1',
        });
        continue;
      }

      for (const item of itemsElegibles) {
        const pares = Math.floor(item.cantidad / 2);
        if (pares > 0) {
          const ahorroItem = pares * item.precioUnitario;
          montoDescuentoCalculado += ahorroItem;
          itemsAfectados.push(item.referenciaId);
        }
      }

      if (montoDescuentoCalculado <= 0) {
        resultados.push({
          promocion: promo,
          esAplicable: false,
          montoDescuentoCOP: 0,
          mensaje: 'Agrega al menos 2 unidades del producto para activar el 2x1',
        });
        continue;
      }

      mensaje = `¡2x1 Aplicado! Ahorras ${formatCOP(montoDescuentoCalculado)}`;
    } else if (promo.tipo === 'descuento_categoria') {
      // Descuento en categorías específicas
      let subtotalCategorias = 0;
      for (const item of items) {
        const catId = categoriaPorProductoMap[item.referenciaId];
        const coincideCat = promo.categoriaIds?.length ? catId && promo.categoriaIds.includes(catId) : false;
        const coincideProd = promo.productoIds?.length ? promo.productoIds.includes(item.referenciaId) : false;

        if (coincideCat || coincideProd) {
          subtotalCategorias += item.subtotal || item.precioUnitario * item.cantidad;
          itemsAfectados.push(item.referenciaId);
        }
      }

      if (subtotalCategorias <= 0) {
        resultados.push({
          promocion: promo,
          esAplicable: false,
          montoDescuentoCOP: 0,
          mensaje: 'No hay productos en el carrito que apliquen a esta categoría en oferta',
        });
        continue;
      }

      if (promo.tipoDescuento === 'porcentaje') {
        const pct = Math.min(100, Math.max(0, promo.valorDescuento));
        montoDescuentoCalculado = Math.round((subtotalCategorias * pct) / 100);
      } else {
        montoDescuentoCalculado = Math.min(subtotalCategorias, promo.valorDescuento);
      }

      mensaje = `${promo.nombre}: Ahorras ${formatCOP(montoDescuentoCalculado)}`;
    } else {
      // Happy Hour / Descuento General / Cupón sobre total o ítems elegibles
      let baseCalculo = subtotalSeguro;

      // Si tiene categorías o productos específicos asociados
      if ((promo.categoriaIds && promo.categoriaIds.length > 0) || (promo.productoIds && promo.productoIds.length > 0)) {
        let subtotalFiltrado = 0;
        for (const item of items) {
          const catId = categoriaPorProductoMap[item.referenciaId];
          const coincideCat = promo.categoriaIds?.length ? catId && promo.categoriaIds.includes(catId) : false;
          const coincideProd = promo.productoIds?.length ? promo.productoIds.includes(item.referenciaId) : false;

          if (coincideCat || coincideProd) {
            subtotalFiltrado += item.subtotal || item.precioUnitario * item.cantidad;
            itemsAfectados.push(item.referenciaId);
          }
        }
        if (subtotalFiltrado <= 0) {
          resultados.push({
            promocion: promo,
            esAplicable: false,
            montoDescuentoCOP: 0,
            mensaje: 'No hay productos que apliquen para este descuento de Happy Hour',
          });
          continue;
        }
        baseCalculo = subtotalFiltrado;
      }

      if (promo.tipoDescuento === 'porcentaje') {
        const pct = Math.min(100, Math.max(0, promo.valorDescuento));
        montoDescuentoCalculado = Math.round((baseCalculo * pct) / 100);
      } else {
        montoDescuentoCalculado = Math.min(baseCalculo, promo.valorDescuento);
      }

      mensaje = `${promo.nombre}: ${formatCOP(montoDescuentoCalculado)} de descuento`;
    }

    // Aplicar tope máximo si está definido
    if (
      typeof promo.topeDescuentoMaximoCOP === 'number' &&
      promo.topeDescuentoMaximoCOP > 0 &&
      montoDescuentoCalculado > promo.topeDescuentoMaximoCOP
    ) {
      montoDescuentoCalculado = promo.topeDescuentoMaximoCOP;
    }

    // Piso 0 y techo subtotal seguro
    montoDescuentoCalculado = Math.max(0, Math.min(subtotalSeguro, montoDescuentoCalculado));

    if (montoDescuentoCalculado > 0) {
      resultados.push({
        promocion: promo,
        esAplicable: true,
        montoDescuentoCOP: montoDescuentoCalculado,
        mensaje,
        detalleAhorro: `Ahorro de ${formatCOP(montoDescuentoCalculado)}`,
        itemsAfectadosIds: itemsAfectados.length > 0 ? itemsAfectados : undefined,
      });
    }
  }

  // Ordenar de mayor a menor ahorro entregado
  return resultados.sort((a, b) => b.montoDescuentoCOP - a.montoDescuentoCOP);
}

/**
 * Valida un código de cupón y retorna el resultado de su verificación
 */
export function validarCodigoCupon(
  promociones: Promocion[],
  codigo: string,
  subtotal: number,
  canal: CanalPromocion = 'todos',
  ahora: Date = new Date()
): {
  valido: boolean;
  promocion?: Promocion;
  descuentoCOP: number;
  error?: string;
} {
  const normalizado = codigo.trim().toUpperCase();
  if (!normalizado) {
    return { valido: false, descuentoCOP: 0, error: 'Ingresa un código de cupón' };
  }

  const promo = promociones.find(
    (p) => p.tipo === 'cupon_descuento' && p.codigoCupon?.toUpperCase() === normalizado
  );

  if (!promo) {
    return { valido: false, descuentoCOP: 0, error: 'El cupón no existe o no es válido' };
  }

  if (!promo.activo) {
    return { valido: false, promocion: promo, descuentoCOP: 0, error: 'Este cupón está temporalmente inactivo' };
  }

  if (!estaPromocionVigente(promo, ahora)) {
    if (
      typeof promo.limiteUsos === 'number' &&
      promo.limiteUsos > 0 &&
      (promo.usosActuales ?? 0) >= promo.limiteUsos
    ) {
      return { valido: false, promocion: promo, descuentoCOP: 0, error: 'El cupón ha alcanzado el límite de usos' };
    }
    return { valido: false, promocion: promo, descuentoCOP: 0, error: 'El cupón se encuentra fuera de vigencia o horario' };
  }

  if (canal !== 'todos' && promo.canales && !promo.canales.includes('todos') && !promo.canales.includes(canal)) {
    const canalTexto = promo.canales.includes('pos') ? 'Mostrador POS' : 'Tienda Web';
    return { valido: false, promocion: promo, descuentoCOP: 0, error: `Cupón válido únicamente para ${canalTexto}` };
  }

  const subtotalSeguro = Number.isFinite(subtotal) ? Math.max(0, Math.round(subtotal)) : 0;
  if (promo.montoMinimoSubtotal && subtotalSeguro < promo.montoMinimoSubtotal) {
    return {
      valido: false,
      promocion: promo,
      descuentoCOP: 0,
      error: `Compra mínima requerida: ${formatCOP(promo.montoMinimoSubtotal)}`,
    };
  }

  let descuento = 0;
  if (promo.tipoDescuento === 'porcentaje') {
    const pct = Math.min(100, Math.max(0, promo.valorDescuento));
    descuento = Math.round((subtotalSeguro * pct) / 100);
  } else {
    descuento = Math.min(subtotalSeguro, promo.valorDescuento);
  }

  if (promo.topeDescuentoMaximoCOP && descuento > promo.topeDescuentoMaximoCOP) {
    descuento = promo.topeDescuentoMaximoCOP;
  }

  return {
    valido: true,
    promocion: promo,
    descuentoCOP: Math.max(0, Math.min(subtotalSeguro, descuento)),
  };
}

/**
 * Genera KPIs consolidados de promociones
 */
export function calcularKpisPromociones(promociones: Promocion[], ahora: Date = new Date()): KpisPromociones {
  let activas = 0;
  let happyHoursEnVivo = 0;
  let cuponesActivos = 0;
  let totalCanjesCupones = 0;

  for (const p of promociones) {
    const vigente = estaPromocionVigente(p, ahora);
    if (p.activo) {
      activas += 1;
    }
    if (p.tipo === 'happy_hour' && vigente) {
      happyHoursEnVivo += 1;
    }
    if (p.tipo === 'cupon_descuento') {
      if (p.activo && vigente) {
        cuponesActivos += 1;
      }
      totalCanjesCupones += p.usosActuales ?? 0;
    }
  }

  return {
    totalPromociones: promociones.length,
    activas,
    happyHoursEnVivo,
    cuponesActivos,
    totalCanjesCupones,
  };
}

/**
 * Genera un mensaje publicitario optimizado para enviar por WhatsApp
 */
export function generarMensajeWhatsAppPromocion(
  promocion: Promocion,
  nombreNegocio: string,
  urlTienda?: string
): string {
  const lineas: string[] = [];
  lineas.push(`🔥 *¡PROMOCIÓN EXCLUSIVA EN ${nombreNegocio.toUpperCase()}!* 🔥\n`);
  lineas.push(`✨ *${promocion.nombre}*`);
  if (promocion.descripcion) {
    lineas.push(`${promocion.descripcion}\n`);
  }

  // Beneficio
  if (promocion.tipo === 'dos_por_uno') {
    lineas.push('🎁 *Beneficio:* 2x1 en productos seleccionados');
  } else if (promocion.tipoDescuento === 'porcentaje') {
    lineas.push(`🏷️ *Beneficio:* ${promocion.valorDescuento}% de descuento`);
  } else {
    lineas.push(`💰 *Beneficio:* ${formatCOP(promocion.valorDescuento)} de descuento`);
  }

  // Horario y vigencia
  lineas.push(`⏰ *Horario:* ${formatearHorarioPromocion(promocion.horaInicio, promocion.horaFin)}`);
  lineas.push(`📅 *Días:* ${formatearDiasSemana(promocion.diasSemana)}`);

  if (promocion.tipo === 'cupon_descuento' && promocion.codigoCupon) {
    lineas.push(`\n🎟️ *CÓDIGO DE CUPÓN:* *${promocion.codigoCupon}*`);
    if (promocion.montoMinimoSubtotal) {
      lineas.push(`📌 *Compra mínima:* ${formatCOP(promocion.montoMinimoSubtotal)}`);
    }
    lineas.push('Presenta este código al ordenar en caja o úsalo en nuestra tienda web.');
  }

  if (urlTienda) {
    const enlaceCupon =
      promocion.codigoCupon
        ? `${urlTienda}${urlTienda.includes('?') ? '&' : '?'}cupon=${encodeURIComponent(promocion.codigoCupon)}`
        : urlTienda;
    lineas.push(`\n📲 *Pide aquí con tu beneficio:* ${enlaceCupon}`);
  }

  lineas.push('\n¡Te esperamos para consentirte!');
  return lineas.join('\n');
}

/**
 * Genera un Data URL con el código QR para el cupón
 */
export async function generarQrCuponDataUrl(urlTienda: string, codigoCupon: string): Promise<string> {
  const baseUrl = urlTienda || 'https://laparada.pages.dev';
  const urlFinal = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}cupon=${encodeURIComponent(codigoCupon)}`;

  return QRCode.toDataURL(urlFinal, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 400,
    color: {
      dark: '#0A0A0A',
      light: '#FFFFFF',
    },
  });
}

/**
 * Exporta el catálogo de promociones a Excel (CSV con UTF-8 BOM)
 */
export function exportarPromocionesCsv(promociones: Promocion[]): string {
  const encabezados = [
    'Nombre',
    'Tipo',
    'Descuento',
    'Código Cupón',
    'Horario',
    'Días',
    'Canales',
    'Monto Mínimo COP',
    'Tope Máximo COP',
    'Usos / Límite',
    'Estado',
    'Fecha Creación',
  ];

  const escapeCsv = (str: string | number | undefined | null) => {
    if (str === undefined || str === null) return '""';
    const clean = String(str).replace(/"/g, '""');
    return `"${clean}"`;
  };

  const filas = promociones.map((p) => {
    const desc =
      p.tipo === 'dos_por_uno'
        ? '2x1'
        : p.tipoDescuento === 'porcentaje'
          ? `${p.valorDescuento}%`
          : formatCOP(p.valorDescuento);

    const canales = p.canales?.join(', ') || 'todos';
    const horario = formatearHorarioPromocion(p.horaInicio, p.horaFin);
    const dias = formatearDiasSemana(p.diasSemana);
    const usos = p.limiteUsos ? `${p.usosActuales ?? 0}/${p.limiteUsos}` : `${p.usosActuales ?? 0}`;
    const estado = p.activo ? 'Activa' : 'Inactiva';

    return [
      escapeCsv(p.nombre),
      escapeCsv(p.tipo),
      escapeCsv(desc),
      escapeCsv(p.codigoCupon || 'N/A'),
      escapeCsv(horario),
      escapeCsv(dias),
      escapeCsv(canales),
      escapeCsv(p.montoMinimoSubtotal ? formatCOP(p.montoMinimoSubtotal) : 'N/A'),
      escapeCsv(p.topeDescuentoMaximoCOP ? formatCOP(p.topeDescuentoMaximoCOP) : 'N/A'),
      escapeCsv(usos),
      escapeCsv(estado),
      escapeCsv(p.creadoEn || 'N/A'),
    ].join(';');
  });

  // UTF-8 BOM para apertura perfecta en Excel
  return '\uFEFF' + [encabezados.join(';'), ...filas].join('\r\n');
}
