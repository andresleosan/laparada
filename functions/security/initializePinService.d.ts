import * as functions from 'firebase-functions';
/**
 * Initialize Admin PIN Cloud Function
 * One-time setup to create initial PIN in Firestore
 */
export declare const initializeAdminPin: functions.HttpsFunction & functions.Runnable<any>;
