import { assertOfflineOnlyContent } from '../bot/manualMessage';

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface EngineMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface EngineAssistantMessage {
  role: 'assistant';
  content: string | null;
  tool_calls?: ToolCall[];
}

export interface DeepSeekClientOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

const DEFAULT_DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';
const ALLOWED_DEEPSEEK_MODELS = new Set(['deepseek-chat', 'deepseek-flash', 'deepseek-reasoner']);
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

export class DeepSeekEngineError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'DeepSeekEngineError';
  }
}

export function cleanDeepSeekReply(value: string | null | undefined): string {
  const cleaned = (value ?? '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/gi, '')
    .trim();
  if (cleaned) {
    assertOfflineOnlyContent(cleaned);
  }
  return cleaned;
}

export function resolveDeepSeekConfig(options: DeepSeekClientOptions = {}): {
  apiKey: string;
  model: string;
  timeoutMs: number;
  url: string;
} {
  const rawKey = (options.apiKey ?? process.env.DEEPSEEK_API_KEY ?? '').trim();
  if (!rawKey || /\s|[\x00-\x1f\x7f]/.test(rawKey)) {
    throw new DeepSeekEngineError(
      503,
      'Configura una credencial válida de DeepSeek (DEEPSEEK_API_KEY) en el servidor.'
    );
  }

  const rawModel = (options.model ?? process.env.DEEPSEEK_MODEL ?? DEFAULT_DEEPSEEK_MODEL).trim();
  const model = ALLOWED_DEEPSEEK_MODELS.has(rawModel) ? rawModel : DEFAULT_DEEPSEEK_MODEL;

  const timeoutMs = Number(options.timeoutMs ?? process.env.LLM_REQUEST_TIMEOUT_MS ?? 45_000);
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000) {
    throw new DeepSeekEngineError(503, 'Tiempo de espera del motor DeepSeek no válido.');
  }

  return {
    apiKey: rawKey,
    model,
    timeoutMs,
    url: DEFAULT_DEEPSEEK_URL,
  };
}

export function isDeepSeekConfigured(apiKey?: string): boolean {
  const candidate = (apiKey ?? process.env.DEEPSEEK_API_KEY ?? '').trim();
  return Boolean(candidate && !/\s|[\x00-\x1f\x7f]/.test(candidate));
}

async function readBoundedResponseJson(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new DeepSeekEngineError(502, 'El motor DeepSeek devolvió una respuesta vacía.');
  }

  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new DeepSeekEngineError(502, 'Respuesta del motor DeepSeek demasiado grande.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder().decode(merged));
  } catch {
    throw new DeepSeekEngineError(502, 'Respuesta JSON no válida del motor DeepSeek.');
  }
}

function parseAssistantResponse(raw: unknown): EngineAssistantMessage {
  if (!raw || typeof raw !== 'object') {
    throw new DeepSeekEngineError(502, 'Respuesta no válida del motor DeepSeek.');
  }
  const choices = (raw as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0 || choices.length > 4) {
    throw new DeepSeekEngineError(502, 'El motor DeepSeek no devolvió opciones válidas.');
  }
  const firstChoice = choices[0] as { message?: unknown };
  if (!firstChoice || typeof firstChoice.message !== 'object' || !firstChoice.message) {
    throw new DeepSeekEngineError(502, 'Mensaje de respuesta inválido del motor DeepSeek.');
  }

  const msg = firstChoice.message as {
    content?: unknown;
    tool_calls?: unknown;
  };

  const content =
    msg.content === null || msg.content === undefined
      ? null
      : typeof msg.content === 'string' && msg.content.length <= 512_000
        ? msg.content
        : null;

  let parsedToolCalls: ToolCall[] | undefined;
  if (msg.tool_calls !== undefined) {
    if (!Array.isArray(msg.tool_calls) || msg.tool_calls.length > 8) {
      throw new DeepSeekEngineError(502, 'Lista de tool_calls inválida del motor DeepSeek.');
    }
    parsedToolCalls = msg.tool_calls.map((tc) => {
      if (!tc || typeof tc !== 'object') {
        throw new DeepSeekEngineError(502, 'Elemento tool_call inválido.');
      }
      const call = tc as {
        id?: unknown;
        type?: unknown;
        function?: { name?: unknown; arguments?: unknown };
      };
      if (
        typeof call.id !== 'string' ||
        !call.id.trim() ||
        call.id.length > 200 ||
        call.type !== 'function' ||
        !call.function ||
        typeof call.function.name !== 'string' ||
        !call.function.name.trim() ||
        call.function.name.length > 100 ||
        typeof call.function.arguments !== 'string' ||
        call.function.arguments.length > 64_000
      ) {
        throw new DeepSeekEngineError(502, 'Contrato de tool_call inválido.');
      }
      return {
        id: call.id,
        type: 'function' as const,
        function: {
          name: call.function.name,
          arguments: call.function.arguments,
        },
      };
    });
  }

  const normalizedContent = content ? cleanDeepSeekReply(content) : null;
  if (!normalizedContent && (!parsedToolCalls || parsedToolCalls.length === 0)) {
    throw new DeepSeekEngineError(502, 'El motor DeepSeek no produjo texto ni invocación de herramientas.');
  }

  return {
    role: 'assistant',
    content: normalizedContent,
    ...(parsedToolCalls && parsedToolCalls.length > 0 ? { tool_calls: parsedToolCalls } : {}),
  };
}

