import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  StorefrontPreparacionesCasaModal,
  combinarNotasConSalsasCasa,
} from '../StorefrontPreparacionesCasaModal';

vi.mock('@/components/storefront/StorefrontDialog', () => ({
  StorefrontDialog: ({
    children,
    labelledBy,
    className,
  }: {
    children: ReactNode;
    labelledBy: string;
    className: string;
  }) => (
    <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className={className}>
      {children}
    </div>
  ),
}));

describe('StorefrontPreparacionesCasaModal', () => {
  it('renderiza las 4 preparaciones base, filtros por categoría y selector de salsas artesanales', () => {
    const html = renderToStaticMarkup(
      <StorefrontPreparacionesCasaModal
        isOpen={true}
        onClose={vi.fn()}
        negocioNombre="La Parada"
        notasActuales="Timbre blanco"
        salsasIniciales={['Salsa de Ajo de la Casa', 'Salsa Tártara Artesanal']}
        onAplicarSalsasAPedido={vi.fn()}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('Preparaciones de la Casa &amp; Salsas Artesanales');
    expect(html).toContain('Cocina Abierta · Lotes del Día');
    expect(html).toContain('data-testid="storefront-preparaciones-grid"');
    expect(html).toContain('Salsa de Ajo de la Casa');
    expect(html).toContain('Carne Desmechada Marinada');
    expect(html).toContain('Masa Artesanal de Tequeños y Pancerotis');
    expect(html).toContain('Mezcla de Quesos Fundidos para Relleno');
    expect(html).toContain('Frescura 72h');
    expect(html).toContain('Masas &amp; Panadería');
    expect(html).toContain('Elige tus Salsas Artesanales de Cortesía');
    expect(html).toContain('2 / 3 seleccionadas');
    expect(html).toContain('data-testid="btn-aplicar-salsas-pedido"');
    expect(html).toContain('Incluir Salsas en mi Pedido');
  });

  it('no renderiza contenido cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <StorefrontPreparacionesCasaModal
        isOpen={false}
        onClose={vi.fn()}
        negocioNombre="La Parada"
        notasActuales=""
        onAplicarSalsasAPedido={vi.fn()}
      />
    );

    expect(html).toBe('');
  });

  it('combina las salsas seleccionadas en notas sin sobrescribir instrucciones previas del cliente', () => {
    const conSalsas = combinarNotasConSalsasCasa('Apto 302, timbre blanco', [
      'Salsa de Ajo de la Casa',
      'Salsa Tártara Artesanal',
    ]);

    expect(conSalsas).toBe(
      'Apto 302, timbre blanco | Salsas de la casa: Salsa de Ajo de la Casa, Salsa Tártara Artesanal'
    );

    const actualizadas = combinarNotasConSalsasCasa(conSalsas, ['Picante Artesanal de la Casa']);
    expect(actualizadas).toBe(
      'Apto 302, timbre blanco | Salsas de la casa: Picante Artesanal de la Casa'
    );

    const sinSalsas = combinarNotasConSalsasCasa(actualizadas, []);
    expect(sinSalsas).toBe('Apto 302, timbre blanco');
  });
});
