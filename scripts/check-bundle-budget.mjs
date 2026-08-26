import { readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const ASSETS_DIR = resolve('dist/assets');
const BUDGET_BYTES = 650_000;

const javascriptAssets = readdirSync(ASSETS_DIR)
  .filter((file) => file.endsWith('.js'))
  .map((file) => ({
    file,
    bytes: statSync(resolve(ASSETS_DIR, file)).size,
  }))
  .sort((a, b) => b.bytes - a.bytes);

if (javascriptAssets.length === 0) {
  console.error('No se encontraron assets JavaScript en dist/assets.');
  process.exit(1);
}

const largest = javascriptAssets[0];
const sizeInKb = (largest.bytes / 1024).toFixed(2);
console.log(`Bundle JS mayor: ${largest.file} (${sizeInKb} kB). Presupuesto: ${(BUDGET_BYTES / 1024).toFixed(0)} kB.`);

if (largest.bytes > BUDGET_BYTES) {
  console.error('El bundle JavaScript supera el presupuesto establecido.');
  process.exit(1);
}
