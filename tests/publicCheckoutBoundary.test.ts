import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('frontera del checkout público', () => {
  it('envía pedidos por la callable y no escribe domicilios directamente', () => {
    const checkout = readFileSync(resolve('src/pages/LandingTiendaPage.tsx'), 'utf8');
    const service = readFileSync(resolve('src/services/publicOrderService.ts'), 'utf8');

    expect(checkout).toContain('createPublicOrder(');
    expect(checkout).not.toMatch(/addDoc\s*\(/);
    expect(checkout).not.toMatch(/collection\s*\(\s*db\s*,\s*['"]domicilios['"]/);
    expect(service).toContain("'crearPedidoPublico'");
    expect(service).toContain('limitedUseAppCheckTokens: true');
    expect(checkout).not.toContain('Pago al recibir');
  });

  it('mantiene las lecturas públicas de categorías libres de auto-sembrado', () => {
    const service = readFileSync(resolve('src/services/categoriasService.ts'), 'utf8');
    const readBoundary = service.slice(
      service.indexOf('export async function getCategorias'),
      service.indexOf('export async function crearCategoria')
    );

    expect(readBoundary).not.toContain('inicializarCategoriasPorDefecto(');
  });
});
