import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { KioscoTurnosDrawer } from '../KioscoTurnosDrawer';
import type { Domicilio } from '@/types';

vi.mock('@/services/kioscoService', () => ({
  marcarPedidoKioscoPagado: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/components/storefront/StorefrontDialog', () => ({
  StorefrontDialog: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

describe('KioscoTurnosDrawer', () => {
  const mockPedidos: Domicilio[] = [
    {
      id: 'kiosco_001',
      numeroTurno: 'K-015',
      clienteNombre: 'Carlos Silva',
      total: 35000,
      metodoPago: 'efectivo',
      origen: 'kiosco',
      estado: 'pendiente',
      direccion: 'Salón - Mesa 2',
      barrio: 'Mesa 2',
      mesaNumero: '2',
      clienteTelefono: '3001234567',
      items: [
        {
          tipo: 'producto',
          referenciaId: 'p1',
          nombre: 'Hamburguesa Doble',
          cantidad: 1,
          precioUnitario: 25000,
          subtotal: 25000,
        },
      ],
      creadoEn: { seconds: 1600000000, nanoseconds: 0 } as any,
      actualizadoEn: { seconds: 1600000000, nanoseconds: 0 } as any,
      negocioId: 'laparada',
    },
  ];

  it('muestra la lista de turnos de kiosco pendientes de cobro y acciones de cobro', () => {
    const handleClose = vi.fn();
    const handleCargarAlTicket = vi.fn();

    const html = renderToStaticMarkup(
      <KioscoTurnosDrawer
        pedidos={mockPedidos}
        negocioId="laparada"
        onClose={handleClose}
        onCargarAlTicket={handleCargarAlTicket}
      />
    );

    expect(html).toContain('K-015');
    expect(html).toContain('Carlos Silva');
    expect(html).toContain('Paga con Efectivo');
    expect(html).toContain('Cobrar Turno');
    expect(html).toContain('Cargar al Ticket');
  });

  it('muestra estado vacío amigable cuando no hay turnos pendientes', () => {
    const html = renderToStaticMarkup(
      <KioscoTurnosDrawer
        pedidos={[]}
        negocioId="laparada"
        onClose={vi.fn()}
        onCargarAlTicket={vi.fn()}
      />
    );

    expect(html).toContain('¡Al día! No hay pedidos de kiosco pendientes de cobro');
  });
});
