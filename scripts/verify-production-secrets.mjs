// scripts/verify-production-secrets.mjs
import { execSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const REQUIRED_SECRETS = [
  'RESEND_API_KEY',
  'DEEPSEEK_API_KEY',
  'DEEPSEEK_API_KEY_SARIN_BOT',
  'WHATSAPP_ACCESS_TOKEN',
  'WHATSAPP_APP_SECRET',
  'WHATSAPP_WEBHOOK_VERIFY_TOKEN',
  'REMOVE_BG_API_KEY',
];

const REQUIRED_PARAMS = [
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_API_VERSION',
  'WHATSAPP_NEGOCIO_ID',
  'EMAIL_FROM_ADDRESS',
  'EMAIL_REPLY_TO',
  'PUBLIC_APP_URL',
];

function buildFirebaseSecretsCommand(secret) {
  const localBin = resolve(
    process.cwd(),
    process.platform === 'win32' ? 'node_modules/.bin/firebase.cmd' : 'node_modules/.bin/firebase'
  );
  const runner = existsSync(localBin) ? `"${localBin}"` : 'corepack pnpm exec firebase';
  return `${runner} functions:secrets:get ${secret} --project laparada-26`;
}

console.log('🔍 Verificando configuración de Secret Manager y entorno para laparada-26...\n');

// 1. Verificar variables en firebase-functions/.env.laparada-26
const envPath = resolve(process.cwd(), 'firebase-functions/.env.laparada-26');
if (!existsSync(envPath)) {
  console.error('❌ Falta el archivo firebase-functions/.env.laparada-26');
  process.exit(1);
}

const envContent = readFileSync(envPath, 'utf8');
let missingParams = 0;
for (const param of REQUIRED_PARAMS) {
  if (envContent.includes(`${param}=`)) {
    console.log(`  ✓ Parámetro operativo: ${param}`);
  } else {
    console.error(`  ✗ Falta parámetro operativo: ${param}`);
    missingParams++;
  }
}

if (missingParams > 0) {
  process.exit(1);
}

// 2. Verificar secretos en Google Cloud Secret Manager
console.log('\n🔒 Verificando secretos en Google Cloud Secret Manager...');
let missingSecrets = 0;
for (const secret of REQUIRED_SECRETS) {
  try {
    execSync(buildFirebaseSecretsCommand(secret), {
      encoding: 'utf8',
      stdio: 'pipe',
    });
    console.log(`  ✓ Secreto activo: ${secret}`);
  } catch {
    console.error(`  ✗ Falta o no accesible en Secret Manager: ${secret}`);
    missingSecrets++;
  }
}

if (missingSecrets > 0) {
  console.error(`\n❌ Error: ${missingSecrets} secretos no configurados.`);
  process.exit(1);
}

console.log('\n✅ Todos los secretos y parámetros operativos están verificados y listos para despliegue.');
