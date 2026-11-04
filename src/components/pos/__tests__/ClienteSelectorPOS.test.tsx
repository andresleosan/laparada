import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ClienteSelectorPOS } from '../ClienteSelectorPOS';
import type { Cliente } from '@/types';

describe('ClienteSelectorPOS', () => {
  const clienteMockConLoDeSiempre: Cliente = {
    id: 'c-1',
    negocioId: 'laparada',
    nombre: 'Andrés Sánchez',
    telefono: '3001234567',
    direcciones: ['Cra 5 #12-34'],
    barrio: 'Centro',
    totalPedidos: 4,
    totalConsumido: 80000,
    primerPedidoEn: new Date(),
    ultimoPedidoEn: new Date(),
    origenRegistro: 'pos',
    creadoEn: new Date(),
    actualizadoEn: new Date(),
    loDeSiempre: {
      items: [
        {
          tipo: 'producto',
          referenciaId: 'prod-1',
          nombre: 'Perro Especial',
          cantidad: 2,
          precioUnitario: 12000,
          subtotal: 24000,
        },
      ],
      total: 24000,
      actualizadoEn: new Date(),
    },
  };

  it('renderiza la barra de búsqueda rápida cuando no hay cliente seleccionado', () => {
    const html = renderToStaticMarkup(
      <ClienteSelectorPOS
        clientes={[clienteMockConLoDeSiempre]}
        clienteSeleccionado={null}
        onSeleccionarCliente={vi.fn()}
        onCargarLoDeSiempre={vi.fn()}
      />
    );

    expect(html).toContain('Cliente frecuente (opcional)');
    expect(html).toContain('placeholder="Buscar por teléfono o nombre..."');
  });

  it('muestra la tarjeta del cliente seleccionado, insignia VIP y botón de cargar lo de siempre', () => {
    const html = renderToStaticMarkup(
      <ClienteSelectorPOS
        clientes={[clienteMockConLoDeSiempre]}
        clienteSeleccionado={clienteMockConLoDeSiempre}
        onSeleccionarCliente={vi.fn()}
        onCargarLoDeSiempre={vi.fn()}
      />
    );

    expect(html).toContain('Andrés Sánchez');
    expect(html).toContain('VIP (4 pedidos)');
    expect(html).toContain('300 123 4567');
    expect(html).toContain('Centro');
    expect(html).toContain('Cra 5 #12-34');
    expect(html).toContain('2x Perro Especial');
    expect(html).toContain('Cargar lo de siempre al ticket');
    expect(html).toContain('aria-label="Desvincular cliente del pedido"');
  });
});
