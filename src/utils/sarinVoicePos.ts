import type { Combo, ItemVenta, MetodoPago, Producto } from '@/types';
import { formatCOP } from '@/utils/formatCOP';

export type SarinVoiceIntentType =
  | 'registrar_venta_directa'
  | 'agregar_al_carrito'
  | 'cobrar_carrito'
  | 'limpiar_carrito'
  | 'consultar_precio'
  | 'ayuda'
  | 'no_entendido';

export interface SarinVoiceMatchedItem {
  tipo: 'producto' | 'combo';
  referenciaId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface SarinVoiceCommandResult {
  wakeWordDetected: boolean;
  cleanCommand: string;
  intent: SarinVoiceIntentType;
  matchedItems: SarinVoiceMatchedItem[];
  metodoPago?: MetodoPago;
  montoRecibido?: number;
  totalCalculado: number;
  cambioCalculado?: number;
  faltanteCalculado?: number;
  spokenResponse: string;
  didacticTip?: string;
}

const NUMBER_WORDS: Record<string, number> = {
  un: 1,
  uno: 1,
  una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  quince: 15,
  veinte: 20,
  treinta: 30,
  cuarenta: 40,
  cincuenta: 50,
  cien: 100,
};

export function normalizeVoiceText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[.,;!?¿¡"$]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function singularizeWord(word: string): string {
  if (word.length <= 3) return word;
  if (word.endsWith('es') && word.length > 5 && !word.endsWith('ques')) {
    return word.slice(0, -2);
  }
  if (word.endsWith('s') && !word.endsWith('as') && !word.endsWith('os') && !word.endsWith('es')) {
    return word.slice(0, -1);
  }
  if (word.endsWith('os') || word.endsWith('as')) {
    return word.slice(0, -1);
  }
  return word;
}

function tokenizeCatalogName(name: string): string[] {
  const stopWords = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'en', 'por', 'para', 'y']);
  return normalizeVoiceText(name)
    .split(' ')
    .filter((w) => w.length >= 2 && !stopWords.has(w))
    .map(singularizeWord);
}

/**
 * Extrae un monto en pesos colombianos desde voz (ej. "con 5000 pesos", "con 20 mil", "con cinco mil").
 */
export function parseSpokenAmountCOP(normalizedText: string): number | undefined {
  // Caso 1: "5000", "5.000", "20 mil", "5 mil pesos"
  const numericMilMatch = normalizedText.match(
    /(?:con|de|recibo|recibiendo|paga con|billete de)\s+(\d{1,3})\s*mil\b/
  );
  if (numericMilMatch) {
    return Number(numericMilMatch[1]) * 1000;
  }

  // Caso 2: Palabra + mil, ej. "con cinco mil", "con veinte mil"
  const wordMilMatch = normalizedText.match(
    /(?:con|de|recibo|recibiendo|paga con|billete de)\s+(un|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|once|doce|quince|veinte|treinta|cuarenta|cincuenta|cien)\s+mil\b/
  );
  if (wordMilMatch) {
    const base = NUMBER_WORDS[wordMilMatch[1]];
    if (base) return base * 1000;
  }

  // Caso 3: Número explícito >= 500 después de "con" o antes de "pesos", ej. "con 5000 pesos"
  const directNumberMatch =
    normalizedText.match(/(?:con|recibo|paga con|billete de)\s+(\d{3,7})\b/) ||
    normalizedText.match(/\b(\d{3,7})\s*pesos\b/);
  if (directNumberMatch) {
    const amount = Number(directNumberMatch[1]);
    if (Number.isFinite(amount) && amount >= 500) {
      return amount;
    }
  }

  return undefined;
}

export function detectSpokenPaymentMethod(normalizedText: string): MetodoPago | undefined {
  if (
    normalizedText.includes('transferencia') ||
    normalizedText.includes('nequi') ||
    normalizedText.includes('daviplata') ||
    normalizedText.includes('bancolombia')
  ) {
    return 'transferencia';
  }
  if (
    normalizedText.includes('efectivo') ||
    normalizedText.includes('contado') ||
    normalizedText.includes('billete') ||
    /\bcon\s+\d+\s*(?:mil|pesos)?\b/.test(normalizedText)
  ) {
    return 'efectivo';
  }
  return undefined;
}

