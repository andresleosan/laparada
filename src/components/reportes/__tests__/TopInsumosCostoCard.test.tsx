import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { TopInsumosCostoCard } from '../TopInsumosCostoCard';
import type { InsumoConsumoCMV } from '@/types';

describe('TopInsumosCostoCard component', () => {
  it('renderiza estado vacío amigable cuando no hay consumo de insumos', () => {
    const html = renderToStaticMarkup(
      <TopInsumosCostoCard insumos={[]} totalCMV={0} />
    );

    expect(html).toContain('Sin consumo de recetas registrado en este período');
    expect(html).toContain('Insumos con Mayor Impacto en Costo (CMV)');
  });

  it('renderiza la lista de insumos con unidades y porcentajes', () => {
    const mockInsumos: InsumoConsumoCMV[] = [
      {
        insumoId: 'ins-carne',
        nombre: 'Carne Hamburguesa 150g',
        unidad: 'unidad',
        cantidadConsumida: 45,
        costoUnitarioEstimado: 4500,
        costoTotalCOP: 202500,
        porcentajeCMV: 60.5,
      },
      {
        insumoId: 'ins-pan',
        nombre: 'Pan Brioche',
        unidad: 'unidad',
        cantidadConsumida: 45,
        costoUnitarioEstimado: 1200,
        costoTotalCOP: 54000,
        porcentajeCMV: 16.1,
      },
    ];

    const html = renderToStaticMarkup(
      <TopInsumosCostoCard insumos={mockInsumos} totalCMV={334500} />
    );

    expect(html).toContain('Carne Hamburguesa 150g');
    expect(html).toContain('(45 unidad)');
    expect(html).toContain('60.5%');
    expect(html).toContain('Pan Brioche');
    expect(html).toContain('16.1%');
  });
});

