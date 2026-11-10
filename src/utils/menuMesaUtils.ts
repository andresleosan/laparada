import QRCode from 'qrcode';
import type { CuentaMesa, ItemVenta } from '@/types';
import type {
  MotivoLlamadoMesero,
  MotivoLlamadoMeta,
  ResumenCuentaMesaComensal,
} from '@/types/menuMesa';
import { formatCOP } from './formatCOP';

/**
 * Catálogo predefinido de motivos de asistencia en salón para el comensal
 */
export const MOTIVOS_LLAMADO_MESERO: MotivoLlamadoMeta[] = [
  {
    id: 'asistencia',
    label: 'Atención / Consulta',
    descripcion: 'El mesero se acercará para resolver dudas o tomar pedidos adicionales',
    icono: 'BellRing',
  },
  {
    id: 'servilletas',
    label: 'Servilletas / Cubiertos',
    descripcion: 'Servilletas, cubiertos limpios, salsas o condimentos para la mesa',
    icono: 'UtensilsCrossed',
  },
  {
    id: 'bebidas_hielo',
    label: 'Hielo / Vasos',
    descripcion: 'Hielo adicional, vasos o bebidas refrescantes',
    icono: 'Wine',
  },
  {
    id: 'limpieza',
    label: 'Retirar Platos / Limpiar',
    descripcion: 'Retirar platos vacíos de rondas previas o despejar la mesa',
    icono: 'Sparkles',
  },
  {
    id: 'cuenta',
    label: 'Pedir la Cuenta',
    descripcion: 'Solicitar la pre-cuenta de control para revisar el consumo y pagar',
    icono: 'Receipt',
  },
  {
    id: 'otro',
    label: 'Otro Requerimiento',
    descripcion: 'Cualquier otra solicitud especial para el personal de servicio',
    icono: 'MessageSquare',
  },
];

/**
 * Obtiene los metadatos de un motivo de llamado
 */
export function getMotivoLlamadoMeta(motivo: MotivoLlamadoMesero): MotivoLlamadoMeta {
  const match = MOTIVOS_LLAMADO_MESERO.find((m) => m.id === motivo);
  if (match) return match;
  return {
    id: 'otro',
    label: 'Atención General',
    descripcion: 'Solicitud de asistencia en mesa',
    icono: 'BellRing',
  };
}

/**
 * Genera la URL pública interactiva para el menú de una mesa específica
 */
export function generarUrlMenuMesa(baseUrl: string, slug: string, numeroMesa: number): string {
  const cleanBase = (baseUrl || '').trim().replace(/\/+$/, '');
  const cleanSlug = (slug || 'laparada').trim().toLowerCase();
  const num = Math.max(1, Math.floor(Number(numeroMesa) || 1));
  return `${cleanBase}/mesa/${cleanSlug}/${num}`;
}

/**
 * Genera un Data URL con el código QR para el menú digital de mesa
 */
export async function generarQrMesaDataUrl(
  url: string,
  options?: QRCode.QRCodeToDataURLOptions
): Promise<string> {
  const defaultOptions: QRCode.QRCodeToDataURLOptions = {
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 600,
    color: {
      dark: '#0A0A0A',
      light: '#FFFFFF',
    },
    ...options,
  };
  return QRCode.toDataURL(url, defaultOptions);
}

/**
 * Calcula el resumen de consumo y saldos de la cuenta de mesa para visualización del comensal
 */