/**
 * Busca productos y combos del catálogo mencionados en la frase hablada y determina su cantidad.
 */
export function matchCatalogItemsFromSpeech(
  normalizedCommand: string,
  productos: Producto[],
  combos: Combo[]
): SarinVoiceMatchedItem[] {
  // Quitamos la cola de pago ("pagado en efectivo con 5000 pesos") para no confundir números con cantidades
  const commandWithoutPaymentTail = normalizedCommand
    .replace(/\b(?:pagado|pagada|pago|paga|cobrando|cobrado|en efectivo|por transferencia|con transferencia).*$/i, '')
    .replace(/\bcon\s+\d+\s*(?:mil|pesos).*$/i, '')
    .trim();

  const candidates: Array<{
    tipo: 'producto' | 'combo';
    id: string;
    nombre: string;
    precio: number;
    tokens: string[];
  }> = [
    ...productos
      .filter((p) => p.disponible !== false && p.precio > 0)
      .map((p) => ({
        tipo: 'producto' as const,
        id: p.id,
        nombre: p.nombre,
        precio: p.precio,
        tokens: tokenizeCatalogName(p.nombre),
      })),
    ...combos
      .filter((c) => c.disponible !== false && c.precioEspecial > 0)
      .map((c) => ({
        tipo: 'combo' as const,
        id: c.id,
        nombre: c.nombre,
        precio: c.precioEspecial,
        tokens: tokenizeCatalogName(c.nombre),
      })),
  ].filter((c) => c.tokens.length > 0);

  // Ordenar primero por mayor especificidad (más palabras en el nombre)
  candidates.sort((a, b) => b.tokens.length - a.tokens.length);

  const spokenWords = commandWithoutPaymentTail.split(' ').filter(Boolean);
  const spokenSingular = spokenWords.map(singularizeWord);
  const usedTokenIndices = new Set<number>();
  const matched: SarinVoiceMatchedItem[] = [];

  for (const candidate of candidates) {
    // Verificar si todos los tokens del producto (o al menos 2 si tiene >= 2) aparecen en la frase
    const matchedPositions: number[] = [];
    for (const token of candidate.tokens) {
      const pos = spokenSingular.findIndex(
        (sw, idx) =>
          !usedTokenIndices.has(idx) &&
          (sw === token ||
            (sw.length >= 4 && token.length >= 4 && (sw.startsWith(token) || token.startsWith(sw))))
      );
      if (pos !== -1) {
        matchedPositions.push(pos);
      }
    }

    const requiredMatches =
      candidate.tokens.length <= 2 ? candidate.tokens.length : Math.ceil(candidate.tokens.length * 0.75);

    if (matchedPositions.length >= requiredMatches) {
      const firstPos = Math.min(...matchedPositions);
      matchedPositions.forEach((p) => usedTokenIndices.add(p));

      // Buscar cantidad inmediatamente antes del primer token del producto (hasta 2 palabras atrás)
      let cantidad = 1;
      for (let lookback = 1; lookback <= 2; lookback++) {
        const prevIdx = firstPos - lookback;
        if (prevIdx < 0) break;
        const prevWord = spokenWords[prevIdx];
        if (prevWord === 'de' || prevWord === 'del') continue;
        if (/^\d{1,2}$/.test(prevWord)) {
          cantidad = Math.max(1, Math.min(50, Number(prevWord)));
          break;
        }
        if (NUMBER_WORDS[prevWord] && NUMBER_WORDS[prevWord] <= 50) {
          cantidad = NUMBER_WORDS[prevWord];
          break;
        }
      }

      matched.push({
        tipo: candidate.tipo,
        referenciaId: candidate.id,
        nombre: candidate.nombre,
        cantidad,
        precioUnitario: candidate.precio,
        subtotal: candidate.precio * cantidad,
      });
    }
  }

  return matched;
}

/**
 * Interpreta una frase hablada dirigida a "Sarin" en el Punto de Venta.
 */