/**
 * Cliente de completado con soporte de Tool Calling basado en la arquitectura de Sarin Bot.
 */
export async function completeDeepSeekChat(
  messages: EngineMessage[],
  tools?: readonly ToolDefinition[],
  options: DeepSeekClientOptions = {}
): Promise<EngineAssistantMessage> {
  const config = resolveDeepSeekConfig(options);
  const fetchFn = options.fetchImpl ?? fetch;

  const requestMessages = messages.map((message) =>
    message.tool_calls
      ? {
          ...message,
          tool_calls: message.tool_calls.map((call) => ({
            id: call.id,
            type: call.type,
            function: call.function,
          })),
        }
      : message
  );

  const body = {
    model: config.model,
    messages: requestMessages,
    stream: false,
    max_tokens: 2048,
    temperature: 0.2,
    thinking: { type: 'disabled' as const },
    ...(tools && tools.length > 0 ? { tools, tool_choice: 'auto' as const } : {}),
  };

  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(config.timeoutMs)])
    : AbortSignal.timeout(config.timeoutMs);

  const response = await fetchFn(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    cache: 'no-store',
    redirect: 'error',
    signal,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    await response.body?.cancel();
    if (response.status === 401 || response.status === 403) {
      throw new DeepSeekEngineError(503, 'DeepSeek rechazó la credencial del servidor.');
    }
    if (response.status === 402) {
      throw new DeepSeekEngineError(503, 'DeepSeek no tiene saldo disponible en la cuenta.');
    }
    if (response.status === 429) {
      throw new DeepSeekEngineError(503, 'DeepSeek alcanzó su límite temporal de solicitudes.');
    }
    throw new DeepSeekEngineError(503, `No se pudo conectar con DeepSeek (HTTP ${response.status}).`);
  }

  const rawData = await readBoundedResponseJson(response);
  return parseAssistantResponse(rawData);
}

/**
 * Definición declarativa de las herramientas (Tools) para toma de pedidos de La Parada.
 */
export const LA_PARADA_ORDER_TOOLS: readonly ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'consultar_menu',
      description:
        'Consulta el catálogo actualizado de productos y combos disponibles en La Parada con sus IDs oficiales y precios en pesos colombianos (COP). Úsala antes de agregar productos si no conoces su ID.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          busqueda: {
            type: 'string',
            description: 'Filtro opcional por nombre o categoría (ej. "arepa", "tequeño", "combo").',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'modificar_carrito',
      description:
        'Agrega, reemplaza o vacía los ítems de la orden pendiente del cliente en Firestore usando únicamente los IDs oficiales devueltos por consultar_menu. El servidor recalcula todos los precios.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['operacion'],
        properties: {
          operacion: {
            type: 'string',
            enum: ['agregar', 'reemplazar', 'vaciar'],
            description:
              'Usa "agregar" para sumar ítems al carrito actual, "reemplazar" para definir la lista exacta del carrito, o "vaciar" para cancelar/limpiar la orden pendiente.',
          },
          items: {
            type: 'array',
            description: 'Lista de productos o combos con su ID oficial y cantidad entera.',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['productoId', 'catalogoTipo', 'cantidad'],
              properties: {
                productoId: {
                  type: 'string',
                  description: 'ID exacto del documento en productos o combos.',
                },
                catalogoTipo: {
                  type: 'string',
                  enum: ['producto', 'combo'],
                },
                cantidad: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 50,
                },
              },
            },
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'confirmar_pedido',
      description:
        'Confirma definitivamente la orden pendiente y registra el domicilio para cocina. Solo debe llamarse cuando ya hay ítems en el carrito y el cliente proporcionó dirección, barrio y medio de pago offline (efectivo o transferencia).',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['direccion', 'barrio', 'metodoPago'],
        properties: {
          clienteNombre: {
            type: 'string',
            description: 'Nombre del cliente si lo indicó.',
          },
          direccion: {
            type: 'string',
            description: 'Dirección física de entrega (ej. "Calle 10 # 20-30 Apto 201").',
          },
          barrio: {
            type: 'string',
            description: 'Barrio o sector de la entrega (ej. "Centro", "Caobos").',
          },
          referencia: {
            type: 'string',
            description: 'Indicaciones adicionales opcionales para el domiciliario.',
          },
          metodoPago: {
            type: 'string',
            enum: ['efectivo', 'transferencia'],
            description: 'Medio de pago estrictamente offline acordado con el cliente.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_estado_o_escalar',
      description:
        'Consulta el estado del último pedido a domicilio activo del cliente o transfiere la conversación a un operador humano del restaurante.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        required: ['accion'],
        properties: {
          accion: {
            type: 'string',
            enum: ['estado_pedido', 'hablar_con_humano'],
          },
          motivo: {
            type: 'string',
            description: 'Motivo breve si el cliente solicita atención de una persona.',
          },
        },
      },
    },
  },
];

