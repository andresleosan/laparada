import * as functions from 'firebase-functions/v2/scheduler';
/**
 * Scheduled Cloud Function que procesa mensajes en queue
 * Se ejecuta cada 2 minutos
 */
export declare const procesarMensajesBot: functions.ScheduleFunction;
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
