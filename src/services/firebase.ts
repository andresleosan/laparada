import { initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { connectStorageEmulator, getStorage } from 'firebase/storage';
import {
  CustomProvider,
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
} from 'firebase/app-check';

// Validación de variables de entorno en tiempo de inicialización
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

for (const key of requiredEnvVars) {
  const value = import.meta.env[key as keyof ImportMetaEnv];
  if (!value) {
    throw new Error(
      `Variable de entorno faltante: ${key}. Revisa tu archivo .env o .env.local`
    );
  }
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log('🔧 Inicializando Firebase con proyecto:', firebaseConfig.projectId);

const app = initializeApp(firebaseConfig);

let appCheckConfigured = false;
const useFirebaseEmulators = import.meta.env.DEV
  && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
const appCheckSiteKey = import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY?.trim();
if (useFirebaseEmulators) {
  const encodeJwtPart = (value: Record<string, unknown>) =>
    btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const nowSeconds = Math.floor(Date.now() / 1000);
  const emulatorToken = `${encodeJwtPart({ alg: 'none', typ: 'JWT' })}.${encodeJwtPart({
    app_id: firebaseConfig.appId,
    aud: [firebaseConfig.projectId],
    exp: nowSeconds + 3600,
    iat: nowSeconds,
    iss: `https://firebaseappcheck.googleapis.com/${firebaseConfig.projectId}`,
    sub: firebaseConfig.appId,
  })}.`;
  initializeAppCheck(app, {
    provider: new CustomProvider({
      getToken: async () => ({
        token: emulatorToken,
        expireTimeMillis: Date.now() + 60 * 60 * 1000,
      }),
    }),
    isTokenAutoRefreshEnabled: false,
  });
  appCheckConfigured = true;
} else if (appCheckSiteKey) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
    appCheckConfigured = true;
  } catch (error) {
    console.error('No fue posible inicializar Firebase App Check:', error);
  }
} else {
  console.warn('Firebase App Check no está configurado; el checkout público seguro no podrá enviar pedidos.');
}

let db: any = null;
let functions: any = null;
let storage: any = null;

// Intentar inicializar Firestore
try {
  db = getFirestore(app);
  if (useFirebaseEmulators) {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  }
  console.log('✅ Firestore inicializado correctamente');
} catch (error) {
  console.warn('⚠️ Firestore no disponible:', error);
}

// Intentar inicializar Storage
try {
  storage = getStorage(app);
  if (useFirebaseEmulators) {
    connectStorageEmulator(storage, '127.0.0.1', 9199);
  }
  console.log('✅ Firebase Storage inicializado correctamente');
} catch (error) {
  console.warn('⚠️ Firebase Storage no disponible:', error);
}

// Intentar inicializar Cloud Functions
try {
  functions = getFunctions(app, 'us-central1');
  if (useFirebaseEmulators) {
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }
  console.log('✅ Cloud Functions inicializado correctamente');
} catch (error) {
  console.warn('⚠️ Cloud Functions no disponible:', error);
}

// Intentar inicializar Auth
let auth: ReturnType<typeof getAuth> | null = null;
try {
  auth = getAuth(app);
  if (useFirebaseEmulators) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  console.log('✅ Auth inicializado correctamente');
} catch (error) {
  console.warn('⚠️ Auth no disponible:', error);
}

export { db, auth, functions, storage, appCheckConfigured };

export default app;
