// src/services/sarinWebAssistant.ts
import type { Producto, Combo } from '@/types';
import { DEFAULT_NEGOCIO_ID } from '@/types/negocio';
import { formatCOP } from '@/utils/formatCOP';

export interface ContextoSarinWeb {
  mensajeCliente: string;
  negocioId: string;
  negocioNombre: string;
  productos?: Producto[];
  combos?: Combo[];
  telefonoNegocio?: string;
  direccionNegocio?: string;
  ciudadNegocio?: string;
  suscripcionValida?: boolean;
  cuotaRestante?: number;
}

export interface ItemDetectadoSarin {
  nombre: string;
  cantidad: number;
  precio: number;
}

export interface RespuestaSarinWeb {
  texto: string;
  sugerencias: string[];
  whatsappLink?: string;
  itemsDetectados?: ItemDetectadoSarin[];
}

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function generarEnlaceWhatsApp(telefono?: string, mensaje = 'Hola, quiero hacer un pedido'): string {
  const cel = (telefono || '3001234567').replace(/\D/g, '');
  const celNorm = cel.startsWith('57') ? cel : `57${cel}`;
  return `https://wa.me/${celNorm}?text=${encodeURIComponent(mensaje)}`;
}

/**
 * Saludo de bienvenida automático e interactivo para Sarin en el chat web.
 */
export function generarBienvenidaSarin(
  negocioNombre: string,
  productos: Producto[] = [],
  combos: Combo[] = []
): string {
  const destacado =
    productos.find((p) => p.destacado && p.disponible) ||
    combos.find((c) => c.destacado && c.disponible) ||
    productos.find((p) => p.disponible);

  if (destacado) {
    const precio = 'precio' in destacado ? destacado.precio : destacado.precioEspecial;
    return (
      `¡Hola! 👋 Soy Sarin, el asistente digital de ${negocioNombre}.\n\n` +
      `Hoy te recomiendo probar nuestra estrella: *${destacado.nombre}* (${formatCOP(precio)}).\n\n` +
      `¿Te gustaría ver nuestra carta completa, consultar promociones o armar tu pedido?`
    );
  }

  return (
    `¡Hola! 👋 Soy Sarin, el asistente digital de ${negocioNombre}.\n\n` +
    `Estoy aquí para ayudarte con el menú, responder preguntas de precios o guiarte en tu pedido.\n\n` +
    `¿En qué te puedo colaborar hoy?`
  );
}

/**
 * Motor conversacional de Sarin Bot para el storefront y marketplace.
 */