export function parseSarinVoiceCommand(params: {
  transcript: string;
  productos: Producto[];
  combos: Combo[];
  currentCartItems?: ItemVenta[];
  requireWakeWord?: boolean;
}): SarinVoiceCommandResult {
  const normalized = normalizeVoiceText(params.transcript);
  const wakeRegex = /\b(?:sarin|sari|jarin|sharin|zarin)\b/;
  const wakeMatch = normalized.match(wakeRegex);
  const wakeWordDetected = Boolean(wakeMatch);

  if (params.requireWakeWord !== false && !wakeWordDetected) {
    return {
      wakeWordDetected: false,
      cleanCommand: normalized,
      intent: 'no_entendido',
      matchedItems: [],
      totalCalculado: 0,
      spokenResponse: '',
    };
  }

  const cleanCommand = wakeMatch
    ? normalized.slice((wakeMatch.index ?? 0) + wakeMatch[0].length).trim()
    : normalized;

  if (
    !cleanCommand ||
    cleanCommand === 'hola' ||
    cleanCommand.includes('que puedes hacer') ||
    cleanCommand.includes('ayuda') ||
    cleanCommand.includes('como funciona')
  ) {
    return {
      wakeWordDetected: true,
      cleanCommand,
      intent: 'ayuda',
      matchedItems: [],
      totalCalculado: 0,
      spokenResponse:
        'Estoy escuchando. Puedes decirme por ejemplo: "Sarin registra un panceroti ranchero pagado en efectivo con 5000 pesos", o "Sarin agrega dos arepas al carrito".',
      didacticTip:
        'Di "Sarin registra [producto] en efectivo con [monto]" para cobrar y calcular vueltas sin tocar la pantalla.',
    };
  }

  // Limpiar / vaciar carrito
  if (
    /\b(?:limpia|limpiar|vacia|vaciar|cancela|cancelar|borra|borrar)\b/.test(cleanCommand) &&
    /\b(?:carrito|ticket|orden|pedido|venta)\b/.test(cleanCommand)
  ) {
    return {
      wakeWordDetected: true,
      cleanCommand,
      intent: 'limpiar_carrito',
      matchedItems: [],
      totalCalculado: 0,
      spokenResponse: 'Listo, vacié el ticket actual.',
      didacticTip: 'Puedes empezar un nuevo pedido diciendo "Sarin agrega..." o "Sarin registra...".',
    };
  }

  const matchedItems = matchCatalogItemsFromSpeech(cleanCommand, params.productos, params.combos);
  const metodoPago = detectSpokenPaymentMethod(cleanCommand);
  const montoRecibido = parseSpokenAmountCOP(cleanCommand);

  // Consulta de precio
  if (
    /\b(?:cuanto cuesta|que vale|cuanto vale|precio de|a como es)\b/.test(cleanCommand) &&
    matchedItems.length > 0
  ) {
    const item = matchedItems[0];
    return {
      wakeWordDetected: true,
      cleanCommand,
      intent: 'consultar_precio',
      matchedItems,
      totalCalculado: item.precioUnitario,
      spokenResponse: `El ${item.nombre} tiene un valor de ${formatCOP(item.precioUnitario)}.`,
      didacticTip: `Si deseas venderlo de una vez, di: "Sarin registra un ${item.nombre} en efectivo".`,
    };
  }

  const wantsDirectSale =
    /\b(?:registra|registrar|vende|vender|facturar|factura|cobra|cobrar)\b/.test(cleanCommand) ||
    Boolean(metodoPago) ||
    Boolean(montoRecibido);

  // Caso: Cobrar el carrito que ya está en pantalla ("Sarin cobra en efectivo con 10000")
  if (
    matchedItems.length === 0 &&
    /\b(?:cobra|cobrar|registra la venta|confirma la venta|pagar)\b/.test(cleanCommand) &&
    params.currentCartItems &&
    params.currentCartItems.length > 0
  ) {
    const totalActual = params.currentCartItems.reduce((sum, i) => sum + i.subtotal, 0);
    const pago = metodoPago || 'efectivo';
    if (pago === 'efectivo' && montoRecibido !== undefined && montoRecibido < totalActual) {
      const faltante = totalActual - montoRecibido;
      return {
        wakeWordDetected: true,
        cleanCommand,
        intent: 'no_entendido',
        matchedItems: [],
        metodoPago: pago,
        montoRecibido,
        totalCalculado: totalActual,
        faltanteCalculado: faltante,
        spokenResponse: `Atención: el ticket suma ${formatCOP(totalActual)} y recibiste ${formatCOP(montoRecibido)}. Faltan ${formatCOP(faltante)}.`,
        didacticTip: 'Verifica el billete con el cliente e intenta de nuevo.',
      };
    }

    const cambio =
      pago === 'efectivo' && montoRecibido !== undefined ? montoRecibido - totalActual : undefined;
    return {
      wakeWordDetected: true,
      cleanCommand,
      intent: 'cobrar_carrito',
      matchedItems: [],
      metodoPago: pago,
      montoRecibido,
      totalCalculado: totalActual,
      cambioCalculado: cambio,
      spokenResponse:
        cambio !== undefined
          ? `¡Venta registrada por ${formatCOP(totalActual)} en efectivo! Recibiste ${formatCOP(montoRecibido!)}, devuelve ${formatCOP(cambio)} de cambio.`
          : `¡Venta registrada por ${formatCOP(totalActual)} en ${pago}!`,
    };
  }

  if (matchedItems.length === 0) {
    return {
      wakeWordDetected: true,
      cleanCommand,
      intent: 'no_entendido',
      matchedItems: [],
      totalCalculado: 0,
      spokenResponse:
        'No encontré ese producto en el catálogo activo. Dime el nombre tal como aparece en el menú.',
      didacticTip: 'Prueba diciendo el nombre exacto del producto y el medio de pago (efectivo o transferencia).',
    };
  }

  const totalCalculado = matchedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const resumenNombres = matchedItems
    .map((item) => `${item.cantidad} ${item.nombre}`)
    .join(' y ');

  if (wantsDirectSale) {
    const pago: MetodoPago = metodoPago || 'efectivo';
    if (pago === 'efectivo' && montoRecibido !== undefined && montoRecibido < totalCalculado) {
      const faltante = totalCalculado - montoRecibido;
      return {
        wakeWordDetected: true,
        cleanCommand,
        intent: 'agregar_al_carrito',
        matchedItems,
        metodoPago: pago,
        montoRecibido,
        totalCalculado,
        faltanteCalculado: faltante,
        spokenResponse: `Ojo: ${resumenNombres} cuesta ${formatCOP(totalCalculado)} y me indicaste ${formatCOP(montoRecibido)}. Faltan ${formatCOP(faltante)}. Lo agregué al ticket para que verifiques.`,
        didacticTip: 'Sarin protegió la caja evitando registrar un cobro menor al precio del catálogo.',
      };
    }

    const cambio =
      pago === 'efectivo' && montoRecibido !== undefined ? montoRecibido - totalCalculado : undefined;
    const cambioTexto =
      cambio !== undefined
        ? ` Recibiste ${formatCOP(montoRecibido!)}, devuelve ${formatCOP(cambio)} de cambio.`
        : '';

    return {
      wakeWordDetected: true,
      cleanCommand,
      intent: 'registrar_venta_directa',
      matchedItems,
      metodoPago: pago,
      montoRecibido,
      totalCalculado,
      cambioCalculado: cambio,
      spokenResponse: `¡Listo! Registré ${resumenNombres} por ${formatCOP(totalCalculado)} en ${pago}.${cambioTexto}`,
      didacticTip:
        cambio !== undefined && cambio > 0
          ? `Cambio exacto a entregar al cliente: ${formatCOP(cambio)}.`
          : 'La venta ya quedó sumada en la caja del día.',
    };
  }

  return {
    wakeWordDetected: true,
    cleanCommand,
    intent: 'agregar_al_carrito',
    matchedItems,
    totalCalculado,
    spokenResponse: `Agregué ${resumenNombres} al ticket (${formatCOP(totalCalculado)}). Di "Sarin cobra en efectivo" o "transferencia" para finalizar.`,
    didacticTip: 'Para registrar de una sola vez, incluye el medio de pago en tu frase.',
  };
}

