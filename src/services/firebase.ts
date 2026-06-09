// src/services/firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

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

let db: any = null;
let functions: any = null;

// Intentar inicializar Firestore
try {
  db = getFirestore(app);
  console.log('✅ Firestore inicializado correctamente');
} catch (error) {
  console.warn('⚠️ Firestore no disponible:', error);
  // Continuar sin Firestore no es crítico
}

// Intentar inicializar Cloud Functions
try {
  functions = getFunctions(app, 'us-central1');
  console.log('✅ Cloud Functions inicializado correctamente');
} catch (error) {
  console.warn('⚠️ Cloud Functions no disponible:', error);
}

// Intentar inicializar Auth
let auth: ReturnType<typeof getAuth> | null = null;
try {
  auth = getAuth(app);
  console.log('✅ Auth inicializado correctamente');
} catch (error) {
  console.warn('⚠️ Auth no disponible:', error);
}

export { db, auth, functions };

export default app;
