import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { Timestamp } from 'firebase/firestore';
import type { Combo, Insumo, Producto } from '@/types';
import { formatCOP } from '@/utils/formatCOP';
import { ArmaTuComboModal } from '../ArmaTuComboModal';
import { ItemProducto } from '../ItemProducto';
import { GruposEleccionComboEditor } from '@/components/productos/GruposEleccionComboEditor';

vi.mock('@/components/storefront/StorefrontDialog', () => ({
  StorefrontDialog: ({
    children,
    className,
    labelledBy,
  }: {
    children: React.ReactNode;
    className: string;
    labelledBy: string;
  }) => (
    <div role="dialog" aria-modal="true" aria-labelledby={labelledBy} className={className}>
      {children}
    </div>
  ),
}));

describe('ArmaTuComboModal & UI de Combos Personalizables', () => {
  const now = Timestamp.now();

  const insumos: Insumo[] = [
    {
      id: 'ins_coca',
      nombre: 'Lata Coca-Cola',
      stockActual: 10,
      stockMinimo: 2,
      unidad: 'unidades',
      negocioId: 'laparada',
      creadoEn: now,
      actualizadoEn: now,
    },
    {
      id: 'ins_papa',
      nombre: 'Papa Prefrita',
      stockActual: 8,
      stockMinimo: 2,
      unidad: 'kg',
      negocioId: 'laparada',
      creadoEn: now,
      actualizadoEn: now,
    },
    {
      id: 'ins_salsa',
      nombre: 'Salsa de Ajo',
      stockActual: 3,
      stockMinimo: 1,
      unidad: 'litros',
      negocioId: 'laparada',
      creadoEn: now,
      actualizadoEn: now,
    },
  ];

  const productos: Producto[] = [
    {
      id: 'prod_coca',
      nombre: 'Coca-Cola 400ml',
      descripcion: 'Bebida',
      precio: 4500,
      disponible: true,
      negocioId: 'laparada',
      creadoEn: now,
      actualizadoEn: now,
      receta: [
        {
          insumoId: 'ins_coca',
          nombreSnapshot: 'Lata Coca-Cola',
          cantidad: 1,
          unidadSnapshot: 'unidades',
        },
      ],
    },
    {
      id: 'prod_papas',
      nombre: 'Papas Francesas',
      descripcion: 'Acompañamiento',
      precio: 6000,
      disponible: true,
      negocioId: 'laparada',
      creadoEn: now,
      actualizadoEn: now,
      receta: [
        {
          insumoId: 'ins_papa',
          nombreSnapshot: 'Papa Prefrita',
          cantidad: 0.25,
          unidadSnapshot: 'kg',
        },
      ],
    },
  ];

  const comboMock: Combo = {
    id: 'combo_armable',
    nombre: 'Combo Pareja Armable',
    descripcion: 'Arma tu combo ideal',
    precioEspecial: 32000,
    disponible: true,
    esPersonalizable: true,
    negocioId: 'laparada',
    creadoEn: now,
    actualizadoEn: now,
    items: [
      {
        productoId: 'prod_base',
        cantidad: 2,
        nombreSnapshot: 'Perro Artesanal',
      },
    ],
    gruposEleccion: [
      {
        id: 'grp_bebida',
        nombre: 'Elige tu Bebida',
        categoriaGrupo: 'bebida',
        obligatorio: true,
        minSelecciones: 1,
        maxSelecciones: 1,
        opciones: [
          {
            id: 'opc_coca',
            nombre: 'Coca-Cola 400ml',
            productoId: 'prod_coca',
            cantidadProducto: 1,
            recargoCOP: 0,
            disponible: true,
            porDefecto: true,
          },
        ],
      },
      {
        id: 'grp_acomp',
        nombre: 'Elige tu Acompañamiento',
        categoriaGrupo: 'acompanamiento',
        obligatorio: true,
        minSelecciones: 1,
        maxSelecciones: 1,
        opciones: [
          {
            id: 'opc_papas',
            nombre: 'Papas Francesas',
            productoId: 'prod_papas',
            cantidadProducto: 1,
            recargoCOP: 2000,
            disponible: true,
            porDefecto: true,
          },
        ],
      },
      {
        id: 'grp_salsas',
        nombre: 'Elige tus Salsas',
        categoriaGrupo: 'salsa',
        obligatorio: false,
        minSelecciones: 0,
        maxSelecciones: 2,
        opciones: [
          {
            id: 'opc_ajo',
            nombre: 'Salsa de Ajo',
            recargoCOP: 0,
            disponible: true,
            porDefecto: true,
            recetaExtra: [
              {
                insumoId: 'ins_salsa',
                nombreSnapshot: 'Salsa de Ajo',
                cantidad: 0.03,
                unidadSnapshot: 'litros',
              },
            ],
          },
        ],
      },
    ],
  };

  it('no renderiza nada cuando isOpen es false o combo es null', () => {
    expect(
      renderToStaticMarkup(
        <ArmaTuComboModal
          combo={comboMock}
          isOpen={false}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      )
    ).toBe('');

    expect(
      renderToStaticMarkup(
        <ArmaTuComboModal
          combo={null}
          isOpen={true}
          onClose={vi.fn()}
          onConfirm={vi.fn()}
        />
      )
    ).toBe('');
  });

  it('renderiza grupos de elección y recálculo de escandallo en vivo en modo POS', () => {
    const html = renderToStaticMarkup(
      <ArmaTuComboModal
        combo={comboMock}
        isOpen={true}
        productos={productos}
        insumos={insumos}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('Arma tu Combo');
    expect(html).toContain('Combo Pareja Armable');
    expect(html).toContain('2× Perro Artesanal');
    expect(html).toContain('Elige tu Bebida');
    expect(html).toContain('Elige tu Acompañamiento');
    expect(html).toContain('Elige tus Salsas');
    expect(html).toContain('Coca-Cola 400ml');
    expect(html).toContain('Papas Francesas');
    expect(html).toContain('Recálculo de Escandallo en Vivo');
    expect(html).toContain('Lata Coca-Cola');
    expect(html).toContain('Papa Prefrita');
    expect(html).toContain('Salsa de Ajo');
    expect(html).toContain(formatCOP(34000));
    expect(html).toContain('Agregar Combo');
  });

  it('oculta métricas internas de bodega y mantiene precio catálogo en modoStorefront', () => {
    const html = renderToStaticMarkup(
      <ArmaTuComboModal
        combo={comboMock}
        isOpen={true}
        productos={productos}
        insumos={insumos}
        modoStorefront={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    expect(html).not.toContain('Recálculo de Escandallo en Vivo');
    expect(html).toContain(formatCOP(32000));
  });

  it('renderiza badge ARMA TU COMBO en ItemProducto y editor administrativo de grupos', () => {
    const cardHtml = renderToStaticMarkup(
      <ItemProducto
        nombre="Combo Pareja Armable"
        precio={32000}
        disponible
        esCombo
        esPersonalizable
        onAgregar={vi.fn()}
      />
    );

    expect(cardHtml).toContain('ARMA TU COMBO');
    expect(cardHtml).toContain('Personalizar');
    expect(cardHtml).toContain('aria-label="Personalizar Combo Pareja Armable"');

    const editorHtml = renderToStaticMarkup(
      <GruposEleccionComboEditor
        esPersonalizable={true}
        onTogglePersonalizable={vi.fn()}
        grupos={comboMock.gruposEleccion!}
        onChangeGrupos={vi.fn()}
        productos={productos}
        insumos={insumos}
      />
    );

    expect(editorHtml).toContain('+ Bebida');
    expect(editorHtml).toContain('+ Acompañamiento');
    expect(editorHtml).toContain('+ Salsas');
    expect(editorHtml).toContain('Elige tu Bebida');
  });
});
