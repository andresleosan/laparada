"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analizarSentimiento = analizarSentimiento;
exports.analizarIntencion = analizarIntencion;
exports.generarRecomendaciones = generarRecomendaciones;
exports.generarRespuestaContextual = generarRespuestaContextual;
const axios_1 = __importDefault(require("axios"));
const CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
/**
 * Analiza el sentimiento de un mensaje usando Claude API
 * @param mensaje - Texto del cliente
 * @param historial - Mensajes previos (contexto)
 * @returns Análisis de sentimiento
 */
async function analizarSentimiento(mensaje, historial) {
    try {
        const prompt = `Analiza el sentimiento del siguiente mensaje de un cliente de una tienda de comida a domicilio.

Mensaje: "${mensaje}"

Responde en JSON con este formato exacto:
{
  "score": (número entre -1 y 1),
  "sentiment": ("negativo" | "neutral" | "positivo"),
  "confidence": (número entre 0 y 1),
  "keywords": [lista de palabras clave],
  "explanation": "breve explicación del análisis",
  "recommendedAction": "acción sugerida si es negativo"
}`;
        const response = await axios_1.default.post(CLAUDE_API_URL, {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 500,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        }, {
            headers: {
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01',
            },
        });
        const content = response.data.content[0].text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON encontrado en respuesta');
        }
        return JSON.parse(jsonMatch[0]);
    }
    catch (error) {
        console.error('Error en análisis de sentimiento:', error);
        // Fallback: análisis básico
        const score = mensaje.toLowerCase().includes('gracias') ? 0.5 :
            mensaje.toLowerCase().includes('problema') ? -0.5 : 0;
        return {
            score,
            sentiment: score < -0.2 ? 'negativo' : score > 0.2 ? 'positivo' : 'neutral',
            confidence: 0.3,
            keywords: [],
            explanation: 'Análisis fallido, usando valor por defecto',
        };
    }
}
/**
 * Analiza la intención del usuario en el mensaje
 * @param mensaje - Texto del usuario
 * @returns Análisis de intención
 */
async function analizarIntencion(mensaje) {
    try {
        const prompt = `Analiza la intención del siguiente mensaje de un cliente.

Mensaje: "${mensaje}"

Clasifica como:
- saludo: "hola", "buenos días", etc.
- menu: solicita ver el menú
- pedir: quiere hacer un pedido
- rastrear: quiere rastrear una orden
- queja: queja o problema
- elogio: felicitación o comentario positivo
- otro: otros

Responde en JSON:
{
  "intent": ("saludo" | "menu" | "pedir" | "rastrear" | "queja" | "elogio" | "otro"),
  "confidence": (0-1),
  "extractedEntities": {
    "productos": [lista de productos mencionados],
    "cantidad": número si se menciona,
    "negocioId": id del negocio si se menciona
  },
  "suggestedResponse": "respuesta sugerida breve"
}`;
        const response = await axios_1.default.post(CLAUDE_API_URL, {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 400,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        }, {
            headers: {
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01',
            },
        });
        const content = response.data.content[0].text;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON encontrado');
        }
        return JSON.parse(jsonMatch[0]);
    }
    catch (error) {
        console.error('Error en análisis de intención:', error);
        return {
            intent: 'otro',
            confidence: 0.3,
            extractedEntities: {},
            suggestedResponse: 'Ayuda disponible 24/7',
        };
    }
}
/**
 * Genera recomendaciones de productos personalizadas
 * @param historialCliente - Compras previas del cliente
 * @param preferencias - Preferencias conocidas del cliente
 * @returns Array de recomendaciones
 */
async function generarRecomendaciones(historialCliente, preferencias) {
    try {
        const historialTexto = historialCliente
            .map(p => `${p.nombre} (${p.categoria})`)
            .join(', ');
        const prompt = `Basándote en el historial de compras de este cliente, sugiere 3 productos que probablemente le interesen.

Historial de compras: ${historialTexto}
${preferencias ? `Preferencias adicionales: ${preferencias}` : ''}

Responde en JSON array:
[
  {
    "productId": "id_producto",
    "productName": "Nombre del producto",
    "reason": "Por qué se recomienda",
    "probability": 0.85
  }
]`;
        const response = await axios_1.default.post(CLAUDE_API_URL, {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 500,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        }, {
            headers: {
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01',
            },
        });
        const content = response.data.content[0].text;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('No array encontrado');
        }
        return JSON.parse(jsonMatch[0]);
    }
    catch (error) {
        console.error('Error generando recomendaciones:', error);
        return [];
    }
}
/**
 * Genera una respuesta contextual del bot usando Claude
 * @param mensaje - Mensaje del cliente
 * @param contexto - Contexto de la conversación
 * @returns Respuesta generada
 */
async function generarRespuestaContextual(mensaje, contexto) {
    try {
        let contextTexto = '';
        if (contexto) {
            contextTexto = `
Cliente: ${contexto.nombreCliente || 'Nuevo'}
Última orden: ${contexto.ultimaOrden || 'Sin órdenes previas'}
Total gastado: $${contexto.totalGastado || 0}
Tiempo promedio de entrega: ${contexto.tiempoPromedio || 30} min`;
        }
        const prompt = `Eres un asistente de atención al cliente para una tienda de comida a domicilio.

${contextTexto}

Mensaje del cliente: "${mensaje}"

Responde de forma amable, profesional y breve (máximo 3 líneas).
Sé natural y utiliza emojis cuando sea apropiado.`;
        const response = await axios_1.default.post(CLAUDE_API_URL, {
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 300,
            messages: [
                {
                    role: 'user',
                    content: prompt,
                },
            ],
        }, {
            headers: {
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01',
            },
        });
        return response.data.content[0].text;
    }
    catch (error) {
        console.error('Error generando respuesta:', error);
        return '¿Cómo te puedo ayudar? 😊';
    }
}
