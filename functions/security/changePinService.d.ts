import * as functions from 'firebase-functions';
/**
 * Cloud Function to change admin PIN
 * Requires: currentPin, newPin, confirmNewPin
 * Returns: success status and message
 */
export declare const changeAdminPin: functions.HttpsFunction & functions.Runnable<any>;
/**
 * Cloud Function to verify admin PIN
 * Used by client to validate PIN without exposing it
 */
export declare const verifyAdminPin: functions.HttpsFunction & functions.Runnable<any>;