export function calcularResumenCuentaMesa(
  cuenta: CuentaMesa | null,
  propinaSugeridaPorcentaje = 10
): ResumenCuentaMesaComensal {
  if (!cuenta) {
    return {
      subtotal: 0,
      propinaSugerida: 0,
      total: 0,
      totalPagado: 0,
      saldoRestante: 0,
      itemsCount: 0,
      rondasCount: 0,
    };
  }

  const items = Array.isArray(cuenta.items) ? cuenta.items : [];
  const rondas = Array.isArray(cuenta.rondas) ? cuenta.rondas : [];

  const subtotalBruto = items.reduce((acc, item) => {
    const precio = Number(item.precioUnitario) || 0;
    const cant = Number(item.cantidad) || 0;
    return acc + precio * cant;
  }, 0);

  const descuento = Math.max(0, Number(cuenta.descuento) || 0);
  const subtotalNeto = Math.max(0, subtotalBruto - descuento);

  const propinaPorcentaje = Math.max(0, Number(propinaSugeridaPorcentaje) || 10);
  const propinaCalculada = Math.round((subtotalNeto * propinaPorcentaje) / 100);

  const totalCalculado = Number(cuenta.total) || subtotalNeto + (cuenta.propina || 0);

  const pagosParciales = Array.isArray(cuenta.pagosParciales) ? cuenta.pagosParciales : [];
  const totalPagado = pagosParciales.reduce((acc, pago) => acc + (Number(pago.monto) || 0), 0);

  const saldoRestante = Math.max(0, totalCalculado - totalPagado);
  const itemsCount = items.reduce((acc, it) => acc + (Number(it.cantidad) || 0), 0);

  return {
    subtotal: subtotalNeto,
    propinaSugerida: propinaCalculada,
    total: totalCalculado,
    totalPagado,
    saldoRestante,
    itemsCount,
    rondasCount: rondas.length,
  };
}

/**
 * Valida que los ítems del autopedido sean correctos antes de enviarlos a la mesa/cocina
 */
export function validarAutopedidoMesa(items: ItemVenta[]): { valido: boolean; error?: string } {
  if (!Array.isArray(items) || items.length === 0) {
    return { valido: false, error: 'Debes seleccionar al menos un producto para enviar a tu mesa.' };
  }

  for (const it of items) {
    if (!it.nombre || !it.nombre.trim()) {
      return { valido: false, error: 'Uno de los productos no tiene un nombre válido.' };
    }
    const cant = Number(it.cantidad);
    if (!Number.isFinite(cant) || cant <= 0) {
      return { valido: false, error: `Cantidad no válida para "${it.nombre}".` };
    }
    const precio = Number(it.precioUnitario);
    if (!Number.isFinite(precio) || precio < 0) {
      return { valido: false, error: `Precio no válido para "${it.nombre}".` };
    }
  }

  return { valido: true };
}

/**
 * Genera el texto formateado para compartir la pre-cuenta de la mesa por WhatsApp entre comensales
 */
export function generarTextoCompartirPrecuentaMesa(
  cuenta: CuentaMesa,
  negocioNombre = 'La Parada'
): string {
  const lineas: string[] = [];
  lineas.push(`🍽️ *PRE-CUENTA DE SALÓN — ${negocioNombre.toUpperCase()}*`);
  lineas.push(`📍 *${cuenta.mesaNombre || `Mesa ${cuenta.mesaNumero}`}*`);
  if (cuenta.meseroNombre || cuenta.mesero) {
    lineas.push(`👤 *Atendido por:* ${cuenta.meseroNombre || cuenta.mesero}`);
  }
  lineas.push('───────────────────────');
  lineas.push('📋 *Consumo de la Mesa:*');

  const items = Array.isArray(cuenta.items) ? cuenta.items : [];
  for (const it of items) {
    const cant = Number(it.cantidad) || 1;
    const sub = (Number(it.precioUnitario) || 0) * cant;
    let linea = `• ${cant}x ${it.nombre} → ${formatCOP(sub)}`;
    if (it.notas) linea += ` _(${it.notas})_`;
    lineas.push(linea);
  }

  lineas.push('───────────────────────');
  const resumen = calcularResumenCuentaMesa(cuenta);
  lineas.push(`*Subtotal:* ${formatCOP(resumen.subtotal)}`);

  if (cuenta.descuento && cuenta.descuento > 0) {
    lineas.push(`*Descuento:* -${formatCOP(cuenta.descuento)} (${cuenta.descuentoMotivo || 'Cortesía'})`);
  }

  lineas.push(`*Propina sugerida (10%):* ${formatCOP(resumen.propinaSugerida)}`);
  lineas.push(`*TOTAL A PAGAR:* ${formatCOP(resumen.total)}`);

  if (resumen.totalPagado > 0) {
    lineas.push(`*Abonado:* ${formatCOP(resumen.totalPagado)}`);
    lineas.push(`*SALDO RESTANTE:* ${formatCOP(resumen.saldoRestante)}`);
  }

  if (cuenta.comensales && cuenta.comensales > 1) {
    const porPersona = Math.round(resumen.saldoRestante / cuenta.comensales);
    lineas.push(`👥 *Dividido entre ${cuenta.comensales} personas:* aprox. ${formatCOP(porPersona)} c/u`);
  }

  lineas.push('');
  lineas.push('¡Gracias por visitarnos! 🙌');
  return lineas.join('\n');
}

