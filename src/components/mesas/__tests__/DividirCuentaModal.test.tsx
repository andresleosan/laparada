import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DividirCuentaModal } from '../DividirCuentaModal';
import { formatCOP } from '@/utils/formatCOP';

describe('DividirCuentaModal', () => {
  it('no se renderiza si isOpen es false', () => {
    const html = renderToStaticMarkup(
      <DividirCuentaModal
        isOpen={false}
        mesaNombre="Mesa 1"
        totalCuenta={60000}
        onClose={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('calcula la división de cuenta correctamente para 3 comensales', () => {
    const html = renderToStaticMarkup(
      <DividirCuentaModal
        isOpen={true}
        mesaNombre="Mesa 4"
        totalCuenta={60000}
        comensalesIniciales={3}
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('Dividir Cuenta');
    expect(html).toContain('Mesa 4');
    // 60.000 / 3 = 20.000
    expect(html).toContain(formatCOP(20000));
    expect(html).toContain('Copiar Desglose');
  });
});
