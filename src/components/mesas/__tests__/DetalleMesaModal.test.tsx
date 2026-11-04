import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DetalleMesaModal } from '../DetalleMesaModal';
import type { CuentaMesa, Mesa } from '@/types/mesa';
import type { Combo, Producto } from '@/types';
import { Timestamp } from 'firebase/firestore';

describe('DetalleMesaModal', () => {
  const mockMesa: Mesa = {
    id: 'm1',
    numero: 1,
    nombre: 'Mesa 1',
    capacidad: 4,
    zona: 'Salón Principal',
    estado: 'ocupada',
    comensales: 3,
    mesero: 'Carlos',
    totalActual: 40000,
    cuentaActivaId: 'c1',
    negocioId: 'test_tenant',
  };

  const mockCuenta: CuentaMesa = {
    id: 'c1',
    mesaId: 'm1',
    mesaNumero: 1,
    mesaNombre: 'Mesa 1',
    negocioId: 'test_tenant',
    estado: 'abierta',
    comensales: 3,
    mesero: 'Carlos',
    rondas: [
      {
        id: 'r1',
        numero: 1,
        enviadoEn: { seconds: 1700000000, nanoseconds: 0 },
        enviadoCocina: true,
        items: [
          { tipo: 'producto', referenciaId: 'p1', nombre: 'Hamburguesa Especial', cantidad: 2, precioUnitario: 20000, subtotal: 40000 },
        ],
        total: 40000,
      },
    ],
    items: [
      { tipo: 'producto', referenciaId: 'p1', nombre: 'Hamburguesa Especial', cantidad: 2, precioUnitario: 20000, subtotal: 40000 },
    ],
    total: 40000,
    apertura: { seconds: 1700000000, nanoseconds: 0 },
  };

  const mockProductos: Producto[] = [
    {
      id: 'p1',
      nombre: 'Hamburguesa Especial',
      descripcion: 'Carne artesanal',
      precio: 20000,
      disponible: true,
      negocioId: 'test_tenant',
      creadoEn: Timestamp.now(),
      actualizadoEn: Timestamp.now(),
    },
  ];

  const mockCombos: Combo[] = [];

  it('no renderiza nada cuando isOpen es false', () => {
    const html = renderToStaticMarkup(
      <DetalleMesaModal
        isOpen={false}
        mesa={mockMesa}
        cuenta={mockCuenta}
        productos={mockProductos}
        combos={mockCombos}
        onClose={vi.fn()}
        onAgregarRonda={vi.fn()}
        onPrecerrar={vi.fn()}
        onCobrar={vi.fn()}
        onCancelarCuenta={vi.fn()}
      />
    );
    expect(html).toBe('');
  });

  it('renderiza cabecera con nombre de la mesa, mesero y total de la cuenta', () => {
    const html = renderToStaticMarkup(
      <DetalleMesaModal
        isOpen={true}
        mesa={mockMesa}
        cuenta={mockCuenta}
        productos={mockProductos}
        combos={mockCombos}
        onClose={vi.fn()}
        onAgregarRonda={vi.fn()}
        onPrecerrar={vi.fn()}
        onCobrar={vi.fn()}
        onCancelarCuenta={vi.fn()}
      />
    );

    expect(html).toContain('Mesa 1');
    expect(html).toContain('3 personas');
    expect(html).toContain('Carlos');
    expect(html).toContain('Hamburguesa Especial');
    expect(html).toContain('Dividir');
    expect(html).toContain('Pre-Cuenta');
  });
});
