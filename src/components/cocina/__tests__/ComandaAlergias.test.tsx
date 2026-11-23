import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Domicilio } from '@/types';
import { construirLookupPerfilDietetico } from '@/utils/alergenosUtils';
import { ComandaCard } from '../ComandaCard';

describe('ComandaCard — Alergias del comensal', () => {
  const comandaBase: Domicilio = {
    id: 'dom_alergia_1',
    clienteNombre: 'Laura Gómez',
    clienteTelefono: '3001234567',
    direccion: 'Calle 10 # 5-20',
    barrio: 'Caobos',
    items: [
      {
        nombre: 'Hamburguesa La Parada',
        cantidad: 1,
        precioUnitario: 20000,
        subtotal: 20000,
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
    total: 28000,
    metodoPago: 'efectivo',
    origen: 'pos',
    estado: 'pendiente',
    creadoEn: { seconds: 1700000000, nanoseconds: 0 } as unknown as Domicilio['creadoEn'],
    actualizadoEn: { seconds: 1700000000, nanoseconds: 0 } as unknown as Domicilio['actualizadoEn'],
    negocioId: 'laparada',
  };

  const ahora = (1700000000 + 180) * 1000;

  it('destaca la alerta de alergia del comensal y el ítem en conflicto', () => {
    const perfilDieteticoLookup = construirLookupPerfilDietetico([
      { id: 'h1', alergenosDeclarados: true, alergenos: ['mani', 'gluten'] },
      { id: 'p1', alergenosDeclarados: true, alergenos: [] },
    ]);

    const html = renderToStaticMarkup(
      <ComandaCard
        comanda={{
          ...comandaBase,
          alergiasComensal: { alergenos: ['mani'], nota: 'Severa' },
        }}
        ahoraMs={ahora}
        itemsPreparados={{}}
        onToggleItem={vi.fn()}
        onAvanzar={vi.fn()}
        perfilDieteticoLookup={perfilDieteticoLookup}
      />
    );

    expect(html).toContain('data-testid="alerta-alergia-comanda"');
    expect(html).toContain('ALERGIA DEL COMENSAL');
    expect(html).toContain('Maní');
    expect(html).toContain('Severa');
    expect(html).toContain('ring-red-500');
    expect(html).toContain('⚠ Maní');
  });

  it('no renderiza alerta de alergias cuando la comanda no tiene alergiasComensal', () => {
    const html = renderToStaticMarkup(
      <ComandaCard
        comanda={comandaBase}
        ahoraMs={ahora}
        itemsPreparados={{}}
        onToggleItem={vi.fn()}
        onAvanzar={vi.fn()}
      />
    );

    expect(html).not.toContain('data-testid="alerta-alergia-comanda"');
  });
});
