import * as functions from 'firebase-functions/v2/scheduler';
import { BotQueueMessage } from './whatsappBotService';
interface BotRuntimeConfig {
    activo: boolean;
    mensajeBienvenida: string;
    mensajeCierre: string;
}
/**
 * Scheduled Cloud Function que procesa mensajes en queue
 * Se ejecuta cada 2 minutos
 */
export declare const procesarMensajesBot: functions.ScheduleFunction;
/**
 * Despertador inmediato de la cola de WhatsApp (patrón kickWhatsAppWorker de Sarin Bot).
 * Permite procesar los mensajes recién llegados al webhook sin esperar los 2 minutos del cron.
 */
export declare function kickWhatsAppQueueProcessor(limit?: number): Promise<void>;
/**
 * Procesa un mensaje individual
 */
export declare function procesarUnMensaje(mensaje: BotQueueMessage, runtimeConfig?: BotRuntimeConfig): Promise<void>;
/**
 * Limpia órdenes expiradas
 * Se ejecuta cada hora
 */
export declare const limpiarOrdenesExpiradas: functions.ScheduleFunction;
/**
 * Reintenta mensajes en error
 * Se ejecuta cada 5 minutos
 */
export declare const reintenrarMensajesEnError: functions.ScheduleFunction;
export {};
