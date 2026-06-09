const admin = require('firebase-admin');
const crypto = require('crypto');
const fs = require('fs');

// Initialize Firebase Admin
try {
  // Try to use service account file if it exists
  if (fs.existsSync('./firebase-admin.json')) {
    const serviceAccount = JSON.parse(fs.readFileSync('./firebase-admin.json', 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: 'https://la-parada-ecb37.firebaseio.com'
    });
  } else {
    // Fallback to default credentials (Firebase CLI authenticated)
    admin.initializeApp({
      projectId: 'la-parada-ecb37'
    });
  }
} catch (error) {
  console.error('Error initializing Firebase:', error);
  process.exit(1);
}

const db = admin.firestore();

const PIN = '140492'; // El PIN a inicializar

// Hash the PIN using SHA256
const pinHash = crypto
  .createHash('sha256')
  .update(PIN)
  .digest('hex');

console.log(`PIN: ${PIN}`);
console.log(`PIN Hash: ${pinHash}`);

// Create the config/admin document
db.collection('config')
  .doc('admin')
  .set({
    pinHash: pinHash,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: 'system',
    lastPinChange: admin.firestore.FieldValue.serverTimestamp(),
    changedBy: 'system'
  })
  .then(() => {
    console.log('✅ PIN administrativo inicializado correctamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error al inicializar PIN:', error);
    process.exit(1);
  });
