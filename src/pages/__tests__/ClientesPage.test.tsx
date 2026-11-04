import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import type { Cliente } from '@/types';

const mockClientes: Cliente[] = [
  {
    id: 'c-1',
    negocioId: 'laparada',
    nombre: 'Laura Mendoza',
    telefono: '3109876543',
    direcciones: ['Cra 1 #2-3, Centro'],
    barrio: 'Centro',
    totalPedidos: 5,
    totalConsumido: 120000,
    primerPedidoEn: new Date('2026-01-01'),
    ultimoPedidoEn: new Date('2026-11-01'),
    origenRegistro: 'pos',
    creadoEn: new Date('2026-01-01'),
    actualizadoEn: new Date('2026-11-01'),
    loDeSiempre: {
      items: [
        {
          tipo: 'producto',
          referenciaId: 'p-1',
          nombre: 'Hamburguesa La Parada',
          cantidad: 1,
          precioUnitario: 24000,
          subtotal: 24000,
        },
      ],
      total: 24000,
      actualizadoEn: new Date('2026-11-01'),
    },
  },
  {
    id: 'c-2',
    negocioId: 'laparada',
    nombre: 'Pedro Salazar',
    telefono: '3150001122',
    direcciones: [],
    barrio: 'Caobos',
    totalPedidos: 1,
    totalConsumido: 18000,
    primerPedidoEn: new Date('2026-10-15'),
    ultimoPedidoEn: new Date('2026-10-15'),
    origenRegistro: 'web',
    creadoEn: new Date('2026-10-15'),
    actualizadoEn: new Date('2026-10-15'),
  },
];

const mockUseClientesReturn = {
  clientes: mockClientes,
  loading: false,
  error: null,
  buscarClientes: vi.fn((termino: string) => {
    if (!termino) return mockClientes;
    return mockClientes.filter((c) =>
      c.nombre.toLowerCase().includes(termino.toLowerCase())
    );
  }),
  crearCliente: vi.fn(),
  actualizarCliente: vi.fn(),
  eliminarCliente: vi.fn(),
};

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: { id: 'laparada', nombre: 'La Parada' },
    usuarioNegocio: { uid: 'admin-1', nombre: 'Andrés Admin', rol: 'admin' },
    esSuperAdmin: false,
  }),
}));

vi.mock('@/hooks/useClientes', () => ({
  useClientes: () => mockUseClientesReturn,
}));

vi.mock('@/services/firebase', () => ({ auth: null, db: {} }));

import { ClientesPage } from '../ClientesPage';

describe('ClientesPage', () => {
  it('renderiza la vista principal con KPIs, buscador y tarjetas de clientes', () => {
    const html = renderToStaticMarkup(
      <StaticRouter location="/clientes">
        <ClientesPage />
      </StaticRouter>
    );

    expect(html).toContain('Directorio de Clientes');
    expect(html).toContain('Total Clientes');
    expect(html).toContain('Clientes VIP');
    expect(html).toContain('Laura Mendoza');
    expect(html).toContain('Pedro Salazar');
    expect(html).toContain('Nuevo Cliente');
  });

  it('muestra la insignia VIP para clientes con 3 o más pedidos', () => {
    const html = renderToStaticMarkup(
      <StaticRouter location="/clientes">
        <ClientesPage />
      </StaticRouter>
    );

    expect(html).toContain('VIP');
    expect(html).toContain('Hamburguesa La Parada');
  });
});
