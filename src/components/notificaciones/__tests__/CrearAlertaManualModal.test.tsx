import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CrearAlertaManualModal } from '../CrearAlertaManualModal';

vi.mock('@/components/storefront/StorefrontDialog', () => ({
  StorefrontDialog: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="dialog" className={className}>
      {children}
    </div>
  ),
}));

describe('CrearAlertaManualModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('no renderiza nada cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <CrearAlertaManualModal
        isOpen={false}
        onClose={vi.fn()}
        onCrear={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renderiza el formulario con selectores de módulo y urgencias cuando isOpen es true', () => {
    const html = renderToStaticMarkup(
      <CrearAlertaManualModal
        isOpen={true}
        onClose={vi.fn()}
        onCrear={vi.fn()}
      />
    );

    expect(html).toContain('Emitir Alerta Operativa');
    expect(html).toContain('Cocina &amp; KDS');
    expect(html).toContain('Salón &amp; Mesas');
    expect(html).toContain('Bodega &amp; Insumos');
    expect(html).toContain('Crítica');
    expect(html).toContain('Alta');
    expect(html).toContain('Emitir Alerta');
  });
});
