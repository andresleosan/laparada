import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    // A delayed import or failed mock must never select the local production project.
    env: {
      VITE_FIREBASE_API_KEY: 'demo-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'demo-la-parada-rules-test.firebaseapp.com',
      VITE_FIREBASE_PROJECT_ID: 'demo-la-parada-rules-test',
      VITE_FIREBASE_STORAGE_BUCKET: 'demo-la-parada-rules-test.appspot.com',
      VITE_FIREBASE_MESSAGING_SENDER_ID: '000000000000',
      VITE_FIREBASE_APP_ID: '1:000000000000:web:test',
      VITE_USE_FIREBASE_EMULATORS: 'true',
    },
    // Emulator I/O and first imports can exceed Vitest's 5 s unit-test default.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
}));
