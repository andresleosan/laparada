#!/usr/bin/env node
/**
 * Build script que asegura que las variables de entorno se cargan correctamente
 */

const { spawnSync } = require('child_process');
const path = require('path');

// Establecer NODE_ENV
process.env.NODE_ENV = 'production';

// Compilar TypeScript primero
const tsc = spawnSync('npx', ['tsc'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'production' }
});

if (tsc.status !== 0) {
  console.error('TypeScript compilation failed');
  process.exit(1);
}

// Ejecutar el build de vite
const build = spawnSync('npx', ['vite', 'build'], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NODE_ENV: 'production' }
});

process.exit(build.status || 0);
