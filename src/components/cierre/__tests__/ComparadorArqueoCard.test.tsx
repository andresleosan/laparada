import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { ComparadorArqueoCard } from '../ComparadorArqueoCard';
import type { ArqueoEfectivo } from '@/types/cierreCaja';

describe('ComparadorArqueoCard', () => {
  it('renderiza estado cuadrado con balance en $0', () => {
    const arqueo: ArqueoEfectivo = {
      denominaciones: { b50k: 2 },
      totalBilletes: 100000,
      totalMonedas: 0,
      totalFisico: 100000,
      efectivoEsperado: 100000,
      diferencia: 0,
      estadoCuadre: 'cuadrado',
    };

    const html = renderToStaticMarkup(<ComparadorArqueoCard arqueo={arqueo} />);

    expect(html).toContain('Total Físico en Caja');
    expect(html).toContain('¡Cuadre exacto sin diferencias!');
    expect(html).toContain('$ 0 COP');
  });

  it('renderiza estado sobrante con diferencia positiva', () => {
    const arqueo: ArqueoEfectivo = {
      denominaciones: { b100k: 1 },
      totalBilletes: 100000,
      totalMonedas: 0,
      totalFisico: 100000,
      efectivoEsperado: 90000,
      diferencia: 10000,
      estadoCuadre: 'sobrante',
    };

    const html = renderToStaticMarkup(<ComparadorArqueoCard arqueo={arqueo} />);

    expect(html).toContain('Sobrante a favor de caja');
    expect(html).toContain('+');
  });

  it('renderiza estado faltante con alerta de dinero no encontrado', () => {
    const arqueo: ArqueoEfectivo = {
      denominaciones: { b20k: 2 },
      totalBilletes: 40000,
      totalMonedas: 0,
      totalFisico: 40000,
      efectivoEsperado: 50000,
      diferencia: -10000,
      estadoCuadre: 'faltante',
    };

    const html = renderToStaticMarkup(<ComparadorArqueoCard arqueo={arqueo} />);

    expect(html).toContain('Falta dinero físico según el sistema');
    expect(html).toContain('-');
  });
});
