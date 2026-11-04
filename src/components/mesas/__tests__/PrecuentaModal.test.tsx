import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PrecuentaModal } from '../PrecuentaModal';
import type { CuentaMesa } from '@/types/mesa';
import { formatCOP } from '@/utils/formatCOP';

describe('PrecuentaModal', () => {
  const mockCuenta: CuentaMesa = {
    id: 'c1',
    mesaId: 'm2',
    mesaNumero: 2,
    mesaNombre: 'Mesa 2',
    negocioId: 'test_tenant',
    estado: 'abierta',
    comensales: 3,
    mesero: 'Mateo',
    clienteNombre: 'Familia Ramírez',
    rondas: [],
    items: [
      { tipo: 'producto', referenciaId: 'p1', nombre: 'Panceroti Mixto', cantidad: 2, precioUnitario: 12000, subtotal: 24000 },
      { tipo: 'producto', referenciaId: 'p2', nombre: 'Jugo Natural', cantidad: 2, precioUnitario: 5000, subtotal: 10000 },
    ],
    total: 34000,
    apertura: { seconds: 1700000000, nanoseconds: 0 },
  };

  it('no se renderiza si isOpen es false o no hay cuenta', () => {
    const html = renderToStaticMarkup(
      <PrecuentaModal isOpen={false} cuenta={mockCuenta} onClose={vi.fn()} />
    );
    expect(html).toBe('');
  });

  it('renderiza la pre-cuenta con ítems, mesa y total formateado en COP', () => {
    const html = renderToStaticMarkup(
      <PrecuentaModal
        isOpen={true}
        cuenta={mockCuenta}
        negocioNombre="La Parada Grill"
        onClose={vi.fn()}
      />
    );

    expect(html).toContain('Pre-Cuenta de Salón');
    expect(html).toContain('Mesa 2');
    expect(html).toContain(formatCOP(34000));
    expect(html).toContain('Imprimir');
    expect(html).toContain('WhatsApp');
    expect(html).toContain('Copiar');
  });

  it('renderiza botón de cobro cuando se proporciona onProcederCobro', () => {
    const html = renderToStaticMarkup(
      <PrecuentaModal
        isOpen={true}
        cuenta={mockCuenta}
        onClose={vi.fn()}
        onProcederCobro={vi.fn()}
      />
    );

    expect(html).toContain('Proceder a Cobrar y Liberar Mesa');
  });
});
