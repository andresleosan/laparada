#!/usr/bin/env node

/**
 * Script de inicialización para crear el documento de configuración de PIN
 * Ejecutar una sola vez después de desplegar las Cloud Functions
 * 
 * Uso: npm run init-admin-pin
 */

const admin = require('firebase-admin');
const crypto = require('crypto');

// Validar que Firebase está inicializado
if (!process.env.FIREBASE_PROJECT_ID) {
  console.error('❌ Error: FIREBASE_PROJECT_ID no está configurado');
  process.exit(1);
}

// Inicializar Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: process.env.FIREBASE_PROJECT_ID,
});

const db = admin.firestore();

/**
 * Hash a PIN using SHA256
 */
function hashPin(pin) {
  return crypto.createHash('sha256').update(pin).digest('hex');
}

async function initAdminPin() {
  try {
    const initialPin = process.env.ADMIN_PIN_INITIAL || '140492';

    if (!/^\d{6}$/.test(initialPin)) {
      throw new Error('El PIN debe ser 6 dígitos');
    }

    const pinHash = hashPin(initialPin);

    console.log('📝 Inicializando PIN administrativo...');

    // Verificar si ya existe
    const configDoc = await db.collection('config').doc('admin').get();

    if (configDoc.exists) {
      console.log('⚠️ La configuración de PIN ya existe');
      console.log('Para cambiar el PIN, usa la página de Configuración de Administrador');
      process.exit(0);
    }

    // Crear documento de configuración
    await db.collection('config').doc('admin').set({
      pinHash: pinHash,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      initialized: true,
      note: 'PIN hasheado con SHA256. No se almacena en texto plano.',
    });

    console.log('✅ PIN administrativo inicializado correctamente');
    console.log('🔒 PIN: ' + '*'.repeat(initialPin.length) + ' (hasheado)');
    console.log('📚 Documento creado en: config/admin');

  } catch (error) {
    console.error('❌ Error al inicializar PIN:', error.message);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

// Ejecutar
initAdminPin();
