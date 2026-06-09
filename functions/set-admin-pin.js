const admin = require('firebase-admin');

// Initialize using default credentials from Firebase CLI
admin.initializeApp({
  projectId: 'la-parada-ecb37',
  databaseURL: 'https://la-parada-ecb37.firebaseio.com'
});

const db = admin.firestore();

const PIN = '140492';
const pinHash = '1ca857f69b8083c5663f1193d3f77aa87199a98ec43417073efbeac6c300fd7c';

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
    console.log('✅ PIN administrativo (140492) creado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error creando PIN:', error.message);
    process.exit(1);
  });
