import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ComandaCard } from '../ComandaCard';
import type { Domicilio } from '@/types';

describe('ComandaCard', () => {
  const comandaPendiente: Domicilio = {
    id: 'dom_123456',
    clienteNombre: 'Juan Cocinero',
    clienteTelefono: '3001234567',
    direccion: 'Calle 10 # 5-20',
    barrio: 'Caobos',
    items: [
      {
        nombre: 'Hamburguesa La Parada',
        cantidad: 2,
        precioUnitario: 18000,
        subtotal: 36000,
        tipo: 'producto',
        referenciaId: 'h1',
      },
      {
        nombre: 'Papas Rústicas',
        cantidad: 1,
        precioUnitario: 8000,
        subtotal: 8000,
        tipo: 'producto',
        referenciaId: 'p1',
      },
    ],
    total: 44000,
    metodoPago: 'efectivo',
    origen: 'whatsapp',
    estado: 'pendiente',
    notas: 'Sin cebolla y salsas aparte',
    creadoEn: { seconds: 1700000000, nanoseconds: 0 } as any,
    actualizadoEn: { seconds: 1700000000, nanoseconds: 0 } as any,
    negocioId: 'laparada',
  };

  const ahora = (1700000000 + 300) * 1000; // 5 minutos después (300 s)

  it('renderiza código, cliente, platos y notas de preparación destacadas', () => {
    const html = renderToStaticMarkup(
      <ComandaCard
        comanda={comandaPendiente}
        ahoraMs={ahora}
        itemsPreparados={{}}
        onToggleItem={vi.fn()}
        onAvanzar={vi.fn()}
      />
    );

    expect(html).toContain('#123456');
    expect(html).toContain('Juan Cocinero');
    expect(html).toContain('WhatsApp');
    expect(html).toContain('Sin cebolla y salsas aparte');
    expect(html).toContain('Hamburguesa La Parada');
    expect(html).toContain('Papas Rústicas');
    expect(html).toContain('2×');
    expect(html).toContain('05:00');
  });

  it('marca visualmente los ítems tachados con clase line-through', () => {
    const html = renderToStaticMarkup(
      <ComandaCard
        comanda={comandaPendiente}
        ahoraMs={ahora}
        itemsPreparados={{ dom_123456_0: true }}
        onToggleItem={vi.fn()}
        onAvanzar={vi.fn()}
      />
    );

    expect(html).toContain('line-through');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
  });

  it('muestra el botón "A Cocina / Iniciar" en estado pendiente', () => {
    const html = renderToStaticMarkup(
      <ComandaCard
        comanda={comandaPendiente}
        ahoraMs={ahora}
        itemsPreparados={{}}
        onToggleItem={vi.fn()}
        onAvanzar={vi.fn()}
      />
    );

    expect(html).toContain('A Cocina / Iniciar');
  });

  it('muestra el botón "¡Comanda Lista!" en estado en_preparacion', () => {
    const comandaEnCocina = { ...comandaPendiente, estado: 'en_preparacion' as const };
    const html = renderToStaticMarkup(
      <ComandaCard
        comanda={comandaEnCocina}
        ahoraMs={ahora}
        itemsPreparados={{}}
        onToggleItem={vi.fn()}
        onAvanzar={vi.fn()}
      />
    );

    expect(html).toContain('¡Comanda Lista!');
  });

  it('muestra acciones de entrega y devolución en estado en_camino (listo para entrega)', () => {
    const comandaLista = { ...comandaPendiente, estado: 'en_camino' as const };
    const html = renderToStaticMarkup(
      <ComandaCard
        comanda={comandaLista}
        ahoraMs={ahora}
        itemsPreparados={{}}
        onToggleItem={vi.fn()}
        onAvanzar={vi.fn()}
        onDevolver={vi.fn()}
        onMarcarEntregado={vi.fn()}
      />
    );

    expect(html).toContain('Devolver');
    expect(html).toContain('Entregar / Despachado');
    expect(html).toContain('Comanda lista en mostrador');
  });
});
