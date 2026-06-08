import * as functions from 'firebase-functions';
/**
 * Cloud Function to initialize admin PIN (one-time setup)
 * This function creates the initial PIN configuration in Firestore
 * Only accessible with admin auth and should be deleted after use
 */
export declare const initializeAdminPin: functions.HttpsFunction & functions.Runnable<any>;