/**
 * Genera un Blob PNG de alta resolución (1200×1600 px) con el tarjetón elegante de mesa
 * listo para imprimir y colocar en portamenús acrílicos de salón.
 */
export async function generarTarjetonMesaBlob(opciones: {
  negocioNombre: string;
  mesaNumero: number;
  mesaNombre: string;
  zona?: string;
  urlMesa: string;
}): Promise<Blob> {
  const qrDataUrl = await generarQrMesaDataUrl(opciones.urlMesa, {
    width: 650,
    margin: 1,
    color: { dark: '#0A0A0A', light: '#FFFFFF' },
  });

  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo inicializar el contexto 2D del Canvas');

  // Fondo oscuro gastronómico elegante
  ctx.fillStyle = '#0A0A0A';
  ctx.fillRect(0, 0, 1200, 1600);

  // Marco perimetral dorado
  ctx.strokeStyle = '#C9A84C';
  ctx.lineWidth = 14;
  ctx.strokeRect(40, 40, 1120, 1520);

  // Marco interior sutil
  ctx.strokeStyle = '#332711';
  ctx.lineWidth = 3;
  ctx.strokeRect(60, 60, 1080, 1480);

  // Encabezado — Nombre del Negocio
  ctx.fillStyle = '#C9A84C';
  ctx.font = 'bold 44px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(opciones.negocioNombre.toUpperCase(), 600, 160);

  // Subtítulo
  ctx.fillStyle = '#A3A3A3';
  ctx.font = '28px sans-serif';
  ctx.fillText('MENÚ DIGITAL & SERVICIO A LA MESA', 600, 215);

  // Línea dorada divisoria
  ctx.strokeStyle = '#C9A84C';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(350, 255);
  ctx.lineTo(850, 255);
  ctx.stroke();

  // Nombre de la Mesa / Número destacado
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 84px sans-serif';
  ctx.fillText(opciones.mesaNombre || `MESA ${opciones.mesaNumero}`, 600, 370);

  if (opciones.zona) {
    ctx.fillStyle = '#EAB308';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(`ZONA: ${opciones.zona.toUpperCase()}`, 600, 430);
  }

  // Contenedor blanco para el Código QR
  const qrBoxX = 275;
  const qrBoxY = 490;
  const qrBoxSize = 650;

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 36);
  ctx.fill();

  // Dibujar el Código QR cargado
  const qrImg = new Image();
  qrImg.src = qrDataUrl;
  await new Promise<void>((resolve, reject) => {
    qrImg.onload = () => resolve();
    qrImg.onerror = (err) => reject(err);
  });
  ctx.drawImage(qrImg, qrBoxX + 25, qrBoxY + 25, qrBoxSize - 50, qrBoxSize - 50);

  // Instrucciones didácticas para el comensal
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('¡ESCANEA CON TU TELÉFONO!', 600, 1220);

  ctx.fillStyle = '#D4D4D4';
  ctx.font = '30px sans-serif';
  ctx.fillText('1. Explora nuestra carta completa y fotos en vivo', 600, 1285);
  ctx.fillText('2. Llama al mesero a tu mesa con un solo toque', 600, 1335);
  ctx.fillText('3. Haz autopedido directo a cocina y pide tu cuenta', 600, 1385);

  // Pie de tarjeta
  ctx.fillStyle = '#C9A84C';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`la-parada.co · ${opciones.negocioNombre}`, 600, 1490);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('No se pudo convertir el Canvas a Blob'));
    }, 'image/png');
  });
}
