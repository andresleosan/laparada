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
export declare class DeepSeekEngineError extends Error {
    readonly status: number;
    constructor(status: number, message: string);
}
export declare function cleanDeepSeekReply(value: string | null | undefined): string;
export declare function resolveDeepSeekConfig(options?: DeepSeekClientOptions): {
    apiKey: string;
    model: string;
    timeoutMs: number;
    url: string;
};
export declare function isDeepSeekConfigured(apiKey?: string): boolean;
/**
 * Cliente de completado con soporte de Tool Calling basado en la arquitectura de Sarin Bot.
 */
export declare function completeDeepSeekChat(messages: EngineMessage[], tools?: readonly ToolDefinition[], options?: DeepSeekClientOptions): Promise<EngineAssistantMessage>;
/**
 * Definición declarativa de las herramientas (Tools) para toma de pedidos de La Parada.
 */
export declare const LA_PARADA_ORDER_TOOLS: readonly ToolDefinition[];
export declare function buildLaParadaSystemPrompt(params: {
    nombreNegocio: string;
    mensajeBienvenida: string;
    mensajeCierre: string;
    catalogoResumen?: string;
    carritoResumen?: string;
}): string;
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
export type AgentToolExecutor = (toolName: string, args: Record<string, unknown>, context: AgentToolExecutorContext) => Promise<AgentToolExecutionOutcome>;
export declare function runLaParadaOrderAgent(params: {
    userMessage: string;
    history?: EngineMessage[];
    systemPrompt: string;
    context: AgentToolExecutorContext;
    executeTool: AgentToolExecutor;
    completeChatFn?: typeof completeDeepSeekChat;
    clientOptions?: DeepSeekClientOptions;
}): Promise<{
    accion: string;
    respuesta: string;
    toolActions: string[];
}>;
