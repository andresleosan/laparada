const admin = require('firebase-admin');

// Initialize using default credentials from Firebase CLI
admin.initializeApp({
  projectId: 'la-parada-ecb37',
  databaseURL: 'https://la-parada-ecb37.firebaseio.com'
});

const db = admin.firestore();

const crypto = require('crypto');
const DEFAULT_PIN = process.env.ADMIN_PIN_INITIAL ?? null;
if (!DEFAULT_PIN) throw new Error('ADMIN_PIN_INITIAL env var is required');
const PIN = DEFAULT_PIN;
const pinHash = crypto.createHash('sha256').update(PIN).digest('hex');

db.collection('config')
  .doc('admin')
  .set({
    pinHash: pinHash,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: 'system',
    lastPinChange: admin.firestore.FieldValue.serverTimestamp(),
    changedBy: 'system'
  }, { merge: true })
  .then(() => {
    console.log('✅ PIN administrativo creado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error creando PIN:', error.message);
    process.exit(1);
  });
