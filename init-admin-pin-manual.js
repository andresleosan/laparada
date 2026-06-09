#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Check if firebase config exists
const firebaseConfigPath = path.join(__dirname, '../.firebase/la-parada-ecb37.json');

const data = {
  pinHash: '1ca857f69b8083c5663f1193d3f77aa87199a98ec43417073efbeac6c300fd7c',
  createdAt: new Date().toISOString(),
  createdBy: 'system'
};

console.log('📝 Documento a crear:');
console.log(JSON.stringify(data, null, 2));
console.log('\n🔗 Ubicación: config/admin');
console.log('\nℹ️  Instrucciones para crear manualmente en Firebase Console:');
console.log('1. Ir a: https://console.firebase.google.com/project/la-parada-ecb37/firestore');
console.log('2. Crear colección: "config"');
console.log('3. Crear documento: "admin"');
console.log('4. Agregar campos con los valores de arriba');
console.log('5. O ejecutar desde Cloud Shell:');
console.log('\nCurl command:');

// Para propósitos de demostración
console.log(`
# Primero obtén un token de autenticación:
TOKEN=$(gcloud auth application-default print-access-token)

# Luego crea el documento:
curl -X POST \\
  https://firestore.googleapis.com/v1/projects/la-parada-ecb37/databases/(default)/documents/config \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "fields": {
      "pinHash": {"stringValue": "1ca857f69b8083c5663f1193d3f77aa87199a98ec43417073efbeac6c300fd7c"},
      "createdAt": {"timestampValue": "'$(date -u +'%Y-%m-%dT%H:%M:%SZ')'"},
      "createdBy": {"stringValue": "system"}
    }
  }' 
`);
