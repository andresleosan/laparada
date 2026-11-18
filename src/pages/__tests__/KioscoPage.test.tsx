import type { ReactNode } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { KioscoPage } from '../KioscoPage';
import { KioscoProductCard } from '@/components/kiosco/KioscoProductCard';
import { KioscoCartDrawer } from '@/components/kiosco/KioscoCartDrawer';
import type { ItemKioscoCustomizado, Producto } from '@/types';
import { getComboPersonalizableDefault } from '@/utils/combosPersonalizablesUtils';

vi.mock('@/components/storefront/StorefrontDialog', () => ({
  StorefrontDialog: ({ children, className }: { children: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock('@/context/NegocioContext', () => ({
  useNegocio: () => ({
    negocioActual: {
      id: 'laparada',
      nombre: 'La Parada Autoservicio',
      slug: 'laparada',
      logoUrl: '',
    },
  }),
}));

const mockProductos: Producto[] = [
  {
    id: 'prod_1',
    nombre: 'Hamburguesa Monumental',
    descripcion: 'Carne artesanal y queso fundido',
    precio: 24000,
    disponible: true,
    negocioId: 'laparada',
    creadoEn: { seconds: 1600000000, nanoseconds: 0 } as Producto['creadoEn'],
    actualizadoEn: { seconds: 1600000000, nanoseconds: 0 } as Producto['actualizadoEn'],
  },
];

vi.mock('@/hooks/useProductos', () => ({
  useProductos: () => ({
    productos: mockProductos,
    combos: [],
    loading: false,
    error: null,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/hooks/useCategorias', () => ({
  useCategorias: () => ({
    categorias: [{ id: 'hamburguesas', nombre: 'Hamburguesas', activo: true, negocioId: 'laparada' }],
    loading: false,
  }),
}));

vi.mock('@/services/kioscoService', () => ({
  crearPedidoKiosco: vi.fn().mockResolvedValue({
    id: 'kiosco_123',
    numeroTurno: 'K-042',
    total: 24000,
  }),
}));

describe('KioscoPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inicia en la pantalla de bienvenida con opciones de autoservicio para salón y llevar', () => {
    const html = renderToStaticMarkup(
      <StaticRouter location="/kiosco">
        <KioscoPage />
      </StaticRouter>
    );

    expect(html).toContain('Terminal de Autoservicio');
    expect(html).toContain('Comer Aquí');
    expect(html).toContain('Para Llevar');
    expect(html).toContain('La Parada Autoservicio');
  });

  it('muestra badge Arma tu Combo y botón Armar Combo en KioscoProductCard para combos personalizables', () => {
    const comboPersonalizable = getComboPersonalizableDefault('laparada');
    const html = renderToStaticMarkup(
      <KioscoProductCard
        item={comboPersonalizable}
        isCombo={true}
        onSelect={vi.fn()}
      />
    );

    expect(html).toContain('Combo Arma tu Parada');
    expect(html).toContain('Arma tu Combo');
    expect(html).toContain('3 grupos a elección');
    expect(html).toContain('Armar Combo');
  });

  it('muestra Cambiar opciones en KioscoCartDrawer para combos personalizados', () => {
    const itemCombo: ItemKioscoCustomizado = {
      tipo: 'combo',
      referenciaId: 'combo-arma-tu-parada',
      nombre: 'Combo Arma tu Parada',
      cantidad: 1,
      precioUnitario: 12500,
      subtotal: 12500,
      modificadores: ['Bebida: Gaseosa Personal 400ml', 'Acompañamiento: Papas Doradas'],
      eleccionesCombo: [
        {
          grupoId: 'grp_bebida',
          grupoNombre: 'Elige tu Bebida',
          opcionId: 'opc_cola_400',
          opcionNombre: 'Gaseosa Personal 400ml',
          cantidad: 1,
          recargoCOP: 0,
        },
      ],
    };

    const html = renderToStaticMarkup(
      <KioscoCartDrawer
        items={[itemCombo]}
        modalidad="salon"
        onClose={vi.fn()}
        onUpdateCantidad={vi.fn()}
        onRemoveItem={vi.fn()}
        onEditComboItem={vi.fn()}
        onConfirmarPedido={vi.fn()}
      />
    );

    expect(html).toContain('Combo Arma tu Parada');
    expect(html).toContain('Bebida: Gaseosa Personal 400ml');
    expect(html).toContain('Cambiar opciones');
  });
});
