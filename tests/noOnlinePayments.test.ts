import { readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const PROJECT_ROOT = resolve('.');
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.yaml', '.yml']);
const FORBIDDEN_ONLINE_PAYMENT_PATTERN =
  /mercadopago|stripe|paypal|referenciaPasarela|paymentIntent|urlCheckout|retryFailedPayments|MERCADOPAGO_|STRIPE_/i;

function collectFiles(directory: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(directory)) {
    if (entry === 'node_modules') continue;
    const absolutePath = join(directory, entry);
    if (statSync(absolutePath).isDirectory()) {
      files.push(...collectFiles(absolutePath));
    } else if (CODE_EXTENSIONS.has(extname(entry))) {
      files.push(absolutePath);
    }
  }

  return files;
}

describe('alcance sin plataformas de pago en línea', () => {
  it('no contiene proveedores, secretos ni flujos de checkout en código o dependencias', () => {
    const candidates = [
      ...collectFiles(resolve('src')),
      ...collectFiles(resolve('functions')),
      resolve('package.json'),
      resolve('pnpm-lock.yaml'),
    ].filter((file) => !file.endsWith('noOnlinePayments.test.ts'));

    const violations = candidates.flatMap((file) => {
      const content = readFileSync(file, 'utf8');
      return FORBIDDEN_ONLINE_PAYMENT_PATTERN.test(content)
        ? [relative(PROJECT_ROOT, file)]
        : [];
    });

    expect(violations).toEqual([]);
  });
});
