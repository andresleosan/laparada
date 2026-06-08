import * as functions from 'firebase-functions/v2/scheduler';
/**
 * Scheduled function que reintenta transacciones fallidas
 * Se ejecuta cada 10 minutos
 */
export declare const retryFailedPayments: functions.ScheduleFunction;