export function buildLaParadaSystemPrompt(params: {
  nombreNegocio: string;
  mensajeBienvenida: string;
  mensajeCierre: string;
  catalogoResumen?: string;
  carritoResumen?: string;
}): string {
  return [
    `Eres el asistente virtual oficial de WhatsApp de ${params.nombreNegocio} en Cúcuta, Colombia.`,
    'Tu objetivo es atender clientes con calidez, rapidez y precisión para tomar pedidos a domicilio, mostrar el menú y consultar el estado de sus pedidos.',
    '',
    'REGLAS OBLIGATORIAS DE OPERACIÓN Y SEGURIDAD:',
    '1. AUTORIDAD DE PRECIOS EN EL SERVIDOR: Jamás inventes productos, combos, códigos ni precios. Usa siempre la herramienta `consultar_menu` o los IDs del catálogo activo.',
    '2. GESTIÓN DEL CARRITO: Cuando el cliente elija productos o combos y cantidades, llama a `modificar_carrito` con los `productoId` reales.',
    '3. PAGOS 100% OFFLINE: Solo aceptamos dos medios de pago offline: `efectivo` (contra entrega) o `transferencia` (acordada por este chat de WhatsApp). Nunca menciones ni envíes enlaces web de cobro.',
    '4. REQUISITOS PARA CONFIRMAR: Antes de llamar a `confirmar_pedido`, asegúrate de que el cliente haya indicado: (a) qué desea pedir, (b) dirección exacta y barrio de entrega, y (c) si paga en `efectivo` o `transferencia`.',
    '5. RELEVO HUMANO: Si el cliente tiene un reclamo complejo o pide hablar con una persona, llama a `consultar_estado_o_escalar` con `accion: "hablar_con_humano"`.',
    '6. ESTILO: Responde en español natural, conciso y amable, ideal para lectura rápida en WhatsApp.',
    '',
    `Mensaje base de bienvenida del negocio: "${params.mensajeBienvenida}"`,
    `Mensaje base de despedida al confirmar: "${params.mensajeCierre}"`,
    params.catalogoResumen ? `\nCATÁLOGO ACTIVO DISPONIBLE:\n${params.catalogoResumen}` : '',
    params.carritoResumen ? `\nESTADO ACTUAL DE LA ORDEN DEL CLIENTE:\n${params.carritoResumen}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export interface AgentToolExecutorContext {
  negocioId: string;
  numeroCliente: string;
  queueId: string;
  mensajeCierre?: string;
}

export interface AgentToolExecutionOutcome {
  accion: string;
  output: Record<string, unknown>;
}

export type AgentToolExecutor = (
  toolName: string,
  args: Record<string, unknown>,
  context: AgentToolExecutorContext
) => Promise<AgentToolExecutionOutcome>;

export async function runLaParadaOrderAgent(params: {
  userMessage: string;
  history?: EngineMessage[];
  systemPrompt: string;
  context: AgentToolExecutorContext;
  executeTool: AgentToolExecutor;
  completeChatFn?: typeof completeDeepSeekChat;
  clientOptions?: DeepSeekClientOptions;
}): Promise<{ accion: string; respuesta: string; toolActions: string[] }> {
  const completeFn = params.completeChatFn ?? completeDeepSeekChat;
  const messages: EngineMessage[] = [
    { role: 'system', content: params.systemPrompt },
    ...(params.history ?? []),
    { role: 'user', content: params.userMessage },
  ];

  const toolActions: string[] = [];
  let lastAction = 'respuesta_ia';

  for (let round = 0; round < 4; round++) {
    const assistant = await completeFn(messages, LA_PARADA_ORDER_TOOLS, params.clientOptions);
    messages.push(assistant);

    if (!assistant.tool_calls || assistant.tool_calls.length === 0) {
      const reply = cleanDeepSeekReply(assistant.content);
      if (!reply) {
        throw new DeepSeekEngineError(502, 'El agente finalizó sin respuesta de texto.');
      }
      return {
        accion: lastAction,
        respuesta: reply.slice(0, 4096),
        toolActions,
      };
    }

    for (const call of assistant.tool_calls) {
      let parsedArgs: Record<string, unknown> = {};
      try {
        const raw = call.function.arguments.trim() ? JSON.parse(call.function.arguments) : {};
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
          throw new Error('Los argumentos deben ser un objeto JSON.');
        }
        parsedArgs = raw as Record<string, unknown>;
      } catch (err) {
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({
            ok: false,
            error: err instanceof Error ? err.message : 'Argumentos JSON inválidos',
          }),
        });
        continue;
      }

      try {
        const outcome = await params.executeTool(call.function.name, parsedArgs, params.context);
        lastAction = outcome.accion;
        toolActions.push(outcome.accion);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({ ok: true, ...outcome.output }),
        });
      } catch (err) {
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify({
            ok: false,
            error: err instanceof Error ? err.message : 'Error ejecutando herramienta',
          }),
        });
      }
    }
  }

  throw new DeepSeekEngineError(502, 'El agente excedió el número máximo de rondas de herramientas.');
}