export function responderMensajeSarinWeb(contexto: ContextoSarinWeb): RespuestaSarinWeb {
  const {
    mensajeCliente,
    negocioId,
    negocioNombre,
    productos = [],
    combos = [],
    telefonoNegocio,
    direccionNegocio,
    ciudadNegocio,
    suscripcionValida = true,
    cuotaRestante = 1000,
  } = contexto;

  const raw = normalizar(mensajeCliente);

  // 1. Verificación de cuota de IA para locales SaaS aliados
  const esTenantInsignia = negocioId === DEFAULT_NEGOCIO_ID;
  if (!esTenantInsignia && (!suscripcionValida || cuotaRestante <= 0)) {
    const waLink = generarEnlaceWhatsApp(
      telefonoNegocio,
      `Hola ${negocioNombre}, quiero consultar la carta y hacer un pedido.`
    );
    return {
      texto:
        `El canal de atención inteligente de *${negocioNombre}* ha alcanzado su límite operativo de hoy. ` +
        `Para no hacerte esperar, puedes continuar tu pedido directamente a través de nuestro WhatsApp oficial.`,
      sugerencias: ['Abrir WhatsApp del local'],
      whatsappLink: waLink,
    };
  }

  // 2. Solicitud de relevo humano
  if (
    raw.includes('humano') ||
    raw.includes('asesor') ||
    raw.includes('operador') ||
    raw.includes('persona') ||
    raw.includes('alguien real')
  ) {
    const waLink = generarEnlaceWhatsApp(
      telefonoNegocio,
      `Hola ${negocioNombre}, solicito atención personalizada con un asesor humano.`
    );
    return {
      texto:
        `¡Con gusto! He notificado al equipo de *${negocioNombre}*. ` +
        `Un asesor humano tomará este chat en breve. Si tienes prisa, también puedes comunicarte directo por WhatsApp:`,
      sugerencias: ['Hablar por WhatsApp', 'Ver menú mientras espero'],
      whatsappLink: waLink,
    };
  }

  // 3. Formas de pago (Modelo 100 % pagos offline de La Parada)
  if (
    raw.includes('pago') ||
    raw.includes('pagar') ||
    raw.includes('tarjeta') ||
    raw.includes('nequi') ||
    raw.includes('daviplata') ||
    raw.includes('transferencia') ||
    raw.includes('efectivo')
  ) {
    return {
      texto:
        `En *${negocioNombre}* operamos con pagos directos y transparentes, sin sobrecostos:\n\n` +
        `💵 *Efectivo contra entrega*: pagas al recibir tu pedido en la mesa o en tu puerta.\n` +
        `📲 *Transferencias directas*: Nequi, Daviplata o Bancolombia coordinadas al momento de despachar.\n\n` +
        `¡Cero comisiones ni pasarelas intermediarias!`,
      sugerencias: ['¿Hacen domicilios?', 'Ver productos', 'Armar pedido'],
    };
  }

  // 4. Domicilios, cobertura, horarios y ubicación
  if (
    raw.includes('domicilio') ||
    raw.includes('entrega') ||
    raw.includes('ubicacion') ||
    raw.includes('donde estan') ||
    raw.includes('direccion') ||
    raw.includes('horario') ||
    raw.includes('abren')
  ) {
    const ubicacion = [direccionNegocio, ciudadNegocio].filter(Boolean).join(', ');
    const textoUbicacion = ubicacion ? `Nos encontramos en *${ubicacion}*.` : '';

    return {
      texto:
        `🛵 *Servicio y Cobertura de ${negocioNombre}*:\n\n` +
        `¡Sí contamos con servicio a domicilio! Los platos se preparan frescos al momento en que confirmas tu orden. ` +
        `${textoUbicacion}\n\n` +
        `El costo del envío y tiempo estimado se coordinan según tu barrio o dirección exacta.`,
      sugerencias: ['Ver menú', '¿Cómo pagar?', 'Pedir por WhatsApp'],
      whatsappLink: generarEnlaceWhatsApp(telefonoNegocio, `Hola ${negocioNombre}, ¿cuál es la cobertura de domicilios?`),
    };
  }

  // 5. Combos y Promociones
  if (
    raw.includes('combo') ||
    raw.includes('promocion') ||
    raw.includes('promo') ||
    raw.includes('oferta') ||
    raw.includes('descuento')
  ) {
    const combosActivos = combos.filter((c) => c.disponible);
    if (combosActivos.length > 0) {
      const lista = combosActivos
        .slice(0, 4)
        .map((c) => `🔥 *${c.nombre}* — ${formatCOP(c.precioEspecial)}\n   _${c.descripcion}_`)
        .join('\n\n');

      return {
        texto: `Aquí tienes nuestros mejores combos y promociones en *${negocioNombre}*:\n\n${lista}\n\n¿Te aparto alguno de estos para tu orden?`,
        sugerencias: ['Pedir combo', 'Ver productos individuales', 'Medios de pago'],
      };
    }
  }

  // 6. Búsqueda de producto específico por nombre o categoría
  const productosCoincidentes = productos.filter((p) => {
    if (!p.disponible) return false;
    const nombreNorm = normalizar(p.nombre);
    const catNorm = normalizar(p.categoria || '');
    return raw.includes(nombreNorm) || (raw.includes('precio') && raw.split(' ').some((palabra) => palabra.length > 3 && nombreNorm.includes(palabra))) || (catNorm && raw.includes(catNorm));
  });

  if (productosCoincidentes.length > 0) {
    const principal = productosCoincidentes[0];
    const items: ItemDetectadoSarin[] = [
      { nombre: principal.nombre, cantidad: 1, precio: principal.precio },
    ];

    const detalle = productosCoincidentes
      .slice(0, 3)
      .map((p) => `🍔 *${p.nombre}*: ${formatCOP(p.precio)}\n   _${p.descripcion}_`)
      .join('\n\n');

    const mensajeWa = `Hola ${negocioNombre}, quiero pedir ${principal.nombre} (${formatCOP(principal.precio)})`;

    return {
      texto:
        `¡Excelente elección! Aquí tienes el detalle de lo que buscas en *${negocioNombre}*:\n\n` +
        `${detalle}\n\n` +
        `¿Deseas que te lo preparemos o prefieres añadirle alguna bebida o adicional?`,
      sugerencias: [
        `Pedir ${principal.nombre}`,
        'Ver bebidas y acompañamientos',
        '¿Cómo pagar?',
      ],
      whatsappLink: generarEnlaceWhatsApp(telefonoNegocio, mensajeWa),
      itemsDetectados: items,
    };
  }

  // 7. Menú General / Carta
  if (
    raw.includes('menu') ||
    raw.includes('carta') ||
    raw.includes('venden') ||
    raw.includes('platos') ||
    raw.includes('tienen') ||
    raw.includes('opciones') ||
    raw.includes('recomiendas') ||
    raw.includes('recomendacion')
  ) {
    const disponibles = productos.filter((p) => p.disponible);
    const categorias = Array.from(new Set(disponibles.map((p) => p.categoria || 'Especialidades')));

    const muestraPlatos = disponibles
      .slice(0, 5)
      .map((p) => `• *${p.nombre}*: ${formatCOP(p.precio)}`)
      .join('\n');

    return {
      texto:
        `🍽️ *Nuestra Carta en ${negocioNombre}*:\n\n` +
        `Tenemos opciones deliciosas en: ${categorias.slice(0, 4).join(', ')}.\n\n` +
        `Algunos de los más pedidos:\n${muestraPlatos}\n\n` +
        `¿Te provoca algo en particular o quieres que te arme una recomendación?`,
      sugerencias: ['¿Qué combos tienen?', 'Ver promociones', '¿Cómo pagar?'],
    };
  }

  // 8. Saludos y mensajes cordiales
  if (
    raw.includes('hola') ||
    raw.includes('buenas') ||
    raw.includes('buenos dias') ||
    raw.includes('buenas tardes') ||
    raw.includes('buenas noches') ||
    raw.includes('hey')
  ) {
    return {
      texto:
        `¡Hola! Qué gusto saludarte. Soy *Sarin*, el asistente inteligente de *${negocioNombre}*. ` +
        `Estoy listo para contarte sobre nuestros platos, combos, precios o tomar los detalles de tu orden.\n\n` +
        `¿Qué te gustaría probar hoy?`,
      sugerencias: ['Ver menú completo', 'Combos del día', '¿Hacen domicilios?'],
    };
  }

  // 9. Respuesta por defecto amigable con sugerencias
  return {
    texto:
      `Te escucho. En *${negocioNombre}* puedo ayudarte a ver nuestra carta, conocer los precios oficiales, ` +
      `revisar los combos disponibles o coordinar tu pedido.\n\n` +
      `¿Te gustaría que te muestre los platos más recomendados?`,
    sugerencias: ['Ver carta y precios', 'Ver promociones', 'Hablar con un asesor'],
  };
}

