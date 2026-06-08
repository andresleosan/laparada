import * as admin from 'firebase-admin';

let db: FirebaseFirestore.Firestore | null = null;

// Inicializar Firebase Admin si no está ya inicializado
if (!admin.apps.length) {
  admin.initializeApp();
}

export function getDb(): FirebaseFirestore.Firestore {
  if (!db) {
    db = admin.firestore();
  }
  return db;
}

export function getAdmin() {
  return admin;
}
